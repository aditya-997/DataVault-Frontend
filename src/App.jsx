import React, { useState, useEffect, useRef } from 'react';
import UploadForm from './components/UploadForm';
import FileBrowser from './components/FileBrowser';
import VaultGate from './components/VaultGate';
import StatsCard from './components/StatsCard';
import { getApiBaseUrl, setApiBaseUrl, getStoredApiUrl } from './config';
import { Folder, Upload, BarChart2, Shield, Settings, X, Terminal, ChevronDown } from 'lucide-react';
import './App.css';

function App() {
  const [userName, setUserName] = useState('');
  const [activeTab, setActiveTab] = useState('explorer');
  const [logs, setLogs] = useState([]);
  const [filesList, setFilesList] = useState([]);
  
  // Modals / Drawers
  const [showSettings, setShowSettings] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [apiUrlInput, setApiUrlInput] = useState(getStoredApiUrl());
  
  const logsEndRef = useRef(null);

  // Directory Breadcrumb States
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [currentFolderName, setCurrentFolderName] = useState('Home');
  const [breadcrumbs, setBreadcrumbs] = useState([]);

  const addLog = (level, message) => {
    const timestamp = new Date().toLocaleTimeString([], { hour12: false });
    setLogs(prev => [...prev, { timestamp, level, message }]);
  };

  useEffect(() => {
    addLog('INFO', 'DataVault security layer active.');
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    if (showLogs && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, showLogs]);

  if (!userName) {
    return <VaultGate onUnlock={(name) => {
      setUserName(name);
      addLog('SUCCESS', `Vault unlocked for user: ${name}`);
    }} />;
  }

  // Pre-defined network options for the dropdown
  const commonUrls = [
    { label: "Local Device (Browser)", value: "" },
    { label: "dev: LAPMACTPGGN19", value: "http://LAPMACTPGGN19.local:8081/" },
    { label: "prod: LAPTOP-C5Q2VCU5", value: "http://LAPTOP-C5Q2VCU5.local:8081/" }
  ];

  return (
    <div className="flex flex-col min-h-[100dvh] pb-[90px]">
      
      {/* Top Header - Native iOS feel */}
      <header className="flex items-center justify-between px-4 ios-glass sticky top-0 z-40 border-b-0 min-h-[44px] pt-[max(48px,env(safe-area-inset-top))] pb-2">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-500" strokeWidth={2.5} />
          <span className="font-semibold tracking-tight text-white text-[17px]">DataVault</span>
        </div>
        <div className="flex items-center gap-3">
           <button 
             onClick={() => setShowLogs(true)}
             className="text-zinc-400 hover:text-white transition-colors p-1 relative"
           >
             <Terminal className="w-5 h-5" />
             {/* Indicator dot if logs updated recently (simplified) */}
             <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full border border-black"></span>
           </button>
           <button 
             onClick={() => setShowSettings(true)}
             className="text-zinc-400 hover:text-white transition-colors p-1"
           >
             <Settings className="w-5 h-5" />
           </button>
           <button 
             onClick={() => setUserName('')}
             className="text-sm font-semibold text-indigo-500 hover:text-indigo-400 transition-colors ml-1"
           >
             Lock
           </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow flex flex-col relative w-full px-4 pt-4 pb-6">
        
        {activeTab === 'explorer' && (
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

        {activeTab === 'upload' && (
          <UploadForm 
            addLog={addLog} 
            userName={userName}
            currentFolderId={currentFolderId}
            setCurrentFolderId={setCurrentFolderId}
            currentFolderName={currentFolderName}
            setCurrentFolderName={setCurrentFolderName}
          />
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6 animate-fadeInNative">
             <div className="flex items-end justify-between pb-2">
                <div>
                  <h2 className="text-[28px] font-bold text-white tracking-tight">Analytics</h2>
                </div>
             </div>
             <StatsCard files={filesList} />
          </div>
        )}

      </main>

      {/* Settings Modal (iOS native-like alert style) */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-[9999] backdrop-blur-md animate-fadeInNative">
          <div className="w-full max-w-[320px] glass-panel rounded-[14px] overflow-hidden animate-scalePop">
            <div className="p-5 text-center border-b border-white/10">
              <h3 className="text-[17px] font-semibold text-white mb-1">Network Settings</h3>
              <p className="text-[13px] text-zinc-400 leading-tight">
                Select your backend API destination.
              </p>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="relative">
                <select 
                  value={apiUrlInput}
                  onChange={(e) => setApiUrlInput(e.target.value)}
                  className="w-full h-11 px-3 appearance-none rounded-lg bg-white/5 text-white text-[15px] font-medium border border-transparent focus:border-indigo-500 focus:outline-none transition-colors"
                >
                  {commonUrls.map((url, i) => (
                    <option key={i} value={url.value}>{url.label}</option>
                  ))}
                  {/* If the current input isn't in commonUrls, show it as 'Custom' */}
                  {!commonUrls.find(u => u.value === apiUrlInput) && (
                    <option value={apiUrlInput}>Custom: {apiUrlInput}</option>
                  )}
                </select>
                <ChevronDown className="absolute right-3 top-3 w-5 h-5 text-zinc-400 pointer-events-none" />
              </div>
              
              <input 
                type="text" 
                value={apiUrlInput}
                onChange={(e) => setApiUrlInput(e.target.value)}
                placeholder="Or type custom URL..."
                className="w-full h-11 px-3 rounded-lg bg-white/5 text-white text-[15px] border border-transparent focus:border-indigo-500 focus:outline-none transition-colors"
              />
            </div>
            
            <div className="flex border-t border-white/10 h-12">
              <button 
                onClick={() => setShowSettings(false)}
                className="flex-1 text-[17px] font-normal text-indigo-500 border-r border-white/10 ios-active"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setApiBaseUrl(apiUrlInput);
                  setShowSettings(false);
                  window.location.reload();
                }}
                className="flex-1 text-[17px] font-semibold text-indigo-500 ios-active"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FE Logs Bottom Sheet */}
      {showLogs && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-[9990] animate-fadeInNative" 
            onClick={() => setShowLogs(false)} 
          />
          {/* Drawer */}
          <div className="fixed bottom-0 left-0 right-0 h-[60vh] glass-panel rounded-t-[32px] z-[9991] flex flex-col shadow-2xl animate-slideUpNative border-b-0 border-l-0 border-r-0">
            <div className="flex justify-center p-3 cursor-pointer" onClick={() => setShowLogs(false)}>
               <div className="w-12 h-1.5 bg-zinc-600 rounded-full" />
            </div>
            <div className="px-5 pb-3 border-b border-white/10 flex justify-between items-center">
               <h3 className="text-[17px] font-bold text-white tracking-tight flex items-center gap-2">
                 <Terminal className="w-5 h-5 text-indigo-400" /> System Logs
               </h3>
               <button onClick={() => setLogs([])} className="text-[13px] font-semibold text-indigo-500">
                 Clear
               </button>
            </div>
            
            {/* Terminal Window */}
            <div className="flex-1 overflow-y-auto p-4 bg-black/40 font-mono text-[11px] leading-relaxed space-y-1.5 safe-pb">
               {logs.map((log, i) => {
                 let colorClass = "text-zinc-300";
                 if (log.level === 'SUCCESS') colorClass = "text-emerald-400";
                 if (log.level === 'ERROR') colorClass = "text-red-400";
                 if (log.level === 'WARNING') colorClass = "text-amber-400";
                 
                 return (
                   <div key={i} className="flex gap-2">
                     <span className="text-zinc-600 shrink-0">[{log.timestamp}]</span>
                     <span className={`shrink-0 font-semibold ${colorClass}`}>[{log.level}]</span>
                     <span className="text-zinc-300 break-words">{log.message}</span>
                   </div>
                 );
               })}
               <div ref={logsEndRef} />
               {logs.length === 0 && <div className="text-zinc-600 italic">No logs generated yet.</div>}
            </div>
          </div>
        </>
      )}

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 h-[76px] bottom-nav-glass z-50 safe-pb flex items-center justify-around px-4">
        <button 
          onClick={() => setActiveTab('explorer')}
          className={`flex items-center justify-center gap-2 px-5 py-2 rounded-2xl transition-all duration-200 cursor-pointer ${
            activeTab === 'explorer' 
              ? 'bg-indigo-500/25 text-white border border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.3)] font-bold' 
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5 font-medium'
          }`}
        >
          <Folder className={`w-5 h-5 ${activeTab === 'explorer' ? 'text-indigo-400 fill-indigo-400/20' : 'text-zinc-400'}`} strokeWidth={activeTab === 'explorer' ? 2.5 : 2} />
          <span className="text-xs tracking-wide">Files</span>
        </button>

        <button 
          onClick={() => setActiveTab('upload')}
          className={`flex items-center justify-center gap-2 px-5 py-2 rounded-2xl transition-all duration-200 cursor-pointer ${
            activeTab === 'upload' 
              ? 'bg-indigo-500/25 text-white border border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.3)] font-bold' 
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5 font-medium'
          }`}
        >
          <Upload className={`w-5 h-5 ${activeTab === 'upload' ? 'text-indigo-400 fill-indigo-400/20' : 'text-zinc-400'}`} strokeWidth={activeTab === 'upload' ? 2.5 : 2} />
          <span className="text-xs tracking-wide">Upload</span>
        </button>

        <button 
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center justify-center gap-2 px-5 py-2 rounded-2xl transition-all duration-200 cursor-pointer ${
            activeTab === 'analytics' 
              ? 'bg-indigo-500/25 text-white border border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.3)] font-bold' 
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5 font-medium'
          }`}
        >
          <BarChart2 className={`w-5 h-5 ${activeTab === 'analytics' ? 'text-indigo-400 fill-indigo-400/20' : 'text-zinc-400'}`} strokeWidth={activeTab === 'analytics' ? 2.5 : 2} />
          <span className="text-xs tracking-wide">Stats</span>
        </button>
      </nav>

    </div>
  );
}

export default App;
