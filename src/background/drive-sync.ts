export async function getAuthToken(interactive = true): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError || !token) {
        reject(chrome.runtime.lastError || new Error('No token'));
      } else {
        resolve(token);
      }
    });
  });
}

async function getBackupFileId(token: string): Promise<string | null> {
  const q = encodeURIComponent("name='subsume_backup.json' and 'appDataFolder' in parents and trashed=false");
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}`, {
    headers: {
      'Authorization': 'Bearer ' + token
    }
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  return null;
}

export async function uploadDatabaseBackup(jsonString: string): Promise<void> {
  const token = await getAuthToken(false);
  const metadata = {
    name: 'subsume_backup.json',
    parents: ['appDataFolder']
  };

  const fileId = await getBackupFileId(token);
  const boundary = '-------314159265358979323846';
  const delimiter = "\r\n--" + boundary + "\r\n";
  const close_delim = "\r\n--" + boundary + "--";

  const multipartRequestBody =
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      jsonString +
      close_delim;

  const method = fileId ? 'PATCH' : 'POST';
  const path = fileId ? `/upload/drive/v3/files/${fileId}` : '/upload/drive/v3/files';

  const res = await fetch(`https://www.googleapis.com${path}?uploadType=multipart`, {
    method,
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'multipart/related; boundary="' + boundary + '"'
    },
    body: multipartRequestBody
  });

  if (!res.ok) {
    throw new Error('Upload failed: ' + await res.text());
  }
}

export async function downloadDatabaseBackup(): Promise<string> {
  const token = await getAuthToken(false);
  const fileId = await getBackupFileId(token);
  if (!fileId) throw new Error('No backup found');

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: {
      'Authorization': 'Bearer ' + token
    }
  });

  if (!res.ok) {
    throw new Error('Download failed: ' + await res.text());
  }

  return await res.text();
}
