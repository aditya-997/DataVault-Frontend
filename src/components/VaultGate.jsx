import React, { useState } from 'react';
import { Shield, Lock, Fingerprint } from 'lucide-react';

export default function VaultGate({ onUnlock }) {
  const [userName, setUserName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(0); // 0: input, 1: verify, 2: tunnel, 3: decrypt

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!userName.trim()) return;

    setIsSubmitting(true);
    setStep(1);

    setTimeout(() => setStep(2), 800);
    setTimeout(() => setStep(3), 1600);
    setTimeout(() => {
      onUnlock(userName.trim());
    }, 2400);
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden font-sans">
      
      {/* Subtle top-center ambient bloom */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-indigo-500/10 rounded-[100%] blur-[100px] pointer-events-none" />

      {/* Top Logo */}
      <div className="absolute top-[max(48px,env(safe-area-inset-top))] left-0 right-0 flex justify-center items-center gap-2 animate-fadeIn">
        <Shield className="w-4 h-4 text-zinc-400" />
        <span className="text-white font-semibold tracking-wide">DataVault</span>
      </div>

      <div className="w-full max-w-[340px] px-6 space-y-8 relative z-10 animate-fadeInUp">
        
        {/* Shield Icon */}
        <div className="flex justify-center">
          <div className="relative w-24 h-28 animate-shieldFloat">
            {/* Base shape */}
            <div className="absolute inset-0 bg-white/10 rounded-xl transform rotate-45 scale-75 opacity-0"></div>
            {/* SVG Shield */}
            <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-2xl">
              <path 
                d="M50 5 L90 20 L90 60 C90 90 50 115 50 115 C50 115 10 90 10 60 L10 20 Z" 
                fill="rgba(255,255,255,0.05)" 
                stroke="rgba(255,255,255,0.2)" 
                strokeWidth="1.5"
              />
              <path 
                d="M50 12 L82 25 L82 58 C82 82 50 103 50 103 C50 103 18 82 18 58 L18 25 Z" 
                fill="transparent" 
                stroke="rgba(99, 102, 241, 0.4)" 
                strokeWidth="2"
                style={{ filter: 'drop-shadow(0 0 12px rgba(99,102,241,0.3))' }}
              />
              {/* Center line for depth */}
              <path d="M50 12 L50 103" stroke="#27272a" strokeWidth="1" />
            </svg>
          </div>
        </div>

        {/* Welcome Text */}
        <div className="text-center space-y-1.5">
          <h1 className="text-3xl font-semibold text-white tracking-tight">Welcome back</h1>
          <p className="text-zinc-400 text-sm">Your vault is encrypted and waiting</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-zinc-500" />
              </div>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                disabled={isSubmitting}
                placeholder="Access Key"
                className="w-full h-[52px] pl-10 pr-12 rounded-xl bg-white/5 border border-white/20 text-white placeholder-zinc-500 font-medium transition-all focus:border-indigo-500 focus:outline-none"
                autoFocus
              />
              <button 
                type="button"
                className="absolute inset-y-0 right-1 px-3 flex items-center justify-center text-zinc-500 hover:text-indigo-400 transition-colors"
                disabled={isSubmitting}
              >
                <Fingerprint className="w-5 h-5" />
              </button>
            </div>

          </div>

          <button
            type="submit"
            disabled={isSubmitting || !userName.trim()}
            className="w-full h-[52px] mt-2 bg-indigo-600 hover:bg-indigo-500 border border-indigo-500 text-white font-semibold rounded-xl flex items-center justify-center text-[15px] transition-colors"
          >
            Authenticate
          </button>
        </form>

        {/* Progress Sequence */}
        <div className="pt-2 flex flex-col items-center justify-center h-8">
          {isSubmitting && (
            <div className="flex items-center gap-2 text-xs text-zinc-400 animate-fadeIn">
              <span className={`flex items-center gap-1 ${step >= 1 ? 'text-indigo-400' : ''}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${step >= 1 ? 'bg-indigo-400' : 'bg-zinc-700'}`} /> Verify
              </span>
              <span className="w-3 h-px bg-zinc-700" />
              <span className={`flex items-center gap-1 ${step >= 2 ? 'text-indigo-400' : ''}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${step >= 2 ? 'bg-indigo-400' : 'bg-zinc-700'}`} /> Tunnel
              </span>
              <span className="w-3 h-px bg-zinc-700" />
              <span className={`flex items-center gap-1 ${step >= 3 ? 'text-indigo-400' : ''}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${step >= 3 ? 'bg-indigo-400' : 'bg-zinc-700'}`} /> Decrypt
              </span>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
