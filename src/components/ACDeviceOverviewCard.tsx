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
  Thermometer,
  Droplets,
  Minus,
  MapPin,
  SlidersHorizontal,
  Zap,
  Leaf,
  Moon,
  Sparkles,
  Wind,
} from 'lucide-react';

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
  onOpenCleanModal,
}) => {
  const {
    ac,
    climate,
    power,
    togglePower,
    toggleTurbo,
    toggleEco,
    toggleSleep,
    stepTemperature,
    unpairDevice,
    language,
  } = useSmartAC();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showUnpairConfirm, setShowUnpairConfirm] = useState(false);

  const isOnline = ac.isOnline !== undefined ? ac.isOnline : true;
  const isPaired = Boolean(ac.isPaired && ac.deviceName);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleTogglePower = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await togglePower();
  };

  const handleTempStep = async (e: React.MouseEvent, delta: number) => {
    e.stopPropagation();
    await stepTemperature(delta);
  };

  return (
    <div className="space-y-5 animate-fadeIn max-w-2xl mx-auto">
      {/* 1. TOP HEADER: CLEAN & MINIMAL */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {language === 'bn' ? 'আমার হোম' : 'My Home'}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {language === 'bn' ? 'স্মার্ট ক্লাইমেট ড্যাশবোর্ড' : 'Smart Climate Dashboard'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isPaired && (
            <button
              onClick={onOpenAddWizard}
              className="w-9 h-9 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-cyan-400 flex items-center justify-center transition-all shadow-sm active:scale-95"
              title={language === 'bn' ? 'আরেকটি এসি যুক্ত করুন' : 'Add device'}
            >
              <Plus className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={handleRefresh}
            className={`w-9 h-9 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-all shadow-sm active:scale-95 ${
              isRefreshing ? 'rotate-180 transition-transform duration-500 text-cyan-400' : ''
            }`}
            title="Refresh"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* CASE 1: NO DEVICE PAIRED */}
      {!isPaired ? (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-slate-400 shadow-inner">
            <Snowflake className="w-8 h-8 text-cyan-400" />
          </div>

          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base sm:text-lg font-bold text-white">
              {language === 'bn' ? 'কোনো ডিভাইস যুক্ত করা হয়নি' : 'No devices connected'}
            </h3>
            <p className="text-xs text-slate-400">
              {language === 'bn'
                ? 'আপনার এসি ওয়াইফাই বা ক্লাউড একাউন্ট দিয়ে যুক্ত করুন।'
                : 'Connect your AC via WiFi or cloud credentials.'}
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-xs mx-auto">
            <button
              onClick={onOpenAddWizard}
              className="w-full px-5 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-2xl shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'bn' ? 'ডিভাইস যুক্ত করুন' : 'Add Device'}</span>
            </button>
            <button
              onClick={onOpenNoArduino}
              className="w-full px-4 py-3 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white font-semibold text-xs rounded-2xl transition-all"
            >
              {language === 'bn' ? 'Gree+ লগইন' : 'Gree+ Login'}
            </button>
          </div>
        </div>
      ) : (
        /* CASE 2: CLEAN, LUXURY SMART AC HERO TILE (APPLE / TESLA STYLE) */
        <div className="space-y-4">
          <div
            onClick={onEnterDevice}
            className={`group relative cursor-pointer rounded-3xl p-6 sm:p-7 transition-all duration-300 border backdrop-blur-xl shadow-2xl overflow-hidden ${
              ac.power && isOnline
                ? 'bg-gradient-to-b from-slate-900/98 via-slate-900/90 to-cyan-950/20 border-cyan-500/30 hover:border-cyan-400/50 shadow-[0_12px_40px_rgba(6,182,212,0.12)]'
                : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
            }`}
          >
            {/* Ambient Aura Glow when ON */}
            {ac.power && isOnline && (
              <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
            )}

            {/* TOP BAR: DEVICE NAME, LOCATION & POWER */}
            <div className="flex items-start justify-between gap-3 relative z-10">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate group-hover:text-cyan-300 transition-colors">
                    {ac.deviceName || 'Gree AC'}
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-bold uppercase shrink-0">
                    {ac.brand || 'Gree'}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                  <span className="flex items-center gap-1 text-slate-300 font-medium truncate">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>{ac.location || 'Master Bedroom'}</span>
                  </span>
                  <span className="text-slate-600">·</span>
                  <span className="flex items-center gap-1 font-mono text-[11px]">
                    <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                    <span className={isOnline ? 'text-emerald-400' : 'text-rose-400'}>
                      {isOnline ? (language === 'bn' ? 'সক্রিয়' : 'Online') : 'Offline'}
                    </span>
                  </span>
                </div>
              </div>

              {/* Master Power Toggle Button */}
              <button
                type="button"
                onClick={handleTogglePower}
                className={`w-13 h-13 rounded-2xl flex items-center justify-center shrink-0 border transition-all active:scale-90 shadow-xl ${
                  ac.power && isOnline
                    ? 'bg-gradient-to-tr from-cyan-500 to-blue-600 border-cyan-300 text-slate-950 shadow-cyan-500/40 ring-4 ring-cyan-500/15'
                    : 'bg-slate-800/80 hover:bg-slate-750 border-slate-700 text-slate-400 hover:text-white'
                }`}
                title={ac.power ? 'Turn AC OFF' : 'Turn AC ON'}
              >
                <Power className="w-6 h-6 stroke-[2.8]" />
              </button>
            </div>

            {/* CENTER: BIG LUXURY TEMPERATURE READOUT & STEPPERS */}
            <div className="my-6 py-6 px-4 rounded-3xl bg-slate-950/50 border border-slate-800/60 flex items-center justify-between relative z-10">
              <button
                type="button"
                onClick={(e) => handleTempStep(e, -1)}
                disabled={!ac.power || ac.temperature <= 16}
                className="w-13 h-13 rounded-2xl bg-slate-900 hover:bg-slate-850 active:bg-cyan-500/20 disabled:opacity-20 border border-slate-700/80 hover:border-cyan-500/40 text-slate-200 hover:text-white flex items-center justify-center transition-all active:scale-90 shadow-md"
                title="Decrease Temperature"
              >
                <Minus className="w-6 h-6 stroke-[2.5]" />
              </button>

              <div className="text-center select-none">
                <div className="flex items-baseline justify-center gap-1">
                  <span className={`text-5xl sm:text-6xl font-black tracking-tight font-mono ${
                    ac.power ? 'text-white' : 'text-slate-500'
                  }`}>
                    {ac.temperature}
                  </span>
                  <span className="text-2xl sm:text-3xl font-extrabold text-cyan-400">°C</span>
                </div>
                <p className="text-xs text-slate-400 mt-1 font-medium">
                  {ac.power
                    ? (language === 'bn' ? `কুলিং মোড · ফ্যান: ${ac.fanSpeed}` : `Cooling · Fan: ${ac.fanSpeed}`)
                    : (language === 'bn' ? 'এসি বন্ধ আছে' : 'AC is Turned Off')}
                </p>
              </div>

              <button
                type="button"
                onClick={(e) => handleTempStep(e, 1)}
                disabled={!ac.power || ac.temperature >= 30}
                className="w-13 h-13 rounded-2xl bg-slate-900 hover:bg-slate-850 active:bg-cyan-500/20 disabled:opacity-20 border border-slate-700/80 hover:border-cyan-500/40 text-slate-200 hover:text-white flex items-center justify-center transition-all active:scale-90 shadow-md"
                title="Increase Temperature"
              >
                <Plus className="w-6 h-6 stroke-[2.5]" />
              </button>
            </div>

            {/* 3 CLEAN ESSENTIAL QUICK BUTTONS */}
            <div className="grid grid-cols-3 gap-2 relative z-10" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={toggleTurbo}
                className={`py-2.5 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                  ac.turbo
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20'
                    : 'bg-slate-950/70 hover:bg-slate-850 text-slate-300 border-slate-800'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'টার্বো ১৬°' : 'Turbo'}</span>
              </button>

              <button
                onClick={toggleEco}
                className={`py-2.5 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                  ac.eco
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                    : 'bg-slate-950/70 hover:bg-slate-850 text-slate-300 border-slate-800'
                }`}
              >
                <Leaf className="w-3.5 h-3.5 text-emerald-400" />
                <span>{language === 'bn' ? 'ইকো ২৫°' : 'Eco'}</span>
              </button>

              <button
                onClick={toggleSleep}
                className={`py-2.5 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                  ac.sleep
                    ? 'bg-purple-500 text-slate-950 border-purple-400 shadow-md shadow-purple-500/20'
                    : 'bg-slate-950/70 hover:bg-slate-850 text-slate-300 border-slate-800'
                }`}
              >
                <Moon className="w-3.5 h-3.5 text-purple-400" />
                <span>{language === 'bn' ? 'স্লিপ ২৬°' : 'Sleep'}</span>
              </button>
            </div>

            {/* CARD FOOTER: LINK TO FULL REMOTE */}
            <div className="mt-4 pt-3.5 border-t border-slate-800/60 flex items-center justify-between text-xs text-cyan-400 group-hover:text-cyan-300 font-bold transition-colors">
              <span className="flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'সম্পূর্ণ রিমোট কন্ট্রোল' : 'Full Remote & Modes'}</span>
              </span>
              <div className="flex items-center gap-1">
                <span>{language === 'bn' ? 'ওপেন করুন' : 'Open'}</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>

          {/* 2 CLEAN AMBIENT ENVIRONMENT TILES (NO CLUTTER!) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-3xl bg-slate-900/60 border border-slate-800/80 shadow-md flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                <Thermometer className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-mono tracking-wider text-slate-400 uppercase">
                  {language === 'bn' ? 'ঘরের তাপমাত্রা' : 'Indoor Temp'}
                </p>
                <p className="text-base sm:text-lg font-black text-white font-mono mt-0.5">
                  {climate.roomTemp}°C
                </p>
              </div>
            </div>

            <div className="p-4 rounded-3xl bg-slate-900/60 border border-slate-800/80 shadow-md flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <Droplets className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-mono tracking-wider text-slate-400 uppercase">
                  {language === 'bn' ? 'ঘরের আর্দ্রতা' : 'Humidity'}
                </p>
                <p className="text-base sm:text-lg font-black text-white font-mono mt-0.5">
                  {climate.roomHumidity}% RH
                </p>
              </div>
            </div>
          </div>

          {/* 3. CLEAN SUBTLE FOOTER: EDIT / DELETE */}
          <div className="flex items-center justify-between px-2 text-xs text-slate-400 pt-1">
            <button
              onClick={onOpenEditModal}
              className="hover:text-cyan-300 flex items-center gap-1.5 transition-colors font-medium"
            >
              <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
              <span>{language === 'bn' ? 'ডিভাইসের নাম এডিট' : 'Edit name'}</span>
            </button>

            {showUnpairConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-rose-400 font-semibold">
                  {language === 'bn' ? 'রিমুভ করবেন?' : 'Remove?'}
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
                className="hover:text-rose-400 flex items-center gap-1.5 transition-colors font-medium"
              >
                <Trash2 className="w-3.5 h-3.5 text-slate-500 hover:text-rose-400" />
                <span>{language === 'bn' ? 'ডিভাইস মুছুন' : 'Delete'}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
