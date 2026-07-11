import React, { useState, useRef } from 'react';
import { sha256 } from 'js-sha256';

const API_URL = `${window.location.origin}/upload/media`;

export default function UploadForm({ addLog, userName, currentFolderId, currentFolderName }) {
  const [files, setFiles] = useState([]); // { id, file, progress, status, message }
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      addFilesToQueue(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      addFilesToQueue(e.target.files);
    }
  };

  const addFilesToQueue = (fileList) => {
    const newFiles = Array.from(fileList).map(f => ({
      id: Math.random().toString(36).substr(2, 9),
      file: f,
      progress: 0,
      status: 'pending', // pending, uploading, success, error
      message: ''
    }));
    setFiles(prev => [...prev, ...newFiles]);
    addLog('INFO', `Added ${newFiles.length} file(s) to queue.`);
  };

  const removeFile = (id) => {
    setFiles(prev => {
      const remaining = prev.filter(f => f.id !== id);
      if (remaining.length === 0 && fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return remaining;
    });
  };

  const clearAll = () => {
    setFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const updateFileState = (id, updates) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileEmoji = (filename) => {
    if (!filename) return '📄';
    const ext = filename.split('.').pop().toLowerCase();
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) return '📷';
    if (ext === 'pdf') return '📕';
    if (['xlsx', 'xls', 'csv'].includes(ext)) return '📊';
    if (['doc', 'docx', 'txt'].includes(ext)) return '📝';
    return '📄';
  };

  const computeFileHash = async (file) => {
    const buffer = await file.arrayBuffer();
    if (window.crypto && window.crypto.subtle) {
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } else {
      addLog('INFO', `Web Crypto API not available. Using optimized JS fallback to calculate hash for: ${file.name}`);
      return sha256(buffer);
    }
  };

  const uploadFile = (fileObj) => {
    return new Promise(async (resolve) => {
      let fileHash = '';
      try {
        updateFileState(fileObj.id, { status: 'uploading', message: 'Computing hash...' });
        fileHash = await computeFileHash(fileObj.file);
        
        updateFileState(fileObj.id, { message: 'Checking deduplication...' });
        const preCheckForm = new FormData();
        preCheckForm.append('fileHash', fileHash);
        preCheckForm.append('userName', userName.trim());
        preCheckForm.append('originalName', fileObj.file.name);
        if (fileObj.file.lastModified) {
          preCheckForm.append('fileLastModified', fileObj.file.lastModified);
        }
        if (currentFolderId) {
          preCheckForm.append('folderId', currentFolderId);
        }

        const checkRes = await fetch(`${window.location.origin}/upload/pre-check`, {
          method: 'POST',
          body: preCheckForm
        });

        if (checkRes.ok) {
           const checkData = await checkRes.json();
           if (checkData.status && checkData.data !== 'UPLOAD_REQUIRED') {
              updateFileState(fileObj.id, { status: 'success', message: `Deduplicated: ${checkData.data}`, progress: 100 });
              addLog('SUCCESS', `Pre-flight check: ${fileObj.file.name} deduplicated (${checkData.data}).`);
              resolve();
              return;
           }
         }
      } catch (err) {
        console.error("Pre-flight check failed:", err);
        addLog('WARNING', `Pre-flight check failed for ${fileObj.file.name} (Error: ${err.message}). Fallback to full upload.`);
      }

      updateFileState(fileObj.id, { message: 'Uploading...', progress: 0 });
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('mediaFile', fileObj.file);
      formData.append('userName', userName.trim());
      formData.append('fileHash', fileHash);
      if (fileObj.file.lastModified) {
        formData.append('fileLastModified', fileObj.file.lastModified);
      }
      if (currentFolderId) {
        formData.append('folderId', currentFolderId);
      }

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          updateFileState(fileObj.id, { progress: percentComplete });
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const res = JSON.parse(xhr.responseText);
            if (res.status === true || res.message) {
              updateFileState(fileObj.id, { status: 'success', message: res.message || 'Success', progress: 100 });
              addLog('SUCCESS', `Uploaded: ${fileObj.file.name}`);
            } else {
              updateFileState(fileObj.id, { status: 'error', message: res.message || 'Upload failed' });
              addLog('ERROR', `Failed: ${fileObj.file.name} - ${res.message}`);
            }
          } catch(e) {
             updateFileState(fileObj.id, { status: 'success', message: 'Uploaded', progress: 100 });
             addLog('SUCCESS', `Uploaded: ${fileObj.file.name}`);
          }
        } else {
          updateFileState(fileObj.id, { status: 'error', message: `HTTP ${xhr.status}` });
          addLog('ERROR', `HTTP ${xhr.status} for ${fileObj.file.name}`);
        }
        resolve();
      });

      xhr.addEventListener('error', () => {
        updateFileState(fileObj.id, { status: 'error', message: 'Network Error' });
        addLog('ERROR', `Network Error for ${fileObj.file.name}`);
        resolve();
      });

      xhr.open('POST', API_URL);
      xhr.send(formData);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const pendingFiles = files.filter(f => f.status === 'pending' || f.status === 'error');
    if (pendingFiles.length === 0) {
      alert('No pending files to upload.');
      return;
    }

    setIsUploading(true);

    // Process sequentially
    for (const fileObj of pendingFiles) {
      await uploadFile(fileObj);
    }

    setIsUploading(false);
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="destination-badge glass" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.75rem 1rem',
        borderRadius: '12px',
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid var(--border-color)',
        marginBottom: '1.5rem',
        fontSize: '0.9rem'
      }}>
        <span>📁 Destination Directory:</span>
        <strong style={{ color: 'var(--accent-end)' }}>/{currentFolderName}</strong>
      </div>

      <div
        className={`upload-zone ${isDragOver ? 'dragover' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current.click()}
        style={{ cursor: isUploading ? 'not-allowed' : 'pointer' }}
      >
        <input
          type="file"
          id="mediaFile"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          hidden
          disabled={isUploading}
        />
        <div className="upload-zone-content">
          <div className="upload-icon-container">
            <span className="upload-icon">☁️</span>
          </div>
          <h3>Drag & Drop your files here</h3>
          <p>or <span className="browse-btn">browse files</span></p>
          <span className="file-limits">Select multiple files for batch upload</span>
        </div>
      </div>

      {files.length > 0 && (
        <div className="files-queue">
          <div className="queue-header">
            <h4>Upload Queue ({files.length})</h4>
            <button 
              type="button" 
              className="clear-all-btn"
              onClick={clearAll}
              disabled={isUploading}
            >
              Clear All
            </button>
          </div>
          <div className="queue-list">
            {files.map(f => (
              <div key={f.id} className={`queue-item status-${f.status}`}>
                <div className="queue-item-info">
                  <span className="file-emoji">{getFileEmoji(f.file.name)}</span>
                  <div className="file-meta">
                    <span className="file-name" title={f.file.name}>{f.file.name}</span>
                    <span className="file-size">{formatBytes(f.file.size)}</span>
                  </div>
                </div>
                
                <div className="queue-item-progress">
                  {(f.status === 'uploading' || f.status === 'success') && (
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${f.progress}%` }}></div>
                    </div>
                  )}
                  {f.status === 'success' && <span className="status-badge success">✓ {f.message}</span>}
                  {f.status === 'error' && <span className="status-badge error">✕ {f.message}</span>}
                  {f.status === 'pending' && <span className="status-badge pending">Pending</span>}
                </div>

                <button
                  type="button"
                  className="remove-queue-item-btn"
                  onClick={(e) => { e.stopPropagation(); removeFile(f.id); }}
                  disabled={isUploading}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <button type="submit" className="submit-btn" disabled={isUploading || files.length === 0}>
        <span className="btn-text">{isUploading ? 'Uploading...' : 'Upload All Files'}</span>
        {isUploading && <div className="btn-spinner"></div>}
      </button>
    </form>
  );
}
