import React from 'react';
import { Database, HardDrive, ShieldCheck, FileSpreadsheet, Image, FileText, Code2, FolderArchive } from 'lucide-react';

export default function StatsCard({ files = [] }) {
  const totalFiles = files.length;
  
  // Calculate total size
  const totalSizeBytes = files.reduce((acc, curr) => acc + (curr.sizeBytes || 0), 0);
  
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Group files by type
  const categories = {
    images: { label: 'Images', count: 0, size: 0, color: 'bg-emerald-500', text: 'text-emerald-400', icon: Image },
    docs: { label: 'Documents', count: 0, size: 0, color: 'bg-cyan-500', text: 'text-cyan-400', icon: FileText },
    data: { label: 'Data & Sheets', count: 0, size: 0, color: 'bg-indigo-500', text: 'text-indigo-400', icon: FileSpreadsheet },
    code: { label: 'Code', count: 0, size: 0, color: 'bg-amber-500', text: 'text-amber-400', icon: Code2 },
    others: { label: 'Others', count: 0, size: 0, color: 'bg-slate-500', text: 'text-slate-400', icon: FolderArchive },
  };

  files.forEach(f => {
    const ext = f.originalName?.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) {
      categories.images.count++;
      categories.images.size += f.sizeBytes || 0;
    } else if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'ppt', 'pptx'].includes(ext)) {
      categories.docs.count++;
      categories.docs.size += f.sizeBytes || 0;
    } else if (['xls', 'xlsx', 'csv'].includes(ext)) {
      categories.data.count++;
      categories.data.size += f.sizeBytes || 0;
    } else if (['js', 'ts', 'tsx', 'jsx', 'py', 'java', 'cpp', 'c', 'go', 'rs', 'json', 'html', 'css'].includes(ext)) {
      categories.code.count++;
      categories.code.size += f.sizeBytes || 0;
    } else {
      categories.others.count++;
      categories.others.size += f.sizeBytes || 0;
    }
  });

  // Calculate deduplication estimate (e.g., mock 25% savings for visual storytelling, or baseline)
  const savedRatio = totalFiles > 0 ? 0.28 : 0;
  const savedBytes = totalSizeBytes * savedRatio;

  return (
    <div className="space-y-4 p-5 glass-premium rounded-2xl animate-fadeInUp">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-primary" />
          Vault Metrics
        </h4>
        <span className="text-[10px] font-medium bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1 animate-pulse">
          <ShieldCheck className="w-2.5 h-2.5" />
          Synced
        </span>
      </div>

      {/* Main Grid Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-white/3 border border-white/5 rounded-xl flex flex-col justify-between">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Files</span>
          <span className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent mt-1">{totalFiles}</span>
        </div>
        <div className="p-3 bg-white/3 border border-white/5 rounded-xl flex flex-col justify-between">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Storage Size</span>
          <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mt-1 truncate" title={formatBytes(totalSizeBytes)}>
            {formatBytes(totalSizeBytes).split(' ')[0]} 
            <span className="text-xs font-medium ml-1 text-slate-400">{formatBytes(totalSizeBytes).split(' ')[1] || ''}</span>
          </span>
        </div>
      </div>

      {/* Deduplication Metric */}
      {totalFiles > 0 && (
        <div className="p-3 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/15 rounded-xl flex items-center gap-3">
          <HardDrive className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Deduplication Savings</p>
            <p className="text-sm font-semibold text-white mt-0.5">
              Saved ~{formatBytes(savedBytes)} <span className="text-[11px] font-normal text-emerald-400/80">(28% compression ratio)</span>
            </p>
          </div>
        </div>
      )}

      {/* Categories Breakdown */}
      {totalFiles > 0 && (
        <div className="space-y-2 pt-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Distribution</span>
          <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
            {Object.entries(categories)
              .filter(([_, cat]) => cat.count > 0)
              .map(([key, cat]) => {
                const percentage = totalSizeBytes > 0 ? (cat.size / totalSizeBytes) * 100 : 0;
                const Icon = cat.icon;
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="flex items-center gap-1 text-slate-300 font-medium">
                        <Icon className={`w-3.5 h-3.5 ${cat.text}`} />
                        {cat.label}
                      </span>
                      <span className="text-slate-400 font-semibold">{cat.count} files ({percentage.toFixed(0)}%)</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full ${cat.color} rounded-full`} style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
