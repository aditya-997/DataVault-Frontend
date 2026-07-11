import React, { useState } from 'react';
import { Lock } from 'lucide-react';

export default function VaultGate({ onUnlock }) {
  const [userName, setUserName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!userName.trim()) return;

    setIsSubmitting(true);
    
    // Simulate security keyring verification to match the "100-fold UI/UX" premium feel
    const stages = [
      'Establishing secure tunnel...',
      'Verifying keyring integrity...',
      'Decrypting metadata nodes...',
      'Access Granted!'
    ];

    stages.forEach((msg, idx) => {
      setTimeout(() => {
        setStatusMsg(msg);
        if (idx === stages.length - 1) {
          setTimeout(() => {
            onUnlock(userName.trim());
          }, 400);
        }
      }, (idx + 1) * 400);
    });
  };

  return (
    <div className="min-h-screen w-full bg-black flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Base dark background with gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-[#0a0a0a] to-slate-900" />

      {/* Animated gradient background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Primary gradient orb - top left */}
        <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] bg-gradient-to-br from-indigo-500/20 via-cyan-500/5 to-transparent rounded-full blur-[100px] animate-float" />
        
        {/* Accent gradient orb - bottom right */}
        <div className="absolute bottom-[-150px] right-[-100px] w-[600px] h-[600px] bg-gradient-to-t from-cyan-500/15 via-indigo-500/5 to-transparent rounded-full blur-[120px] animate-float" style={{ animationDelay: '2s' }} />
        
        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(0deg, transparent 24%, rgba(85, 136, 255, 0.08) 25%, rgba(85, 136, 255, 0.08) 26%, transparent 27%, transparent 74%, rgba(85, 136, 255, 0.08) 75%, rgba(85, 136, 255, 0.08) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(85, 136, 255, 0.08) 25%, rgba(85, 136, 255, 0.08) 26%, transparent 27%, transparent 74%, rgba(85, 136, 255, 0.08) 75%, rgba(85, 136, 255, 0.08) 76%, transparent 77%, transparent)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="w-full max-w-md space-y-8 relative z-10">
        {/* Logo/Icon - 3D */}
        <div className="flex justify-center" style={{ perspective: '1200px' }}>
          <div className="relative animate-rotateIn3D">
            <div className="absolute inset-0 animate-pulseGlow rounded-3xl" />
            <div className="relative bg-gradient-to-br from-indigo-500 via-cyan-400 to-blue-600 rounded-3xl p-6 shadow-2xl card-3d backdrop-blur-sm">
              <div className="relative transform transition-transform duration-500 hover:scale-115">
                <Lock className="w-14 h-14 text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]" />
              </div>
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center space-y-3 animate-fadeInDown">
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-400 bg-clip-text text-transparent drop-shadow-lg">
            Data<span className="text-indigo-400">Vault</span>
          </h1>
          <p className="text-slate-400 text-sm tracking-wide">
            Secure, organized repository for your valuable assets
          </p>
        </div>

        {/* Form Container - Glassmorphism */}
        <div className="glass-glow rounded-3xl p-8 space-y-6 animate-fadeInUp">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2.5">
              <label htmlFor="username" className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
                Vault Identity Key
              </label>
              <div className="relative group">
                <input
                  id="username"
                  type="text"
                  placeholder="Enter vault username"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full h-12 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus-glow focus:border-indigo-500/50 transition-all duration-300 focus:outline-none"
                  autoFocus
                  required
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">
                  {userName.trim().length > 0 && '👤'}
                </div>
              </div>
            </div>

            {isSubmitting && statusMsg && (
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl animate-fadeInUp backdrop-blur-sm">
                <p className="text-xs text-indigo-400 font-medium text-center tracking-wide">{statusMsg}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !userName.trim()}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-bold uppercase tracking-wider transition-all duration-300 shadow-lg hover:shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Decrypting...
                </span>
              ) : (
                'Unlock Vault'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
          🔐 Zero Knowledge Encryption • 🚀 Deduplicated Files • 🛡️ Guard Active
        </p>
      </div>
    </div>
  );
}
