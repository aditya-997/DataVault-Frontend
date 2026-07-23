import React, { useState, useRef, useEffect } from 'react';
import { sha256 } from 'js-sha256';
import { getApiBaseUrl } from '../config';
import { Upload, FolderPlus, CheckCircle2 } from 'lucide-react';

export default function UploadForm({ addLog, userName, currentFolderId, setCurrentFolderId, currentFolderName, setCurrentFolderName }) {
  const [files, setFiles] = useState([]); 
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // New Folder Modal State
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // Staging Assets Progress State
  const [isStaging, setIsStaging] = useState(false);
  const [stagingStats, setStagingStats] = useState({ current: 0, total: 0, percent: 0 });
  const [visibleQueueLimit, setVisibleQueueLimit] = useState(30);

  const handleCreateFolder = async () => {
    if (!newFolderName || !newFolderName.trim()) return;
    setIsCreatingFolder(true);
    let url = `${getApiBaseUrl()}/folders?userName=${encodeURIComponent(userName.trim())}&name=${encodeURIComponent(newFolderName.trim())}`;
    if (currentFolderId) {
      url += `&parentId=${currentFolderId}`;
    }

    try {
      const res = await fetch(url, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.status) {
        if (addLog) addLog('SUCCESS', `Created folder "${newFolderName.trim()}"`);
        if (data.data && data.data.id) {
          setCurrentFolderId(data.data.id);
          setCurrentFolderName(data.data.name);
        }
        setShowNewFolderModal(false);
        setNewFolderName('');
      } else {
        alert(data.message || 'Failed to create folder');
      }
    } catch (err) {
      alert('Network error while creating folder');
    }
    setIsCreatingFolder(false);
  };

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
    const totalCount = fileList.length;
    if (totalCount === 0) return;

    // Immediately show staging progress bar card
    setIsStaging(true);
    setStagingStats({ current: 0, total: totalCount, percent: 0 });
    if (addLog) addLog('INFO', `Staging ${totalCount} selected file(s) into upload queue...`);

    const rawArray = Array.from(fileList);
    const chunkSize = 25; // Process 25 files per micro-batch tick
    let currentIndex = 0;

    const processNextChunk = () => {
      const nextChunk = rawArray.slice(currentIndex, currentIndex + chunkSize);
      const mappedChunk = nextChunk.map((f, idx) => ({
        id: `${Date.now()}-${currentIndex + idx}-${Math.random().toString(36).substr(2, 6)}`,
        file: f,
        progress: 0,
        status: 'pending', 
        message: 'Queued',
        hashDone: false,
        dedupDone: false,
        uploadDone: false
      }));

      setFiles(prev => [...prev, ...mappedChunk]);
      currentIndex += nextChunk.length;

      const percent = Math.round((currentIndex / totalCount) * 100);
      setStagingStats({ current: currentIndex, total: totalCount, percent });

      if (currentIndex < totalCount) {
        setTimeout(processNextChunk, 15);
      } else {
        setTimeout(() => {
          setIsStaging(false);
          if (addLog) addLog('SUCCESS', `Staged ${totalCount} file(s) in queue.`);
        }, 200);
      }
    };

    setTimeout(processNextChunk, 10);
  };

  const updateFileState = (id, updates) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const computeFileHash = async (file, id) => {
    updateFileState(id, { status: 'hashing', message: 'Hashing' });
    const buffer = await file.arrayBuffer();
    if (window.crypto && window.crypto.subtle) {
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      updateFileState(id, { hashDone: true });
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } else {
      updateFileState(id, { hashDone: true });
      return sha256(buffer);
    }
  };

  const uploadFile = (fileObj) => {
    return new Promise(async (resolve) => {
      let fileHash = '';
      try {
        fileHash = await computeFileHash(fileObj.file, fileObj.id);
        
        updateFileState(fileObj.id, { status: 'check-dedup', message: 'Checking dedup' });
        const preCheckForm = new FormData();
        preCheckForm.append('fileHash', fileHash);
        preCheckForm.append('userName', userName.trim());
        preCheckForm.append('originalName', fileObj.file.name);
        
        if (currentFolderId) {
          preCheckForm.append('folderId', currentFolderId);
        }

        const checkRes = await fetch(`${getApiBaseUrl()}/upload/pre-check`, {
          method: 'POST',
          body: preCheckForm
        });

        if (checkRes.ok) {
          const checkData = await checkRes.json();
          if (checkData.status && checkData.data !== 'UPLOAD_REQUIRED') {
            updateFileState(fileObj.id, { 
              status: 'success', 
              message: 'Instant Dedup', 
              progress: 100, 
              dedupDone: true,
              uploadDone: true,
              isDedup: true 
            });
            resolve();
            return;
          }
        }
      } catch (err) {}

      updateFileState(fileObj.id, { status: 'uploading', message: 'Uploading', progress: 0, dedupDone: true });
      
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('mediaFile', fileObj.file);
      formData.append('userName', userName.trim());
      formData.append('fileHash', fileHash);
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
        updateFileState(fileObj.id, { status: 'success', message: 'Completed', progress: 100, uploadDone: true });
        resolve();
      });

      xhr.addEventListener('error', () => {
        updateFileState(fileObj.id, { status: 'error', message: 'Error' });
        resolve();
      });

      xhr.open('POST', `${getApiBaseUrl()}/upload/media`);
      xhr.send(formData);
    });
  };

  const handleSubmit = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending' || f.status === 'error');
    if (pendingFiles.length === 0) return;

    setIsUploading(true);
    for (const fileObj of pendingFiles) {
      await uploadFile(fileObj);
    }
    setIsUploading(false);
  };

  const totalSize = files.reduce((acc, f) => acc + f.file.size, 0);
  const dedupSaved = files.filter(f => f.isDedup).reduce((acc, f) => acc + f.file.size, 0);

  // Overall Upload Progress Statistics
  const completedCount = files.filter(f => f.status === 'success').length;
  const errorCount = files.filter(f => f.status === 'error').length;
  const activeFile = files.find(f => f.status === 'hashing' || f.status === 'check-dedup' || f.status === 'uploading');
  const activeProgressPartial = (activeFile && activeFile.status === 'uploading') ? (activeFile.progress / 100) : 0;
  const overallPercent = files.length > 0 
    ? Math.min(100, Math.round(((completedCount + activeProgressPartial) / files.length) * 100)) 
    : 0;
  const isAllCompleted = files.length > 0 && (completedCount + errorCount === files.length) && !isUploading && !isStaging;

  return (
    <div className="w-full space-y-6 animate-fadeIn max-w-2xl mx-auto">
      
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-white">Upload</h2>
          <p className="text-sm text-zinc-400 flex items-center gap-1.5 mt-0.5">
            <span>Destination:</span>
            <span className="text-indigo-400 font-semibold px-2 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
              /{currentFolderName || 'Home'}
            </span>
          </p>
        </div>
        <button 
          type="button"
          onClick={() => setShowNewFolderModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-semibold hover:bg-indigo-500/30 active:scale-95 transition-all shrink-0 cursor-pointer"
        >
          <FolderPlus className="w-4 h-4 text-indigo-400" />
          <span>New Folder</span>
        </button>
      </div>

      {/* TOP STICKY OVERALL UPLOAD PROGRESS CARD */}
      {isUploading && (
        <div className="sticky top-[12px] z-30 p-4 glass-panel rounded-2xl border border-indigo-500/40 bg-slate-950/95 shadow-2xl backdrop-blur-xl space-y-3 animate-slideDownNative">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 bg-indigo-500/25 rounded-xl text-indigo-400 border border-indigo-500/40 animate-pulse shrink-0">
                <Upload className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white tracking-tight">Syncing Files to Vault...</h4>
                  <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/20 px-2 py-0.5 rounded-md border border-indigo-500/30 shrink-0">
                    {completedCount} / {files.length} Done
                  </span>
                </div>
                {activeFile ? (
                  <p className="text-xs text-zinc-300 mt-0.5 truncate">
                    <span className="text-cyan-400 font-semibold">[{activeFile.message || activeFile.status}]</span> {activeFile.file.name}
                  </p>
                ) : (
                  <p className="text-xs text-zinc-400 mt-0.5">Processing pipeline batch...</p>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-lg font-black text-cyan-400 font-mono">{overallPercent}%</span>
              <p className="text-[10px] font-semibold text-zinc-400">{files.length - completedCount - errorCount} Remaining</p>
            </div>
          </div>

          {/* Overall Progress Bar */}
          <div className="h-2.5 w-full bg-black/80 rounded-full overflow-hidden border border-white/10 p-0.5">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 rounded-full transition-all duration-200"
              style={{ width: `${overallPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* ALL COMPLETED SUCCESS BANNER */}
      {isAllCompleted && (
        <div className="p-4 glass-panel rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-transparent space-y-3 animate-scalePop shadow-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 rounded-xl text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Upload Complete!</h4>
                <p className="text-xs text-zinc-300">
                  Successfully synced <span className="text-emerald-400 font-bold">{completedCount}</span> files to vault 
                  {dedupSaved > 0 && <span className="text-emerald-400 font-semibold"> (Saved {formatBytes(dedupSaved)} via dedup)</span>}.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFiles([])}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold hover:bg-emerald-500/30 transition-all cursor-pointer shrink-0"
            >
              Clear Queue
            </button>
          </div>
        </div>
      )}

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && !isStaging && fileInputRef.current.click()}
        className={`w-full h-[200px] flex flex-col items-center justify-center rounded-2xl cursor-pointer transition-all ${
          isDragOver ? 'border-2 border-indigo-400 bg-indigo-500/10' : 'glass-panel border-dashed border-white/20'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileChange}
          className="hidden"
          disabled={isUploading || isStaging}
        />
        <Upload className="w-7 h-7 text-indigo-400 mb-3" strokeWidth={1.5} />
        <span className="text-base font-medium text-zinc-200">Drop files here</span>
        <span className="text-sm text-zinc-500 mt-1">or tap to browse</span>
      </div>

      {/* STAGING ASSETS PROGRESS BAR CARD */}
      {isStaging && (
        <div className="p-5 glass-panel rounded-2xl border border-indigo-500/40 bg-gradient-to-r from-indigo-500/15 via-cyan-500/10 to-transparent space-y-3.5 animate-scalePop shadow-lg shadow-indigo-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/20 rounded-xl text-indigo-400 border border-indigo-500/30 animate-pulse">
                <Upload className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white tracking-tight">Staging Selected Assets...</h4>
                <p className="text-xs text-zinc-300 mt-0.5">
                  Preparing <span className="font-bold text-indigo-400">{stagingStats.current}</span> of <span className="font-bold text-indigo-400">{stagingStats.total}</span> files
                </p>
              </div>
            </div>
            <span className="text-sm font-extrabold text-cyan-400 font-mono bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/20">{stagingStats.percent}%</span>
          </div>

          {/* Progress Bar */}
          <div className="h-2.5 w-full bg-black/60 rounded-full overflow-hidden border border-white/10 p-0.5">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 rounded-full transition-all duration-150"
              style={{ width: `${stagingStats.percent}%` }}
            />
          </div>
        </div>
      )}

      {/* Queue */}
      {files.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-end border-b border-white/5 pb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Queue · {files.length} files ({formatBytes(totalSize)})
            </span>
            {files.some(f => f.status === 'pending') && !isUploading && !isStaging && (
              <button 
                type="button"
                onClick={handleSubmit}
                className="text-indigo-400 text-sm font-bold hover:text-indigo-300 transition-colors flex items-center gap-1.5 px-3 py-1 bg-indigo-500/15 rounded-xl border border-indigo-500/30 cursor-pointer"
              >
                Start Upload
              </button>
            )}
          </div>
          
          <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
            {files.slice(0, visibleQueueLimit).map(f => (
              <div key={f.id} className="glass-panel rounded-xl p-4 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-white truncate max-w-[70%]">{f.file.name}</span>
                  <span className="text-sm text-zinc-400">{formatBytes(f.file.size)}</span>
                </div>
                
                {/* Minimal Pipeline */}
                <div className="flex items-center gap-2 w-full text-[10px] uppercase font-bold tracking-wider">
                  <div className="flex items-center gap-1.5 flex-1">
                    <span className="text-zinc-500">[Hash]</span>
                    <div className={`w-1.5 h-1.5 rounded-full ${f.hashDone ? 'bg-emerald-400' : (f.status === 'hashing' ? 'bg-indigo-400 animate-pulse' : 'bg-zinc-700')}`} />
                    <div className="h-px bg-zinc-800 flex-1 mx-1" />
                    
                    <span className="text-zinc-500">[Dedup]</span>
                    <div className={`w-1.5 h-1.5 rounded-full ${f.dedupDone ? 'bg-emerald-400' : (f.status === 'check-dedup' ? 'bg-indigo-400 animate-pulse' : 'bg-zinc-700')}`} />
                    <div className="h-px bg-zinc-800 flex-1 mx-1" />
                    
                    <span className="text-zinc-500">[Upload]</span>
                    <div className={`w-1.5 h-1.5 rounded-full ${f.uploadDone ? 'bg-emerald-400' : (f.status === 'uploading' ? 'bg-indigo-400 animate-pulse' : 'bg-zinc-700')}`} />
                  </div>
                  
                  {f.status === 'uploading' && (
                     <span className="text-indigo-400 min-w-[30px] text-right">{f.progress}%</span>
                  )}
                  {f.status === 'success' && !f.isDedup && (
                     <span className="text-emerald-400 min-w-[30px] text-right">100%</span>
                  )}
                </div>

                {/* Progress bar line */}
                {f.status !== 'pending' && !f.isDedup && (
                  <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${f.status === 'success' ? 'bg-emerald-400' : 'bg-indigo-400'}`} 
                      style={{ width: `${f.progress}%` }}
                    />
                  </div>
                )}
                
                {/* Dedup Badge */}
                {f.isDedup && (
                  <div className="flex justify-end">
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-medium px-2 py-0.5 rounded-full">
                      Dedup · Saved {formatBytes(f.file.size)}
                    </span>
                  </div>
                )}

              </div>
            ))}

            {files.length > visibleQueueLimit && (
              <div className="text-center pt-2 pb-1">
                <button 
                  type="button"
                  onClick={() => setVisibleQueueLimit(prev => prev + 50)}
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 px-4 py-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 transition-all cursor-pointer"
                >
                  Show More Files ({files.length - visibleQueueLimit} remaining)
                </button>
              </div>
            )}
          </div>

          <div className="text-center text-xs text-zinc-400 pt-2">
            {files.length} files · {formatBytes(totalSize)} · {formatBytes(dedupSaved)} saved
          </div>
        </div>
      )}

      {/* CREATE NEW FOLDER MODAL */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[9999] backdrop-blur-md animate-fadeInNative">
          <div className="w-full max-w-[320px] glass-panel rounded-[20px] overflow-hidden animate-scalePop border border-white/10 p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/20 rounded-xl text-indigo-400 border border-indigo-500/30">
                <FolderPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Create New Folder</h3>
                <p className="text-xs text-zinc-400">Inside /{currentFolderName || 'Home'}</p>
              </div>
            </div>

            <input 
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name..."
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder(); }}
              className="w-full h-11 px-3.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:border-indigo-500 focus:outline-none transition-colors"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setShowNewFolderModal(false); setNewFolderName(''); }}
                className="px-4 h-9 rounded-xl text-xs font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim() || isCreatingFolder}
                className="px-4 h-9 rounded-xl bg-indigo-500 text-white text-xs font-semibold hover:bg-indigo-600 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {isCreatingFolder ? 'Creating...' : 'Create & Select'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
