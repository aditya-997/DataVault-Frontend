import React from 'react';
import { Zap } from 'lucide-react';

export default function StatsCard({ files = [] }) {
  const totalFiles = files.length;
  const totalSizeBytes = files.reduce((acc, curr) => acc + (curr.sizeBytes || 0), 0);
  const maxStorage = 100 * 1024 * 1024 * 1024; // 100GB mock max
  const usagePercent = Math.min((totalSizeBytes / maxStorage) * 100, 100) || 0;
  
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 GB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const categories = {
    images: { label: 'Images', size: 0, color: 'bg-emerald-500' },
    docs: { label: 'Documents', size: 0, color: 'bg-indigo-500' },
    code: { label: 'Code files', size: 0, color: 'bg-amber-500' },
    others: { label: 'Others', size: 0, color: 'bg-zinc-700' },
  };

  files.forEach(f => {
    const ext = f.originalName?.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
      categories.images.size += f.sizeBytes || 0;
    } else if (['pdf', 'doc', 'docx', 'txt'].includes(ext)) {
      categories.docs.size += f.sizeBytes || 0;
    } else if (['js', 'ts', 'jsx', 'json', 'html', 'css'].includes(ext)) {
      categories.code.size += f.sizeBytes || 0;
    } else {
      categories.others.size += f.sizeBytes || 0;
    }
  });

  const savedRatio = totalFiles > 0 ? 0.28 : 0;
  const savedBytes = totalSizeBytes * savedRatio;

  // Render SVG Arc for Storage Used
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (usagePercent / 100) * (circumference / 2); 
  // It's a semi-circle so we only stroke half

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Top 3 Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Storage Used Card */}
        <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-6">
            <span className="text-sm font-medium text-zinc-400">Storage Used</span>
          </div>
          <div className="relative h-16 w-full flex items-end justify-start overflow-hidden">
             {/* Arc Chart */}
             <svg className="absolute left-0 bottom-0 w-24 h-24 -translate-x-2 translate-y-6" viewBox="0 0 100 100">
               <path 
                 d="M 10 50 A 40 40 0 0 1 90 50" 
                 fill="none" stroke="#27272a" strokeWidth="6" strokeLinecap="round"
               />
               <path 
                 d="M 10 50 A 40 40 0 0 1 90 50" 
                 fill="none" stroke="#6366f1" strokeWidth="6" strokeLinecap="round"
                 strokeDasharray={circumference}
                 strokeDashoffset={circumference - ((Math.max(usagePercent, 2) / 100) * (circumference/2))}
                 className="transition-all duration-1000 ease-out"
               />
             </svg>
             <div className="pl-1 z-10">
               <div className="text-3xl font-semibold text-white">
                 {formatBytes(totalSizeBytes).split(' ')[0]}<span className="text-xl text-zinc-400 ml-1">{formatBytes(totalSizeBytes).split(' ')[1]}</span>
               </div>
               <div className="text-[11px] text-zinc-500 mt-1">of 100 GB</div>
             </div>
          </div>
        </div>

        {/* Total Files Card */}
        <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-5 flex flex-col justify-between">
          <span className="text-sm font-medium text-zinc-400 mb-6 block">Total Files</span>
          <div>
            <div className="text-3xl font-semibold text-white">{totalFiles.toLocaleString()}</div>
            <div className="text-[11px] font-medium text-emerald-400 mt-1">
               ↑ {Math.floor(totalFiles * 0.1) || 0} this week
            </div>
          </div>
        </div>

        {/* Space Saved Card */}
        <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden">
          <div className="flex justify-between items-start mb-6">
            <span className="text-sm font-medium text-zinc-400">Space Saved</span>
            <Zap className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <div className="text-3xl font-semibold text-white">
              {formatBytes(savedBytes).split(' ')[0]}<span className="text-xl text-zinc-400 ml-1">{formatBytes(savedBytes).split(' ')[1]}</span>
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">via deduplication</div>
          </div>
        </div>

      </div>

      {/* Storage Breakdown Bar */}
      {totalFiles > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-zinc-300">Storage breakdown</h3>
          
          {/* Segmented Bar */}
          <div className="h-2.5 w-full flex rounded-full overflow-hidden gap-[2px]">
             {Object.entries(categories).map(([key, cat]) => {
               const pct = totalSizeBytes ? (cat.size / totalSizeBytes) * 100 : 0;
               if (pct === 0) return null;
               return (
                 <div key={key} className={`h-full ${cat.color}`} style={{ width: `${pct}%` }} />
               );
             })}
          </div>

          {/* Legend Grid */}
          <div className="grid grid-cols-2 gap-4 border border-white/5 rounded-xl p-4 bg-[#080808]">
             {Object.entries(categories).map(([key, cat]) => {
                const pct = totalSizeBytes ? (cat.size / totalSizeBytes) * 100 : 0;
                return (
                  <div key={key} className="flex items-center justify-between border-b border-white/5 pb-2 last:border-0">
                    <div className="flex items-center gap-2">
                       <span className={`w-2 h-2 rounded-full ${cat.color}`} />
                       <span className="text-sm text-zinc-300">{cat.label}</span>
                    </div>
                    <span className="text-sm text-zinc-400">{pct.toFixed(0)}%</span>
                  </div>
                );
             })}
          </div>
        </div>
      )}

      {/* Mock Activity Chart (CSS driven representation) */}
      <div className="space-y-4">
         <h3 className="text-sm font-medium text-zinc-300">Upload activity</h3>
         <div className="h-40 border-b border-white/5 relative flex items-end">
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
               <defs>
                 <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                   <stop offset="0%" stopColor="rgba(99,102,241,0.2)" />
                   <stop offset="100%" stopColor="rgba(99,102,241,0)" />
                 </linearGradient>
               </defs>
               <path d="M0,70 Q20,30 40,60 T70,40 T100,20 L100,100 L0,100 Z" fill="url(#chartGrad)" />
               <path d="M0,70 Q20,30 40,60 T70,40 T100,20" fill="none" stroke="#6366f1" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            </svg>
            <div className="w-full flex justify-between text-[10px] text-zinc-600 absolute -bottom-5">
              <span>1 day</span>
              <span>2 day</span>
              <span>3 day</span>
              <span>4 day</span>
              <span>5 day</span>
              <span>6 day</span>
              <span>7 day</span>
            </div>
         </div>
      </div>

    </div>
  );
}
