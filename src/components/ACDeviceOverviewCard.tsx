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
  CheckCircle2,
  Wifi,
  Zap,
  Leaf,
  Moon,
  Sparkles,
  Wind,
  Thermometer,
  Droplets,
  Activity,
  MapPin,
  SlidersHorizontal,
  Minus,
  ShieldCheck,
  Clock,
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
    power,
    activatePreset,
    togglePower,
    toggleTurbo,
    toggleEco,
    toggleHealth,
    toggleAutoClean,
    stepTemperature,
    processACVoiceCommand,
    unpairDevice,
    language,
    t,
  } = useSmartAC();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showUnpairConfirm, setShowUnpairConfirm] = useState(false);
  const [quickAiStatus, setQuickAiStatus] = useState<string | null>(null);

  const isOnline = ac.isOnline !== undefined ? ac.isOnline : true;
  const isPaired = Boolean(ac.isPaired && ac.deviceName);

  // Time-aware greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return language === 'bn' ? 'সুপ্রভাত' : 'Good Morning';
    if (hour < 17) return language === 'bn' ? 'শুভ দুপুর' : 'Good Afternoon';
    if (hour < 21) return language === 'bn' ? 'শুভ সন্ধ্যা' : 'Good Evening';
    return language === 'bn' ? 'শুভ রাত্রি' : 'Good Night';
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleTogglePowerFromCard = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await togglePower();
  };

  const handleTempStep = async (e: React.MouseEvent, delta: number) => {
    e.stopPropagation();
    await stepTemperature(delta);
  };

  const handleQuickAiPrompt = (cmd: string) => {
    const res = processACVoiceCommand(cmd);
    setQuickAiStatus(res.reply);
    setTimeout(() => setQuickAiStatus(null), 3500);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 1. TOP HEADER: GREETING & AMBIENT CLIMATE GLANCE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <p className="text-[11px] font-mono tracking-widest text-cyan-400/90 uppercase font-semibold">
              {getGreeting()}, SMART CLIMATE
            </p>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
            {language === 'bn' ? 'আমার হোম ও ডিভাইস' : 'My Home & Devices'}
          </h1>
        </div>

        {/* Header Right: Live Room Badge & Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Quick Room Mini-Pill */}
          <div className="hidden xs:flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300 font-mono">
            <span className="flex items-center gap-1 text-cyan-300">
              <Thermometer className="w-3.5 h-3.5 text-cyan-400" />
              <b>{climate.roomTemp}°C</b>
            </span>
            <span className="text-slate-600">|</span>
            <span className="flex items-center gap-1 text-slate-400">
              <Droplets className="w-3 h-3 text-blue-400" />
              <span>{climate.roomHumidity}%</span>
            </span>
          </div>

          {isPaired && (
            <button
              onClick={onOpenAddWizard}
              className="w-9 h-9 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-400 flex items-center justify-center transition-all shadow-sm active:scale-95"
              title={language === 'bn' ? 'আরেকটি এসি যুক্ত করুন' : 'Add another device'}
            >
              <Plus className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={handleRefresh}
            className={`w-9 h-9 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-all shadow-sm active:scale-95 ${
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
        /* CASE 2: FLAGSHIP LUXURY SMART AC POD */
        <div className="space-y-5">
          {/* Main App Hero Device Card */}
          <div
            onClick={onEnterDevice}
            className={`group relative cursor-pointer rounded-3xl p-5 sm:p-7 transition-all duration-300 active:scale-[0.995] overflow-hidden border backdrop-blur-2xl shadow-2xl ${
              ac.power && isOnline
                ? 'bg-gradient-to-br from-slate-900/98 via-slate-900/90 to-cyan-950/20 border-cyan-500/30 hover:border-cyan-400/60 shadow-[0_12px_45px_rgba(6,182,212,0.12)]'
                : 'bg-gradient-to-br from-slate-900/95 via-slate-900/80 to-slate-950 border-slate-800/80 hover:border-slate-700/80'
            }`}
          >
            {/* Ambient Aurora Glow behind card when ON */}
            {ac.power && isOnline && (
              <>
                <div className="absolute -left-16 -top-16 w-64 h-64 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none animate-pulse-slow" />
                <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
              </>
            )}

            {/* TOP BAR: BRAND INFO & MASTER POWER */}
            <div className="flex items-center justify-between gap-3 relative z-10">
              {/* Left: Device Avatar & Details */}
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-all ${
                    ac.power && isOnline
                      ? 'bg-gradient-to-tr from-cyan-500/20 to-blue-500/10 border-cyan-500/40 text-cyan-300 shadow-md shadow-cyan-500/20'
                      : 'bg-slate-850 border-slate-800 text-slate-500'
                  }`}
                >
                  <Snowflake
                    className={`w-6 h-6 ${ac.power && isOnline ? 'animate-spin-slow text-cyan-400' : ''}`}
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg sm:text-xl font-black text-white tracking-tight truncate group-hover:text-cyan-300 transition-colors">
                      {ac.deviceName || 'Gree AC'}
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/25 shrink-0 font-bold uppercase">
                      {ac.brand || 'Gree'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                    <span className="flex items-center gap-1 text-slate-300 font-medium truncate">
                      <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
                      <span>{ac.location || 'Master Bedroom'}</span>
                    </span>
                    <span className="text-slate-600">·</span>
                    <span className="text-[11px] text-slate-400 truncate">
                      {ac.deviceModel || 'Smart Inverter 1.5T'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Online Status & Master Power Switch */}
              <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                <div
                  className={`hidden xs:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold font-mono tracking-wider uppercase border ${
                    isOnline
                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                      : 'bg-rose-950/60 text-rose-300 border-rose-500/40'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-ping' : 'bg-rose-400'}`} />
                  <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
                </div>

                <button
                  type="button"
                  onClick={handleTogglePowerFromCard}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-all active:scale-90 shadow-xl ${
                    ac.power && isOnline
                      ? 'bg-gradient-to-tr from-cyan-500 to-blue-600 border-cyan-300 text-slate-950 shadow-cyan-500/40 ring-4 ring-cyan-500/15'
                      : 'bg-slate-850 hover:bg-slate-800 border-slate-700/80 text-slate-400 hover:text-white'
                  }`}
                  title={ac.power ? 'Turn AC OFF' : 'Turn AC ON'}
                >
                  <Power className="w-5 h-5 stroke-[2.8]" />
                </button>
              </div>
            </div>

            {/* CENTER HIGHLIGHT: INTERACTIVE THERMOSTAT DIAL & QUICK STEPPERS */}
            <div className="mt-6 py-5 px-4 rounded-3xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between relative z-10 shadow-inner">
              {/* Stepper Down (-) */}
              <button
                type="button"
                onClick={(e) => handleTempStep(e, -1)}
                disabled={!ac.power || ac.temperature <= 16}
                className="w-12 h-12 rounded-2xl bg-slate-900 hover:bg-slate-850 active:bg-cyan-500/20 disabled:opacity-30 border border-slate-700/80 hover:border-cyan-500/40 text-slate-200 hover:text-white flex items-center justify-center transition-all active:scale-90 shadow-md"
                title="Decrease Temperature"
              >
                <Minus className="w-5 h-5 stroke-[2.5]" />
              </button>

              {/* Big Thermostat Readout */}
              <div className="text-center">
                <p className="text-[10px] font-mono tracking-widest text-slate-400 uppercase font-semibold">
                  {language === 'bn' ? 'টার্গেট তাপমাত্রা' : 'TARGET TEMPERATURE'}
                </p>
                <div className="flex items-baseline justify-center gap-1 mt-0.5">
                  <span className={`text-4xl sm:text-5xl font-black tracking-tight font-mono ${
                    ac.power ? 'text-white' : 'text-slate-500'
                  }`}>
                    {ac.temperature}
                  </span>
                  <span className="text-xl sm:text-2xl font-extrabold text-cyan-400">°C</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 font-mono flex items-center justify-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>
                    {language === 'bn' ? 'ঘরের তাপমাত্রা' : 'Room'}: <b>{climate.roomTemp}°C</b> ({climate.roomHumidity}%)
                  </span>
                </p>
              </div>

              {/* Stepper Up (+) */}
              <button
                type="button"
                onClick={(e) => handleTempStep(e, 1)}
                disabled={!ac.power || ac.temperature >= 30}
                className="w-12 h-12 rounded-2xl bg-slate-900 hover:bg-slate-850 active:bg-cyan-500/20 disabled:opacity-30 border border-slate-700/80 hover:border-cyan-500/40 text-slate-200 hover:text-white flex items-center justify-center transition-all active:scale-90 shadow-md"
                title="Increase Temperature"
              >
                <Plus className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            {/* LIVE METRIC STRIP (4 Mini Glass Badges) */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 relative z-10 text-xs">
              <div className="p-2.5 rounded-2xl bg-slate-950/40 border border-slate-800/80 flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-cyan-500/15 text-cyan-300 flex items-center justify-center shrink-0">
                  <Snowflake className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] text-slate-400 uppercase font-mono">{language === 'bn' ? 'মোড' : 'Mode'}</p>
                  <p className="text-xs font-bold text-white capitalize truncate">{ac.mode} Mode</p>
                </div>
              </div>

              <div className="p-2.5 rounded-2xl bg-slate-950/40 border border-slate-800/80 flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-blue-500/15 text-blue-300 flex items-center justify-center shrink-0">
                  <Wind className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] text-slate-400 uppercase font-mono">{language === 'bn' ? 'ফ্যান' : 'Fan'}</p>
                  <p className="text-xs font-bold text-white capitalize truncate">{ac.fanSpeed}</p>
                </div>
              </div>

              <div className="p-2.5 rounded-2xl bg-slate-950/40 border border-slate-800/80 flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-amber-500/15 text-amber-300 flex items-center justify-center shrink-0">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] text-slate-400 uppercase font-mono">{language === 'bn' ? 'পাওয়ার' : 'Load'}</p>
                  <p className="text-xs font-bold text-white truncate font-mono">{ac.power ? `${power.watts || 820}W` : '0W'}</p>
                </div>
              </div>

              <div className="p-2.5 rounded-2xl bg-slate-950/40 border border-slate-800/80 flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-teal-500/15 text-teal-300 flex items-center justify-center shrink-0">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] text-slate-400 uppercase font-mono">{language === 'bn' ? 'হেলথ ফিল্টার' : 'Health'}</p>
                  <p className="text-xs font-bold text-white truncate">
                    {ac.ionFilter || ac.health ? (language === 'bn' ? 'সক্রিয় (Active)' : 'Active') : (language === 'bn' ? 'বন্ধ (Off)' : 'Off')}
                  </p>
                </div>
              </div>
            </div>

            {/* 1-TAP QUICK SCENE BUTTONS */}
            <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-5 gap-2 relative z-10" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={toggleTurbo}
                className={`py-2.5 px-3 rounded-2xl border text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm ${
                  ac.turbo
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 border-cyan-400 shadow-cyan-500/25'
                    : 'bg-slate-950/90 hover:bg-slate-850 text-slate-300 border-slate-800'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'টার্বো ১৬°' : 'Turbo 16°'}</span>
              </button>

              <button
                onClick={toggleEco}
                className={`py-2.5 px-3 rounded-2xl border text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm ${
                  ac.eco
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 border-emerald-400 shadow-emerald-500/25'
                    : 'bg-slate-950/90 hover:bg-slate-850 text-slate-300 border-slate-800'
                }`}
              >
                <Leaf className="w-3.5 h-3.5 text-emerald-400" />
                <span>{language === 'bn' ? 'ইকো ২৫°' : 'Eco 25°'}</span>
              </button>

              <button
                onClick={toggleAutoClean}
                className={`py-2.5 px-3 rounded-2xl border text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm ${
                  ac.autoClean
                    ? 'bg-gradient-to-r from-cyan-400 to-teal-400 text-slate-950 border-cyan-300 shadow-cyan-500/25'
                    : 'bg-slate-950/90 hover:bg-slate-850 text-cyan-300 border-cyan-800/40'
                }`}
                title={language === 'bn' ? 'সেলফ ক্লিন ব্লোয়ার (X-Fan)' : 'Self Clean (X-Fan)'}
              >
                <Wind className="w-3.5 h-3.5 text-cyan-400" />
                <span>{language === 'bn' ? 'সেলফ ক্লিন' : 'Self Clean'}</span>
                {ac.autoClean && <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />}
              </button>

              <button
                onClick={() => activatePreset('preset-1')}
                className="py-2.5 px-3 rounded-2xl bg-slate-950/90 hover:bg-slate-850 border border-slate-800 text-slate-300 text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm"
              >
                <Moon className="w-3.5 h-3.5 text-purple-400" />
                <span>{language === 'bn' ? 'নাইট স্লিপ ২৬°' : 'Night 26°'}</span>
              </button>

              <button
                onClick={toggleHealth}
                className={`py-2.5 px-3 rounded-2xl border text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm ${
                  Boolean(ac.ionFilter || ac.health)
                    ? 'bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-950 border-teal-300 shadow-teal-500/25'
                    : 'bg-slate-950/90 hover:bg-slate-850 text-slate-300 border-slate-800'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                <span>{language === 'bn' ? 'হেলথ এয়ার' : 'Health Filter'}</span>
              </button>
            </div>

            {/* DEDICATED CLEAN & CARE BARRIER */}
            {onOpenCleanModal && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenCleanModal();
                }}
                className="mt-3.5 p-3 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-slate-950/70 to-blue-950/40 border border-cyan-800/30 hover:border-cyan-500/40 flex items-center justify-between gap-3 cursor-pointer group transition-all relative z-10"
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${ac.autoClean ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-900 text-slate-400'}`}>
                    <Wind className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors flex items-center gap-1.5">
                      <span>{language === 'bn' ? 'এসি অটো-ক্লিন ও ফিল্টার কেয়ার' : 'AC Clean & Filter Care'}</span>
                      {ac.autoClean && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono font-bold">
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

                <div className="flex items-center gap-1 text-[11px] font-bold text-cyan-400 group-hover:text-cyan-300 shrink-0">
                  <span>{language === 'bn' ? 'ওপেন করুন' : 'Open'}</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            )}

            {/* FULL REMOTE CONTROLLER FOOTER GATEWAY */}
            <div className="mt-4 pt-3 flex items-center justify-between text-xs text-cyan-400 group-hover:text-cyan-300 font-bold transition-colors">
              <span className="flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'সম্পূর্ণ রিমোট কন্ট্রোল ও থার্মোস্ট্যাট ডায়াল' : 'Open Full Remote & Thermostat'}</span>
              </span>
              <div className="flex items-center gap-1">
                <span>{language === 'bn' ? 'কন্ট্রোল পেজ' : 'Control Tab'}</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>

          {/* 3. ENVIRONMENTAL ROOM INSIGHTS (3 Glass Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-3xl bg-slate-900/70 border border-slate-800/80 shadow-lg flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                <Thermometer className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-mono tracking-wider text-slate-400 uppercase">{language === 'bn' ? 'ঘরের তাপমাত্রা' : 'Indoor Temp'}</p>
                <p className="text-base font-black text-white font-mono mt-0.5">{climate.roomTemp}°C</p>
                <p className="text-[10px] text-cyan-300">
                  {language === 'bn' ? `টার্গেট থেকে ${(climate.roomTemp - ac.temperature).toFixed(1)}°C ব্যবধান` : `${(climate.roomTemp - ac.temperature).toFixed(1)}°C delta`}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-3xl bg-slate-900/70 border border-slate-800/80 shadow-lg flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <Droplets className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-mono tracking-wider text-slate-400 uppercase">{language === 'bn' ? 'আর্দ্রতা লেভেল' : 'Humidity'}</p>
                <p className="text-base font-black text-white font-mono mt-0.5">{climate.roomHumidity}% RH</p>
                <p className="text-[10px] text-emerald-400">{language === 'bn' ? 'আরামদায়ক পরিবেশ' : 'Comfortable Zone'}</p>
              </div>
            </div>

            <div className="p-4 rounded-3xl bg-slate-900/70 border border-slate-800/80 shadow-lg flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-mono tracking-wider text-slate-400 uppercase">{language === 'bn' ? 'বিদ্যুৎ ব্যবহার' : 'Energy Usage'}</p>
                <p className="text-base font-black text-white font-mono mt-0.5">{ac.power ? `${power.watts || 820}W` : '0W'}</p>
                <p className="text-[10px] text-amber-300 font-mono">
                  {language === 'bn' ? `আজকের খরচ: ৳${(power.costBdt || 14.5).toFixed(1)}` : `Today: ৳${(power.costBdt || 14.5).toFixed(1)}`}
                </p>
              </div>
            </div>
          </div>

          {/* 4. SMART AI ASSISTANT CONSOLE */}
          <div className="bg-gradient-to-r from-cyan-950/40 via-slate-900/90 to-blue-950/40 border border-cyan-800/30 rounded-3xl p-5 space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-cyan-500/20 shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-white tracking-tight">
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
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-extrabold text-xs rounded-2xl shadow-lg shadow-cyan-500/20 transition-all active:scale-95 flex items-center gap-1.5 shrink-0"
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
                  className="px-3 py-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/30 text-cyan-300 hover:text-white text-xs font-semibold transition-all active:scale-95"
                >
                  ✨ {chip.label}
                </button>
              ))}
            </div>

            {quickAiStatus && (
              <div className="p-3 bg-cyan-950/80 border border-cyan-500/40 rounded-2xl text-xs text-cyan-200 animate-fadeIn font-mono flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>{quickAiStatus}</span>
              </div>
            )}
          </div>

          {/* 5. FOOTER: EDIT NAME & DELETE STRIP */}
          <div className="flex items-center justify-between px-2 text-xs text-slate-400 pt-1">
            <button
              onClick={onOpenEditModal}
              className="hover:text-cyan-300 flex items-center gap-1.5 transition-colors font-medium"
            >
              <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
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
                  className="px-3 py-1 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold"
                >
                  {language === 'bn' ? 'হ্যাঁ' : 'Yes'}
                </button>
                <button
                  onClick={() => setShowUnpairConfirm(false)}
                  className="px-3 py-1 rounded-xl bg-slate-800 text-slate-300"
                >
                  {language === 'bn' ? 'না' : 'No'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowUnpairConfirm(true)}
                className="hover:text-rose-400 flex items-center gap-1.5 transition-colors font-medium"
              >
                <Trash2 className="w-3.5 h-3.5 text-slate-500 hover:text-rose-400" />
                <span>{language === 'bn' ? 'ডিভাইস মুছুন' : 'Delete device'}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
