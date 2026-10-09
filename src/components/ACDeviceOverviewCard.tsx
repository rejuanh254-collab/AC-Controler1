import React, { useState } from 'react';
import { useSmartAC } from '../context/SmartACContext';
import {
  Snowflake,
  Power,
  ChevronRight,
  Plus,
  RotateCw,
  Edit3,
  Trash2,
  Sliders,
  CheckCircle2,
  Wifi,
  Cloud,
  Zap,
  Leaf,
  Moon,
  Sparkles,
  Wind,
} from 'lucide-react';
import type { ConnectionMethod } from '../types/iot';

interface ACDeviceOverviewCardProps {
  onEnterDevice: () => void;
  onOpenEditModal: () => void;
  onOpenNoArduino: () => void;
  onOpenAddWizard: () => void;
  onOpenVoiceModal?: () => void;
  onOpenCleanModal?: () => void;
}

export const ACDeviceOverviewCard: React.FC<ACDeviceOverviewCardProps> = ({
  onEnterDevice,
  onOpenEditModal,
  onOpenNoArduino,
  onOpenAddWizard,
  onOpenVoiceModal,
  onOpenCleanModal,
}) => {
  const {
    ac,
    climate,
    presets,
    activatePreset,
    togglePower,
    toggleTurbo,
    toggleEco,
    toggleHealth,
    toggleAutoClean,
    processACVoiceCommand,
    unpairDevice,
    language,
    t,
  } = useSmartAC();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showUnpairConfirm, setShowUnpairConfirm] = useState(false);
  const [quickAiStatus, setQuickAiStatus] = useState<string | null>(null);

  const isOnline = ac.isOnline !== undefined ? ac.isOnline : false;
  const isPaired = Boolean(ac.isPaired && ac.deviceName);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleTogglePowerFromCard = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await togglePower();
  };

  const handleQuickAiPrompt = (cmd: string) => {
    const res = processACVoiceCommand(cmd);
    setQuickAiStatus(res.reply);
    setTimeout(() => setQuickAiStatus(null), 3500);
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header section: HOME / My devices + Refresh & Add button */}
      <div className="flex items-center justify-between px-1">
        <div>
          <p className="text-[11px] font-mono tracking-widest text-slate-400 uppercase font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>SMART DASHBOARD</span>
          </p>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            {language === 'bn' ? 'আমার হোম ও ডিভাইস' : 'My Home & Devices'}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {isPaired && (
            <button
              onClick={onOpenAddWizard}
              className="w-9 h-9 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-cyan-400 flex items-center justify-center transition-all shadow-sm active:scale-95"
              title={language === 'bn' ? 'আরেকটি এসি যুক্ত করুন' : 'Add another device'}
            >
              <Plus className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={handleRefresh}
            className={`w-9 h-9 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-all shadow-sm active:scale-95 ${
              isRefreshing ? 'rotate-180 transition-transform duration-500 text-cyan-400' : ''
            }`}
            title="Refresh device status"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* CASE 1: NO DEVICE IS PAIRED / ADDED (Clean Empty State) */}
      {!isPaired ? (
        <div className="bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950 border border-slate-800/80 rounded-3xl p-8 sm:p-12 text-center space-y-5 shadow-2xl animate-fadeIn">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-slate-850 border border-slate-700/80 flex items-center justify-center text-slate-500 shadow-inner">
            <Snowflake className="w-10 h-10 text-slate-400" />
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-lg font-bold text-white">
              {language === 'bn' ? 'এখনও কোনো ডিভাইস যুক্ত করা হয়নি' : 'No devices added yet'}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {language === 'bn'
                ? 'আপনার ঘরের আসল এসি (Gree, Walton, General, Midea ইত্যাদি) ক্লাউড একাউন্ট বা ওয়াইফাই দিয়ে যুক্ত করুন।'
                : 'Connect your real AC unit with Gree+ cloud credentials, Tuya IR hub, or built-in WiFi.'}
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-sm mx-auto">
            <button
              onClick={onOpenAddWizard}
              className="w-full px-6 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-xs sm:text-sm rounded-2xl shadow-xl shadow-cyan-500/20 flex items-center justify-center gap-2 transition-transform active:scale-95"
            >
              <Plus className="w-4 h-4 text-slate-950 stroke-[3]" />
              <span>{language === 'bn' ? 'ডিভাইস এড করুন (Add Device)' : 'Add Device'}</span>
            </button>

            <button
              onClick={onOpenNoArduino}
              className="w-full px-4 py-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white font-semibold text-xs rounded-2xl transition-all"
            >
              {language === 'bn' ? 'Gree+ ক্লাউড লগইন' : 'Gree+ Cloud Login'}
            </button>
          </div>
        </div>
      ) : (
        /* CASE 2: REAL PAIRED DEVICE CARD & DYNAMIC QUICK CONTROLS */
        <div className="space-y-4">
          {/* Main App Device Card */}
          <div
            onClick={onEnterDevice}
            className="group relative cursor-pointer bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-950 hover:from-slate-850 hover:to-slate-900 border border-slate-800 hover:border-cyan-500/50 rounded-3xl p-5 sm:p-6 shadow-2xl transition-all duration-300 active:scale-[0.99] overflow-hidden"
          >
            {/* Ambient Power Glow behind card */}
            {ac.power && isOnline && (
              <div className="absolute -left-12 -top-12 w-48 h-48 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
            )}

            <div className="flex items-center justify-between gap-4">
              {/* Left: Power Toggle & Info */}
              <div className="flex items-center gap-4 min-w-0">
                <button
                  type="button"
                  onClick={handleTogglePowerFromCard}
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border transition-all active:scale-90 shadow-lg ${
                    ac.power && isOnline
                      ? 'bg-gradient-to-br from-cyan-500 to-blue-600 border-cyan-400 text-slate-950 shadow-cyan-500/30'
                      : 'bg-slate-850 border-slate-700/80 text-slate-400 hover:text-white'
                  }`}
                  title={ac.power ? 'Turn AC OFF' : 'Turn AC ON'}
                >
                  <Power className="w-6 h-6 stroke-[2.5]" />
                </button>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-xl font-black text-white tracking-tight truncate group-hover:text-cyan-300 transition-colors">
                      {ac.deviceName || 'Gree Inverter AC'}
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                      {ac.brand || 'Gree'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300/90 font-medium truncate mt-1 flex items-center gap-1.5">
                    <span className="text-cyan-400 font-bold">{ac.location || 'Bedroom'}</span>
                    <span className="text-slate-600">·</span>
                    <span className="capitalize text-slate-300">{ac.mode} Mode</span>
                    <span className="text-slate-600">·</span>
                    <span className="font-mono text-cyan-300 font-black">{ac.temperature}°C</span>
                    {Boolean(ac.ionFilter || ac.health) && (
                      <>
                        <span className="text-slate-600">·</span>
                        <span className="text-teal-300 font-bold flex items-center gap-0.5">
                          🌿 {language === 'bn' ? 'হেলথ' : 'Health'}
                        </span>
                      </>
                    )}
                  </p>

                  {/* Multi-Stage or Active Sync info */}
                  {Boolean(ac.multiStageTimer?.enabled) ? (
                    <p className="text-[11px] font-mono text-purple-300 mt-1 flex items-center gap-1.5 font-bold animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping"></span>
                      <span>
                        {language === 'bn'
                          ? `${ac.multiStageTimer?.currentStage === 1 ? '১ম' : ac.multiStageTimer?.currentStage === 2 ? '২য়' : '৩য়'} স্টেজ চলছে: ${ac.temperature}°C (${Math.ceil(ac.multiStageTimer?.remainingMinutes ?? 0)} মি. বাকি)`
                          : `Stage ${ac.multiStageTimer?.currentStage} active: ${ac.temperature}°C (${Math.ceil(ac.multiStageTimer?.remainingMinutes ?? 0)}m left)`}
                      </span>
                    </p>
                  ) : (
                    <p className="text-[10px] font-mono text-slate-400 mt-1 flex items-center gap-2">
                      <span className="flex items-center gap-1 text-slate-400">
                        <Wifi className="w-3 h-3 text-emerald-400" />
                        <span>Room: <b>{climate.roomTemp}°C</b> ({climate.roomHumidity}% RH)</span>
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {/* Right: Online Pill & Enter Chevron */}
              <div className="flex items-center gap-3 shrink-0">
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-extrabold tracking-wider uppercase border ${
                    isOnline
                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 shadow-md shadow-emerald-500/10'
                      : 'bg-rose-950/60 text-rose-300 border-rose-500/40'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isOnline ? 'bg-emerald-400 animate-ping' : 'bg-rose-400'
                    }`}
                  />
                  <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
                </div>

                <div className="w-8 h-8 rounded-xl bg-slate-800/80 group-hover:bg-cyan-500 group-hover:text-slate-950 text-slate-400 flex items-center justify-center transition-all">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Quick Scene Buttons embedded directly inside card for 1-Tap Control */}
            <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-5 gap-2" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={toggleTurbo}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                  ac.turbo
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20'
                    : 'bg-slate-950/80 hover:bg-slate-850 text-slate-300 border-slate-800'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'টার্বো ১৬°' : 'Turbo 16°C'}</span>
              </button>

              <button
                onClick={toggleEco}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                  ac.eco
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                    : 'bg-slate-950/80 hover:bg-slate-850 text-slate-300 border-slate-800'
                }`}
              >
                <Leaf className="w-3.5 h-3.5 text-emerald-400" />
                <span>{language === 'bn' ? 'ইকো ২৫°' : 'Eco 25°C'}</span>
              </button>

              {/* Self Clean / X-Fan Quick Toggle right on Home Card */}
              <button
                onClick={toggleAutoClean}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                  ac.autoClean
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20'
                    : 'bg-slate-950/80 hover:bg-slate-850 text-cyan-300 border-cyan-800/40'
                }`}
                title={language === 'bn' ? 'সেলফ ক্লিন ব্লোয়ার (X-Fan)' : 'Self Clean (X-Fan)'}
              >
                <Wind className="w-3.5 h-3.5 text-cyan-400" />
                <span>{language === 'bn' ? 'সেলফ ক্লিন' : 'Self Clean'}</span>
                {ac.autoClean && <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />}
              </button>

              <button
                onClick={() => activatePreset('preset-1')}
                className="py-2 px-3 rounded-xl bg-slate-950/80 hover:bg-slate-850 border border-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                <Moon className="w-3.5 h-3.5 text-purple-400" />
                <span>{language === 'bn' ? 'নাইট স্লিপ ২৬°' : 'Night 26°C'}</span>
              </button>

              <button
                onClick={toggleHealth}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                  Boolean(ac.ionFilter || ac.health)
                    ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-md shadow-teal-500/20'
                    : 'bg-slate-950/80 hover:bg-slate-850 text-slate-300 border-slate-800'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                <span>{language === 'bn' ? 'হেলথ এয়ার' : 'Health Filter'}</span>
              </button>
            </div>

            {/* Dedicated Clean & Care Banner directly on the Device Card */}
            {onOpenCleanModal && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenCleanModal();
                }}
                className="mt-3 p-2.5 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-slate-950/60 to-blue-950/40 border border-cyan-800/30 hover:border-cyan-500/40 flex items-center justify-between gap-3 cursor-pointer group transition-all"
              >
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${ac.autoClean ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-900 text-slate-400'}`}>
                    <Wind className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors flex items-center gap-1.5">
                      <span>{language === 'bn' ? 'এসি অটো-ক্লিন ও ফিল্টার কেয়ার' : 'AC Clean & Filter Care'}</span>
                      {ac.autoClean && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono font-bold">
                          {language === 'bn' ? 'চালু' : 'ON'}
                        </span>
                      )}
                    </h5>
                    <p className="text-[10px] text-slate-400">
                      {language === 'bn'
                        ? 'কয়েল ড্রায়ার (X-Fan), ফিল্টার ওয়াশ টাইমার ও ক্লিনিং গাইড'
                        : 'Coil drying (X-Fan), filter timer & cleaning guide'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[11px] font-bold text-cyan-400 group-hover:text-cyan-300">
                  <span>{language === 'bn' ? 'ওপেন করুন' : 'Open'}</span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            )}
          </div>

          {/* Quick AI Smart Assistant Bar directly on Home */}
          <div className="bg-gradient-to-r from-slate-900/90 via-slate-900 to-slate-950 border border-slate-800/80 rounded-3xl p-4 sm:p-5 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-cyan-500/20">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-extrabold text-white">
                    {language === 'bn' ? 'স্মার্ট এআই এসি অ্যাসিস্ট্যান্ট' : 'Smart AI Voice & Text Assistant'}
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    {language === 'bn' ? 'এক ক্লিকে বাংলায় ভয়েস বা কমান্ড দিন' : 'One-tap Bengali / English voice controls'}
                  </p>
                </div>
              </div>

              {onOpenVoiceModal && (
                <button
                  onClick={onOpenVoiceModal}
                  className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-cyan-500/20 transition-all active:scale-95 flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'মাইক / ভয়েস' : 'Voice UI'}</span>
                </button>
              )}
            </div>

            {/* Quick Bengali / English AI Prompt Chips */}
            <div className="flex flex-wrap gap-2 pt-1">
              {[
                { label: language === 'bn' ? 'এসি ২৪ এ দাও' : 'Set temp to 24°C', cmd: 'এসি ২৪ এ দাও' },
                { label: language === 'bn' ? 'টার্বো মোড চালাও' : 'Enable Turbo mode', cmd: 'টার্বো মোড অন করো' },
                { label: language === 'bn' ? 'সেলফ ক্লিন চালু করো' : 'Auto Clean ON', cmd: 'সেলফ ক্লিন চালু করো' },
                { label: language === 'bn' ? 'ইকো মোড দাও' : 'Eco Mode', cmd: 'ইকো মোড চালু করো' },
                { label: language === 'bn' ? 'হেলথ ফিল্টার অন' : 'Health Filter', cmd: 'হেলথ ফিল্টার অন করো' },
                { label: language === 'bn' ? 'এসি বন্ধ করো' : 'Turn Off AC', cmd: 'এসি বন্ধ করো' },
              ].map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickAiPrompt(chip.cmd)}
                  className="px-3 py-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800/80 text-cyan-300 hover:text-white text-xs font-medium transition-all active:scale-95"
                >
                  ✨ {chip.label}
                </button>
              ))}
            </div>

            {quickAiStatus && (
              <div className="p-3 bg-cyan-950/60 border border-cyan-500/40 rounded-2xl text-xs text-cyan-200 animate-fadeIn font-mono flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>{quickAiStatus}</span>
              </div>
            )}
          </div>

          {/* Quick Edit / Unpair Strip */}
          <div className="flex items-center justify-between px-2 text-xs text-slate-400 pt-1">
            <button
              onClick={onOpenEditModal}
              className="hover:text-cyan-300 flex items-center gap-1 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'ডিভাইসের নাম এডিট করুন' : 'Edit device name'}</span>
            </button>

            {showUnpairConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-rose-400 font-semibold">
                  {language === 'bn' ? 'নিশ্চিত রিমুভ করবেন?' : 'Remove device?'}
                </span>
                <button
                  onClick={async () => {
                    await unpairDevice();
                    setShowUnpairConfirm(false);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-bold"
                >
                  {language === 'bn' ? 'হ্যাঁ' : 'Yes'}
                </button>
                <button
                  onClick={() => setShowUnpairConfirm(false)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300"
                >
                  {language === 'bn' ? 'না' : 'No'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowUnpairConfirm(true)}
                className="hover:text-rose-400 flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'ডিভাইস মুছুন' : 'Delete device'}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
