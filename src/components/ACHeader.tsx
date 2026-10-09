import React, { useState } from 'react';
import {
  Snowflake,
  Mic,
  Cpu,
  Volume2,
  VolumeX,
  Globe,
  Radio,
  Wifi,
  ChevronDown,
  Power,
  Zap,
  Smartphone,
  ShieldCheck,
  Cloud,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { useSmartAC } from '../context/SmartACContext';
import { BRAND_CONFIGS } from '../utils/irCodes';
import type { ACBrand } from '../types/iot';

interface ACHeaderProps {
  onOpenHardware: () => void;
  onOpenNoArduino: () => void;
  onOpenVoice: () => void;
  activeTab: 'controller' | 'schedules' | 'energy' | 'logs';
  setActiveTab: (tab: 'controller' | 'schedules' | 'energy' | 'logs') => void;
}

export const ACHeader: React.FC<ACHeaderProps> = ({
  onOpenHardware,
  onOpenNoArduino,
  onOpenVoice,
  activeTab,
  setActiveTab,
}) => {
  const {
    ac,
    setBrand,
    togglePower,
    hardware,
    directConfig,
    power,
    climate,
    language,
    setLanguage,
    soundEnabled,
    setSoundEnabled,
    isSendingIR,
    t,
  } = useSmartAC();

  const [showBrandMenu, setShowBrandMenu] = useState(false);
  const brandsList = Object.keys(BRAND_CONFIGS) as ACBrand[];

  const methodLabels: Record<string, { en: string; bn: string }> = {
    gree_cloud: { en: 'Gree+ Official Cloud', bn: 'Gree+ ক্লাউড গেটওয়ে' },
    tuya_smart_life: { en: 'Tuya Smart IR Hub', bn: 'Tuya IR হাব' },
    built_in_wifi: { en: 'AC Built-in WiFi', bn: 'এসির নিজস্ব ওয়াইফাই' },
    broadlink: { en: 'Broadlink RM4', bn: 'Broadlink RM4' },
    mobile_ir: { en: 'Phone Built-in IR', bn: 'মোবাইল IR বাল্ব' },
    home_assistant_webhook: { en: 'Home Assistant', bn: 'হোম অ্যাসিস্ট্যান্ট' },
    esp32_ir: { en: 'ESP32 IR Blaster', bn: 'ESP32 বোর্ড' },
  };

  const activeMethodLabel =
    language === 'bn'
      ? methodLabels[directConfig.activeMethod]?.bn || 'Tuya / WiFi'
      : methodLabels[directConfig.activeMethod]?.en || 'Tuya / WiFi';

  return (
    <header className="sticky top-0 z-30 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Brand & Connection Zone */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 ${
                ac.power
                  ? 'bg-gradient-to-tr from-cyan-600 to-blue-500 text-white shadow-cyan-500/30'
                  : 'bg-slate-900 border border-slate-800 text-slate-500'
              }`}
            >
              <Snowflake className={`w-6 h-6 ${ac.power ? 'animate-spin-slow' : ''}`} />
            </div>

            {isSendingIR && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-cyan-500 border-2 border-slate-950"></span>
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold tracking-tight text-white font-sans">
                CoolHome <span className="text-cyan-400">AC</span>
              </span>

              {/* Brand Selector Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowBrandMenu(!showBrandMenu)}
                  className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 text-xs font-semibold font-mono transition-all"
                >
                  <span>{ac.brand}</span>
                  <ChevronDown className="w-3 h-3 text-cyan-400" />
                </button>

                {showBrandMenu && (
                  <div className="absolute left-0 mt-1.5 w-48 bg-slate-900 border border-slate-800 rounded-2xl p-1.5 shadow-2xl z-50 max-h-64 overflow-y-auto">
                    <p className="px-2.5 py-1 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                      Select AC Protocol:
                    </p>
                    {brandsList.map((b) => (
                      <button
                        key={b}
                        onClick={() => {
                          setBrand(b);
                          setShowBrandMenu(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-medium transition-colors flex items-center justify-between ${
                          ac.brand === b
                            ? 'bg-cyan-500 text-slate-950 font-bold'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <span>{b}</span>
                        {b === 'Walton' && <span className="text-[10px] opacity-70">BD</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <p className="text-[11px] text-slate-400 hidden sm:flex items-center gap-1.5 mt-0.5">
              {ac.isPaired ? (
                <>
                  <span className={`w-1.5 h-1.5 rounded-full ${ac.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
                  <span className={ac.isOnline ? 'text-emerald-300 font-semibold flex items-center gap-1' : 'text-rose-400 font-semibold'}>
                    {ac.isOnline ? (
                      <>
                        {activeMethodLabel === 'Gree Cloud' && <Cloud className="w-3 h-3 text-cyan-400" />}
                        {activeMethodLabel} Active
                      </>
                    ) : 'Device Offline'}
                  </span>
                  <span className="text-slate-600">·</span>
                  <span className="font-mono text-cyan-400">
                    {isSendingIR ? (
                      <span className="flex items-center gap-1 text-emerald-400 font-bold animate-pulse">
                        <CheckCircle2 className="w-3 h-3" />
                        {language === 'bn' ? 'কমান্ড সম্পন্ন' : 'Command OK'}
                      </span>
                    ) : 'Synced & Ready'}
                  </span>
                  {ac.lastUpdated && (
                    <>
                      <span className="text-slate-600">·</span>
                      <span className="text-[9px] text-slate-500 font-mono">
                        Refreshed: {new Date(ac.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </>
                  )}
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3 h-3 text-amber-500" />
                  <span className="text-amber-400 font-bold">
                    {language === 'bn' ? 'সিমুলেশন মোড (রিয়েল এসি অফ)' : 'Simulation Mode (Real AC Off)'}
                  </span>
                  <span className="text-slate-500 text-[10px]">
                    {language === 'bn' ? '— লগইন বা হার্ডওয়্যার কানেক্ট করুন' : '— Login or connect hardware'}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Navigation Tabs (Desktop) */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-900/90 p-1 rounded-2xl border border-slate-800 text-xs font-medium">
          <button
            onClick={() => setActiveTab('controller')}
            className={`px-3.5 py-1.5 rounded-xl transition-all ${
              activeTab === 'controller'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {language === 'bn' ? 'এসি রিমোট' : 'AC Remote'}
          </button>
          <button
            onClick={() => setActiveTab('schedules')}
            className={`px-3.5 py-1.5 rounded-xl transition-all ${
              activeTab === 'schedules'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.schedules}
          </button>
          <button
            onClick={() => setActiveTab('energy')}
            className={`px-3.5 py-1.5 rounded-xl transition-all ${
              activeTab === 'energy'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.energy}
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3.5 py-1.5 rounded-xl transition-all ${
              activeTab === 'logs'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.irAudit}
          </button>
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Direct Connection WITHOUT Arduino (Primary Action) */}
          <button
            onClick={onOpenNoArduino}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-bold shadow-sm transition-all hover:scale-102 active:scale-98"
            title="Connect without Arduino: Tuya IR, Smart Life, Built-in WiFi, or Phone IR"
          >
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>{language === 'bn' ? 'আরডুইন ছাড়া কানেক্ট' : 'No-Arduino Connect'}</span>
          </button>

          {/* ESP32 Arduino DIY Code Generator */}
          <button
            onClick={onOpenHardware}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 rounded-xl text-xs font-semibold transition-all"
            title="ESP32 Arduino C++ Firmware Sketch"
          >
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>ESP32</span>
          </button>

          {/* Voice Assistant Button */}
          <button
            onClick={onOpenVoice}
            className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/50 transition-all hover:scale-105 active:scale-95"
            title={t.voiceAssistant}
          >
            <Mic className="w-4 h-4 text-cyan-400" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-all"
            title="Sound Feedback"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {/* Language Switch */}
          <button
            onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-cyan-300 transition-all"
          >
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <span>{language === 'bn' ? 'বাংলা' : 'EN'}</span>
          </button>

          {/* Master Power Toggle */}
          <button
            onClick={togglePower}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-md ${
              ac.power
                ? 'bg-red-500 hover:bg-red-400 text-white shadow-red-500/25'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{ac.power ? (language === 'bn' ? 'বন্ধ' : 'OFF') : (language === 'bn' ? 'চালু' : 'ON')}</span>
          </button>
        </div>
      </div>

      {/* Mobile Tabs */}
      <div className="flex md:hidden items-center justify-between gap-1 mt-2.5 pt-2 border-t border-slate-900 text-xs font-medium">
        <button
          onClick={() => setActiveTab('controller')}
          className={`flex-1 py-1.5 text-center rounded-lg ${
            activeTab === 'controller' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400'
          }`}
        >
          {language === 'bn' ? 'রিমোট' : 'Remote'}
        </button>
        <button
          onClick={() => setActiveTab('schedules')}
          className={`flex-1 py-1.5 text-center rounded-lg ${
            activeTab === 'schedules' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400'
          }`}
        >
          {t.schedules}
        </button>
        <button
          onClick={() => setActiveTab('energy')}
          className={`flex-1 py-1.5 text-center rounded-lg ${
            activeTab === 'energy' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400'
          }`}
        >
          {t.energy}
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex-1 py-1.5 text-center rounded-lg ${
            activeTab === 'logs' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400'
          }`}
        >
          {t.irAudit}
        </button>
      </div>
    </header>
  );
};
