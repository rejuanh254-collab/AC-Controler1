import React, { useState } from 'react';
import {
  Wifi,
  Smartphone,
  Radio,
  CheckCircle2,
  Globe,
  Send,
  Zap,
  Check,
  AlertTriangle,
  Cloud,
  ChevronDown,
  RefreshCw,
  X,
  Plus,
} from 'lucide-react';
import { useSmartAC } from '../context/SmartACContext';
import type { ConnectionMethod } from '../types/iot';

export const NoArduinoConnectModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const {
    directConfig,
    updateDirectConfig,
    testDirectConnection,
    greeSession,
    loginGreeCloud,
    language,
  } = useSmartAC();

  const [activeTab, setActiveTab] = useState<ConnectionMethod>(directConfig.activeMethod || 'gree_cloud');
  const [greeEmail, setGreeEmail] = useState(directConfig.greeEmail || 'rejuanh254@gmail.com');
  const [greePassword, setGreePassword] = useState(directConfig.greePassword || '');
  const [greeRegion, setGreeRegion] = useState(directConfig.greeRegion || 'asia');
  const [greeMac, setGreeMac] = useState(directConfig.greeDeviceMac || 'C0:39:37:92:CB:97');
  const [isLoggingInGree, setIsLoggingInGree] = useState(false);
  const [greeLoginMessage, setGreeLoginMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const [tuyaDevId, setTuyaDevId] = useState(directConfig.tuyaDeviceId || '');
  const [tuyaKey, setTuyaKey] = useState(directConfig.tuyaLocalKey || '');
  const [acIp, setAcIp] = useState(directConfig.acLocalIp || '192.168.1.120');
  const [broadlinkIp, setBroadlinkIp] = useState(directConfig.broadlinkIp || '192.168.1.110');
  const [webhook, setWebhook] = useState(directConfig.webhookUrl || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleGreeCloudLogin = async () => {
    if (!greeEmail || (!greePassword && !greeSession.loggedIn)) {
      setGreeLoginMessage({
        text: language === 'bn' ? 'দয়া করে Gree+ অ্যাপের ইমেইল ও পাসওয়ার্ড লিখুন' : 'Please enter Gree+ email and password',
        isError: true,
      });
      return;
    }

    setIsLoggingInGree(true);
    setGreeLoginMessage(null);
    const res = await loginGreeCloud({
      email: greeEmail,
      password: greePassword,
      region: greeRegion,
      mac: greeMac,
    });
    setIsLoggingInGree(false);

    if (res.success) {
      setGreeLoginMessage({ text: res.message, isError: false });
    } else {
      setGreeLoginMessage({ text: res.message, isError: true });
    }
  };

  const handleSave = async () => {
    await updateDirectConfig({
      activeMethod: activeTab,
      greeEmail,
      greeRegion,
      greeDeviceMac: greeMac,
      tuyaDeviceId: tuyaDevId,
      tuyaLocalKey: tuyaKey,
      acLocalIp: acIp,
      broadlinkIp: broadlinkIp,
      webhookUrl: webhook,
      connected: true,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleTest = async (method: ConnectionMethod) => {
    const ok = await testDirectConnection(method);
    if (ok) {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-xl animate-fadeIn overflow-y-auto">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-8 pb-4 relative">
          <button
            onClick={onClose}
            className="absolute right-6 top-6 w-10 h-10 rounded-full bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <div className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 uppercase tracking-wider">
              Plug & Play
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              Setup Wizard
            </div>
          </div>

          <h2 className="text-2xl font-black text-white leading-tight">
            {language === 'bn' ? 'আরডুইন বা কোডিং ছাড়া' : 'Zero Coding'} <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
              {language === 'bn' ? 'রিয়েল এসি কানেকশন' : 'Real AC Connection'}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-2 max-w-md">
            {language === 'bn'
              ? 'বাজারের রেডিমেড স্মার্ট রিমোট বা এসির নিজস্ব ওয়াইফাই দিয়ে সরাসরি কন্ট্রোল করুন।'
              : 'Use official cloud APIs or local WiFi to control your physical AC without any extra electronics.'}
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="px-8 mb-4">
          <div className="flex items-center gap-1.5 p-1.5 bg-slate-950 border border-slate-800 rounded-3xl overflow-x-auto scrollbar-none">
            {[
              { id: 'gree_cloud', label: 'Gree+ Cloud', icon: Cloud },
              { id: 'tuya_smart_life', label: 'Tuya Hub', icon: Radio },
              { id: 'built_in_wifi', label: 'WiFi AC', icon: Wifi },
              { id: 'broadlink', label: 'Broadlink', icon: Globe },
              { id: 'mobile_ir', label: 'Phone IR', icon: Smartphone },
            ].map((item) => {
              const Icon = item.icon;
              const isSelected = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as ConnectionMethod)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[11px] font-bold whitespace-nowrap transition-all ${
                    isSelected
                      ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-6">
          {activeTab === 'gree_cloud' && (
            <div className="space-y-6 animate-slideUp">
              {/* Feature Card */}
              <div className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 p-6 rounded-[32px] flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-400">
                  <Zap className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-white text-sm">
                    {language === 'bn' ? 'Gree+ অফিসিয়াল ক্লাউড' : 'Official Gree+ Cloud'}
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {language === 'bn'
                      ? 'আপনার Gree+ অ্যাপের ইমেইল ও পাসওয়ার্ড দিয়ে সরাসরি কানেক্ট করুন। এটি সবচেয়ে সহজ ও রিয়েল পদ্ধতি।'
                      : 'Connect directly via Gree Official Servers. No extra hardware required, works worldwide.'}
                  </p>
                </div>
              </div>

              {/* Input Group */}
              <div className="bg-slate-950/50 border border-slate-800 rounded-[32px] p-6 space-y-5">
                <div>
                  <h4 className="text-[10px] text-slate-500 uppercase font-bold block mb-3 ml-1 tracking-widest">
                    Gree+ Region
                  </h4>
                  <div className="relative">
                    <select
                      value={greeRegion}
                      onChange={(e) => setGreeRegion(e.target.value)}
                      className="w-full px-5 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-white font-semibold focus:border-emerald-500 focus:outline-none appearance-none cursor-pointer"
                    >
                      <option value="asia">India / South Asia</option>
                      <option value="eu">Europe</option>
                      <option value="global">East & South-East Asia</option>
                      <option value="us">North America</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-500 absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-[10px] text-slate-500 uppercase font-bold block mb-3 ml-1 tracking-widest">
                      Email Address
                    </h4>
                    <input
                      type="email"
                      value={greeEmail}
                      onChange={(e) => setGreeEmail(e.target.value)}
                      placeholder="rejuanh254@gmail.com"
                      className="w-full px-5 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-white font-mono text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <h4 className="text-[10px] text-slate-500 uppercase font-bold block mb-3 ml-1 tracking-widest">
                      Password
                    </h4>
                    <input
                      type="password"
                      value={greePassword}
                      onChange={(e) => setGreePassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-5 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-white font-mono text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] text-slate-500 uppercase font-bold block mb-3 ml-1 tracking-widest">
                    AC MAC Address
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
                    className="w-full px-5 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-emerald-400 font-mono text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {greeLoginMessage && (
                  <div className={`p-4 rounded-2xl text-xs flex items-center gap-3 border ${
                    greeLoginMessage.isError
                      ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                      : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  }`}>
                    {greeLoginMessage.isError ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>{greeLoginMessage.text}</span>
                  </div>
                )}

                <button
                  onClick={handleGreeCloudLogin}
                  disabled={isLoggingInGree}
                  className="w-full py-4.5 bg-white hover:bg-slate-100 text-slate-950 font-black rounded-2xl shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoggingInGree ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>{language === 'bn' ? 'সার্ভারে লগইন হচ্ছে...' : 'Connecting...'}</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      <span>{language === 'bn' ? 'লগইন ও এসি লিঙ্ক করুন' : 'Connect & Link AC'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'tuya_smart_life' && (
            <div className="space-y-6 animate-slideUp">
              <div className="bg-slate-950 border border-slate-800 rounded-[32px] p-6 space-y-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400">
                    <Radio className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Tuya / Smart Life IR Hub</h4>
                    <p className="text-[11px] text-slate-500">Popular plug-and-play IR blaster method</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-[10px] text-slate-500 uppercase font-bold block mb-3 tracking-widest">Device ID</h4>
                    <input
                      type="text"
                      value={tuyaDevId}
                      onChange={(e) => setTuyaDevId(e.target.value)}
                      placeholder="bf48192a089..."
                      className="w-full px-5 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-white font-mono text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <h4 className="text-[10px] text-slate-500 uppercase font-bold block mb-3 tracking-widest">Local Key</h4>
                    <input
                      type="text"
                      value={tuyaKey}
                      onChange={(e) => setTuyaKey(e.target.value)}
                      placeholder="8e4f1a2b3..."
                      className="w-full px-5 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-white font-mono text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleTest('tuya_smart_life')}
                    className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>Test Command</span>
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    {savedSuccess ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    <span>{savedSuccess ? 'Saved' : 'Connect'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'built_in_wifi' && (
            <div className="space-y-6 animate-slideUp">
               <div className="bg-slate-950 border border-slate-800 rounded-[32px] p-6 space-y-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                    <Wifi className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Local WiFi AC</h4>
                    <p className="text-[11px] text-slate-500">Connect via local IP address (Walton/Gree)</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] text-slate-500 uppercase font-bold block mb-3 tracking-widest">AC Local IP Address</h4>
                  <input
                    type="text"
                    value={acIp}
                    onChange={(e) => setAcIp(e.target.value)}
                    placeholder="192.168.1.120"
                    className="w-full px-5 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-white font-mono text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200/80 leading-relaxed">
                  <span className="font-bold text-amber-300 block mb-1">⚠️ Network Constraint:</span>
                  Local IP only works when your phone and AC are on the same WiFi. For remote control outside your home, use the <span className="text-emerald-400 font-bold underline cursor-pointer" onClick={() => setActiveTab('gree_cloud')}>Gree+ Cloud</span> method.
                </div>

                <button
                  onClick={handleSave}
                  className="w-full py-4.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                >
                  {savedSuccess ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                  <span>{savedSuccess ? 'Saved' : 'Save Connection'}</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'broadlink' && (
            <div className="space-y-6 animate-slideUp">
               <div className="bg-slate-950 border border-slate-800 rounded-[32px] p-6 space-y-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Broadlink RM4 Mini</h4>
                    <p className="text-[11px] text-slate-500">Connect via Broadlink universal remote</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] text-slate-500 uppercase font-bold block mb-3 tracking-widest">Broadlink Local IP</h4>
                  <input
                    type="text"
                    value={broadlinkIp}
                    onChange={(e) => setBroadlinkIp(e.target.value)}
                    placeholder="192.168.1.110"
                    className="w-full px-5 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-white font-mono text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <button
                  onClick={handleSave}
                  className="w-full py-4.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                >
                  {savedSuccess ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                  <span>{savedSuccess ? 'Saved' : 'Save Connection'}</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'mobile_ir' && (
            <div className="space-y-6 animate-slideUp">
               <div className="bg-slate-950 border border-slate-800 rounded-[32px] p-8 space-y-5 text-center">
                <div className="w-20 h-20 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400 mx-auto mb-2 border border-cyan-500/20">
                  <Smartphone className="w-10 h-10" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white">Phone IR Blaster</h4>
                  <p className="text-sm text-slate-500 mt-2">No hardware needed for Xiaomi/Redmi phones</p>
                </div>
                <div className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
                  {language === 'bn' 
                    ? 'আপনার ফোনে ইনফ্রারেড বাল্ব থাকলে সরাসরি এসির দিকে ধরে বাটন চাপুন। এটি অটোমেটিক সিগন্যাল ট্রান্সমিট করবে।' 
                    : 'If your phone has a built-in IR bulb (like Xiaomi/Redmi), just point it at the AC. The app will blast signals directly from your phone.'}
                </div>
                <div className="pt-4">
                  <button
                    onClick={onClose}
                    className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition-all"
                  >
                    Got it, Ready to blast
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
