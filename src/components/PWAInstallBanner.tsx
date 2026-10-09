import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Smartphone, 
  X, 
  CheckCircle2, 
  Share2, 
  PlusSquare, 
  Sparkles,
  Monitor,
  MoreVertical,
  HelpCircle,
  ExternalLink,
  Copy,
  Check,
  Zap
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useSmartAC } from '../context/SmartACContext';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, isAndroid, isInIframe, install, sharedAppUrl, appUrl } = usePWAInstall();
  const { language } = useSmartAC();
  const [dismissed, setDismissed] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const lastDismissed = sessionStorage.getItem('coolhome_pwa_banner_dismissed');
    if (lastDismissed) {
      setDismissed(true);
    }
  }, []);

  // If already running inside standalone PWA app, hide banner
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    setIsInstalling(true);
    try {
      // Try native prompt first
      const outcome = await install();
      if (outcome === 'accepted') {
        setJustInstalled(true);
        setDismissed(true);
        setTimeout(() => setJustInstalled(false), 5000);
        return;
      }
    } catch (err) {
      console.warn('Install banner error:', err);
    } finally {
      setIsInstalling(false);
    }

    // If native prompt didn't trigger, show modal with direct browser links
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

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('coolhome_pwa_banner_dismissed', 'true');
  };

  return (
    <>
      {/* 1-Click Install Floating Banner */}
      {!dismissed && (
        <div className="fixed bottom-20 md:bottom-6 left-3 right-3 md:left-auto md:right-6 md:max-w-md z-40 animate-slideUp">
          <div className="bg-slate-900/95 backdrop-blur-xl border border-cyan-500/40 p-4 rounded-3xl shadow-2xl shadow-cyan-950/70 relative overflow-hidden ring-1 ring-cyan-500/30">
            {/* Top decorative gradient bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-emerald-400" />

            <div className="flex items-start gap-3.5">
              {/* App Icon */}
              <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-cyan-500/40 p-1 flex items-center justify-center shrink-0 shadow-lg relative group">
                <img 
                  src="/pwa-192x192.png" 
                  alt="CoolHome AC" 
                  className="w-full h-full object-cover rounded-xl"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/icon.svg';
                  }}
                />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-950 animate-ping" />
              </div>

              {/* Text Info */}
              <div className="flex-1 min-w-0 pr-6">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-black text-white truncate">
                    CoolHome AC App
                  </h4>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/30">
                    PWA
                  </span>
                </div>

                <p className="text-xs text-slate-300 mt-1 leading-snug">
                  {language === 'bn' 
                    ? '১ ক্লিকে সরাসরি অ্যাপ ইনস্টল করুন! প্লে-স্টোর ছাড়াই ফুল-স্ক্রিনে চলবে।' 
                    : '1-click direct install! Runs standalone fullscreen like a native app.'}
                </p>

                {/* 1-Click Install Button & Direct Link */}
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={handleInstallClick}
                    disabled={isInstalling}
                    className="flex-1 py-2 px-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-1.5 transition-all hover:scale-102 active:scale-98"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />
                    <span>
                      {isInstalling 
                        ? (language === 'bn' ? 'ইন্সটল হচ্ছে...' : 'Installing...') 
                        : (language === 'bn' ? '১-ক্লিকে ইনস্টল' : '1-Click Install')}
                    </span>
                  </button>

                  <a
                    href={sharedAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1 border border-slate-700 transition-colors shrink-0"
                    title={language === 'bn' ? 'ব্রাউজার ট্যাবে খুলুন' : 'Open in Browser'}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'ট্যাবে খুলুন' : 'Open'}</span>
                  </a>

                  <button
                    onClick={() => setShowGuideModal(true)}
                    className="p-2 text-slate-400 hover:text-cyan-300 rounded-xl hover:bg-slate-800 transition-colors"
                    title={language === 'bn' ? 'সহায়তা' : 'Help'}
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>

                  <button
                    onClick={handleDismiss}
                    className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                    title={language === 'bn' ? 'পরে করব' : 'Later'}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={handleDismiss}
                className="absolute top-2.5 right-2.5 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guided Installation Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-cyan-500/40 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center border border-cyan-500/30">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {language === 'bn' ? '১-ক্লিকে অ্যাপ ইনস্টল করার নিয়ম' : 'How to Install CoolHome AC'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {language === 'bn' ? 'মোবাইলে হোম স্ক্রিনে নেটিভ অ্যাপ তৈরি করুন' : 'Add to home screen as a standalone app'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Direct Open Button */}
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
                {language === 'bn' ? 'অ্যাপ লিংক (Chrome/Safari ব্রাউজারে খুলুন):' : 'App URL (Open in Chrome):'}
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

            {/* Device-Specific Steps */}
            <div className="space-y-2.5 text-xs text-slate-300">
              {/* Option A: Android Chrome */}
              <div className="p-3 bg-slate-950/80 rounded-2xl border border-cyan-500/20 space-y-2">
                <div className="flex items-center gap-2 text-cyan-400 font-bold">
                  <Smartphone className="w-4 h-4" />
                  <span>{language === 'bn' ? 'অ্যান্ড্রয়েড ফোন (Chrome / Samsung Internet):' : 'Android (Chrome / Samsung):'}</span>
                </div>
                <div className="space-y-1 text-slate-300 text-[11px] pl-1">
                  <p><strong>১.</strong> উপরের লিঙ্কে ক্লিক করে অথবা কপি করে ক্রোম ব্রাউজারে খুলুন।</p>
                  <p><strong>২.</strong> ব্রাউজারের উপরে ডানদিকের ৩-ডট (⋮) মেনু চাপুন।</p>
                  <p><strong>৩.</strong> তালিকা থেকে <strong>"Install app"</strong> অথবা <strong>"Add to Home screen"</strong> চাপুন। সাথে সাথে ফোনে অ্যাপ আইকন তৈরি হয়ে যাবে!</p>
                </div>
              </div>

              {/* Option B: iOS Safari */}
              <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold">
                  <Share2 className="w-4 h-4" />
                  <span>{language === 'bn' ? 'আইফোন / আইপ্যাড (Apple Safari):' : 'iPhone / iPad (Safari):'}</span>
                </div>
                <div className="space-y-1 text-slate-300 text-[11px] pl-1">
                  <p><strong>১.</strong> সাফারি ব্রাউজারে লিংকটি খুলে নিচে <strong>Share</strong> আইকন চাপুন।</p>
                  <p><strong>২.</strong> নিচে স্ক্রল করে <strong>"Add to Home Screen"</strong> চাপুন।</p>
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowGuideModal(false)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-colors"
              >
                {language === 'bn' ? 'বন্ধ করুন' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {justInstalled && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-500 text-slate-950 px-4 py-3 rounded-2xl font-bold shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-slate-950" />
          <span>
            {language === 'bn' 
              ? 'অভিনন্দন! CoolHome AC সফলভাবে আপনার ডিভাইসে ইন্সটল হয়েছে।' 
              : 'Success! CoolHome AC is now installed on your device.'}
          </span>
        </div>
      )}
    </>
  );
};
