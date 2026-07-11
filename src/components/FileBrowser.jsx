import React, { useState, useEffect } from 'react';

const FILES_API = `${window.location.origin}/files`;
const FOLDERS_API = `${window.location.origin}/folders`;

export default function FileBrowser({
  addLog,
  userName,
  currentFolderId,
  setCurrentFolderId,
  currentFolderName,
  setCurrentFolderName,
  breadcrumbs,
  setBreadcrumbs
}) {
  const [subfolders, setSubfolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Modal state for moving files/folders
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveTargetItem, setMoveTargetItem] = useState(null); // { id, name, type: 'file' | 'folder' }
  const [allFolders, setAllFolders] = useState([]);
  const [selectedDestId, setSelectedDestId] = useState('root');

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileEmoji = (fileType) => {
    if (fileType === 'image') return '📷';
    if (fileType === 'pdf') return '📕';
    if (fileType === 'excel') return '📊';
    if (fileType === 'word-txt') return '📝';
    return '📄';
  };

  // 1. Fetch current directory content
  const fetchDirectory = async () => {
    if (!userName) return;
    setIsLoading(true);
    let url = `${FILES_API}/browse?userName=${encodeURIComponent(userName.trim())}`;
    if (currentFolderId) {
      url += `&folderId=${currentFolderId}`;
    }

    try {
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.status) {
        setSubfolders(data.data.subfolders || []);
        setFiles(data.data.files || []);
        setCurrentFolderName(data.data.currentFolderName || 'Home');
        setBreadcrumbs(data.data.breadcrumbs || []);
      } else {
        addLog('ERROR', `Failed to load directory: ${data.message}`);
      }
    } catch (err) {
      addLog('ERROR', `Network error loading directory: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Re-fetch when folder or user changes
  useEffect(() => {
    fetchDirectory();
  }, [currentFolderId, userName]);

  // 2. Handle folder creation
  const handleCreateFolder = async () => {
    const folderName = prompt('Enter name for the new folder:');
    if (!folderName || !folderName.trim()) return;

    addLog('INFO', `Creating folder "${folderName}"`);
    let url = `${FOLDERS_API}?userName=${encodeURIComponent(userName)}&name=${encodeURIComponent(folderName.trim())}`;
    if (currentFolderId) {
      url += `&parentId=${currentFolderId}`;
    }

    try {
      const res = await fetch(url, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.status) {
        addLog('SUCCESS', `Created folder: ${folderName}`);
        fetchDirectory();
      } else {
        alert(data.message || 'Failed to create folder');
        addLog('ERROR', `Create folder failed: ${data.message}`);
      }
    } catch (err) {
      addLog('ERROR', `Create folder network error: ${err.message}`);
    }
  };

  // 3. Handle folder renaming
  const handleRenameFolder = async (folderId, oldName, e) => {
    e.stopPropagation();
    const newName = prompt(`Rename folder "${oldName}" to:`, oldName);
    if (!newName || !newName.trim() || newName === oldName) return;

    addLog('INFO', `Renaming folder "${oldName}" to "${newName}"`);
    try {
      const res = await fetch(`${FOLDERS_API}/${folderId}/rename?userName=${encodeURIComponent(userName)}&name=${encodeURIComponent(newName.trim())}`, {
        method: 'PATCH'
      });
      const data = await res.json();
      if (res.ok && data.status) {
        addLog('SUCCESS', `Renamed folder to: ${newName}`);
        fetchDirectory();
      } else {
        alert(data.message || 'Failed to rename folder');
        addLog('ERROR', `Rename folder failed: ${data.message}`);
      }
    } catch (err) {
      addLog('ERROR', `Rename folder network error: ${err.message}`);
    }
  };

  // 4. Handle folder deletion
  const handleDeleteFolder = async (folderId, folderName, e) => {
    e.stopPropagation();
    if (!confirm(`WARNING: Deleting folder "${folderName}" will delete ALL its subfolders and files recursively!\nAre you sure you want to proceed?`)) return;

    addLog('INFO', `Deleting folder "${folderName}" recursively...`);
    try {
      const res = await fetch(`${FOLDERS_API}/${folderId}?userName=${encodeURIComponent(userName)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok && data.status) {
        addLog('SUCCESS', `Deleted folder: ${folderName}`);
        fetchDirectory();
      } else {
        addLog('ERROR', `Failed to delete folder: ${data.message}`);
      }
    } catch (err) {
      addLog('ERROR', `Delete folder network error: ${err.message}`);
    }
  };

  // 5. Handle file deletion
  const handleDeleteFile = async (fileId, fileName, e) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${fileName}"?`)) return;

    addLog('INFO', `Deleting file "${fileName}"`);
    try {
      const res = await fetch(`${FILES_API}/${fileId}?userName=${encodeURIComponent(userName)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok && data.status) {
        addLog('SUCCESS', `Deleted file: ${fileName}`);
        fetchDirectory();
      } else {
        addLog('ERROR', `Failed to delete file: ${data.message}`);
      }
    } catch (err) {
      addLog('ERROR', `Delete file network error: ${err.message}`);
    }
  };

  // 6. Move Dialog Modal logic
  const openMoveModal = async (itemId, itemName, type, e) => {
    e.stopPropagation();
    setMoveTargetItem({ id: itemId, name: itemName, type });
    setSelectedDestId('root');
    
    // Fetch all folders flatly for selection
    try {
      const res = await fetch(`${FOLDERS_API}/all?userName=${encodeURIComponent(userName)}`);
      const data = await res.json();
      if (res.ok && data.status) {
        // Exclude the folder itself and its descendants if we are moving a folder
        let available = data.data || [];
        if (type === 'folder') {
          available = available.filter(f => f.id !== itemId);
          // Cyclic parent validation is handled on BE, but filtering the current folder prevents basic mistakes
        }
        setAllFolders(available);
        setShowMoveModal(true);
      } else {
        addLog('ERROR', `Could not fetch folders for moving: ${data.message}`);
      }
    } catch (err) {
      addLog('ERROR', `Network error loading folders: ${err.message}`);
    }
  };

  const handleMoveSubmit = async () => {
    if (!moveTargetItem) return;
    const destFolderId = selectedDestId === 'root' ? null : Number(selectedDestId);

    const isFolder = moveTargetItem.type === 'folder';
    const endpoint = isFolder 
      ? `${FOLDERS_API}/${moveTargetItem.id}/move`
      : `${FILES_API}/${moveTargetItem.id}/move`;

    let url = `${endpoint}?userName=${encodeURIComponent(userName)}`;
    if (destFolderId) {
      url += `&parentId=${destFolderId}`; // folders use parentId
    }

    // files use folderId
    if (!isFolder && destFolderId) {
      url += `&folderId=${destFolderId}`;
    }

    addLog('INFO', `Moving ${moveTargetItem.type} "${moveTargetItem.name}"...`);

    try {
      const res = await fetch(url, { method: 'PATCH' });
      const data = await res.json();
      if (res.ok && data.status) {
        addLog('SUCCESS', `Successfully moved "${moveTargetItem.name}"`);
        setShowMoveModal(false);
        setMoveTargetItem(null);
        fetchDirectory();
      } else {
        alert(data.message || `Failed to move ${moveTargetItem.type}`);
        addLog('ERROR', `Move failed: ${data.message}`);
      }
    } catch (err) {
      addLog('ERROR', `Move network error: ${err.message}`);
    }
  };

  return (
    <div className="file-browser">
      {/* Explorer toolbar */}
      <div className="explorer-toolbar" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '1.5rem',
        flexWrap: 'wrap'
      }}>
        {/* Dynamic Breadcrumbs */}
        <div className="breadcrumbs" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          fontSize: '0.95rem',
          flexWrap: 'wrap',
          background: 'rgba(255, 255, 255, 0.02)',
          padding: '0.5rem 0.75rem',
          borderRadius: '8px',
          border: '1px solid var(--border-color)'
        }}>
          <span 
            className="breadcrumb-item" 
            style={{ cursor: 'pointer', color: currentFolderId === null ? 'var(--accent-end)' : 'var(--text-secondary)' }}
            onClick={() => setCurrentFolderId(null)}
          >
            🏠 Home
          </span>
          {breadcrumbs.map((bc, index) => (
            <React.Fragment key={bc.id}>
              <span style={{ color: 'var(--text-secondary)' }}>/</span>
              <span 
                className="breadcrumb-item" 
                style={{
                  cursor: 'pointer',
                  color: index === breadcrumbs.length - 1 ? 'var(--accent-end)' : 'var(--text-secondary)'
                }}
                onClick={() => setCurrentFolderId(bc.id)}
              >
                {bc.name}
              </span>
            </React.Fragment>
          ))}
        </div>

        <button 
          onClick={handleCreateFolder} 
          className="action-btn"
          style={{
            padding: '0.5rem 1rem',
            fontSize: '0.85rem',
            background: 'rgba(99, 102, 241, 0.15)',
            border: '1px solid var(--accent-start)',
            color: 'var(--text-primary)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <span>📁+</span> New Folder
        </button>
      </div>

      <div className="browser-results" style={{ minHeight: '200px', position: 'relative' }}>
        {isLoading && (
          <div className="loading-overlay" style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '2rem'
          }}>
            <div className="loading-spinner">Loading files...</div>
          </div>
        )}
        
        {!isLoading && subfolders.length === 0 && files.length === 0 && (
          <div className="empty-state" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
            <span className="empty-icon" style={{ fontSize: '3rem', opacity: '0.5' }}>📂</span>
            <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>This directory is empty.</p>
          </div>
        )}

        {!isLoading && (subfolders.length > 0 || files.length > 0) && (
          <div className="explorer-grid" style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            {/* Render Folders First */}
            {subfolders.length > 0 && (
              <div className="folders-section">
                <h5 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                  Folders ({subfolders.length})
                </h5>
                <div className="files-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.75rem' }}>
                  {subfolders.map(folder => (
                    <div 
                      key={folder.id} 
                      className="file-card folder-card glass"
                      onClick={() => {
                        setCurrentFolderId(folder.id);
                        setCurrentFolderName(folder.name);
                      }}
                      style={{
                        cursor: 'pointer',
                        padding: '0.75rem',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        transition: 'transform 0.2s, border-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-start)'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '1.8rem' }}>📁</span>
                        <div className="card-actions" onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: '0.3rem' }}>
                          <button 
                            onClick={(e) => openMoveModal(folder.id, folder.name, 'folder', e)}
                            title="Move folder"
                            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }}
                          >
                            ↗️
                          </button>
                          <button 
                            onClick={(e) => handleRenameFolder(folder.id, folder.name, e)}
                            title="Rename folder"
                            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }}
                          >
                            ✏️
                          </button>
                          <button 
                            onClick={(e) => handleDeleteFolder(folder.id, folder.name, e)}
                            title="Delete folder"
                            style={{ background: 'none', border: 'none', color: 'var(--text-error)', cursor: 'pointer', fontSize: '0.85rem' }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      <h5 style={{ 
                        fontSize: '0.9rem', 
                        fontWeight: '500', 
                        whiteSpace: 'nowrap', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis',
                        margin: 0
                      }} title={folder.name}>
                        {folder.name}
                      </h5>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Render Files */}
            {files.length > 0 && (
              <div className="files-section">
                <h5 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em', marginBottom: '0.5rem', marginTop: '0.5rem' }}>
                  Files ({files.length})
                </h5>
                <div className="files-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.75rem' }}>
                  {files.map(file => (
                    <div key={file.id} className="file-card glass" style={{
                      padding: '0.75rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: '12px'
                    }}>
                      <div className="file-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span className="file-card-icon" style={{ fontSize: '1.8rem' }}>{getFileEmoji(file.fileType)}</span>
                        <div className="card-actions" style={{ display: 'flex', gap: '0.3rem' }}>
                          <button 
                            className="move-file-btn"
                            onClick={(e) => openMoveModal(file.id, file.originalName, 'file', e)}
                            title="Move file"
                            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem' }}
                          >
                            ↗️
                          </button>
                          <button 
                            className="delete-file-btn" 
                            onClick={(e) => handleDeleteFile(file.id, file.originalName, e)}
                            title="Delete file"
                            style={{ background: 'none', border: 'none', color: 'var(--text-error)', cursor: 'pointer', fontSize: '0.85rem' }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      <div className="file-card-body">
                        <h5 className="file-card-name" title={file.originalName} style={{
                          fontSize: '0.9rem',
                          fontWeight: '500',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          margin: '0 0 0.25rem 0'
                        }}>{file.originalName}</h5>
                        <p className="file-card-meta" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                          {formatBytes(file.sizeBytes)} • {file.fileType}
                        </p>
                        <p className="file-card-date" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.2rem', margin: 0 }}>
                          Created: {file.fileCreatedDate || 'Unknown'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Move Dialog Modal Overlay */}
      {showMoveModal && moveTargetItem && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(8px)',
          padding: '1.5rem'
        }}>
          <div className="modal-content glass" style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '20px',
            padding: '1.5rem',
            width: '100%',
            maxWidth: '360px',
            boxShadow: 'var(--shadow-premium)'
          }}>
            <h4 style={{ marginBottom: '1rem', color: 'var(--text-primary)', fontWeight: '600' }}>
              Move {moveTargetItem.type === 'file' ? 'File' : 'Folder'}
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Select destination for <strong>{moveTargetItem.name}</strong>:
            </p>

            <div className="select-container" style={{ marginBottom: '1.5rem' }}>
              <select 
                value={selectedDestId} 
                onChange={(e) => setSelectedDestId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  background: '#111827',
                  color: '#fff',
                  border: '1px solid var(--border-color)'
                }}
              >
                <option value="root">🏠 Home (Root)</option>
                {allFolders.map(folder => (
                  <option key={folder.id} value={folder.id}>
                    📁 {folder.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button 
                onClick={() => { setShowMoveModal(false); setMoveTargetItem(null); }}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'transparent',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={handleMoveSubmit}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'var(--accent-start)',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Confirm Move
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
