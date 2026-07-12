import React, { useState, useEffect, useRef } from 'react';
import FileTypeIcon from './FileTypeIcon';
import { 
  FolderPlus, 
  Folder, 
  Trash2, 
  Edit3, 
  MoveRight, 
  Grid, 
  List, 
  ChevronRight, 
  Home, 
  CornerDownRight, 
  Clock, 
  ShieldCheck,
  Search,
  ExternalLink
} from 'lucide-react';

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
  setBreadcrumbs,
  onFilesUpdate
}) {
  const [subfolders, setSubfolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [visibleFilesCount, setVisibleFilesCount] = useState(10);
  const scrollContainerRef = useRef(null);

  // Hybrid pagination tracking states
  const [loadedPage, setLoadedPage] = useState(0);
  const [hasMoreOnServer, setHasMoreOnServer] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 40) {
      if (visibleFilesCount < files.length) {
        setVisibleFilesCount(prev => {
          const nextVal = prev + 10;
          addLog('INFO', `Lazy loading next items (rendered: ${Math.min(nextVal, files.length)}/${files.length})`);
          
          // Trigger prefetch if remaining loaded items is 5 or less
          if (files.length - nextVal <= 5 && hasMoreOnServer && !isFetchingMore) {
            const nextPage = loadedPage + 1;
            addLog('INFO', `Prefetching next block of 50 files from backend (page: ${nextPage})`);
            fetchDirectory(nextPage, true);
          }
          return nextVal;
        });
      } else {
        // Fallback: fetched all current, but backend has more
        if (hasMoreOnServer && !isFetchingMore) {
          const nextPage = loadedPage + 1;
          addLog('INFO', `Fetching next block of 50 files from backend (page: ${nextPage})`);
          fetchDirectory(nextPage, true);
        }
      }
    }
  };
  
  // Move item modal state
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveTargetItem, setMoveTargetItem] = useState(null); // { id, name, type: 'file' | 'folder' }
  const [allFolders, setAllFolders] = useState([]);
  const [selectedDestId, setSelectedDestId] = useState('root');

  // Lightbox / Fullscreen preview file state
  const [previewFile, setPreviewFile] = useState(null);

  const handleFileClick = (file) => {
    if (file.fileType === 'image') {
      setPreviewFile(file);
      addLog('INFO', `Opening preview for: ${file.originalName}`);
    } else if (file.fileType === 'pdf') {
      addLog('INFO', `Opening PDF view for: ${file.originalName}`);
      window.open(`${window.location.origin}/files/${file.id}/view?userName=${encodeURIComponent(userName)}`, '_blank');
    } else {
      addLog('INFO', `Triggering download for: ${file.originalName}`);
      window.open(`${window.location.origin}/files/${file.id}/download?userName=${encodeURIComponent(userName)}`, '_blank');
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Recent';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Fetch directory content
  const fetchDirectory = async (page = 0, append = false) => {
    if (!userName) return;
    if (page === 0) {
      setIsLoading(true);
    } else {
      setIsFetchingMore(true);
    }
    
    let url = `${FILES_API}/browse?userName=${encodeURIComponent(userName.trim())}&page=${page}&size=50`;
    if (currentFolderId) {
      url += `&folderId=${currentFolderId}`;
    }

    try {
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.status) {
        const sub = data.data.subfolders || [];
        const fls = data.data.files || [];
        
        setSubfolders(sub);
        if (append) {
          setFiles(prev => [...prev, ...fls]);
        } else {
          setFiles(fls);
        }
        
        setHasMoreOnServer(fls.length === 50);
        setLoadedPage(page);
        setCurrentFolderName(data.data.currentFolderName || 'Home');
        setBreadcrumbs(data.data.breadcrumbs || []);
        
        // Notify parent application of files list so StatsCard can update
        if (onFilesUpdate) {
          // Fallback to fetch all files flatly for StatsCard
          fetchAllFilesFlat();
        }
      } else {
        addLog('ERROR', `Failed to load directory: ${data.message}`);
      }
    } catch (err) {
      addLog('ERROR', `Network error loading directory: ${err.message}`);
    } finally {
      setIsLoading(false);
      setIsFetchingMore(false);
    }
  };

  // Fetch flat file list for StatsCard aggregation
  const fetchAllFilesFlat = async () => {
    try {
      const res = await fetch(`${FILES_API}?userName=${encodeURIComponent(userName.trim())}`);
      const data = await res.json();
      if (res.ok && data.status && onFilesUpdate) {
        onFilesUpdate(data.data || []);
      }
    } catch (err) {
      console.error('Failed flat files fetch:', err);
    }
  };

  useEffect(() => {
    setVisibleFilesCount(10);
    setLoadedPage(0);
    setHasMoreOnServer(true);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
    fetchDirectory(0, false);
  }, [currentFolderId, userName]);

  // Handle folder creation
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

  // Rename folder
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

  // Delete folder
  const handleDeleteFolder = async (folderId, folderName, e) => {
    e.stopPropagation();
    if (!confirm(`WARNING: Deleting folder "${folderName}" will delete ALL its subfolders and files recursively!\nAre you sure you want to proceed?`)) return;

    addLog('INFO', `Deleting folder "${folderName}"...`);
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

  // Delete file
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

  // Open move modal
  const openMoveModal = async (itemId, itemName, type, e) => {
    e.stopPropagation();
    setMoveTargetItem({ id: itemId, name: itemName, type });
    setSelectedDestId('root');
    
    try {
      const res = await fetch(`${FOLDERS_API}/all?userName=${encodeURIComponent(userName)}`);
      const data = await res.json();
      if (res.ok && data.status) {
        let available = data.data || [];
        if (type === 'folder') {
          available = available.filter(f => f.id !== itemId);
        }
        setAllFolders(available);
        setShowMoveModal(true);
      } else {
        addLog('ERROR', `Could not fetch target folders: ${data.message}`);
      }
    } catch (err) {
      addLog('ERROR', `Network error loading folders: ${err.message}`);
    }
  };

  // Submit move
  const handleMoveSubmit = async () => {
    if (!moveTargetItem) return;
    const destFolderId = selectedDestId === 'root' ? null : Number(selectedDestId);

    const isFolder = moveTargetItem.type === 'folder';
    const endpoint = isFolder 
      ? `${FOLDERS_API}/${moveTargetItem.id}/move`
      : `${FILES_API}/${moveTargetItem.id}/move`;

    let url = `${endpoint}?userName=${encodeURIComponent(userName)}`;
    if (destFolderId) {
      url += `&parentId=${destFolderId}`;
    }
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
    <div className="space-y-6">
      {/* Explorer Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
        {/* Terminal path breadcrumbs */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/3 border border-white/5 text-xs font-mono text-slate-300 max-w-full overflow-x-auto whitespace-nowrap">
          <button 
            className={`hover:text-indigo-400 flex items-center gap-1 transition-colors ${currentFolderId === null ? 'text-indigo-400 font-bold' : 'text-slate-400'}`}
            onClick={() => setCurrentFolderId(null)}
          >
            <Home className="w-3.5 h-3.5" />
            root
          </button>
          
          {breadcrumbs.map((bc, index) => (
            <React.Fragment key={bc.id}>
              <ChevronRight className="w-3 h-3 text-slate-500 flex-shrink-0" />
              <button 
                className={`hover:text-indigo-400 transition-colors ${index === breadcrumbs.length - 1 ? 'text-indigo-400 font-bold' : 'text-slate-400'}`}
                onClick={() => setCurrentFolderId(bc.id)}
              >
                {bc.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Controls Layout + New Folder */}
        <div className="flex items-center gap-2.5">
          {/* Toggle View mode */}
          <div className="flex items-center rounded-xl bg-white/3 border border-white/5 p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:text-white'}`}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:text-white'}`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleCreateFolder}
            className="h-9 px-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-white text-xs font-bold hover:bg-indigo-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            New Folder
          </button>
        </div>
      </div>

      {/* Explorer Results */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="relative max-h-[480px] overflow-y-auto pr-1.5 border border-white/5 rounded-2xl bg-white/[0.01] p-3.5"
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[1px] z-10 rounded-2xl">
            <div className="flex flex-col items-center gap-2 text-xs font-semibold text-slate-400">
              <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
              Scanning filesystem...
            </div>
          </div>
        )}

        {!isLoading && subfolders.length === 0 && files.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center glass rounded-2xl border border-white/5">
            <Folder className="w-10 h-10 text-slate-500 stroke-[1.5] mb-3 animate-float" />
            <p className="text-sm font-semibold text-slate-300">This directory is empty</p>
            <p className="text-xs text-slate-500 mt-1">Upload files or create subdirectories to populate this node</p>
          </div>
        )}

        {!isLoading && (subfolders.length > 0 || files.length > 0) && (
          <div className="space-y-6">
            {/* Render Folders First */}
            {subfolders.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block pl-1">
                  Folders ({subfolders.length})
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
                  {subfolders.map(folder => (
                    <div
                      key={folder.id}
                      onClick={() => {
                        setCurrentFolderId(folder.id);
                        setCurrentFolderName(folder.name);
                      }}
                      className="group p-4 bg-white/2 border border-white/5 rounded-2xl hover:border-indigo-500/30 transition-all duration-300 hover-lift-3d cursor-pointer flex flex-col justify-between h-[104px]"
                    >
                      <div className="flex items-start justify-between">
                        <div className="p-2.5 bg-gradient-to-br from-indigo-500/10 to-cyan-500/5 rounded-xl text-indigo-400 group-hover:scale-105 transition-transform duration-300 border border-white/5">
                          <Folder className="w-5 h-5" />
                        </div>
                        {/* Quick Hover Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-sm border border-white/5 rounded-lg p-0.5" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={(e) => openMoveModal(folder.id, folder.name, 'folder', e)}
                            title="Move folder"
                            className="p-1 text-slate-400 hover:text-white rounded"
                          >
                            <MoveRight className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => handleRenameFolder(folder.id, folder.name, e)}
                            title="Rename folder"
                            className="p-1 text-slate-400 hover:text-white rounded"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteFolder(folder.id, folder.name, e)}
                            title="Delete folder"
                            className="p-1 text-red-400 hover:text-red-300 rounded"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="min-w-0 pt-2">
                        <h5 className="text-xs font-bold text-white truncate" title={folder.name}>
                          {folder.name}
                        </h5>
                        <p className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">Directory Node</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Render Files */}
            {files.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block pl-1">
                  Files ({files.length})
                </span>
                
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
                    {files.slice(0, visibleFilesCount).map(file => {
                      const showThumbnail = file.fileType === 'image' || file.fileType === 'pdf';
                      
                      if (showThumbnail) {
                        return (
                          <div
                            key={file.id}
                            onClick={() => handleFileClick(file)}
                            className="group relative rounded-2xl overflow-hidden border border-white/5 hover:border-cyan-500/30 transition-all duration-300 hover-lift-3d h-[140px] cursor-pointer bg-black"
                          >
                            {/* Image fills the entire card */}
                            <img 
                              src={`${window.location.origin}/files/${file.id}/thumbnail?userName=${encodeURIComponent(userName)}`}
                              alt={file.originalName}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            
                            {/* Overlay for actions and name, visible on hover */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-3 flex flex-col justify-between select-none">
                              {/* Quick Hover Actions */}
                              <div className="flex items-center gap-1 self-end bg-black/60 backdrop-blur-sm border border-white/10 rounded-lg p-0.5" onClick={e => e.stopPropagation()}>
                                <button
                                  onClick={(e) => openMoveModal(file.id, file.originalName, 'file', e)}
                                  title="Move file"
                                  className="p-1 text-slate-300 hover:text-white rounded"
                                >
                                  <MoveRight className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => handleDeleteFile(file.id, file.originalName, e)}
                                  title="Delete file"
                                  className="p-1 text-red-400 hover:text-red-300 rounded"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>

                              {/* Title / Meta (bottom) */}
                              <div className="min-w-0">
                                <h5 className="text-[11px] font-bold text-white truncate" title={file.originalName}>
                                  {file.originalName}
                                </h5>
                                <div className="flex items-center justify-between text-[8px] text-slate-300 font-semibold mt-0.5">
                                  <span>{formatBytes(file.sizeBytes)}</span>
                                  <span className="flex items-center gap-0.5">
                                    <Clock className="w-2 h-2" />
                                    {formatDate(file.fileCreatedDate)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // Non-image files card layout
                      return (
                        <div
                          key={file.id}
                          onClick={() => handleFileClick(file)}
                          className="group p-4 bg-white/2 border border-white/5 rounded-2xl hover:border-cyan-500/30 transition-all duration-300 hover-lift-3d flex flex-col justify-between h-[140px] cursor-pointer"
                        >
                          <div className="flex items-start justify-between">
                            <div className="p-2.5 bg-white/3 rounded-xl text-slate-400 border border-white/5 group-hover:scale-105 transition-transform duration-300 w-10 h-10 overflow-hidden flex items-center justify-center p-0">
                              <FileTypeIcon fileName={file.originalName} className="w-5 h-5" />
                            </div>
                            {/* Quick Hover Actions */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-sm border border-white/5 rounded-lg p-0.5" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={(e) => openMoveModal(file.id, file.originalName, 'file', e)}
                                title="Move file"
                                className="p-1 text-slate-400 hover:text-white rounded"
                              >
                                <MoveRight className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => handleDeleteFile(file.id, file.originalName, e)}
                                title="Delete file"
                                className="p-1 text-red-400 hover:text-red-300 rounded"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          <div className="min-w-0 pt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <h5 className="text-xs font-bold text-white truncate" title={file.originalName}>
                              {file.originalName}
                            </h5>
                            <div className="flex items-center justify-between text-[9px] text-slate-500 font-semibold mt-0.5">
                              <span>{formatBytes(file.sizeBytes)}</span>
                              <span>•</span>
                              <span className="flex items-center gap-0.5">
                                <Clock className="w-2.5 h-2.5" />
                                {formatDate(file.fileCreatedDate)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* List View Mode */
                  <div className="border border-white/5 rounded-2xl overflow-hidden glass divide-y divide-white/5">
                    {files.slice(0, visibleFilesCount).map(file => (
                      <div
                        key={file.id}
                        onClick={() => handleFileClick(file)}
                        className="group flex items-center justify-between gap-4 p-3.5 hover:bg-white/2 transition-smooth cursor-pointer"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="p-2 bg-white/4 rounded-xl text-slate-400 border border-white/5 flex-shrink-0 w-8.5 h-8.5 overflow-hidden flex items-center justify-center p-0">
                            {file.fileType === 'image' || file.fileType === 'pdf' ? (
                              <img 
                                src={`${window.location.origin}/files/${file.id}/thumbnail?userName=${encodeURIComponent(userName)}`}
                                alt={file.originalName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <FileTypeIcon fileName={file.originalName} className="w-4.5 h-4.5" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate" title={file.originalName}>
                              {file.originalName}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {formatBytes(file.sizeBytes)} • {file.fileType || file.originalName.split('.').pop() || 'File'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 flex-shrink-0">
                          <span className="text-[10px] text-slate-500 font-medium flex items-center gap-0.5 hidden sm:flex">
                            <Clock className="w-3 h-3" />
                            Uploaded: {formatDate(file.fileCreatedDate)}
                          </span>

                          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-sm border border-white/5 rounded-lg p-0.5">
                            <button
                              onClick={(e) => openMoveModal(file.id, file.originalName, 'file', e)}
                              title="Move file"
                              className="p-1 text-slate-400 hover:text-white rounded"
                            >
                              <MoveRight className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteFile(file.id, file.originalName, e)}
                              title="Delete file"
                              className="p-1 text-red-400 hover:text-red-300 rounded"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Infinite Scroll Loader Indicator */}
                {(visibleFilesCount < files.length || hasMoreOnServer) && (
                  <div className="text-center text-[10px] text-slate-500 py-4 font-semibold tracking-wider animate-pulse flex items-center justify-center gap-1.5 border-t border-white/5 mt-3">
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border border-slate-500 border-t-transparent" />
                    {isFetchingMore 
                      ? "Fetching assets from security core..." 
                      : (visibleFilesCount < files.length)
                        ? `Scroll down to display more assets (${files.length - visibleFilesCount} local files remaining)`
                        : "Scroll down to fetch next block from server..."
                    }
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Move Dialog Modal Overlay */}
      {showMoveModal && moveTargetItem && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-[9999] backdrop-blur-md animate-fadeInUp">
          <div className="w-full max-w-sm glass-premium border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5 animate-rotateIn3D">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                <CornerDownRight className="w-4 h-4 text-indigo-400 animate-pulse" />
                Relocate {moveTargetItem.type === 'file' ? 'Asset' : 'Directory'}
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Select target vault node for <span className="font-semibold text-indigo-300">{moveTargetItem.name}</span>:
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Destination Node</label>
              <select 
                value={selectedDestId} 
                onChange={(e) => setSelectedDestId(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-black border border-white/10 text-white text-xs font-semibold focus-glow transition-all focus:outline-none"
              >
                <option value="root">🏠 Home (Root Node)</option>
                {allFolders.map(folder => (
                  <option key={folder.id} value={folder.id}>
                    📁 {folder.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/5">
              <button 
                onClick={() => { setShowMoveModal(false); setMoveTargetItem(null); }}
                className="px-4 h-9 rounded-xl border border-white/10 text-slate-400 text-xs font-semibold hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleMoveSubmit}
                className="px-4 h-9 rounded-xl bg-indigo-500 text-white text-xs font-bold hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/20 cursor-pointer"
              >
                Move Asset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox / Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 bg-black/95 flex flex-col z-[9999] backdrop-blur-md animate-fadeIn">
          {/* Header */}
          <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 text-white select-none">
            <div className="min-w-0">
              <p className="text-xs font-bold truncate max-w-xs md:max-w-md">{previewFile.originalName}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{formatBytes(previewFile.sizeBytes)} • {formatDate(previewFile.fileCreatedDate)}</p>
            </div>
            
            <div className="flex items-center gap-3">
              <a 
                href={`${window.location.origin}/files/${previewFile.id}/download?userName=${encodeURIComponent(userName)}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 h-9 rounded-xl bg-indigo-500 text-white text-xs font-bold hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/20 flex items-center gap-1.5 cursor-pointer decoration-none"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Download Original
              </a>
              <button 
                onClick={() => setPreviewFile(null)}
                className="p-1.5 rounded-xl border border-white/10 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer text-xs font-semibold"
              >
                ✕ Close
              </button>
            </div>
          </div>

          {/* Image display container */}
          <div className="flex-grow w-full flex items-center justify-center p-6 min-h-0">
            <img 
              src={`${window.location.origin}/files/${previewFile.id}/view?userName=${encodeURIComponent(userName)}`}
              alt={previewFile.originalName}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-scaleIn border border-white/10"
            />
          </div>
        </div>
      )}
    </div>
  );
}
