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

async function removeCachedToken(token: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.identity.removeCachedAuthToken({ token }, () => {
      resolve();
    });
  });
}

async function fetchDriveApi(url: string, init: RequestInit = {}): Promise<Response> {
  let token = await getAuthToken(false);
  const headers = new Headers(init.headers);
  headers.set('Authorization', 'Bearer ' + token);

  let res = await fetch(url, { ...init, headers });

  if (res.status === 401) {
    await removeCachedToken(token);
    token = await getAuthToken(true);
    headers.set('Authorization', 'Bearer ' + token);
    res = await fetch(url, { ...init, headers });
  }

  return res;
}

async function getBackupFileId(): Promise<string | null> {
  const q = encodeURIComponent("name='subsume_backup.json' and 'appDataFolder' in parents and trashed=false");
  const res = await fetchDriveApi(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}`);
  if (!res.ok) {
    throw new Error(`Google Drive backup file lookup failed: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  return null;
}

export async function uploadDatabaseBackup(jsonString: string): Promise<void> {
  const metadata = {
    name: 'subsume_backup.json',
    parents: ['appDataFolder']
  };

  const fileId = await getBackupFileId();
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

  const res = await fetchDriveApi(`https://www.googleapis.com${path}?uploadType=multipart`, {
    method,
    headers: {
      'Content-Type': 'multipart/related; boundary="' + boundary + '"'
    },
    body: multipartRequestBody
  });

  if (!res.ok) {
    throw new Error('Upload failed: ' + await res.text());
  }
}

export async function downloadDatabaseBackup(): Promise<string> {
  const fileId = await getBackupFileId();
  if (!fileId) throw new Error('No backup found');

  const res = await fetchDriveApi(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`);

  if (!res.ok) {
    throw new Error('Download failed: ' + await res.text());
  }

  return await res.text();
}
