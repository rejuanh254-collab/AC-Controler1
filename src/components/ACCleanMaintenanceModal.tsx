import React, { useState } from 'react';
import {
  Sparkles,
  Wind,
  ShieldCheck,
  RotateCcw,
  X,
  Droplets,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Power,
  RefreshCw,
} from 'lucide-react';
import { useSmartAC } from '../context/SmartACContext';

interface ACCleanMaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ACCleanMaintenanceModal: React.FC<ACCleanMaintenanceModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { ac, toggleAutoClean, startCleanCycle, cancelCleanCycle, toggleHealth, resetFilterClean, language } = useSmartAC();
  const [resetSuccess, setResetSuccess] = useState(false);

  if (!isOpen) return null;

  const filterHours = ac.filterCleanHours ?? 38;
  const maxHours = 250; // Standard manufacturer recommended cleaning interval
  const percentUsed = Math.min(100, Math.round((filterHours / maxHours) * 100));
  const healthPercent = Math.max(0, 100 - percentUsed);
  const needsClean = filterHours >= 200;

  const handleReset = async () => {
    await resetFilterClean();
    setResetSuccess(true);
    setTimeout(() => setResetSuccess(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-7 space-y-6 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>{language === 'bn' ? 'এসি অটো-ক্লিন ও ফিল্টার কেয়ার' : 'AC Clean & Maintenance'}</span>
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 font-mono font-bold px-2 py-0.5 rounded-full border border-cyan-500/30">
                  {ac.brand || 'Gree'} Inverter
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {language === 'bn'
                  ? 'সেলফ ক্লিনিং ব্লোয়ার, কোল্ড প্লাজমা ও এয়ার ফিল্টার সুরক্ষা'
                  : 'Self-clean coil drying, Cold Plasma & filter maintenance'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 0. Instant Deep Clean Cycle (Active 15-Minute Frost & Dry Cycle) */}
        <div className={`p-5 rounded-2xl border transition-all ${
          ac.isCleaning
            ? 'bg-cyan-950/40 border-cyan-500/60 shadow-lg shadow-cyan-500/20'
            : 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-cyan-500/30'
        } space-y-4`}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center border border-cyan-500/40">
                <Sparkles className={`w-5 h-5 ${ac.isCleaning ? 'animate-spin text-cyan-400' : ''}`} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{language === 'bn' ? '🚀 তাৎক্ষণিক ১৫-মিনিট ডিপ ক্লিন মোড' : '🚀 Instant 15-Min Deep Clean Cycle'}</span>
                  {ac.isCleaning && (
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500 text-slate-950 text-[10px] font-black animate-pulse">
                      {language === 'bn' ? 'চলছে (CL)' : 'RUNNING (CL)'}
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {language === 'bn'
                    ? 'কয়েল ফ্রস্ট ➔ ড্রেন ওয়াশ ➔ ব্লোয়ার ড্রাই ➔ কোল্ড প্লাজমা স্যানিটাইজ'
                    : 'Frost coil ➔ Melt & flush ➔ Heat dry ➔ Plasma sanitize'}
                </p>
              </div>
            </div>

            {ac.isCleaning ? (
              <button
                onClick={cancelCleanCycle}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500 hover:bg-rose-600 text-white shadow-md transition-all active:scale-95 flex items-center gap-1.5"
              >
                <Power className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'ক্লিন বন্ধ করুন' : 'Stop Cleaning'}</span>
              </button>
            ) : (
              <button
                onClick={startCleanCycle}
                className="px-4 py-2 rounded-xl text-xs font-extrabold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-lg shadow-cyan-500/25 transition-all active:scale-95 flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'এখনই ক্লিন শুরু করুন' : 'Start Deep Clean Now'}</span>
              </button>
            )}
          </div>

          {/* Active progress tracker if cleaning */}
          {ac.isCleaning && (
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-cyan-500/40 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold text-cyan-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span>
                    {ac.cleanCycleStage === 'frost'
                      ? (language === 'bn' ? 'ধাপ ১: ইভাপোরেটর কয়েলে আর্দ্রতা ফ্রস্টিং' : 'Step 1: Coil Rapid Freezing')
                      : ac.cleanCycleStage === 'wash'
                      ? (language === 'bn' ? 'ধাপ ২: বরফ গলিয়ে ড্রেন দিয়ে ময়লা ফ্লাশ' : 'Step 2: Rapid Melt & Drain Flush')
                      : ac.cleanCycleStage === 'dry'
                      ? (language === 'bn' ? 'ধাপ ৩: ব্লোয়ার চালিয়ে কয়েল ড্রাইং' : 'Step 3: Indoor Blower Drying')
                      : (language === 'bn' ? 'ধাপ ৪: কোল্ড প্লাজমা অ্যান্টি-ব্যাকটেরিয়াল' : 'Step 4: Plasma Sanitization')}
                  </span>
                </span>
                <span className="font-mono font-bold text-white">
                  {Math.ceil(ac.cleanCycleRemainingMinutes ?? 15)} {language === 'bn' ? 'মিনিট বাকি' : 'mins left'}
                </span>
              </div>

              {/* 4-Step Progress Bar */}
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                <div className={`h-2 rounded-full transition-all ${ac.cleanCycleStage ? 'bg-cyan-400' : 'bg-slate-800'}`} />
                <div className={`h-2 rounded-full transition-all ${['wash', 'dry', 'plasma'].includes(ac.cleanCycleStage || '') ? 'bg-cyan-400' : 'bg-slate-800'}`} />
                <div className={`h-2 rounded-full transition-all ${['dry', 'plasma'].includes(ac.cleanCycleStage || '') ? 'bg-cyan-400' : 'bg-slate-800'}`} />
                <div className={`h-2 rounded-full transition-all ${ac.cleanCycleStage === 'plasma' ? 'bg-cyan-400' : 'bg-slate-800'}`} />
              </div>

              <p className="text-[10px] text-cyan-300/80 text-center font-mono">
                {language === 'bn'
                  ? 'এসির ডিসপ্লেতে "CL" দেখাচ্ছে এবং স্বয়ংক্রিয় ক্লিন চক্র চলছে।'
                  : 'Display shows "CL" code and automatic self-clean cycle is running.'}
              </p>
            </div>
          )}

          {!ac.isCleaning && (
            <div className="text-[11px] text-slate-300 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 leading-relaxed">
              💡 <b>{language === 'bn' ? 'ক্লিন মোড কীভাবে কাজ করে?' : 'How does this mode work?'}</b>{' '}
              {language === 'bn'
                ? 'এই বাটনে চাপ দিলে এসি তাৎক্ষণিকভাবে "CL" মোডে চলে যায়। কম্প্রেসর কয়েলে ঘাম জমিয়ে ধুলো-ময়লা বরফ করে, এরপর তা গলিয়ে ড্রেন পাইপ দিয়ে বের করে দেয় এবং শেষে ব্লোয়ার চালিয়ে পুরোপুরি শুকিয়ে ফেলে।'
                : 'Clicking this immediately commands the AC to enter "CL" mode. It freezes dust moisture onto the coils, flushes it down the drain pipe, and heat-dries the indoor unit.'}
            </div>
          )}
        </div>

        {/* 1. Auto Clean (X-Fan / Coil Self-Drying) Feature Card */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/90 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${ac.autoClean ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-900 text-slate-400'}`}>
                <Wind className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>{language === 'bn' ? 'সেলফ ক্লিন ব্লোয়ার (X-Fan Auto-Clean)' : 'Evaporator Self-Clean (X-Fan)'}</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  {language === 'bn'
                    ? 'কয়েল ড্রায়ার: এসি অফ করার পর ১০ মিনিট ফ্যান চালিয়ে কয়েল শুকায়'
                    : 'Keeps fan running 10m after power off to dry coil moisture'}
                </p>
              </div>
            </div>
            <button
              onClick={toggleAutoClean}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 ${
                ac.autoClean
                  ? 'bg-cyan-500 text-slate-950 shadow-cyan-500/25'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{ac.autoClean ? (language === 'bn' ? 'চালু (ON)' : 'Active') : (language === 'bn' ? 'বন্ধ (OFF)' : 'Disabled')}</span>
            </button>
          </div>

          <div className="text-[11px] text-cyan-300/80 bg-cyan-950/30 p-2.5 rounded-xl border border-cyan-800/30 leading-relaxed">
            💡 <b>{language === 'bn' ? 'কেন প্রয়োজন?' : 'Why use this?'}</b> {language === 'bn'
              ? 'কুলিং মোড চালানোর পর এসির অভ্যন্তরীণ কয়েলে ঘাম বা পানি জমে থাকে। এই অপশনটি চালু রাখলে এসি অফ হওয়ার পরও ব্লোয়ার অতিরিক্ত ১০ মিনিট চলে কয়েল পুরোপুরি শুকিয়ে ফেলে—ফলে কয়েলে কোনো ছত্রাক, ব্যাকটেরিয়া বা দুর্গন্ধ তৈরি হতে পারে না।'
              : 'Cooling condenses water inside the coils. Auto-clean runs the internal blower after shutdown to thoroughly dry the coils, preventing mold, mildew, and stale odor.'}
          </div>

          {/* Important Notice: Why AC does not switch mode immediately */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] leading-relaxed space-y-1.5">
            <div className="font-bold text-amber-400 flex items-center gap-1.5">
              <span>⚠️</span>
              <span>{language === 'bn' ? 'ক্লিক করার সাথে সাথে এসি ক্লিন মোডে যায় না কেন?' : 'Why doesn\'t the AC switch to clean mode immediately?'}</span>
            </div>
            <p className="text-slate-300 leading-normal">
              {language === 'bn'
                ? 'সেলফ ক্লিন (X-Fan) কোনো আলাদা কুলিং মোড (যেমন Cool বা Dry) নয়; এটি একটি পোস্ট-শাটডাউন প্রটেকশন। এসি যখন চলছে তখন এটি ব্যাকগ্রাউন্ডে রেডি থাকে এবং এসি স্বাভাবিকভাবেই ঠান্ডা বাতাস দিতে থাকে। আসল ক্লিনিং শুরু হয় আপনি যখন এসি অফ (Power OFF) করবেন—তখন কম্প্রেসর বন্ধ হলেও ব্লোয়ার ফ্যান ১০-১৫ মিনিট চলে কয়েল শুকাবে।'
                : 'Self-Clean (X-Fan) is not an active cooling mode; it is a standby drying guard. While the AC is on, it continues cooling normally. The actual cleaning/drying cycle only starts when you turn the AC OFF—the blower keeps running for 10-15 mins before shutting down.'}
            </p>
            <div className="pt-1 text-[10px] text-amber-300 font-medium">
              👉 {language === 'bn'
                ? 'পরীক্ষা করতে চাইলে: সেলফ ক্লিন চালু রেখে রিমোট বা অ্যাপ থেকে "এসি বন্ধ (Power OFF)" করুন—দেখবেন এসি বন্ধ না হয়ে ফ্যান চলছে!'
                : 'To test it: Keep Self-Clean ON and tap "Power OFF"—you will see the indoor fan continues running!'}
            </div>
          </div>

          {/* Verification Guide: How to know if Auto Clean is working */}
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
            <h4 className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>{language === 'bn' ? 'কীভাবে বুঝবেন এসি অটো-ক্লিন হচ্ছে?' : 'How to tell if Auto-Clean is running?'}</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300">
              <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-start gap-1.5">
                <span className="text-cyan-400 font-bold shrink-0">১.</span>
                <span>
                  {language === 'bn'
                    ? 'এসি পাওয়ার অফ করার পরও রুম ইউনিটের ব্লোয়ার ফ্যান বন্ধ হবে না; আরও ১০-১৫ মিনিট মৃদু গতিতে বাতাস বের হতে থাকবে।'
                    : 'Indoor blower keeps gently running for 10-15 mins even after turning OFF the AC.'}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-start gap-1.5">
                <span className="text-cyan-400 font-bold shrink-0">২.</span>
                <span>
                  {language === 'bn'
                    ? 'গ্রী বা অধিকাংশ আধুনিক এসির ডিসপ্লেতে "CL" কোড বা ক্লিনিং/ব্লোয়ার আইকন দেখা যায়।'
                    : 'AC unit display shows "CL" or an animated clean/fan icon.'}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-start gap-1.5">
                <span className="text-cyan-400 font-bold shrink-0">৩.</span>
                <span>
                  {language === 'bn'
                    ? 'অ্যাপে থার্মোস্ট্যাট ডায়ালের নিচে "অটো ক্লিন ON" সায়ান ব্যাজ সক্রিয় থাকে।'
                    : 'In this app, an active "Auto Clean ON" cyan badge is shown under the dial.'}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-start gap-1.5">
                <span className="text-cyan-400 font-bold shrink-0">৪.</span>
                <span>
                  {language === 'bn'
                    ? 'কয়েল সম্পূর্ণ শুকিয়ে যাওয়ার পর এসি স্বয়ংক্রিয়ভাবে নিজে থেকেই অফ হয়ে যাবে (কোনো বাটনে চাপতে হবে না)।'
                    : 'The unit shuts down completely on its own once coil moisture is fully dried.'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Cold Plasma / Health Air Purifier Card */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/90 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${Boolean(ac.ionFilter || ac.health) ? 'bg-teal-500/20 text-teal-400' : 'bg-slate-900 text-slate-400'}`}>
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>{language === 'bn' ? 'কোল্ড প্লাজমা এয়ার ক্লিন (Health Purifier)' : 'Cold Plasma Air Purifier'}</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  {language === 'bn'
                    ? 'আয়নাইজার ফিল্টার: রুমের বায়ুবাহিত জীবাণু ও ধূলিকণা ধ্বংস করে'
                    : 'Active air ionization kills airborne allergens and dust'}
                </p>
              </div>
            </div>
            <button
              onClick={toggleHealth}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 ${
                Boolean(ac.ionFilter || ac.health)
                  ? 'bg-teal-500 text-slate-950 shadow-teal-500/25'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{Boolean(ac.ionFilter || ac.health) ? (language === 'bn' ? 'সক্রিয় (ON)' : 'Active') : (language === 'bn' ? 'বন্ধ (OFF)' : 'Off')}</span>
            </button>
          </div>
        </div>

        {/* 3. Filter Mesh Cleaning Life Tracker */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/90 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Droplets className="w-4 h-4 text-cyan-400" />
                <span>{language === 'bn' ? 'এসি ফিল্টার ওয়াশ স্ট্যাটাস' : 'Filter Mesh Wash Tracker'}</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                {language === 'bn'
                  ? `সর্বশেষ ওয়াশের পর চলেছে: ${filterHours} ঘণ্টা (সুপারিশ: ২৫০ ঘণ্টা পরপর ওয়াশ)`
                  : `Operating time since last clean: ${filterHours} hrs (Recommended: Every 250h)`}
              </p>
            </div>
            <span
              className={`text-xs font-mono font-bold px-2.5 py-1 rounded-xl border ${
                needsClean
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}
            >
              {needsClean
                ? (language === 'bn' ? 'ওয়াশ প্রয়োজন!' : 'Wash Needed!')
                : (language === 'bn' ? `${healthPercent}% পরিচ্ছন্ন` : `${healthPercent}% Clean`)}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-500 ${
                needsClean ? 'bg-rose-500' : percentUsed > 60 ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
              style={{ width: `${percentUsed}%` }}
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-slate-500">
              {language === 'bn' ? '০ ঘণ্টা' : '0 hrs'}
            </span>
            <span className="text-[10px] text-slate-500">
              {language === 'bn' ? '২৫০ ঘণ্টা (পরবর্তী ওয়াশ)' : '250 hrs max'}
            </span>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-slate-800/60">
            <p className="text-[11px] text-slate-400">
              {language === 'bn'
                ? 'ফিল্টার ধুয়ে লাগিয়ে থাকলে টাইমার রিসেট করুন:'
                : 'Already washed physical filter? Reset runtime:'}
            </p>
            <button
              onClick={handleReset}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                resetSuccess
                  ? 'bg-emerald-500 text-slate-950 font-extrabold'
                  : 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700'
              }`}
            >
              {resetSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-950" />
                  <span>{language === 'bn' ? 'রিসেট সম্পন্ন!' : 'Reset!'}</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'রিসেট টাইমার (০ ঘণ্টা)' : 'Reset Counter'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 4. DIY AC Cleaning Steps Guide */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/60 space-y-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span>{language === 'bn' ? 'বাসায় সহজে এসি ফিল্টার পরিষ্কারের ৪টি ধাপ' : '4 Easy DIY AC Filter Cleaning Steps'}</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center shrink-0 text-xs">1</span>
              <p className="text-slate-300">
                {language === 'bn' ? 'নিরাপত্তার জন্য এসির পাওয়ার বা সার্কিট ব্রেকার বন্ধ করুন।' : 'Turn off AC main power switch for safety.'}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center shrink-0 text-xs">2</span>
              <p className="text-slate-300">
                {language === 'bn' ? 'ইনডোর ইউনিটের ফ্রন্ট প্যানেল দুই পাশে ধরে আলতোভাবে তুলুন এবং ডাস্ট ফিল্টার বের করুন।' : 'Lift front cover and slide out the mesh filters.'}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center shrink-0 text-xs">3</span>
              <p className="text-slate-300">
                {language === 'bn' ? 'স্বাভাবিক পানির নিচে হালকা ব্রাশ দিয়ে ধুয়ে ছায়ায় শুকান (রোদে দেবেন না)।' : 'Rinse under tap water with soft brush. Dry in shade.'}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center shrink-0 text-xs">4</span>
              <p className="text-slate-300">
                {language === 'bn' ? 'ফিল্টার সঠিক স্লটে লাগিয়ে প্যানেল বন্ধ করুন এবং উপরের রিসেট বাটনে চাপুন।' : 'Slot filters back in, close panel, and tap Reset above.'}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 flex items-center justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-cyan-500/20"
          >
            {language === 'bn' ? 'ঠিক আছে (বন্ধ করুন)' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
};
