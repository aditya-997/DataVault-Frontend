import React, { useState, useEffect } from 'react';
import UploadForm from './components/UploadForm';
import FileBrowser from './components/FileBrowser';
import VaultGate from './components/VaultGate';
import StatsCard from './components/StatsCard';
import { Lock, LogOut, Terminal, FolderOpen, Upload, FolderSearch, ShieldAlert } from 'lucide-react';
import './App.css';

function App() {
  const [userName, setUserName] = useState('');
  const [activeTab, setActiveTab] = useState('explorer'); // 'upload' | 'explorer'
  const [logs, setLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);
  const [filesList, setFilesList] = useState([]); // Flat files list for StatsCard

  // Directory Breadcrumb States
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [currentFolderName, setCurrentFolderName] = useState('Home');
  const [breadcrumbs, setBreadcrumbs] = useState([]);

  const addLog = (level, message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, level, message }]);
  };

  useEffect(() => {
    addLog('INFO', 'DataVault security layer active.');
  }, []);

  // Lock the vault session
  const handleLockVault = () => {
    setUserName('');
    setCurrentFolderId(null);
    setCurrentFolderName('Home');
    setBreadcrumbs([]);
    setFilesList([]);
    addLog('INFO', 'Vault session locked.');
  };

  if (!userName) {
    return <VaultGate onUnlock={(name) => {
      setUserName(name);
      addLog('INFO', `Vault decrypted successfully for user: ${name}`);
    }} />;
  }

  return (
    <div className="min-h-screen bg-black text-slate-100 flex flex-col md:flex-row relative overflow-hidden font-sans">
      {/* Dynamic background lighting */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] animate-float" />
        <div className="absolute bottom-[-10%] right-[25%] w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[130px] animate-float" style={{ animationDelay: '3s' }} />
        <div 
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `linear-gradient(0deg, transparent 24%, rgba(85, 136, 255, 0.05) 25%, rgba(85, 136, 255, 0.05) 26%, transparent 27%, transparent 74%, rgba(85, 136, 255, 0.05) 75%, rgba(85, 136, 255, 0.05) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(85, 136, 255, 0.05) 25%, rgba(85, 136, 255, 0.05) 26%, transparent 27%, transparent 74%, rgba(85, 136, 255, 0.05) 75%, rgba(85, 136, 255, 0.05) 76%, transparent 77%, transparent)`,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      {/* Sidebar - Desktop navigation & Info */}
      <aside className="w-full md:w-[320px] bg-[#070708] border-r border-white/5 p-5 flex flex-col justify-between shrink-0 relative z-10 select-none">
        <div className="space-y-6">
          {/* Logo Brand Header */}
          <div className="flex items-center gap-2.5 pb-3 border-b border-white/5">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-xl text-white shadow-lg shadow-indigo-500/20">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white flex items-center">
                Data<span className="text-indigo-400">Vault</span>
              </h1>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold block">Cloud Secure</span>
            </div>
          </div>

          {/* User Session Credentials Card */}
          <div className="p-4 bg-white/3 border border-white/5 rounded-2xl flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Active Identity</p>
              <p className="text-xs font-bold text-white mt-0.5 truncate">{userName}</p>
            </div>
            <button 
              onClick={handleLockVault}
              className="p-2 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all cursor-pointer"
              title="Lock Session"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Sidebar Nav Links */}
          <nav className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block pl-2 mb-2">Workspace Tools</span>
            <button
              onClick={() => setActiveTab('explorer')}
              className={`w-full flex items-center gap-3 px-4 h-11 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'explorer' 
                  ? 'bg-gradient-to-r from-indigo-500/15 to-cyan-500/5 text-indigo-400 border border-indigo-500/20' 
                  : 'text-slate-400 hover:text-white border border-transparent hover:bg-white/3'
              }`}
            >
              <FolderSearch className="w-4 h-4" />
              File Explorer
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`w-full flex items-center gap-3 px-4 h-11 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'upload' 
                  ? 'bg-gradient-to-r from-indigo-500/15 to-cyan-500/5 text-indigo-400 border border-indigo-500/20' 
                  : 'text-slate-400 hover:text-white border border-transparent hover:bg-white/3'
              }`}
            >
              <Upload className="w-4 h-4" />
              Upload Console
            </button>
          </nav>

          {/* Dynamic Stats Metrics */}
          <StatsCard files={filesList} />
        </div>

        {/* Console Drawer Toggle Footer */}
        <div className="pt-4 border-t border-white/5 mt-6 md:mt-0">
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="w-full flex items-center justify-between px-4 h-10 rounded-xl bg-white/2 hover:bg-white/4 border border-white/5 text-[11px] font-bold text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
              System Activity Logs
            </span>
            <span className="text-[10px] font-semibold bg-white/5 px-2 py-0.5 rounded border border-white/5">
              {logs.length}
            </span>
          </button>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <main className="flex-grow flex flex-col justify-between overflow-hidden relative z-10">
        <div className="flex-grow p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Folder Destination Badge */}
            <div className="flex items-center gap-2 text-xs text-slate-400 bg-white/2 border border-white/5 rounded-xl px-4 py-2.5 w-fit">
              <FolderOpen className="w-4 h-4 text-indigo-400" />
              Current Node:
              <strong className="text-white">/{currentFolderName}</strong>
            </div>

            {/* Render selected workspace tool view */}
            <div className="glass-premium border border-white/5 rounded-3xl p-6 shadow-2xl relative">
              {activeTab === 'upload' ? (
                <UploadForm 
                  addLog={addLog} 
                  userName={userName}
                  currentFolderId={currentFolderId}
                  setCurrentFolderId={setCurrentFolderId}
                  currentFolderName={currentFolderName}
                  setCurrentFolderName={setCurrentFolderName}
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
                  onFilesUpdate={setFilesList}
                />
              )}
            </div>
          </div>
        </div>

        {/* Collapsible Console Drawer */}
        {showLogs && (
          <div className="border-t border-white/10 bg-[#070708] max-h-56 flex flex-col z-50 shrink-0 relative animate-fadeInUp">
            <div className="flex items-center justify-between px-6 py-2.5 border-b border-white/5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]" />
                Remote Terminal Logs
              </span>
              <button 
                onClick={() => setLogs([])}
                className="text-[9px] font-bold text-slate-500 hover:text-red-400 uppercase cursor-pointer"
              >
                Clear Terminal
              </button>
            </div>
            <div className="overflow-y-auto p-4 font-mono text-[10px] space-y-1.5 flex-grow select-text selection:bg-indigo-500/30">
              {logs.length === 0 ? (
                <p className="text-slate-600 italic text-center py-6">Terminal idle. No events logged.</p>
              ) : (
                logs.map((log, idx) => {
                  const colors = {
                    info: 'text-sky-400',
                    success: 'text-emerald-400',
                    warning: 'text-amber-400',
                    error: 'text-red-400'
                  };
                  return (
                    <div key={idx} className="flex items-start gap-2 leading-relaxed">
                      <span className="text-slate-600 flex-shrink-0">[{log.timestamp}]</span>
                      <span className={`${colors[log.level.toLowerCase()] || 'text-white'} font-bold flex-shrink-0 uppercase`}>{log.level}:</span>
                      <span className="text-slate-300">{log.message}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
