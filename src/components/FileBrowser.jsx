import React, { useState, useEffect } from 'react';
import { getApiBaseUrl } from '../config';
import { Folder, FolderPlus, MoreHorizontal, Search, File, Image as ImageIcon, FileText, Code, X, Download, Trash2, Edit2, FolderInput } from 'lucide-react';

export default function FileBrowser({
  userName,
  currentFolderId,
  setCurrentFolderId,
  breadcrumbs,
  setBreadcrumbs,
  onFilesUpdate,
  addLog
}) {
  const [subfolders, setSubfolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterActive, setFilterActive] = useState('Files'); // 'Folders' | 'Files' | 'Images'
  
  // New Folder Modal State
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // Move Modal State
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveTarget, setMoveTarget] = useState(null); // { id, name, type }
  const [allUserFolders, setAllUserFolders] = useState([]);
  const [selectedMoveFolderId, setSelectedMoveFolderId] = useState('root');
  const [isMoving, setIsMoving] = useState(false);
  
  // Immersive Viewer State
  const [fullscreenImage, setFullscreenImage] = useState(null);

  const fetchDirectory = async () => {
    if (!userName) return;
    setIsLoading(true);
    let url = `${getApiBaseUrl()}/files/browse?userName=${encodeURIComponent(userName.trim())}&page=0&size=100`;
    if (currentFolderId) {
      url += `&folderId=${currentFolderId}`;
    }

    try {
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.status) {
        setSubfolders(data.data.subfolders || []);
        setFiles(data.data.files || []);
        setBreadcrumbs(data.data.breadcrumbs || []);
        if (onFilesUpdate) onFilesUpdate(data.data.files || []);
      }
    } catch (err) {}
    setIsLoading(false);
  };

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
        setShowNewFolderModal(false);
        setNewFolderName('');
        fetchDirectory();
      } else {
        alert(data.message || 'Failed to create folder');
      }
    } catch (err) {
      alert('Network error while creating folder');
    }
    setIsCreatingFolder(false);
  };

  const handleDeleteFile = async (fileId, fileName, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${fileName}"?`)) return;
    try {
      const res = await fetch(`${getApiBaseUrl()}/files/${fileId}?userName=${encodeURIComponent(userName.trim())}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok && data.status) {
        if (addLog) addLog('SUCCESS', `Deleted file "${fileName}"`);
        if (fullscreenImage && fullscreenImage.id === fileId) {
          setFullscreenImage(null);
        }
        fetchDirectory();
      } else {
        alert(data.message || 'Failed to delete file');
      }
    } catch (err) {
      alert('Network error while deleting file');
    }
  };

  const handleDeleteFolder = async (folderId, folderName, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`WARNING: Deleting folder "${folderName}" will delete ALL its subfolders and files! Are you sure?`)) return;
    try {
      const res = await fetch(`${getApiBaseUrl()}/folders/${folderId}?userName=${encodeURIComponent(userName.trim())}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok && data.status) {
        if (addLog) addLog('SUCCESS', `Deleted folder "${folderName}"`);
        fetchDirectory();
      } else {
        alert(data.message || 'Failed to delete folder');
      }
    } catch (err) {
      alert('Network error while deleting folder');
    }
  };

  const handleRenameFolder = async (folderId, currentName, e) => {
    if (e) e.stopPropagation();
    const newName = window.prompt(`Rename folder "${currentName}" to:`, currentName);
    if (!newName || !newName.trim() || newName.trim() === currentName) return;
    try {
      const res = await fetch(`${getApiBaseUrl()}/folders/${folderId}/rename?userName=${encodeURIComponent(userName.trim())}&name=${encodeURIComponent(newName.trim())}`, {
        method: 'PATCH'
      });
      const data = await res.json();
      if (res.ok && data.status) {
        if (addLog) addLog('SUCCESS', `Renamed folder to "${newName.trim()}"`);
        fetchDirectory();
      } else {
        alert(data.message || 'Failed to rename folder');
      }
    } catch (err) {
      alert('Network error while renaming folder');
    }
  };

  const handleOpenMoveModal = async (item, type, e) => {
    if (e) e.stopPropagation();
    setMoveTarget({ id: item.id, name: item.originalName || item.name, type });
    setSelectedMoveFolderId('root');
    try {
      const res = await fetch(`${getApiBaseUrl()}/folders/all?userName=${encodeURIComponent(userName.trim())}`);
      const data = await res.json();
      if (res.ok && data.status) {
        let folderList = data.data || [];
        if (type === 'folder') {
          folderList = folderList.filter(f => f.id !== item.id);
        }
        setAllUserFolders(folderList);
        setShowMoveModal(true);
      }
    } catch (err) {
      alert('Failed to load folders list for move destination');
    }
  };

  const handleExecuteMove = async () => {
    if (!moveTarget) return;
    setIsMoving(true);
    const isFolder = moveTarget.type === 'folder';
    const targetFolderId = selectedMoveFolderId === 'root' ? null : selectedMoveFolderId;
    
    let url = isFolder 
      ? `${getApiBaseUrl()}/folders/${moveTarget.id}/move?userName=${encodeURIComponent(userName.trim())}`
      : `${getApiBaseUrl()}/files/${moveTarget.id}/move?userName=${encodeURIComponent(userName.trim())}`;

    if (targetFolderId) {
      url += isFolder ? `&parentId=${targetFolderId}` : `&folderId=${targetFolderId}`;
    }

    try {
      const res = await fetch(url, { method: 'PATCH' });
      const data = await res.json();
      if (res.ok && data.status) {
        if (addLog) addLog('SUCCESS', `Moved ${moveTarget.type} "${moveTarget.name}"`);
        setShowMoveModal(false);
        setMoveTarget(null);
        fetchDirectory();
      } else {
        alert(data.message || 'Failed to move item');
      }
    } catch (err) {
      alert('Network error while moving item');
    }
    setIsMoving(false);
  };

  useEffect(() => {
    fetchDirectory();
  }, [currentFolderId, userName]);

  const handleFileClick = (file) => {
    if (isImage(file)) {
      setFullscreenImage(file);
    } else if (file.fileType === 'pdf') {
      window.open(`${getApiBaseUrl()}/files/${file.id}/view?userName=${encodeURIComponent(userName)}`, '_blank');
    } else {
      window.open(`${getApiBaseUrl()}/files/${file.id}/download?userName=${encodeURIComponent(userName)}`, '_blank');
    }
  };

  const getIconForFile = (filename) => {
    const ext = filename?.split('.').pop()?.toLowerCase() || '';
    if (['pdf', 'doc', 'docx', 'txt'].includes(ext)) return <FileText className="w-6 h-6 text-zinc-400" strokeWidth={1.5} />;
    if (['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'py'].includes(ext)) return <Code className="w-6 h-6 text-zinc-400" strokeWidth={1.5} />;
    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return <ImageIcon className="w-6 h-6 text-zinc-400" strokeWidth={1.5} />;
    return <File className="w-6 h-6 text-zinc-400" strokeWidth={1.5} />;
  };

  const isImage = (f) => ['image', 'jpg', 'jpeg', 'png', 'gif', 'webp'].includes(f.fileType || f.originalName?.split('.').pop()?.toLowerCase());

  // Group files by date (mock logic for demo UI purposes based on file created date)
  const groupedFiles = files.reduce((acc, file) => {
    // simplified group mapping
    const groupName = "Today, July 20"; 
    if(!acc[groupName]) acc[groupName] = [];
    acc[groupName].push(file);
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header - Clean Breadcrumbs */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm overflow-x-auto py-1 max-w-[65%]">
           <button 
             onClick={() => setCurrentFolderId(null)}
             className={`transition-colors ${currentFolderId === null ? 'text-white font-semibold' : 'text-zinc-500 hover:text-zinc-300'}`}
           >
             Home
           </button>
           {breadcrumbs.map((bc, idx) => (
             <React.Fragment key={bc.id}>
               <span className="text-zinc-600">/</span>
               <button 
                 onClick={() => setCurrentFolderId(bc.id)}
                 className={`transition-colors ${idx === breadcrumbs.length - 1 ? 'text-white font-semibold' : 'text-zinc-500 hover:text-zinc-300'}`}
               >
                 {bc.name}
               </button>
             </React.Fragment>
           ))}
        </div>
        <div className="flex items-center gap-2 shrink-0">
           <button 
             onClick={() => setShowNewFolderModal(true)}
             className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-semibold hover:bg-indigo-500/30 active:scale-95 transition-all cursor-pointer"
           >
             <FolderPlus className="w-4 h-4 text-indigo-400" />
             <span>New Folder</span>
           </button>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex gap-4 border-b border-white/5 pb-2 text-sm font-medium">
         <button onClick={() => setFilterActive('Folders')} className={`${filterActive === 'Folders' ? 'text-indigo-400 border-b border-indigo-400' : 'text-zinc-500 hover:text-zinc-300'} pb-2 transition-all`}>
            Folders ({subfolders.length})
         </button>
         <button onClick={() => setFilterActive('Files')} className={`${filterActive === 'Files' ? 'text-indigo-400 border-b border-indigo-400' : 'text-zinc-500 hover:text-zinc-300'} pb-2 transition-all`}>
            Files ({files.length})
         </button>
         <button onClick={() => setFilterActive('Images')} className={`${filterActive === 'Images' ? 'text-indigo-400 border-b border-indigo-400' : 'text-zinc-500 hover:text-zinc-300'} pb-2 transition-all`}>
            Images
         </button>
      </div>

      {isLoading && (
         <div className="py-20 text-center text-zinc-500 text-sm animate-pulse">Loading vault data...</div>
      )}

      {/* FOLDERS SECTION */}
      {!isLoading && (filterActive === 'Folders' || filterActive === 'Files') && subfolders.length > 0 && (
        <div className="space-y-3">
          <span className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">Folders</span>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {subfolders.map(folder => (
              <div 
                key={folder.id} 
                onClick={() => setCurrentFolderId(folder.id)}
                className="glass-panel rounded-2xl p-3.5 flex items-center justify-between cursor-pointer hover:bg-white/10 transition-all group relative border border-white/5 hover:border-indigo-500/30"
              >
                 <div className="flex items-center gap-3 min-w-0">
                   <Folder className="w-5 h-5 text-indigo-400 shrink-0" strokeWidth={1.5} />
                   <div className="min-w-0">
                     <div className="text-sm font-semibold text-white truncate max-w-[100px]">{folder.name}</div>
                     <div className="text-[10px] text-zinc-400">Folder</div>
                   </div>
                 </div>

                 {/* Folder Actions (Move, Rename, Delete) */}
                 <div className="flex items-center gap-1 opacity-90 md:opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 backdrop-blur-md border border-white/10 rounded-xl p-1 shrink-0" onClick={e => e.stopPropagation()}>
                   <button 
                     type="button"
                     onClick={(e) => handleOpenMoveModal(folder, 'folder', e)}
                     title="Move Folder" 
                     className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                   >
                     <FolderInput className="w-3.5 h-3.5" />
                   </button>
                   <button 
                     type="button"
                     onClick={(e) => handleRenameFolder(folder.id, folder.name, e)}
                     title="Rename Folder" 
                     className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                   >
                     <Edit2 className="w-3.5 h-3.5" />
                   </button>
                   <button 
                     type="button"
                     onClick={(e) => handleDeleteFolder(folder.id, folder.name, e)}
                     title="Delete Folder" 
                     className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors cursor-pointer"
                   >
                     <Trash2 className="w-3.5 h-3.5" />
                   </button>
                 </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FILES SECTION (Google Photos style Grid with Move & Delete) */}
      {!isLoading && (filterActive === 'Files' || filterActive === 'Images') && files.length > 0 && (
        <div className="space-y-6 pt-2 pb-6">
           {Object.entries(groupedFiles).map(([groupDate, groupItems]) => (
             <div key={groupDate} className="space-y-2">
               <span className="text-[13px] font-semibold text-white pl-1">{groupDate}</span>
               
               {/* Edge-to-Edge Grid Container */}
               <div className="edge-to-edge">
                 <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-[1px] md:gap-0.5">
                   {groupItems.map(file => {
                     const isImg = isImage(file);
                     return (
                       <div 
                         key={file.id} 
                         className="aspect-square glass-panel overflow-hidden relative cursor-pointer group rounded-lg border border-white/5 hover:border-indigo-500/30 transition-all"
                       >
                          <div onClick={() => handleFileClick(file)} className="w-full h-full">
                            {isImg ? (
                              <img 
                                src={`${getApiBaseUrl()}/files/${file.id}/thumbnail?userName=${encodeURIComponent(userName)}`} 
                                alt={file.originalName}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center p-2 bg-white/5">
                                 {getIconForFile(file.originalName)}
                                 <span className="text-[9px] font-medium text-zinc-300 mt-2 truncate w-full text-center px-1">
                                   {file.originalName}
                                 </span>
                              </div>
                            )}
                          </div>

                          {/* File Actions Overlay (Move & Delete) */}
                          <div 
                            className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-90 md:opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 backdrop-blur-md border border-white/10 rounded-xl p-1 z-10"
                            onClick={e => e.stopPropagation()}
                          >
                            <button 
                              type="button"
                              onClick={(e) => handleOpenMoveModal(file, 'file', e)}
                              title="Move File"
                              className="p-1.5 text-zinc-300 hover:text-white hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
                            >
                              <FolderInput className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              type="button"
                              onClick={(e) => handleDeleteFile(file.id, file.originalName, e)}
                              title="Delete File"
                              className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                       </div>
                     )
                   })}
                 </div>
               </div>
             </div>
           ))}
        </div>
      )}

      {/* IMMERSIVE FULL SCREEN VIEWER */}
      {fullscreenImage && (
        <div className="fixed inset-0 z-[9999] bg-black animate-fadeInNative flex flex-col justify-center">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/60 to-transparent flex justify-between items-center px-4 safe-pt z-10">
            <button 
              type="button"
              onClick={() => setFullscreenImage(null)}
              className="p-2 -ml-2 text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={(e) => handleOpenMoveModal(fullscreenImage, 'file', e)}
                title="Move File"
                className="p-2 text-zinc-300 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              >
                <FolderInput className="w-5 h-5" />
              </button>
              <button 
                type="button"
                onClick={(e) => handleDeleteFile(fullscreenImage.id, fullscreenImage.originalName, e)}
                title="Delete File"
                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-full transition-colors cursor-pointer"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <a 
                href={`${getApiBaseUrl()}/files/${fullscreenImage.id}/download?userName=${encodeURIComponent(userName)}`}
                target="_blank"
                rel="noreferrer"
                title="Download Original"
                className="p-2 text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              >
                <Download className="w-5 h-5" />
              </a>
            </div>
          </div>
          
          {/* Main Image */}
          <div className="flex-1 w-full flex items-center justify-center overflow-hidden">
            <img 
              src={`${getApiBaseUrl()}/files/${fullscreenImage.id}/view?userName=${encodeURIComponent(userName)}`}
              alt={fullscreenImage.originalName}
              className="max-w-full max-h-full object-contain animate-scalePop"
            />
          </div>
          
          {/* Footer Info */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent text-center safe-pb pointer-events-none">
             <h3 className="text-white text-sm font-medium truncate">{fullscreenImage.originalName}</h3>
             <p className="text-zinc-400 text-xs mt-1">
                {(fullscreenImage.sizeBytes / 1024 / 1024).toFixed(1)} MB
             </p>
          </div>
        </div>
      )}

      {!isLoading && subfolders.length === 0 && files.length === 0 && (
         <div className="py-16 text-center space-y-3 glass-panel rounded-2xl p-6 border border-white/5">
            <FolderPlus className="w-10 h-10 text-indigo-400 mx-auto stroke-[1.5]" />
            <p className="text-zinc-300 text-sm font-medium">This node is empty.</p>
            <button 
              type="button"
              onClick={() => setShowNewFolderModal(true)}
              className="px-4 py-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-semibold hover:bg-indigo-500/30 transition-all inline-flex items-center gap-1.5 cursor-pointer"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Create Subfolder</span>
            </button>
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
                <p className="text-xs text-zinc-400">Inside {breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1].name : 'Home'}</p>
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
                {isCreatingFolder ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOVE ITEM MODAL */}
      {showMoveModal && moveTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[9999] backdrop-blur-md animate-fadeInNative">
          <div className="w-full max-w-sm glass-panel rounded-[20px] overflow-hidden animate-scalePop border border-white/10 p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/20 rounded-xl text-indigo-400 border border-indigo-500/30">
                <FolderInput className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Move {moveTarget.type === 'folder' ? 'Folder' : 'File'}</h3>
                <p className="text-xs text-zinc-400 truncate max-w-[220px]">Target: {moveTarget.name}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-300">Select Destination Folder:</label>
              <select
                value={selectedMoveFolderId}
                onChange={(e) => setSelectedMoveFolderId(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-zinc-900 border border-white/10 text-white text-sm focus:border-indigo-500 focus:outline-none transition-colors"
              >
                <option value="root">🏠 Home (Root)</option>
                {allUserFolders.map(f => (
                  <option key={f.id} value={f.id}>📁 /{f.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setShowMoveModal(false); setMoveTarget(null); }}
                className="px-4 h-9 rounded-xl text-xs font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteMove}
                disabled={isMoving}
                className="px-4 h-9 rounded-xl bg-indigo-500 text-white text-xs font-semibold hover:bg-indigo-600 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {isMoving ? 'Moving...' : 'Move Now'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
