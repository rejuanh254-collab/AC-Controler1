import React, { useState, useRef, useEffect } from 'react';
import { useSmartAC } from '../context/SmartACContext';
import { LogOut, Cloud, RefreshCw, CheckCircle2, ChevronDown, User, Database } from 'lucide-react';

export const GoogleAuthButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const {
    user,
    isAuthLoading,
    signInWithGoogle,
    signOutUser,
    saveSettingsToDatabase,
    loadSettingsFromDatabase,
    isDbSyncing,
    dbLastSynced,
    language,
  } = useSmartAC();

  const [menuOpen, setMenuOpen] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleManualSave = async () => {
    const ok = await saveSettingsToDatabase();
    setActionMsg(ok ? (language === 'bn' ? 'ডাটাবেজে সেভ হয়েছে!' : 'Saved to cloud!') : 'Failed');
    setTimeout(() => setActionMsg(null), 2500);
  };

  const handleManualLoad = async () => {
    const ok = await loadSettingsFromDatabase();
    setActionMsg(ok ? (language === 'bn' ? 'ডাটাবেজ থেকে লোড হয়েছে!' : 'Restored from cloud!') : 'Failed');
    setTimeout(() => setActionMsg(null), 2500);
  };

  if (isAuthLoading) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400">
        <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
        <span>Auth...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <button
        onClick={signInWithGoogle}
        className="group relative flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-200 hover:text-white border border-slate-700/80 hover:border-cyan-500/50 shadow-sm transition-all text-xs font-semibold hover:scale-102 active:scale-98"
        title={language === 'bn' ? 'গুগল দিয়ে সাইন ইন করুন যাতে এসির সব সেটিংস ক্লাউড ডাটাবেজে সেভ থাকে' : 'Sign in with Google to persist AC settings in cloud database'}
      >
        {/* Google 'G' icon */}
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
          />
          <path
            fill="#FBBC05"
            d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.19 0 10.04 0 12s.45 3.81 1.25 5.42l4.03-3.15z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
          />
        </svg>

        <span>{language === 'bn' ? 'গুগল সাইন-ইন' : 'Google Sign In'}</span>

        <span className="hidden sm:inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono">
          DB Sync
        </span>
      </button>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/40 text-xs text-white transition-all shadow-sm"
      >
        {user.photoURL ? (
          <img src={user.photoURL} alt={user.displayName || 'User'} className="w-5 h-5 rounded-full object-cover border border-cyan-400" />
        ) : (
          <div className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 font-bold flex items-center justify-center text-[10px]">
            {user.email?.[0].toUpperCase() || 'U'}
          </div>
        )}

        {!compact && (
          <div className="text-left hidden sm:block">
            <p className="text-[11px] font-bold leading-none truncate max-w-[100px]">
              {user.displayName || user.email?.split('@')[0]}
            </p>
            <p className="text-[9px] text-emerald-400 flex items-center gap-1 leading-none mt-0.5 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              {language === 'bn' ? 'ডাটাবেজ সেভড' : 'Cloud Saved'}
            </p>
          </div>
        )}

        <ChevronDown className="w-3 h-3 text-slate-400" />
      </button>

      {/* Account Dropdown */}
      {menuOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-slate-900/98 backdrop-blur-xl border border-slate-800 rounded-2xl p-3 shadow-2xl z-50 animate-fadeIn space-y-3">
          <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-800">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || 'User'} className="w-9 h-9 rounded-full object-cover border border-cyan-400" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-cyan-500 text-slate-950 font-bold flex items-center justify-center text-sm">
                {user.email?.[0].toUpperCase() || 'U'}
              </div>
            )}
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate">{user.displayName || 'Google User'}</p>
              <p className="text-[10px] text-slate-400 truncate font-mono">{user.email}</p>
            </div>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-[11px] px-1 py-0.5 text-slate-400">
              <span className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-cyan-400" />
                {language === 'bn' ? 'ফায়ারবেজ ডাটাবেজ:' : 'Cloud Database:'}
              </span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1 font-mono text-[10px]">
                <CheckCircle2 className="w-3 h-3" />
                {language === 'bn' ? 'সক্রিয়' : 'Connected'}
              </span>
            </div>

            {dbLastSynced && (
              <p className="text-[10px] text-slate-400 px-1 font-mono">
                {language === 'bn' ? 'শেষ সেভ:' : 'Last Synced:'} <span className="text-cyan-300">{dbLastSynced}</span>
              </p>
            )}

            {actionMsg && (
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-[10px] font-bold text-center border border-emerald-500/30 animate-fadeIn">
                {actionMsg}
              </div>
            )}

            <button
              onClick={handleManualSave}
              disabled={isDbSyncing}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-medium transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Cloud className="w-3.5 h-3.5 text-cyan-400" />
                {language === 'bn' ? 'এখনই সেটিং সেভ করুন' : 'Save Settings Now'}
              </span>
              {isDbSyncing && <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" />}
            </button>

            <button
              onClick={handleManualLoad}
              disabled={isDbSyncing}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-medium transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                {language === 'bn' ? 'ডাটাবেজ থেকে রিস্টোর' : 'Restore from Cloud'}
              </span>
            </button>
          </div>

          <div className="pt-2 border-t border-slate-800">
            <button
              onClick={() => {
                setMenuOpen(false);
                signOutUser();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-rose-400 hover:bg-rose-500/10 text-xs font-semibold transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'লগআউট' : 'Sign Out'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
