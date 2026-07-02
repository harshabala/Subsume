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
      
      const listener = (changes: Record<string, chrome.storage.StorageChange>, namespace: string) => {
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
    <div className="page-container sanctuary-page-shell">
      <header className="sanctuary-header">
        <div className="sanctuary-header-meta">
          <span className="sanctuary-subtitle">Archival Colophon</span>
        </div>
        <h2 className="sanctuary-title">System Inscriptions</h2>
        <p className="sanctuary-description">Telegraphic colophon recording internal projection warnings and mechanism anomalies.</p>
      </header>

      <div className="sanctuary-page-stack">
        <div className="sanctuary-btn-row">
          <button className="sanctuary-btn-gold" onClick={copyToClipboard}>
            Transcribe Colophon (Copy)
          </button>
          <button className="sanctuary-btn-restraint" onClick={clearLogs}>
            Expunge Ledger
          </button>
        </div>

        <div className="sanctuary-plaque-panel">
          {logs.length === 0 ? (
            <div className="sanctuary-loading-text">
              No system inscriptions recorded in the sanctuary ledger.
            </div>
          ) : (
            <div className="logs-table-wrap">
              <table className="logs-table">
                <thead>
                  <tr>
                    <th>Chronicle</th>
                    <th>Designation</th>
                    <th>Inscription</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.slice().reverse().map((log, i) => {
                    const isErr = log.level === 'error';
                    const isWarn = log.level === 'warn';
                    const levelClass = isErr ? 'error' : isWarn ? 'warn' : 'info';

                    return (
                      <tr key={i} className={isErr ? 'error' : ''}>
                        <td className="time">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </td>
                        <td>
                          <span className={`log-level-badge ${levelClass}`}>
                            {log.level.toUpperCase()}
                          </span>
                        </td>
                        <td className="message">
                          {log.message}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}