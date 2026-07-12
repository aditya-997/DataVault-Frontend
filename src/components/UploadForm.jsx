import React, { useState, useRef, useEffect } from 'react';
import { sha256 } from 'js-sha256';
import FileTypeIcon from './FileTypeIcon';
import { Upload, X, ShieldAlert, CheckCircle2, AlertCircle, RefreshCw, Trash2, Cpu, FolderOpen, Home, ChevronRight, Folder } from 'lucide-react';

const API_URL = `${window.location.origin}/upload/media`;

export default function UploadForm({ addLog, userName, currentFolderId, setCurrentFolderId, currentFolderName, setCurrentFolderName }) {
  const [files, setFiles] = useState([]); // { id, file, progress, status, message }
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [subfolders, setSubfolders] = useState([]);
  const [breadcrumbsList, setBreadcrumbsList] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!userName) return;
    let url = `${window.location.origin}/files/browse?userName=${encodeURIComponent(userName.trim())}`;
    if (currentFolderId) {
      url += `&folderId=${currentFolderId}`;
    }
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.status) {
          setSubfolders(data.data.subfolders || []);
          setBreadcrumbsList(data.data.breadcrumbs || []);
          setCurrentFolderName(data.data.currentFolderName || 'Home');
        }
      })
      .catch(err => console.error("Failed to browse in upload form:", err));
  }, [currentFolderId, userName]);

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
      status: 'pending', // pending, hashing, check-dedup, uploading, success, error
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
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const computeFileHash = async (file, id) => {
    updateFileState(id, { status: 'hashing', message: 'Computing hash...' });
    const buffer = await file.arrayBuffer();
    if (window.crypto && window.crypto.subtle) {
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } else {
      addLog('INFO', `Web Crypto API not available. Using fallback hash algorithm for: ${file.name}`);
      return sha256(buffer);
    }
  };

  const uploadFile = (fileObj) => {
    return new Promise(async (resolve) => {
      let fileHash = '';
      try {
        fileHash = await computeFileHash(fileObj.file, fileObj.id);
        
        updateFileState(fileObj.id, { status: 'check-dedup', message: 'Checking index...' });
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
            updateFileState(fileObj.id, { status: 'success', message: 'Instant Deduplication (Saved Storage)', progress: 100 });
            addLog('SUCCESS', `Deduplicated: ${fileObj.file.name} matches remote block (${checkData.data}).`);
            resolve();
            return;
          }
        }
      } catch (err) {
        console.error("Pre-flight check failed:", err);
        addLog('WARNING', `Pre-flight check skipped for ${fileObj.file.name} (${err.message}). Defaulting to standard upload.`);
      }

      updateFileState(fileObj.id, { status: 'uploading', message: 'Transmitting block...', progress: 0 });
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
              updateFileState(fileObj.id, { status: 'success', message: 'Uploaded successfully', progress: 100 });
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
          updateFileState(fileObj.id, { status: 'error', message: `Server error HTTP ${xhr.status}` });
          addLog('ERROR', `HTTP ${xhr.status} for ${fileObj.file.name}`);
        }
        resolve();
      });

      xhr.addEventListener('error', () => {
        updateFileState(fileObj.id, { status: 'error', message: 'Network connection interrupted' });
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
      return;
    }

    setIsUploading(true);
    for (const fileObj of pendingFiles) {
      await uploadFile(fileObj);
    }
    setIsUploading(false);
  };

  const statusColors = {
    pending: 'bg-white/5 text-slate-400 border-white/5',
    hashing: 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse',
    'check-dedup': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 animate-pulse',
    uploading: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    error: 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {/* Destination Folder Selector (Breadcrumbs & Subfolders card navigation) */}
      <div className="space-y-3.5 p-4 bg-white/2 border border-white/5 rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <FolderOpen className="w-4 h-4 text-indigo-400" />
            <span>Upload Destination:</span>
            <strong className="text-white">/{currentFolderName}</strong>
          </div>
          
          {/* Breadcrumbs Path */}
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-black border border-white/10 text-[10px] font-mono text-slate-300 max-w-full overflow-x-auto whitespace-nowrap">
            <button 
              type="button"
              className={`hover:text-indigo-400 flex items-center gap-1 transition-colors ${currentFolderId === null ? 'text-indigo-400 font-bold' : 'text-slate-400'}`}
              onClick={() => {
                setCurrentFolderId(null);
                setCurrentFolderName('Home');
              }}
              disabled={isUploading}
            >
              <Home className="w-3.5 h-3.5" />
              root
            </button>
            
            {breadcrumbsList.map((bc, index) => (
              <React.Fragment key={bc.id}>
                <ChevronRight className="w-2.5 h-2.5 text-slate-500 flex-shrink-0" />
                <button 
                  type="button"
                  className={`hover:text-indigo-400 transition-colors ${index === breadcrumbsList.length - 1 ? 'text-indigo-400 font-bold' : 'text-slate-400'}`}
                  onClick={() => {
                    setCurrentFolderId(bc.id);
                    setCurrentFolderName(bc.name);
                  }}
                  disabled={isUploading}
                >
                  {bc.name}
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Subfolders Quick navigator */}
        {subfolders.length > 0 ? (
          <div className="space-y-1.5">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block pl-1">
              Select Subfolder (Click to traverse)
            </span>
            <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto pr-1">
              {subfolders.map(folder => (
                <button
                  type="button"
                  key={folder.id}
                  onClick={() => {
                    setCurrentFolderId(folder.id);
                    setCurrentFolderName(folder.name);
                  }}
                  disabled={isUploading}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white/2 border border-white/5 rounded-xl text-[11px] font-bold text-white hover:border-indigo-500/30 transition-all hover:bg-white/4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Folder className="w-3.5 h-3.5 text-indigo-400" />
                  {folder.name}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-[10px] text-slate-500 italic pl-1">No subfolders inside this node</p>
        )}
      </div>

      {/* Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current.click()}
        className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 card-3d ${
          isDragOver
            ? 'border-indigo-500 bg-gradient-to-br from-indigo-500/10 to-cyan-500/5 scale-102 shadow-xl shadow-indigo-500/10'
            : 'border-white/10 bg-gradient-to-br from-white/3 to-white/1 hover:bg-gradient-to-br hover:from-white/5 hover:to-white/2 hover:border-white/20'
        }`}
        style={{ cursor: isUploading ? 'not-allowed' : 'pointer' }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileChange}
          className="hidden"
          disabled={isUploading}
          accept="*"
        />

        <div className="flex flex-col items-center gap-4 animate-fadeInUp">
          <div className={`p-4 rounded-2xl transition-all duration-300 ${
            isDragOver 
              ? 'bg-gradient-to-br from-indigo-500 to-cyan-500 text-white scale-110 shadow-lg shadow-indigo-500/30' 
              : 'bg-white/5 text-indigo-400 border border-white/5'
          }`}>
            <Upload className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <p className="font-bold text-base text-white">
              Drag & drop files here or click to browse
            </p>
            <p className="text-xs text-slate-400">
              Multiple files supported for parallel staging & batch upload
            </p>
          </div>
        </div>
      </div>

      {/* Upload Queue list */}
      {files.length > 0 && (
        <div className="space-y-3 p-5 glass rounded-2xl animate-fadeInUp">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Upload Queue ({files.length})
            </h4>
            <button
              type="button"
              className="text-xs font-semibold text-slate-400 hover:text-red-400 hover:bg-red-500/10 px-2.5 py-1 rounded-lg border border-transparent hover:border-red-500/10 transition-all duration-200 flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={clearAll}
              disabled={isUploading}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Queue
            </button>
          </div>
          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {files.map(f => (
              <div 
                key={f.id} 
                className={`p-3 bg-white/2 border rounded-xl flex items-center justify-between gap-3 hover:bg-white/4 transition-smooth border-white/5`}
              >
                <div className="p-2 bg-white/3 rounded-lg flex-shrink-0 text-slate-400">
                  <FileTypeIcon fileName={f.file.name} className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate" title={f.file.name}>{f.file.name}</p>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{formatBytes(f.file.size)}</p>
                </div>
                
                {/* Progress bar or State label */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`text-[10px] font-bold px-2 py-0.5 border rounded-full ${statusColors[f.status]}`}>
                    {f.status === 'hashing' && <Cpu className="w-2.5 h-2.5 inline mr-1 animate-spin" />}
                    {f.status === 'check-dedup' && <RefreshCw className="w-2.5 h-2.5 inline mr-1 animate-spin" />}
                    {f.message || f.status.toUpperCase()}
                  </span>
                  
                  {f.status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  {f.status === 'error' && <AlertCircle className="w-4 h-4 text-red-400" />}
                  
                  <button
                    type="button"
                    className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 p-1 rounded-lg border border-transparent hover:border-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => removeFile(f.id)}
                    disabled={isUploading}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Combined Progress bar for batch */}
          {isUploading && (
            <div className="space-y-1.5 pt-2 border-t border-white/5 animate-fadeInUp">
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500 transition-all duration-300"
                  style={{ width: `${Math.round(files.reduce((acc, curr) => acc + curr.progress, 0) / files.length)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Submit Button */}
      <button 
        type="submit" 
        className="w-full h-12 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-bold uppercase tracking-wider transition-all duration-300 shadow-lg hover:shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 cursor-pointer"
        disabled={isUploading || files.filter(f => f.status === 'pending' || f.status === 'error').length === 0}
      >
        <span>{isUploading ? 'Syncing Vault...' : 'Sync Files to Vault'}</span>
        {isUploading && <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
      </button>
    </form>
  );
}
