import React, { useState } from 'react';
import { 
  Download, 
  Smartphone, 
  CheckCircle2, 
  Share2, 
  PlusSquare, 
  X, 
  MoreVertical, 
  ExternalLink,
  Copy,
  Check,
  Zap
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useSmartAC } from '../context/SmartACContext';

interface PWAInstallButtonProps {
  className?: string;
  showText?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ 
  className = '', 
  showText = true 
}) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, isInIframe, install, sharedAppUrl, appUrl } = usePWAInstall();
  const { language } = useSmartAC();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);
  const [copied, setCopied] = useState(false);

  // If already running inside standalone PWA app, show subtle status badge
  if (isInstalled) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold font-mono">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>{language === 'bn' ? 'PWA ইনস্টলড' : 'PWA Installed'}</span>
      </div>
    );
  }

  const handleClick = async () => {
    setIsInstalling(true);
    try {
      // 1. Try to invoke native browser install prompt unconditionally
      const outcome = await install();
      if (outcome === 'accepted') {
        setJustInstalled(true);
        setTimeout(() => setJustInstalled(false), 5000);
        return;
      }
    } catch (err) {
      console.warn('Install prompt error:', err);
    } finally {
      setIsInstalling(false);
    }

    // 2. If prompt did not trigger, show guided modal with 1-tap browser opener & copy link
    setShowGuideModal(true);
  };

  const handleCopyLink = () => {
    const urlToCopy = sharedAppUrl || appUrl;
    if (navigator.clipboard && urlToCopy) {
      navigator.clipboard.writeText(urlToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={isInstalling}
        className={`flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-xl text-xs shadow-md shadow-cyan-500/20 transition-all hover:scale-105 active:scale-95 group shrink-0 ${className}`}
        title={language === 'bn' ? '১ ক্লিকে সরাসরি অ্যাপ ইনস্টল করুন' : '1-Click Direct PWA Install'}
      >
        <Download className="w-3.5 h-3.5 stroke-[2.5] text-slate-950 group-hover:translate-y-0.5 transition-transform" />
        {showText && (
          <>
            <span className="hidden sm:inline">
              {isInstalling
                ? language === 'bn' ? 'ইন্সটল হচ্ছে...' : 'Installing...'
                : language === 'bn' ? '১-ক্লিকে ইনস্টল' : 'Install App'}
            </span>
            <span className="sm:hidden">
              {language === 'bn' ? 'ইনস্টল' : 'Install'}
            </span>
          </>
        )}
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
      </button>

      {/* 1-Click Install Modal with Direct Anchor Link */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-cyan-500/40 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {language === 'bn' ? '১-ক্লিকে অ্যাপ ইনস্টল করুন' : 'Install CoolHome AC App'}
                  </h3>
                  <p className="text-[10px] text-slate-400">Play Store ছাড়াই সরাসরি ফোনে চলবে</p>
                </div>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Direct 1-Tap Browser Open Button (Anchor Tag - Never Blocked) */}
            <div className="space-y-2">
              <a
                href={sharedAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 transition-all hover:scale-102 active:scale-98 text-center"
              >
                <ExternalLink className="w-4 h-4 stroke-[2.5]" />
                <span>{language === 'bn' ? 'ব্রাউজারে খুলুন ও ১-ক্লিকে ইনস্টল করুন' : 'Open in Browser to Install'}</span>
              </a>

              {/* Android Direct Chrome Intent Link */}
              <a
                href={`intent://${sharedAppUrl.replace('https://', '')}#Intent;scheme=https;package=com.android.chrome;end`}
                className="w-full py-2 bg-slate-800 hover:bg-slate-750 text-cyan-300 font-bold text-[11px] rounded-xl flex items-center justify-center gap-1.5 border border-slate-700 transition-colors"
              >
                <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                <span>{language === 'bn' ? 'অ্যান্ড্রয়েড ক্রোম (Chrome) অ্যাপে খুলুন' : 'Open in Chrome on Android'}</span>
              </a>
            </div>

            {/* Direct App Link with Copy Button */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {language === 'bn' ? 'অ্যাপ লিংক (Chrome/Safari-তে পেস্ট করুন):' : 'App URL (Paste in Chrome):'}
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  readOnly
                  value={sharedAppUrl}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[10px] text-slate-300 font-mono truncate"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-2.5 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg text-[10px] font-black flex items-center gap-1 shrink-0 transition-transform active:scale-95"
                >
                  {copied ? <Check className="w-3 h-3 text-slate-950 stroke-[3]" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'কপি হয়েছে' : 'কপি করুন'}</span>
                </button>
              </div>
            </div>

            {/* Simple Steps Guide */}
            <div className="text-xs text-slate-300 space-y-2 p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
              <p className="font-bold text-white text-[11px] flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>{language === 'bn' ? 'মোবাইলে ইনস্টল করার নিয়ম:' : 'Installation Steps:'}</span>
              </p>
              <div className="space-y-1 text-[11px] text-slate-300 pl-1">
                <p><strong>১.</strong> উপরের লিঙ্কে ক্লিক করে ক্রোম বা সাফারিতে খুলুন।</p>
                <p><strong>২.</strong> ব্রাউজারের ৩-ডট (⋮) মেনু অথবা নিচে Share চাপুন।</p>
                <p><strong>৩.</strong> <strong>"Install app"</strong> বা <strong>"Add to Home screen"</strong> চাপুন। সাথে সাথে ফোনে অ্যাপ আইকন তৈরি হয়ে যাবে!</p>
              </div>
            </div>

            <div className="pt-1">
              <button
                onClick={() => setShowGuideModal(false)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold rounded-xl text-xs transition-colors"
              >
                {language === 'bn' ? 'বন্ধ করুন' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Just Installed Toast */}
      {justInstalled && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-500 text-slate-950 px-4 py-3 rounded-2xl font-bold shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-slate-950" />
          <span>
            {language === 'bn' 
              ? 'সফলভাবে অ্যাপ ইনস্টল হয়েছে!' 
              : 'App installed successfully!'}
          </span>
        </div>
      )}
    </>
  );
};
