import React, { useState } from 'react';
import {
  Snowflake,
  Droplets,
  Wind,
  Flame,
  Zap,
  Leaf,
  ArrowUpDown,
  ArrowLeftRight,
  Fan,
  Sparkles,
} from 'lucide-react';
import { useSmartAC } from '../context/SmartACContext';
import { ACCleanMaintenanceModal } from './ACCleanMaintenanceModal';
import type { ACMode, ACFanSpeed, ACSwingV, ACSwingH } from '../types/iot';

const MODES: Array<{ id: ACMode; labelEn: string; labelBn: string; icon: React.FC<any>; color: string }> = [
  { id: 'cool', labelEn: 'Cool', labelBn: 'কুল (ঠান্ডা)', icon: Snowflake, color: 'text-cyan-400' },
  { id: 'eco', labelEn: 'Eco', labelBn: 'ইকো (সাশ্রয়ী)', icon: Leaf, color: 'text-emerald-400' },
  { id: 'dry', labelEn: 'Dry', labelBn: 'ড্রাই (আর্দ্রতা)', icon: Droplets, color: 'text-blue-400' },
  { id: 'heat', labelEn: 'Heat', labelBn: 'হিট (গরম)', icon: Flame, color: 'text-amber-400' },
  { id: 'fan', labelEn: 'Fan', labelBn: 'ফ্যান বাতাস', icon: Wind, color: 'text-slate-300' },
  { id: 'auto', labelEn: 'Auto', labelBn: 'অটোমেটিক', icon: Zap, color: 'text-purple-400' },
];

const FAN_SPEEDS: Array<{ id: ACFanSpeed; label: string; labelBn: string; bars: number }> = [
  { id: 'auto', label: 'Auto', labelBn: 'অটো', bars: 0 },
  { id: 'quiet', label: 'Quiet', labelBn: 'সাইলেন্ট', bars: 1 },
  { id: 'low', label: 'Low', labelBn: 'কম', bars: 2 },
  { id: 'med', label: 'Med', labelBn: 'মাঝারি', bars: 3 },
  { id: 'high', label: 'High', labelBn: 'উচ্চ', bars: 4 },
  { id: 'turbo', label: 'Turbo', labelBn: 'টার্বো', bars: 5 },
];

const VERTICAL_SWING_OPTIONS: Array<{
  id: ACSwingV;
  labelEn: string;
  labelBn: string;
  iconHint: string;
}> = [
  { id: 'auto', labelEn: 'Full Auto', labelBn: 'ফুল অটো সুইং', iconHint: '↕️' },
  { id: 'highest', labelEn: 'Highest', labelBn: 'সর্বোচ্চ উপরে', iconHint: '⤒' },
  { id: 'high', labelEn: 'High', labelBn: 'উপরে', iconHint: '↑' },
  { id: 'middle', labelEn: 'Middle', labelBn: 'মাঝামাঝি', iconHint: '•' },
  { id: 'low', labelEn: 'Low', labelBn: 'নিচে', iconHint: '↓' },
  { id: 'lowest', labelEn: 'Lowest', labelBn: 'সর্বনিম্ন নিচে', iconHint: '⤓' },
  { id: 'off', labelEn: 'Fixed / Off', labelBn: 'স্থির / বন্ধ', iconHint: '⏹' },
];

const HORIZONTAL_SWING_OPTIONS: Array<{
  id: ACSwingH;
  labelEn: string;
  labelBn: string;
  iconHint: string;
}> = [
  { id: 'auto', labelEn: 'Full Auto', labelBn: 'ফুল সুইং', iconHint: '↔️' },
  { id: 'wide', labelEn: 'Wide Sweep', labelBn: 'ওয়াইড সুইং', iconHint: '⇹' },
  { id: 'left', labelEn: 'Full Left', labelBn: 'বামে', iconHint: '⇤' },
  { id: 'left-mid', labelEn: 'Left-Center', labelBn: 'বাম-মাঝ', iconHint: '←' },
  { id: 'middle', labelEn: 'Center', labelBn: 'সরাসরি মাঝে', iconHint: '•' },
  { id: 'right-mid', labelEn: 'Right-Center', labelBn: 'ডান-মাঝ', iconHint: '→' },
  { id: 'right', labelEn: 'Full Right', labelBn: 'ডানে', iconHint: '⇥' },
  { id: 'off', labelEn: 'Fixed / Off', labelBn: 'স্থির / বন্ধ', iconHint: '⏹' },
];

export const ACModeSelector: React.FC = () => {
  const { ac, setMode, setFanSpeed, updateAC, toggleAutoClean, language, t } = useSmartAC();
  const [showCleanModal, setShowCleanModal] = useState(false);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-6">
      {/* 1. AC Operating Mode Grid */}
      <div className="space-y-3">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <span>{t.mode}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCleanModal(true)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all flex items-center gap-1.5 shadow-sm active:scale-95 ${
                ac.isCleaning
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-extrabold shadow-cyan-500/30 animate-pulse'
                  : ac.autoClean
                  ? 'bg-cyan-500/25 text-cyan-300 border-cyan-500/40'
                  : 'bg-slate-800/90 text-cyan-300 border-slate-700/90 hover:border-cyan-500/50'
              }`}
              title={language === 'bn' ? 'সেলফ ক্লিন ও ফিল্টার কেয়ার সেন্টার' : 'Self-Clean & Filter Care Center'}
            >
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>
                {ac.isCleaning
                  ? (language === 'bn' ? '✨ ক্লিন চলছে (CL)' : '✨ Cleaning (CL)')
                  : ac.autoClean
                  ? (language === 'bn' ? 'অটো ক্লিন ON' : 'Clean ON')
                  : (language === 'bn' ? 'সেলফ ক্লিন' : 'Auto Clean')}
              </span>
            </button>
            <span className="font-mono text-cyan-400 text-[11px] capitalize">{ac.mode}</span>
          </div>
        </label>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {MODES.map((m) => {
            const Icon = m.icon;
            const isSelected = ac.mode === m.id && ac.power;

            return (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`group flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-200 ${
                  isSelected
                    ? 'bg-cyan-500/20 border-cyan-400/80 text-white shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/40 scale-102'
                    : 'bg-slate-950/70 border-slate-800/80 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center mb-1.5 transition-transform group-hover:scale-110 ${
                    isSelected ? 'bg-cyan-500/30 text-cyan-300 shadow-md' : 'bg-slate-900 text-slate-400'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold">
                  {language === 'bn' ? m.labelBn : m.labelEn}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Fan Speed Stepped Selector */}
      <div className="space-y-3 pt-2 border-t border-slate-800/80">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Fan className="w-4 h-4 text-cyan-400" />
            <span>{t.fanSpeed}</span>
          </span>
          <span className="font-mono text-cyan-400 text-[11px] capitalize">
            {(ac.fanSpeed === 'quiet' || ac.quiet)
              ? (language === 'bn' ? 'সাইলেন্ট মোড' : 'Quiet Mode')
              : (ac.fanSpeed === 'turbo' || ac.turbo)
              ? (language === 'bn' ? 'টার্বো মোড' : 'Turbo Mode')
              : `${ac.fanSpeed} Speed`}
          </span>
        </label>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {FAN_SPEEDS.map((f) => {
            const isSelected =
              (f.id === 'quiet'
                ? (ac.fanSpeed === 'quiet' || ac.quiet)
                : f.id === 'turbo'
                ? (ac.fanSpeed === 'turbo' || ac.turbo)
                : (ac.fanSpeed === f.id && !ac.quiet && !ac.turbo)) && ac.power;

            return (
              <button
                key={f.id}
                onClick={() => setFanSpeed(f.id)}
                className={`py-2.5 px-3 rounded-2xl border text-center transition-all duration-200 flex flex-col items-center justify-center gap-1 ${
                  isSelected
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/30 scale-102'
                    : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <span className="text-xs">{language === 'bn' ? f.labelBn : f.label}</span>
                {/* Visual speed signal bars */}
                <div className="flex items-end gap-0.5 h-3">
                  {[1, 2, 3, 4, 5].map((barIndex) => (
                    <div
                      key={barIndex}
                      className={`w-1 rounded-xs transition-all ${
                        f.bars >= barIndex
                          ? isSelected
                            ? 'bg-slate-950 h-full'
                            : 'bg-cyan-400 h-full'
                          : 'bg-slate-800 h-1.5'
                      }`}
                      style={{ height: `${(barIndex / 5) * 100}%` }}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Airflow & Swing Controls (Vertical & Horizontal) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-3 border-t border-slate-800/80">
        {/* Vertical Swing */}
        <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-medium text-slate-300">
              <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
              <span>{language === 'bn' ? 'ভার্টিক্যাল সুইং (উপর-নিচ)' : t.verticalSwing}</span>
            </span>
            <span className="font-mono text-cyan-400 text-[11px] font-bold bg-cyan-950/40 px-2 py-0.5 rounded-lg border border-cyan-800/40">
              {(() => {
                const cur = VERTICAL_SWING_OPTIONS.find((o) => o.id === ac.swingV);
                return cur ? (language === 'bn' ? cur.labelBn : cur.labelEn) : ac.swingV;
              })()}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {VERTICAL_SWING_OPTIONS.map((pos) => {
              const isSelected = ac.swingV === pos.id;
              return (
                <button
                  key={pos.id}
                  onClick={() => updateAC({ swingV: pos.id, power: true })}
                  className={`py-2 px-2 rounded-xl text-center transition-all flex flex-col items-center justify-center gap-0.5 ${
                    isSelected
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/25 scale-102'
                      : 'bg-slate-900/90 border border-slate-800/80 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <span className="text-xs leading-none">{pos.iconHint}</span>
                  <span className="text-[11px] font-semibold leading-tight mt-0.5">
                    {language === 'bn' ? pos.labelBn : pos.labelEn}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Horizontal Swing */}
        <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-medium text-slate-300">
              <ArrowLeftRight className="w-3.5 h-3.5 text-cyan-400" />
              <span>{language === 'bn' ? 'হরাইজন্টাল সুইং (ডান-বাম)' : t.horizontalSwing}</span>
            </span>
            <span className="font-mono text-cyan-400 text-[11px] font-bold bg-cyan-950/40 px-2 py-0.5 rounded-lg border border-cyan-800/40">
              {(() => {
                const cur = HORIZONTAL_SWING_OPTIONS.find((o) => o.id === ac.swingH);
                return cur ? (language === 'bn' ? cur.labelBn : cur.labelEn) : ac.swingH;
              })()}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {HORIZONTAL_SWING_OPTIONS.map((pos) => {
              const isSelected = ac.swingH === pos.id;
              return (
                <button
                  key={pos.id}
                  onClick={() => updateAC({ swingH: pos.id, power: true })}
                  className={`py-2 px-2 rounded-xl text-center transition-all flex flex-col items-center justify-center gap-0.5 ${
                    isSelected
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/25 scale-102'
                      : 'bg-slate-900/90 border border-slate-800/80 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <span className="text-xs leading-none">{pos.iconHint}</span>
                  <span className="text-[11px] font-semibold leading-tight mt-0.5">
                    {language === 'bn' ? pos.labelBn : pos.labelEn}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {showCleanModal && (
        <ACCleanMaintenanceModal isOpen={showCleanModal} onClose={() => setShowCleanModal(false)} />
      )}
    </div>
  );
};
