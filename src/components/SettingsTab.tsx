import React, { useState } from 'react';
import { useSmartAC } from '../context/SmartACContext';
import { BRAND_CONFIGS } from '../utils/irCodes';
import type { ACBrand, ConnectionMethod } from '../types/iot';
import { GoogleAuthButton } from './GoogleAuthButton';
import { PWAInstallButton } from './PWAInstallButton';
import {
  Cloud,
  Radio,
  Wifi,
  Cpu,
  Smartphone,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Volume2,
  VolumeX,
  FileText,
  Trash2,
  ShieldCheck,
  ChevronDown,
  RefreshCw,
  LogOut,
  Mail,
  Lock,
  Server,
  Zap,
  Database,
  Download,
} from 'lucide-react';

interface SettingsTabProps {
  onOpenHardwareModal: () => void;
  onOpenNoArduinoModal: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  onOpenHardwareModal,
  onOpenNoArduinoModal,
}) => {
  const {
    ac,
    setBrand,
    directConfig,
    updateDirectConfig,
    greeSession,
    loginGreeCloud,
    logoutGreeCloud,
    updatePowerSettings,
    unpairDevice,
    language,
    setLanguage,
    soundEnabled,
    setSoundEnabled,
    power,
    logs,
    testIrBlast,
    isSendingIR,
    user,
    signInWithGoogle,
    saveSettingsToDatabase,
    loadSettingsFromDatabase,
    isDbSyncing,
    dbLastSynced,
  } = useSmartAC();

  const [activeSection, setActiveSection] = useState<'cloud' | 'brand' | 'logs' | 'general'>('cloud');
  const [greeEmail, setGreeEmail] = useState(directConfig.greeEmail || 'rejuanh254@gmail.com');
  const [greePassword, setGreePassword] = useState(directConfig.greePassword || '');
  const [greeRegion, setGreeRegion] = useState(directConfig.greeRegion || 'asia');
  const [greeMac, setGreeMac] = useState(directConfig.greeDeviceMac || 'c0393792cb97');
  const [currency, setCurrency] = useState(power.currency || 'BDT');
  const [unitRate, setUnitRate] = useState(power.unitRateBdt?.toString() || '7');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loginMsg, setLoginMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const brandsList = Object.keys(BRAND_CONFIGS) as ACBrand[];

  const handleSaveEnergy = async () => {
    await updatePowerSettings({
      unitRateBdt: parseFloat(unitRate),
      currency: currency,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleLoginGree = async () => {
    if (!greeEmail || !greePassword) {
      setLoginMsg({
        text: language === 'bn' ? 'Gree+ ইমেইল ও পাসওয়ার্ড প্রদান করুন' : 'Enter Gree+ email & password',
        isError: true,
      });
      return;
    }
    setIsLoggingIn(true);
    setLoginMsg(null);
    const res = await loginGreeCloud({
      email: greeEmail,
      password: greePassword,
      region: greeRegion,
      mac: greeMac,
    });
    setIsLoggingIn(false);
    if (res.success) {
      setLoginMsg({ text: res.message, isError: false });
    } else {
      setLoginMsg({ text: res.message, isError: true });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* Settings Header */}
      <div>
        <p className="text-[11px] font-mono tracking-widest text-slate-400 uppercase font-semibold">
          CONFIGURATION
        </p>
        <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
          {language === 'bn' ? 'সেটিংস ও কানেকশন হাব' : 'Settings & Connections'}
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          {language === 'bn'
            ? 'Gree+ ক্লাউড একাউন্ট, ওয়াইফাই সংযোগ, এসি ব্র‍্যান্ড প্রোটোকল ও হার্ডওয়্যার কনফিগারেশন।'
            : 'Manage Gree+ Cloud account, connection methods, IR protocols, and system settings.'}
        </p>
      </div>

      {/* Navigation Sub-Tabs inside Settings */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto scrollbar-none text-xs font-semibold">
        {[
          { id: 'cloud', labelBn: '১. Gree+ ক্লাউড গেটওয়ে', labelEn: '1. Gree+ Cloud Login', icon: Cloud },
          { id: 'brand', labelBn: '২. এসি ব্র্যান্ড ও প্রোটোকল', labelEn: '2. AC Protocol & Brand', icon: Radio },
          { id: 'logs', labelBn: '৩. সিগন্যাল ও অডিট লগ', labelEn: '3. IR Signal Logs', icon: FileText },
          { id: 'general', labelBn: '৪. ভাষা ও অ্যাপ সেটিংস', labelEn: '4. App Preferences', icon: Sliders },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as any)}
              className={`px-3.5 py-2.5 rounded-xl flex items-center gap-2 whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{language === 'bn' ? tab.labelBn : tab.labelEn}</span>
            </button>
          );
        })}
      </div>

      {/* SECTION 1: GREE+ CLOUD LOGIN & GOOGLE DATABASE SYNC */}
      {activeSection === 'cloud' && (
        <div className="space-y-6">
          {/* Google Account & Cloud Database Sync Card */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/30 border border-cyan-500/20 rounded-3xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    {language === 'bn' ? 'গুগল অ্যাকাউন্ট ও ক্লাউড ডাটাবেজ ব্যাকআপ' : 'Google Account & Cloud Database'}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    {language === 'bn' ? 'এসির লাস্ট সেটিংস সবসময় ফায়ারবেজ ক্লাউডে সংরক্ষিত থাকে।' : 'Last AC state is automatically saved to Firebase Firestore.'}
                  </p>
                </div>
              </div>
              <GoogleAuthButton compact />
            </div>

            {user ? (
              <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="User" className="w-9 h-9 rounded-full object-cover border border-cyan-400" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-cyan-500 text-slate-950 font-bold flex items-center justify-center">
                      {user.email?.[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-white flex items-center gap-1.5">
                      <span>{user.displayName || 'Google User'}</span>
                      <span className="text-[10px] font-mono text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {language === 'bn' ? 'সংযুক্ত' : 'Connected'}
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono">{user.email}</p>
                    {dbLastSynced && (
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {language === 'bn' ? 'শেষ সিঙ্ক:' : 'Last Synced:'} <span className="text-cyan-400">{dbLastSynced}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => saveSettingsToDatabase()}
                    disabled={isDbSyncing}
                    className="px-3.5 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-xl font-bold flex items-center gap-1.5 text-xs transition-all active:scale-95"
                  >
                    <Cloud className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'এখনই সেভ' : 'Save Now'}</span>
                  </button>
                  <button
                    onClick={() => loadSettingsFromDatabase()}
                    disabled={isDbSyncing}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl font-bold flex items-center gap-1.5 text-xs transition-all active:scale-95"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{language === 'bn' ? 'রিস্টোর' : 'Restore'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-cyan-950/20 border border-cyan-500/20 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-300">
                  {language === 'bn'
                    ? 'গুগল দিয়ে সাইন-ইন করলে ব্রাউজার বন্ধ করলেও আপনার এসির লাস্ট সেটিংস হারাবে না এবং সকল ডিভাইসে সিঙ্ক থাকবে।'
                    : 'Sign in with Google to preserve your last AC settings and sync them across all your devices.'}
                </p>
                <button
                  onClick={signInWithGoogle}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-950 font-bold rounded-xl text-xs shadow-md shrink-0 flex items-center gap-2 transition-all hover:scale-102 active:scale-98"
                >
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.19 0 10.04 0 12s.45 3.81 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>{language === 'bn' ? 'গুগল দিয়ে সাইন-ইন করুন' : 'Sign in with Google'}</span>
                </button>
              </div>
            )}
          </div>
          {/* Energy Cost Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                {language === 'bn' ? 'বিদ্যুৎ খরচ সেটিংস' : 'Energy cost'}
              </h4>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
                  {language === 'bn' ? 'কারেন্সি' : 'CURRENCY'}
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-semibold focus:border-cyan-500 focus:outline-none appearance-none cursor-pointer"
                >
                  <option value="BDT">BDT</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="INR">INR</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-bold block mb-1">
                  {language === 'bn' ? 'ইউনিট রেট / kWh' : 'PRICE / KWH'}
                </label>
                <input
                  type="text"
                  value={unitRate}
                  onChange={(e) => setUnitRate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              onClick={handleSaveEnergy}
              className="w-full py-3 bg-slate-800 hover:bg-slate-750 text-white font-bold rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-2"
            >
              {saveSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{language === 'bn' ? 'সেভ হয়েছে' : 'Saved'}</span>
                </>
              ) : (
                <span>{language === 'bn' ? 'বিদ্যুৎ খরচ সেভ করুন' : 'Save energy cost'}</span>
              )}
            </button>
          </div>

          {/* Server Indicator Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
                <Globe className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">
                  {greeRegion === 'asia' ? 'India / South Asia server' : greeRegion === 'eu' ? 'Europe server' : greeRegion === 'us' ? 'North America server' : 'Global server'}
                </h4>
                <p className="text-[10px] text-slate-500 font-mono">
                  {greeRegion === 'asia' ? 'ingrih.gree.com' : greeRegion === 'eu' ? 'eu.gree.com' : greeRegion === 'us' ? 'us.gree.com' : 'grih.gree.com'}
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold border border-slate-700 uppercase">
              SAVED
            </span>
          </div>

          {/* Main Account Settings Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
            <div>
              <h4 className="text-[10px] text-slate-500 uppercase font-bold block mb-2">
                GREE+ REGION
              </h4>
              <div className="relative">
                <select
                  value={greeRegion}
                  onChange={(e) => setGreeRegion(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white font-semibold focus:border-cyan-500 focus:outline-none appearance-none cursor-pointer"
                >
                  <option value="asia">India / South Asia</option>
                  <option value="eu">Europe</option>
                  <option value="global">East & South-East Asia</option>
                  <option value="me">Middle East</option>
                  <option value="us">North America</option>
                  <option value="au">Australia</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Pick the region you chose when you signed up in the Gree+ app.
              </p>
            </div>

            <div>
              <h4 className="text-[10px] text-slate-500 uppercase font-bold block mb-2">
                GREE+ EMAIL
              </h4>
              <input
                type="email"
                value={greeEmail}
                onChange={(e) => setGreeEmail(e.target.value)}
                placeholder="rejuanh254@gmail.com"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <h4 className="text-[10px] text-slate-500 uppercase font-bold block mb-2">
                GREE+ PASSWORD
              </h4>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={greePassword}
                  onChange={(e) => setGreePassword(e.target.value)}
                  placeholder="•••••••• (saved - leave blank to keep)"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white font-mono focus:border-cyan-500 focus:outline-none pr-12"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <h4 className="text-[10px] text-slate-500 uppercase font-bold block mb-2">
                AC MAC ADDRESS
              </h4>
              <input
                type="text"
                value={greeMac}
                onChange={(e) => {
                  let val = e.target.value.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
                  if (val.length > 12) val = val.substring(0, 12);
                  const chunks = val.match(/.{1,2}/g) || [];
                  setGreeMac(chunks.join(':'));
                }}
                placeholder="C0:39:37:92:CB:97"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-500 mt-2">
                Found in the Gree+ app → your AC → device info.
              </p>
            </div>

            {loginMsg && (
              <div
                className={`p-4 rounded-2xl text-xs flex items-center gap-2 border ${
                  loginMsg.isError
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                }`}
              >
                {loginMsg.isError ? (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                )}
                <span>{loginMsg.text}</span>
              </div>
            )}

            <button
              onClick={handleLoginGree}
              disabled={isLoggingIn}
              className="w-full py-4 bg-slate-200 hover:bg-white text-slate-950 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{language === 'bn' ? 'আপডেট হচ্ছে...' : 'Updating...'}</span>
                </>
              ) : (
                <span>{language === 'bn' ? 'সেটিংস আপডেট করুন' : 'Update settings'}</span>
              )}
            </button>

            <button
              onClick={logoutGreeCloud}
              className="w-full py-3 flex items-center justify-center gap-2 text-rose-500 hover:text-rose-400 font-bold transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>{language === 'bn' ? 'Gree+ একাউন্ট মুছে ফেলুন' : 'Remove Gree+ account'}</span>
            </button>
          </div>
        </div>
      )}

      {/* SECTION 2: BRAND & PROTOCOL SELECTION */}
      {activeSection === 'brand' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white">
              {language === 'bn' ? 'এসি ব্র্যান্ড প্রোটোকল পরিবর্তন' : 'AC Brand & Protocol Select'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {language === 'bn'
                ? 'বর্তমানে সক্রিয় ব্র্যান্ড: ' + ac.brand
                : 'Active Protocol: ' + ac.brand}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {brandsList.map((brandName) => {
              const isSelected = ac.brand === brandName;
              return (
                <button
                  key={brandName}
                  onClick={() => setBrand(brandName)}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? 'bg-cyan-500/10 border-cyan-500 text-cyan-300 shadow-md shadow-cyan-500/10 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-850'
                  }`}
                >
                  <p className="text-xs font-bold">{brandName}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {BRAND_CONFIGS[brandName]?.cppClass || '38kHz IR'}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
            <button
              onClick={onOpenHardwareModal}
              className="px-4 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-700 rounded-xl text-xs font-semibold text-cyan-400 flex items-center gap-1.5"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'ESP32 আরডুইন কোড তৈরি করুন' : 'ESP32 Code Generator'}</span>
            </button>
          </div>
        </div>
      )}

      {/* SECTION 3: SIGNAL LOGS */}
      {activeSection === 'logs' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">
                {language === 'bn' ? 'আইআর সিগন্যাল ও অডিট লগ' : 'IR Transmission & Audit Logs'}
              </h3>
              <p className="text-xs text-slate-400">
                {language === 'bn' ? 'সার্ভার ও ক্লাউড থেকে প্রেরিত কমান্ডের তালিকা' : 'Real-time telemetry and transmitted hex frames'}
              </p>
            </div>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1 scrollbar-none font-mono text-xs">
            {logs.length === 0 ? (
              <p className="text-slate-400 text-center py-6 text-xs font-sans">
                {language === 'bn' ? 'কোনো লগ রেকর্ড নেই' : 'No transmission records yet'}
              </p>
            ) : (
              logs.map((log: any) => (
                <div
                  key={log.id}
                  className="p-3 bg-slate-950 border border-slate-800/90 rounded-2xl space-y-1"
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="text-cyan-400 font-bold">{log.protocol}</span>
                    <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-slate-200 text-xs">{language === 'bn' ? log.commandBn : log.command}</p>
                  <p className="text-[10px] text-slate-400 break-all">{log.hexCode}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SECTION 4: APP PREFERENCES */}
      {activeSection === 'general' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-white">
            {language === 'bn' ? 'অ্যাপ পছন্দসমূহ' : 'General Preferences'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            {/* Language */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span className="font-semibold text-white">
                  {language === 'bn' ? 'অ্যাপের ভাষা' : 'App Language'}
                </span>
              </div>
              <div className="flex gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setLanguage('bn')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
                    language === 'bn' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  বাংলা
                </button>
                <button
                  onClick={() => setLanguage('en')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
                    language === 'en' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  English
                </button>
              </div>
            </div>

            {/* Sound Feedback */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-cyan-400" />
                ) : (
                  <VolumeX className="w-4 h-4 text-slate-500" />
                )}
                <span className="font-semibold text-white">
                  {language === 'bn' ? 'বিপ সাউন্ড (Beep Sound)' : 'Sound Feedback'}
                </span>
              </div>
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs border ${
                  soundEnabled
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                {soundEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          {/* PWA 1-Click Direct Install Card */}
          <div className="p-4 bg-gradient-to-r from-cyan-950/30 via-slate-950 to-blue-950/30 rounded-2xl border border-cyan-500/30 flex flex-wrap items-center justify-between gap-4 mt-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30 shrink-0">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-white">
                    {language === 'bn' ? 'সরাসরি ১-ক্লিকে PWA অ্যাপ ইনস্টল' : 'Direct 1-Click PWA App Install'}
                  </h4>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Standalone
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {language === 'bn'
                    ? 'ব্রাউজার ছাড়াই মোবাইলের হোম স্ক্রিনে সরাসরি নেটিভ অ্যাপ হিসেবে ইনস্টল করুন।'
                    : 'Install directly on home screen for instant standalone native experience.'}
                </p>
              </div>
            </div>
            <PWAInstallButton />
          </div>
        </div>
      )}
    </div>
  );
};
