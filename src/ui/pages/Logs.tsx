import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { SystemLog } from '@/shared/types';
import '../styles/settings.css';

export function Logs() {
  const [logs, setLogs] = useState<SystemLog[]>([]);

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get('system_logs', (result) => {
        setLogs(result.system_logs || []);
      });
      
      const listener = (changes: any, namespace: string) => {
        if (namespace === 'local' && changes.system_logs) {
          setLogs(changes.system_logs.newValue || []);
        }
      };
      chrome.storage.onChanged.addListener(listener);
      return () => chrome.storage.onChanged.removeListener(listener);
    }
  }, []);

  const copyToClipboard = () => {
    const text = JSON.stringify(logs, null, 2);
    navigator.clipboard.writeText(text).then(() => {
      alert('Logs copied to clipboard!');
    }).catch((err) => {
      alert('Failed to copy logs: ' + err);
    });
  };

  const clearLogs = () => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ system_logs: [] });
    }
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <h2 className="page-title">System Logs</h2>
        <p className="page-subtitle">View recent warnings and errors (max 100).</p>
      </header>

      <div className="settings-section settings-content" style={{ maxWidth: '100%' }}>
        <div className="settings-button-group" style={{ marginBottom: 16 }}>
          <button className="btn btn-primary settings-action-btn" onClick={copyToClipboard}>
            Copy All to Clipboard
          </button>
          <button className="btn btn-secondary settings-action-btn" onClick={clearLogs}>
            Clear Logs
          </button>
        </div>

        {logs.length === 0 ? (
          <p className="settings-help-text">No logs recorded.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '8px' }}>Time</th>
                  <th style={{ padding: '8px' }}>Level</th>
                  <th style={{ padding: '8px' }}>Message</th>
                </tr>
              </thead>
              <tbody>
                {logs.slice().reverse().map((log, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)', color: log.level === 'error' ? 'var(--error)' : 'inherit' }}>
                    <td style={{ padding: '8px', whiteSpace: 'nowrap' }}>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td style={{ padding: '8px' }}>
                      <span style={{ 
                        padding: '2px 6px', 
                        borderRadius: '4px', 
                        background: log.level === 'error' ? 'rgba(255,0,0,0.1)' : 'rgba(255,165,0,0.1)',
                        color: log.level === 'error' ? '#ff4444' : '#ff9900',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}>{log.level.toUpperCase()}</span>
                    </td>
                    <td style={{ padding: '8px', wordBreak: 'break-word' }}>
                      {log.message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
