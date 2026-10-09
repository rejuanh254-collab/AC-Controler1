import React, { useState } from 'react';
import {
  Zap,
  Leaf,
  Moon,
  Lightbulb,
  Sparkles,
  VolumeX,
  Lock,
  Unlock,
  Clock,
  Wind,
} from 'lucide-react';
import { useSmartAC } from '../context/SmartACContext';
import { ACStepTimerModal } from './ACStepTimerModal';
import { ACCleanMaintenanceModal } from './ACCleanMaintenanceModal';

export const ACQuickFeatures: React.FC = () => {
  const {
    ac,
    toggleTurbo,
    toggleEco,
    toggleSleep,
    toggleDisplayLight,
    toggleIonizer,
    toggleHealth,
    toggleAutoClean,
    toggleQuiet,
    toggleLock,
    language,
    t,
  } = useSmartAC();

  const [showStepModal, setShowStepModal] = useState(false);
  const [showCleanModal, setShowCleanModal] = useState(false);

  const features = [
    {
      id: 'turbo',
      label: t.turbo,
      active: ac.turbo,
      icon: Zap,
      onClick: toggleTurbo,
      color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      activeBg: 'bg-cyan-500 text-slate-950 font-bold',
      desc: language === 'bn' ? 'ম্যাক্সিমাম কুলিং পাওয়ার' : '100% Compressor Output',
    },
    {
      id: 'eco',
      label: t.eco,
      active: ac.eco,
      icon: Leaf,
      onClick: toggleEco,
      color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      activeBg: 'bg-emerald-500 text-slate-950 font-bold',
      desc: language === 'bn' ? '৫০% বিদ্যুৎ সাশ্রয়' : 'Save ~45% Electricity',
    },
    {
      id: 'sleep',
      label: t.sleep,
      active: ac.sleep,
      icon: Moon,
      onClick: toggleSleep,
      color: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      activeBg: 'bg-purple-500 text-slate-950 font-bold',
      desc: language === 'bn' ? 'রাতের আরামদায়ক কার্ভ' : 'Gradual Temp Increase',
    },
    {
      id: 'light',
      label: t.displayLight,
      active: ac.displayLight,
      icon: Lightbulb,
      onClick: toggleDisplayLight,
      color: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      activeBg: 'bg-amber-500 text-slate-950 font-bold',
      desc: language === 'bn' ? 'প্যানেল LED অন/অফ' : 'Indoor Unit LED Panel',
    },
    {
      id: 'health',
      label: language === 'bn' ? 'হেলথ ফিল্টার' : 'Health Mode',
      active: Boolean(ac.ionFilter || ac.health),
      icon: Sparkles,
      onClick: toggleHealth,
      color: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
      activeBg: 'bg-teal-500 text-slate-950 font-bold',
      desc: language === 'bn' ? 'কোল্ড প্লাজমা বিশুদ্ধ বাতাস' : 'Cold Plasma Air Purifier',
    },
    {
      id: 'clean',
      label: language === 'bn' ? 'সেলফ ক্লিন' : 'Auto Clean',
      active: ac.autoClean,
      icon: Sparkles,
      onClick: toggleAutoClean,
      color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      activeBg: 'bg-cyan-500 text-slate-950 font-extrabold shadow-cyan-500/30',
      desc: language === 'bn' ? 'X-Fan কয়েল সেলফ ড্রায়ার' : 'X-Fan Coil Auto-Dry',
    },
    {
      id: 'stepTimer',
      label: language === 'bn' ? 'স্টেপ টাইমার' : 'Step Timer',
      active: Boolean(ac.multiStageTimer?.enabled),
      icon: Clock,
      onClick: () => setShowStepModal(true),
      color: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      activeBg: 'bg-purple-500 text-white font-bold',
      desc: ac.multiStageTimer?.enabled
        ? (language === 'bn' ? `স্টেজ ${ac.multiStageTimer.currentStage} রানিং` : `Stage ${ac.multiStageTimer.currentStage} Active`)
        : (language === 'bn' ? 'অটো টেম্পারেচার রুল' : 'Timed Temp Rules'),
    },
    {
      id: 'quiet',
      label: t.quiet,
      active: ac.quiet,
      icon: VolumeX,
      onClick: toggleQuiet,
      color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
      activeBg: 'bg-indigo-500 text-slate-950 font-bold',
      desc: language === 'bn' ? '১৯ dB অতি নীরব ব্লোয়ার' : '19dB Ultra-Quiet Fan',
    },
    {
      id: 'lock',
      label: ac.locked ? t.locked : (language === 'bn' ? 'রিমোট আনলক' : 'Lock Remote'),
      active: ac.locked,
      icon: ac.locked ? Lock : Unlock,
      onClick: toggleLock,
      color: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      activeBg: 'bg-rose-500 text-slate-950 font-bold',
      desc: language === 'bn' ? 'বাচ্চাদের চাপাচাপি রোধ' : 'Prevent Accidental Clicks',
    },
  ];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          {language === 'bn' ? 'অতিরিক্ত ফিচারসমূহ ও স্পেশাল মোড' : 'Special Modes & Advanced Inverter Features'}
        </h3>
        <button
          onClick={() => setShowCleanModal(true)}
          className="text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 px-3 py-1.5 rounded-xl border border-cyan-400/50 flex items-center gap-1.5 transition-all shadow-md shadow-cyan-500/20 active:scale-95"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
          <span>{language === 'bn' ? '✨ সেলফ ক্লিন ও ফিল্টার কেয়ার ➔' : '✨ Clean & Filter Care ➔'}</span>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {features.map((f) => {
          const Icon = f.icon;

          return (
            <button
              key={f.id}
              onClick={f.onClick}
              className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all duration-200 ${
                f.active
                  ? `${f.activeBg} shadow-lg scale-102`
                  : 'bg-slate-950/70 border-slate-800/80 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className="w-5 h-5" />
                <span className="w-2 h-2 rounded-full bg-current opacity-80"></span>
              </div>
              <div>
                <p className="text-xs font-bold truncate">{f.label}</p>
                <p className="text-[10px] opacity-75 truncate">{f.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {showStepModal && <ACStepTimerModal onClose={() => setShowStepModal(false)} />}
      {showCleanModal && <ACCleanMaintenanceModal isOpen={showCleanModal} onClose={() => setShowCleanModal(false)} />}
    </div>
  );
};
