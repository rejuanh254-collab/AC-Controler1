import React, { useState } from 'react';
import { Plus, Minus, Power, Snowflake, Flame, Droplets, Wind, Zap, RotateCw, Sparkles, Clock } from 'lucide-react';
import { useSmartAC } from '../context/SmartACContext';
import { ACStepTimerModal } from './ACStepTimerModal';

export const ThermostatDial: React.FC = () => {
  const {
    ac,
    climate,
    stepTemperature,
    setTemperature,
    togglePower,
    toggleHealth,
    toggleAutoClean,
    cancelCleanCycle,
    fetchData,
    isSendingIR,
    language,
    t,
  } = useSmartAC();

  const [showStepModal, setShowStepModal] = useState(false);

  const minTemp = 16;
  const maxTemp = 30;
  const range = maxTemp - minTemp;
  const currentFraction = Math.max(0, Math.min(1, (ac.temperature - minTemp) / range));
  const strokeDashoffset = 754 - 754 * (currentFraction * 0.75); // 270 degree arc

  const getModeColor = () => {
    if (!ac.power) return '#64748B';
    if (ac.turbo) return '#06B6D4';
    if (ac.mode === 'cool') return '#06B6D4';
    if (ac.mode === 'eco') return '#10B981';
    if (ac.mode === 'dry') return '#3B82F6';
    if (ac.mode === 'heat') return '#F59E0B';
    return '#8B5CF6';
  };

  const activeColor = getModeColor();

  return (
    <div className="relative bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl flex flex-col items-center justify-between space-y-5 overflow-hidden">
      {/* Ambient background glow */}
      {ac.power && (
        <div
          className="absolute -top-24 -left-24 w-72 h-72 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-700"
          style={{ backgroundColor: activeColor }}
        />
      )}

      {/* Responsive Top Header Info Bar */}
      <div className="w-full flex items-center justify-between flex-wrap gap-2 text-xs text-slate-400 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ac.power ? activeColor : '#64748B' }}></span>
          <span className="font-extrabold text-white text-xs tracking-tight">
            {ac.brand} {ac.power ? (ac.turbo ? 'TURBO CHILL' : ac.mode.toUpperCase()) : 'POWER OFF'}
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px] bg-slate-950/80 px-2.5 py-1 rounded-xl border border-slate-800">
          <button
            onClick={() => fetchData()}
            className="p-0.5 hover:bg-slate-800 rounded-lg transition-colors shrink-0"
            title="Refresh Data"
          >
            <RotateCw className={`w-3.5 h-3.5 text-cyan-400 ${isSendingIR ? 'animate-spin' : ''}`} />
          </button>
          
          <div className="flex items-center gap-1.5 pr-2 border-r border-slate-800 shrink-0">
            <div className={`w-1.5 h-1.5 rounded-full ${ac.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></div>
            <span className={ac.isOnline ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
              {ac.isOnline ? 'CLOUD SYNC' : 'OFFLINE'}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span className="text-slate-400">{language === 'bn' ? 'রুম:' : 'Room:'}</span>
            <span className="text-white font-extrabold">{climate.roomTemp}°C</span>
          </div>
        </div>

        {/* Power Toggle Button */}
        <button
          onClick={togglePower}
          className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-all active:scale-95 shrink-0 ${
            ac.power
              ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/30'
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/30 font-bold'
          }`}
          title={ac.power ? 'Turn OFF AC' : 'Turn ON AC'}
        >
          <Power className="w-5 h-5" />
        </button>
      </div>

      {/* Command Transmission Overlay */}
      {isSendingIR && (
        <div className="absolute inset-0 z-40 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center animate-fadeIn">
          <div className="bg-slate-900 border border-cyan-500/50 p-6 rounded-3xl shadow-2xl flex flex-col items-center gap-3 scale-110">
            <div className="w-12 h-12 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 animate-spin" />
            <span className="text-cyan-400 font-bold text-xs uppercase tracking-widest">Transmitting to AC...</span>
            <p className="text-[10px] text-slate-500 text-center max-w-[150px]">Using Gree Official Cloud Remote Bridge</p>
          </div>
        </div>
      )}

      {/* Center Circular Thermostat Dial */}
      <div className="relative w-72 h-72 sm:w-80 sm:h-80 max-w-full flex items-center justify-center my-1 shrink-0">
        {/* SVG Circular Track */}
        <svg className="w-full h-full -rotate-135" viewBox="0 0 280 280">
          {/* Background Arc */}
          <circle
            cx="140"
            cy="140"
            r="112"
            fill="none"
            stroke="#1E293B"
            strokeWidth="14"
            strokeDasharray="754"
            strokeDashoffset="188.5"
            strokeLinecap="round"
          />

          {/* Active Colored Arc */}
          <circle
            cx="140"
            cy="140"
            r="112"
            fill="none"
            stroke={activeColor}
            strokeWidth="14"
            strokeDasharray="754"
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-300"
            style={{
              filter: ac.power ? `drop-shadow(0 0 12px ${activeColor}90)` : 'none',
            }}
          />
        </svg>

        {/* Center Display Panel */}
        <div className="absolute inset-5 sm:inset-6 rounded-full bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border border-slate-800/80 flex flex-col items-center justify-center p-2 sm:p-3 shadow-inner text-center z-10 overflow-hidden">
          {ac.isCleaning ? (
            <div className="flex flex-col items-center justify-center space-y-1">
              <span className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase font-bold animate-pulse">
                {language === 'bn' ? 'ডিপ সেলফ ক্লিন চলছে' : 'SELF CLEAN RUNNING'}
              </span>

              <div className="flex items-baseline justify-center gap-1 my-0.5 leading-none">
                <span className="text-5xl sm:text-6xl font-extrabold font-mono tracking-tighter text-cyan-300 leading-none drop-shadow-[0_0_20px_rgba(6,182,212,0.6)]">
                  CL
                </span>
              </div>

              <p className="text-[11px] text-cyan-300 font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-400 animate-spin" />
                <span>
                  {ac.cleanCycleStage === 'frost'
                    ? (language === 'bn' ? '১/৪: কয়েল ফ্রস্টিং' : '1/4: Frosting')
                    : ac.cleanCycleStage === 'wash'
                    ? (language === 'bn' ? '২/৪: ড্রেন ফ্লাশ' : '2/4: Drain Flush')
                    : ac.cleanCycleStage === 'dry'
                    ? (language === 'bn' ? '৩/৪: কয়েল শুকানো' : '3/4: Coil Drying')
                    : (language === 'bn' ? '৪/৪: প্লাজমা জীবাণুনাশক' : '4/4: Plasma Sanitize')}
                  {' · '}
                  {Math.ceil(ac.cleanCycleRemainingMinutes ?? 15)} {language === 'bn' ? 'মি.' : 'min'}
                </span>
              </p>

              <button
                onClick={cancelCleanCycle}
                className="mt-1 px-2.5 py-0.5 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[9px] font-bold font-mono transition-all active:scale-95"
              >
                {language === 'bn' ? 'ক্লিন বাতিল' : 'Cancel Clean'}
              </button>
            </div>
          ) : (
            <>
              <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase font-semibold leading-none mb-1">
                {ac.power ? t.targetTemp : 'STANDBY'}
              </span>

              <div className="flex items-baseline justify-center gap-0.5 my-0.5 leading-none">
                <span
                  className={`text-5xl sm:text-6xl font-extrabold font-mono tracking-tighter tabular-nums leading-none transition-colors duration-300 ${
                    ac.power ? 'text-white' : 'text-slate-600'
                  }`}
                >
                  {ac.temperature}
                </span>
                <span className="text-xl sm:text-2xl font-bold font-mono text-cyan-400 leading-none">°C</span>
              </div>

              <p className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium my-0.5">
                <span>{((ac.temperature * 9) / 5 + 32).toFixed(0)}°F</span>
                <span aria-hidden="true">·</span>
                <span className="text-cyan-300 capitalize">{ac.fanSpeed === 'quiet' ? (language === 'bn' ? 'সাইলেন্ট' : 'Quiet') : `${ac.fanSpeed}`} Fan</span>
              </p>

              {/* Active Health / Auto Clean / Step Timer Badges */}
              <div className="flex flex-wrap items-center justify-center gap-1 mt-1 max-w-[90%]">
                <button
                  onClick={toggleAutoClean}
                  className={`px-2 py-0.5 rounded-full border text-[9px] font-bold flex items-center gap-1 font-mono transition-all active:scale-95 ${
                    ac.autoClean
                      ? 'bg-cyan-500/25 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-500/20'
                      : 'bg-slate-800/80 text-slate-400 border-slate-700/80 hover:text-cyan-300 hover:border-cyan-500/40'
                  }`}
                  title={language === 'bn' ? 'সেলফ ক্লিন টগল করুন (X-Fan)' : 'Toggle Self Clean (X-Fan)'}
                >
                  <Wind className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                  <span>{ac.autoClean ? (language === 'bn' ? 'অটো ক্লিন ON' : 'Clean ON') : (language === 'bn' ? 'সেলফ ক্লিন' : 'Auto Clean')}</span>
                </button>
                {Boolean(ac.ionFilter || ac.health) && (
                  <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[9px] font-bold flex items-center gap-1 font-mono">
                    <Sparkles className="w-2.5 h-2.5 text-teal-400 shrink-0" />
                    <span>{language === 'bn' ? 'হেলথ ON' : 'Health'}</span>
                  </span>
                )}
                {Boolean(ac.multiStageTimer?.enabled) && (
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[9px] font-bold flex items-center gap-1 font-mono animate-pulse shadow-sm max-w-full truncate">
                    <Clock className="w-2.5 h-2.5 text-purple-400 shrink-0" />
                    <span className="truncate">
                      {language === 'bn'
                        ? `স্টেজ ${ac.multiStageTimer?.currentStage}: ${ac.temperature}°C (${Math.ceil(ac.multiStageTimer?.remainingMinutes ?? 0)}মি.)`
                        : `Stg ${ac.multiStageTimer?.currentStage}: ${ac.temperature}°C (${Math.ceil(ac.multiStageTimer?.remainingMinutes ?? 0)}m)`}
                    </span>
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Floating Stepper Buttons on Dial Sides */}
        <button
          onClick={() => stepTemperature(-1)}
          disabled={ac.temperature <= minTemp}
          className="absolute left-1 top-1/2 -translate-y-1/2 w-11 h-11 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-700/80 shadow-xl flex items-center justify-center transition-all active:scale-90 disabled:opacity-30 z-20"
          title="Decrease temperature"
        >
          <Minus className="w-5 h-5 text-cyan-300" />
        </button>

        <button
          onClick={() => stepTemperature(1)}
          disabled={ac.temperature >= maxTemp}
          className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-700/80 shadow-xl flex items-center justify-center transition-all active:scale-90 disabled:opacity-30 z-20"
          title="Increase temperature"
        >
          <Plus className="w-5 h-5 text-cyan-300" />
        </button>
      </div>

      {/* Temperature Quick Slider & Quick Target Buttons */}
      <div className="w-full space-y-3 pt-2">
        <input
          type="range"
          min={minTemp}
          max={maxTemp}
          value={ac.temperature}
          onChange={(e) => setTemperature(Number(e.target.value))}
          className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
        />

        <div className="flex items-center justify-between gap-1.5">
          {[18, 20, 22, 24, 25, 26, 28].map((tVal) => (
            <button
              key={tVal}
              onClick={() => setTemperature(tVal)}
              className={`flex-1 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all ${
                ac.temperature === tVal && ac.power
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30 scale-105'
                  : 'bg-slate-950/80 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {tVal}°
            </button>
          ))}
        </div>

        {/* Quick Health & Step Timer Action Row */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => toggleHealth()}
            className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
              Boolean(ac.ionFilter || ac.health)
                ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-md shadow-teal-500/20'
                : 'bg-slate-950/80 hover:bg-slate-850 text-slate-300 border-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? (Boolean(ac.ionFilter || ac.health) ? 'হেলথ ফিল্টার: ON' : 'হেলথ ফিল্টার') : 'Health Mode'}</span>
          </button>

          <button
            onClick={() => setShowStepModal(true)}
            className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
              Boolean(ac.multiStageTimer?.enabled)
                ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-500/20'
                : 'bg-slate-950/80 hover:bg-slate-850 text-slate-300 border-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>
              {ac.multiStageTimer?.enabled
                ? (language === 'bn' ? `স্টেপ ${ac.multiStageTimer.currentStage} চলছে` : `Step ${ac.multiStageTimer.currentStage}`)
                : (language === 'bn' ? 'স্টেপ টাইমার' : 'Step Timer')}
            </span>
          </button>
        </div>
      </div>

      {/* Footer live delta badge */}
      <div className="w-full pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>
            {language === 'bn'
              ? `কুলিং ডেল্টা: ${climate.targetDelta}°C কমাতে হবে`
              : `Cooling Delta: ${climate.targetDelta}°C to target`}
          </span>
        </span>
        <span className="font-mono text-cyan-300 font-medium">
          {ac.power ? (climate.roomTemp <= ac.temperature ? 'Target Reached (Eco)' : 'Compressor Active') : 'Idle'}
        </span>
      </div>

      {/* Multi-Stage Step Timer Modal */}
      {showStepModal && <ACStepTimerModal onClose={() => setShowStepModal(false)} />}
    </div>
  );
};
