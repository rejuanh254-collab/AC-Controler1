import React, { useState } from 'react';
import { SmartACProvider, useSmartAC } from './context/SmartACContext';
import { ACDeviceOverviewCard } from './components/ACDeviceOverviewCard';
import { ACDeviceEditModal } from './components/ACDeviceEditModal';
import { AddACDeviceWizard } from './components/AddACDeviceWizard';
import { ThermostatDial } from './components/ThermostatDial';
import { ACModeSelector } from './components/ACModeSelector';
import { ACQuickFeatures } from './components/ACQuickFeatures';
import { ACPresetsBar } from './components/ACPresetsBar';
import { ACClimateStation } from './components/ACClimateStation';
import { ACUsageReports } from './components/ACUsageReports';
import { ACHardwareModal } from './components/ACHardwareModal';
import { NoArduinoConnectModal } from './components/NoArduinoConnectModal';
import { ACVoiceModal } from './components/ACVoiceModal';
import { ACTimersAndSchedules } from './components/ACTimersAndSchedules';
import { SettingsTab } from './components/SettingsTab';
import { ACCleanMaintenanceModal } from './components/ACCleanMaintenanceModal';
import { GoogleAuthButton } from './components/GoogleAuthButton';
import { PWAInstallButton } from './components/PWAInstallButton';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import {
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Home,
  SlidersHorizontal,
  Calendar,
  Zap,
  MessageSquare,
  Settings,
  Plus,
  Power,
  RotateCw,
  Snowflake,
} from 'lucide-react';

function ACAppContent() {
  const { ac, togglePower, language, setLanguage, soundEnabled, setSoundEnabled } = useSmartAC();
  const [activeTab, setActiveTab] = useState<'home' | 'control' | 'curve' | 'power' | 'settings'>('control');
  const [viewMode, setViewMode] = useState<'overview' | 'inside'>('overview');
  const [showHardwareModal, setShowHardwareModal] = useState(false);
  const [showNoArduinoModal, setShowNoArduinoModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddWizard, setShowAddWizard] = useState(false);
  const [showCleanModal, setShowCleanModal] = useState(false);

  const isPaired = Boolean(ac.isPaired && ac.deviceName);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-white pb-24">
      {/* Top Header: Seamless matching Screenshot 1 on Control tab */}
      <header className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 py-2.5 transition-all">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          {activeTab === 'control' ? (
            <div className="w-full flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveTab('home')}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border border-slate-800 shadow-sm"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'হোমে ফিরুন' : 'Back to Home'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-bold text-white font-mono">
                    {ac.deviceName || 'Gree AC'}
                  </span>
                  <button
                    onClick={togglePower}
                    className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold transition-all active:scale-95 ${
                      ac.power
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30'
                        : 'bg-emerald-500 text-slate-950 border border-emerald-400 hover:bg-emerald-400'
                    }`}
                  >
                    {ac.power
                      ? language === 'bn'
                        ? 'চালু (ON)'
                        : 'ON'
                      : language === 'bn'
                      ? 'বন্ধ (OFF)'
                      : 'OFF'}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setShowCleanModal(true)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 shadow-sm active:scale-95 ${
                    ac.autoClean
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-extrabold shadow-cyan-500/25'
                      : 'bg-slate-900/90 hover:bg-slate-800 text-cyan-300 border-slate-800 hover:border-cyan-500/40'
                  }`}
                  title={language === 'bn' ? 'সেলফ ক্লিন ও ফিল্টার কেয়ার' : 'Self Clean & Maintenance'}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'সেলফ ক্লিন' : 'Self Clean'}</span>
                  {ac.autoClean && (
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />
                  )}
                </button>

                <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">{language === 'bn' ? 'ক্লাউড সিঙ্ক কার্যকর' : 'Cloud Sync Active'}</span>
                </div>

                <div className="flex items-center gap-1.5 border-l border-slate-800 pl-2">
                  <PWAInstallButton />
                  <button
                    onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}
                    className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-[10px] font-bold text-slate-300 hover:text-white transition-all"
                  >
                    {language === 'bn' ? 'EN' : 'বাং'}
                  </button>
                  <GoogleAuthButton />
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-md transition-all ${
                    ac.power
                      ? 'bg-gradient-to-tr from-cyan-600 to-blue-500 text-white shadow-cyan-500/20'
                      : 'bg-slate-900 border border-slate-800 text-slate-500'
                  }`}
                >
                  <Snowflake className={`w-4 h-4 ${ac.power ? 'animate-spin-slow' : ''}`} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-extrabold tracking-tight text-white font-sans">
                      CoolHome <span className="text-cyan-400">AC</span>
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                      {ac.brand || 'Gree'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${ac.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
                    <span>{ac.isOnline ? (language === 'bn' ? 'গ্রী ক্লাউড সক্রিয়' : 'Gree Cloud Online') : 'Offline'}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <PWAInstallButton />
                <button
                  onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-[11px] font-bold text-slate-300 hover:text-white transition-all"
                >
                  {language === 'bn' ? 'EN' : 'বাংলা'}
                </button>
                <GoogleAuthButton />
              </div>
            </>
          )}
        </div>
      </header>
      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 pt-5 sm:pt-7 pb-4">
        {/* TAB 1: HOME (My Devices overview) */}
        {activeTab === 'home' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Clean Device List / Overview */}
            <ACDeviceOverviewCard
              onEnterDevice={() => setActiveTab('control')}
              onOpenEditModal={() => setShowEditModal(true)}
              onOpenNoArduino={() => setShowNoArduinoModal(true)}
              onOpenAddWizard={() => setShowAddWizard(true)}
              onOpenVoiceModal={() => setShowVoiceModal(true)}
              onOpenCleanModal={() => setShowCleanModal(true)}
            />
          </div>
        )}

        {/* TAB 2: CONTROL (Dedicated AC Device Controller Page - Screenshot 1) */}
        {activeTab === 'control' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Active Deep Clean Status Banner (only when cleaning cycle is actively running) */}
            {ac.isCleaning && (
              <div
                onClick={() => setShowCleanModal(true)}
                className="cursor-pointer w-full p-3 sm:p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 shadow-lg bg-cyan-950/60 border-cyan-400 text-white shadow-cyan-500/20 animate-pulse"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-cyan-500 text-slate-950">
                    <Sparkles className="w-4 h-4 animate-spin" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">
                        {language === 'bn' ? '✨ এসি ডিপ সেলফ ক্লিন মোড সক্রিয় (CL)' : '✨ Deep Self-Clean Active (CL)'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-cyan-400 text-slate-950 font-black text-[9px] font-mono">
                        {Math.ceil(ac.cleanCycleRemainingMinutes ?? 15)} {language === 'bn' ? 'মি. বাকি' : 'm left'}
                      </span>
                    </div>
                    <p className="text-[11px] text-cyan-300/90 leading-tight">
                      {language === 'bn'
                        ? `ধাপ: ${ac.cleanCycleStage === 'frost' ? '১/৪ কয়েল ফ্রস্টিং' : ac.cleanCycleStage === 'wash' ? '২/৪ ড্রেন ফ্লাশ' : ac.cleanCycleStage === 'dry' ? '৩/৪ কয়েল শুকানো' : '৪/৪ প্লাজমা স্যানিটাইজ'} (ক্লিক করে বিস্তারিত দেখুন)`
                        : `Stage: ${ac.cleanCycleStage} (tap to view details)`}
                    </p>
                  </div>
                </div>

                <span className="text-xs font-bold text-cyan-400 hover:underline shrink-0 flex items-center gap-1">
                  <span>{language === 'bn' ? 'কেয়ার সেন্টার ➔' : 'View ➔'}</span>
                </span>
              </div>
            )}

            {/* 1. Main Temperature Controller Dial - Top Priority Section */}
            <div className="w-full">
              <ThermostatDial />
            </div>

            {/* 2. 1-Tap Quick Presets Bar */}
            <ACPresetsBar />

            {/* 3. AC Modes & Features Controls */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-7 w-full space-y-6">
                <ACModeSelector />
              </div>
              <div className="lg:col-span-5 w-full space-y-6">
                <ACQuickFeatures />
              </div>
            </div>

            {/* Status Out-of-Sync Warning */}
            {!showHardwareModal && (
              <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-2xl flex items-center justify-between gap-4 animate-slideDown">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                    <Zap className="w-4 h-4" />
                  </div>
                  <p className="text-[10px] sm:text-xs text-amber-200/80 leading-tight">
                    {language === 'bn' 
                      ? 'রিয়েল টাইম স্ট্যাটাস ভুল দেখাচ্ছে? ফিজিক্যাল এসি কন্ট্রোল করতে হার্ডওয়্যার মডিউল প্রয়োজন।' 
                      : 'Status out of sync? A hardware bridge (ESP32) is needed for 100% physical control.'}
                  </p>
                </div>
                <button 
                  onClick={() => setShowHardwareModal(true)}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] rounded-lg shadow-lg shadow-amber-500/10 whitespace-nowrap"
                >
                  {language === 'bn' ? 'সমাধান দেখুন' : 'Get Bridge'}
                </button>
              </div>
            )}

            {/* Room Climate & Power Meter */}
            <ACClimateStation />
          </div>
        )}

        {/* TAB 3: CURVE (Smart Timers & Schedules) */}
        {activeTab === 'curve' && <ACTimersAndSchedules />}

        {/* TAB 4: POWER (Energy, Wattmeter & Cost) */}
        {activeTab === 'power' && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <p className="text-[11px] font-mono tracking-widest text-slate-400 uppercase font-semibold">
                POWER & ENERGY
              </p>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                {language === 'bn' ? 'বিদ্যুৎ খরচ ও রিয়েলটাইম পাওয়ার' : 'Energy & Power Analytics'}
              </h1>
            </div>
            <ACClimateStation />
            <ACUsageReports />
          </div>
        )}

        {/* TAB 5: SETTINGS (Gree+ Cloud, Protocols, Hardware, Logs) */}
        {activeTab === 'settings' && (
          <SettingsTab
            onOpenHardwareModal={() => setShowHardwareModal(true)}
            onOpenNoArduinoModal={() => setShowNoArduinoModal(true)}
          />
        )}
      </main>

      {/* Floating App-Like Bottom Navigation Bar */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-slate-950/85 backdrop-blur-2xl border-t border-slate-800/80 px-2 sm:px-4 py-2 shadow-[0_-10px_25px_rgba(0,0,0,0.5)]">
        <div className="max-w-md mx-auto flex items-center justify-between">
          {/* HOME TAB */}
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 sm:px-3 rounded-2xl transition-all duration-200 active:scale-95 ${
              activeTab === 'home'
                ? 'bg-cyan-500/15 text-cyan-300 font-bold border border-cyan-500/30 shadow-sm shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Home className={`w-5 h-5 ${activeTab === 'home' ? 'text-cyan-400 scale-110' : ''}`} />
            <span className="text-[10px] tracking-tight">{language === 'bn' ? 'হোম' : 'Home'}</span>
          </button>

          {/* CONTROL TAB */}
          <button
            onClick={() => setActiveTab('control')}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 sm:px-3 rounded-2xl transition-all duration-200 active:scale-95 ${
              activeTab === 'control'
                ? 'bg-cyan-500/15 text-cyan-300 font-bold border border-cyan-500/30 shadow-sm shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <SlidersHorizontal className={`w-5 h-5 ${activeTab === 'control' ? 'text-cyan-400 scale-110' : ''}`} />
            <span className="text-[10px] tracking-tight">{language === 'bn' ? 'কন্ট্রোল' : 'Control'}</span>
          </button>

          {/* SCHEDULE TAB */}
          <button
            onClick={() => setActiveTab('curve')}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 sm:px-3 rounded-2xl transition-all duration-200 active:scale-95 ${
              activeTab === 'curve'
                ? 'bg-cyan-500/15 text-cyan-300 font-bold border border-cyan-500/30 shadow-sm shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className={`w-5 h-5 ${activeTab === 'curve' ? 'text-cyan-400 scale-110' : ''}`} />
            <span className="text-[10px] tracking-tight">{language === 'bn' ? 'শিডিউল' : 'Schedule'}</span>
          </button>

          {/* POWER TAB */}
          <button
            onClick={() => setActiveTab('power')}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 sm:px-3 rounded-2xl transition-all duration-200 active:scale-95 ${
              activeTab === 'power'
                ? 'bg-cyan-500/15 text-cyan-300 font-bold border border-cyan-500/30 shadow-sm shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className={`w-5 h-5 ${activeTab === 'power' ? 'text-cyan-400 scale-110' : ''}`} />
            <span className="text-[10px] tracking-tight">{language === 'bn' ? 'পাওয়ার' : 'Power'}</span>
          </button>

          {/* AI VOICE BUTTON */}
          <button
            onClick={() => setShowVoiceModal(true)}
            className="flex flex-col items-center gap-1 py-1 px-2 sm:px-2.5 rounded-2xl text-slate-400 hover:text-cyan-300 transition-all duration-200 active:scale-95 group"
          >
            <Sparkles className="w-5 h-5 text-cyan-400 group-hover:scale-125 transition-transform animate-pulse" />
            <span className="text-[10px] tracking-tight font-medium">{language === 'bn' ? 'মাইক' : 'AI Voice'}</span>
          </button>

          {/* SETTINGS TAB */}
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 sm:px-3 rounded-2xl transition-all duration-200 active:scale-95 ${
              activeTab === 'settings'
                ? 'bg-cyan-500/15 text-cyan-300 font-bold border border-cyan-500/30 shadow-sm shadow-cyan-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className={`w-5 h-5 ${activeTab === 'settings' ? 'text-cyan-400 scale-110' : ''}`} />
            <span className="text-[10px] tracking-tight">{language === 'bn' ? 'সেটিংস' : 'Settings'}</span>
          </button>
        </div>
      </nav>

      {/* Add Real AC Device Pairing Wizard Modal */}
      {showAddWizard && (
        <AddACDeviceWizard
          onClose={() => setShowAddWizard(false)}
          onSuccess={() => {
            setShowAddWizard(false);
            setActiveTab('control');
          }}
        />
      )}

      {/* Edit Real Device Name Modal */}
      {showEditModal && (
        <ACDeviceEditModal onClose={() => setShowEditModal(false)} />
      )}

      {/* Hardware / ESP32 Code Generator Modal */}
      {showHardwareModal && (
        <ACHardwareModal onClose={() => setShowHardwareModal(false)} />
      )}

      {/* No Arduino Direct Connection Modal */}
      {showNoArduinoModal && (
        <NoArduinoConnectModal onClose={() => setShowNoArduinoModal(false)} />
      )}

      {/* Voice Assistant Modal */}
      {showVoiceModal && (
        <ACVoiceModal onClose={() => setShowVoiceModal(false)} />
      )}

      {/* AC Clean & Filter Maintenance Modal */}
      {showCleanModal && (
        <ACCleanMaintenanceModal
          isOpen={showCleanModal}
          onClose={() => setShowCleanModal(false)}
        />
      )}

      {/* 1-Click Direct PWA Install Floating Banner */}
      <PWAInstallBanner />
    </div>
  );
}

export default function App() {
  return (
    <SmartACProvider>
      <ACAppContent />
    </SmartACProvider>
  );
}
