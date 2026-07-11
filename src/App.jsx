import React, { useState, useEffect } from 'react';
import UploadForm from './components/UploadForm';
import FileBrowser from './components/FileBrowser';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' or 'browser'
  const [logs, setLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);

  // Lifted state
  const [userName, setUserName] = useState('');
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [currentFolderName, setCurrentFolderName] = useState('Home');
  const [breadcrumbs, setBreadcrumbs] = useState([]);

  const addLog = (level, message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, level, message }]);
  };

  useEffect(() => {
    addLog('INFO', 'DataVault application loaded successfully.');
  }, []);

  if (!userName) {
    return (
      <div className="app-container">
        <header className="app-header">
          <div className="logo">
            <span className="logo-icon">🔒</span>
            <h1>Data<span>Vault</span></h1>
          </div>
          <p className="subtitle">Secure, organized file repository</p>
        </header>

        <main className="app-main" style={{ minHeight: '350px' }}>
          <div className="card glass login-card" style={{ maxWidth: '400px', margin: '2rem auto' }}>
            <h3 style={{ marginBottom: '1.5rem', textAlign: 'center', fontWeight: '600' }}>Access DataVault</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const val = e.target.usernameInput.value.trim();
              if (val) {
                setUserName(val);
                addLog('INFO', `Vault unlocked for user: ${val}`);
              }
            }}>
              <div className="input-group">
                <label>Vault Username</label>
                <div className="input-wrapper">
                  <span className="input-icon">👤</span>
                  <input
                    type="text"
                    name="usernameInput"
                    placeholder="Enter username"
                    required
                    autoFocus
                  />
                </div>
              </div>
              <button type="submit" className="action-btn upload-btn" style={{ width: '100%', marginTop: '0.5rem' }}>
                Open Vault
              </button>
            </form>
          </div>
        </main>

        <footer className="app-footer">
          <p>&copy; 2026 DataVault. Built with professional precision.</p>
        </footer>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo">
          <span className="logo-icon">🔒</span>
          <h1>Data<span>Vault</span></h1>
        </div>
        <p className="subtitle">Secure, organized file repository</p>
        <div className="user-profile-bar glass">
          <span>🔓 Vault: <strong>{userName}</strong></span>
          <button className="switch-user-btn" onClick={() => {
            setUserName('');
            setCurrentFolderId(null);
            setCurrentFolderName('Home');
            setBreadcrumbs([]);
            addLog('INFO', 'Vault locked.');
          }}>Lock Vault</button>
        </div>
      </header>

      <main className="app-main">
        <div className="card glass">
          <div className="tabs-header">
            <button 
              className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
              onClick={() => setActiveTab('upload')}
            >
              Upload Files
            </button>
            <button 
              className={`tab-btn ${activeTab === 'browser' ? 'active' : ''}`}
              onClick={() => setActiveTab('browser')}
            >
              File Explorer
            </button>
          </div>
          
          <div className="tab-content">
            {activeTab === 'upload' ? (
              <UploadForm 
                addLog={addLog} 
                userName={userName}
                currentFolderId={currentFolderId}
                currentFolderName={currentFolderName}
              />
            ) : (
              <FileBrowser 
                addLog={addLog}
                userName={userName}
                currentFolderId={currentFolderId}
                setCurrentFolderId={setCurrentFolderId}
                currentFolderName={currentFolderName}
                setCurrentFolderName={setCurrentFolderName}
                breadcrumbs={breadcrumbs}
                setBreadcrumbs={setBreadcrumbs}
              />
            )}
          </div>
        </div>

        {/* Collapsible Console Log Panel */}
        <div className="logs-panel glass">
          <div className="logs-header" onClick={() => setShowLogs(!showLogs)}>
            <div className="logs-title">
              <span className="logs-pulse"></span>
              <h4>System Activity Logs ({logs.length})</h4>
            </div>
            <button className="toggle-logs-btn">{showLogs ? '▼ Close' : '▲ Open'}</button>
          </div>

          {showLogs && (
            <div className="logs-body">
              <div className="logs-controls">
                <button className="clear-logs-btn" onClick={() => setLogs([])}>Clear Console</button>
              </div>
              <div className="logs-list">
                {logs.length === 0 ? (
                  <div className="log-item empty">No logs captured.</div>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className={`log-item ${log.level.toLowerCase()}`}>
                      <span className="log-time">[{log.timestamp}]</span>
                      <span className="log-level">{log.level}:</span>
                      <span className="log-message">{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="app-footer">
        <p>&copy; 2026 DataVault. Built with professional precision.</p>
      </footer>
    </div>
  );
}

export default App;
