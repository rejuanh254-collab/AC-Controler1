import React, { useState } from 'react';
import { useSmartAC } from '../context/SmartACContext';
import {
  X,
  Radio,
  Wifi,
  Smartphone,
  Send,
  Zap,
  ArrowRight,
  ArrowLeft,
  Cloud,
  ChevronDown,
  Check,
  RefreshCw,
  Plus,
} from 'lucide-react';
import type { ACBrand, ConnectionMethod } from '../types/iot';
import { BRAND_CONFIGS } from '../utils/irCodes';

interface AddACDeviceWizardProps {
  onClose: () => void;
  onSuccess?: () => void;
}

const BRAND_LIST: { brand: ACBrand; subtitle: string; popularInBd?: boolean }[] = [
  { brand: 'Walton', subtitle: 'Inverna / Diamond / Oceanus', popularInBd: true },
  { brand: 'Gree', subtitle: 'Fairy WiFi / Lomo / Pular', popularInBd: true },
  { brand: 'General', subtitle: 'Tropical Heavy Split', popularInBd: true },
  { brand: 'Midea', subtitle: 'Xtreme Save / Mission', popularInBd: true },
  { brand: 'Carrier', subtitle: 'Emperia / Infinity' },
  { brand: 'Panasonic', subtitle: 'Nanoe-G Dual Inverter' },
  { brand: 'LG', subtitle: 'Dual Inverter ThinQ' },
  { brand: 'Daikin', subtitle: 'Triple Display' },
  { brand: 'Samsung', subtitle: 'WindFree Smart' },
  { brand: 'Haier', subtitle: 'Clean Cool Triple' },
  { brand: 'Universal', subtitle: 'Any 38kHz IR AC' },
];

export const AddACDeviceWizard: React.FC<AddACDeviceWizardProps> = ({ onClose, onSuccess }) => {
  const { pairDevice, testDirectConnection, language } = useSmartAC();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedBrand, setSelectedBrand] = useState<ACBrand>('Gree');
  const [deviceName, setDeviceName] = useState('My AC');
  const [deviceModel, setDeviceModel] = useState('Inverter Split');
  const [location, setLocation] = useState('Bedroom');
  const [connectionMethod, setConnectionMethod] = useState<ConnectionMethod>('gree_cloud');
  const [ipOrId, setIpOrId] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testSuccess, setTestSuccess] = useState<boolean | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleBrandSelect = (brand: ACBrand) => {
    setSelectedBrand(brand);
    setDeviceName(`${brand} AC`);
    setStep(2);
  };

  const handleTestBlast = async () => {
    setIsTesting(true);
    const ok = await testDirectConnection(connectionMethod);
    setIsTesting(false);
    setTestSuccess(ok);
    setTimeout(() => setTestSuccess(null), 3000);
  };

  const handleFinishPairing = async () => {
    setIsSaving(true);
    await pairDevice({
      brand: selectedBrand,
      deviceName: deviceName.trim() || `${selectedBrand} AC`,
      deviceModel: deviceModel.trim() || 'Inverter 1.5T',
      location: location.trim() || 'Room',
      method: connectionMethod,
      ipOrId: ipOrId.trim(),
    });
    setIsSaving(false);
    if (onSuccess) onSuccess();
    onClose();
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
              Pairing
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              Step {step} of 3
            </div>
          </div>

          <h2 className="text-2xl font-black text-white leading-tight">
            {language === 'bn' ? 'নতুন এসি ডিভাইস' : 'Connect New'} <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
              {language === 'bn' ? 'যুক্ত করুন' : 'AC Device'}
            </span>
          </h2>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-8 pb-4 space-y-6">
          {step === 1 && (
            <div className="space-y-4 animate-slideUp">
              <h4 className="text-[10px] text-slate-500 uppercase font-bold tracking-widest ml-1">Select Brand</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4">
                {BRAND_LIST.map((item) => (
                  <button
                    key={item.brand}
                    onClick={() => handleBrandSelect(item.brand)}
                    className="p-5 rounded-3xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900 text-left transition-all group flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">{item.brand}</span>
                        {item.popularInBd && <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">POPULAR</span>}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">{item.subtitle}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-700 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-slideUp">
              <div className="bg-slate-950 border border-slate-800 rounded-[32px] p-6 space-y-5">
                <div>
                  <h4 className="text-[10px] text-slate-500 uppercase font-bold mb-3 tracking-widest ml-1">Device Name</h4>
                  <input
                    type="text"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-white font-bold focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-[10px] text-slate-500 uppercase font-bold mb-3 tracking-widest ml-1">Room</h4>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full px-5 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-white text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <h4 className="text-[10px] text-slate-500 uppercase font-bold mb-3 tracking-widest ml-1">Model</h4>
                    <input
                      type="text"
                      value={deviceModel}
                      onChange={(e) => setDeviceModel(e.target.value)}
                      className="w-full px-5 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-white text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-slideUp">
              <div className="bg-slate-950 border border-slate-800 rounded-[32px] p-6 space-y-4">
                <h4 className="text-[10px] text-slate-500 uppercase font-bold tracking-widest ml-1">Connection Method</h4>
                <div className="grid grid-cols-1 gap-2.5">
                   {[
                    { id: 'gree_cloud', label: 'Gree+ Official Cloud', icon: Cloud, badge: 'Real API' },
                    { id: 'tuya_smart_life', label: 'Tuya / Smart Life Hub', icon: Radio, badge: 'IR Blaster' },
                    { id: 'built_in_wifi', label: 'Built-in WiFi AC', icon: Wifi, badge: 'Local UDP' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setConnectionMethod(m.id as ConnectionMethod)}
                      className={`p-5 rounded-3xl border text-left transition-all flex items-center gap-4 ${
                        connectionMethod === m.id 
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400' 
                          : 'bg-slate-900 border-slate-800 text-white hover:bg-slate-850'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${connectionMethod === m.id ? 'bg-slate-950/20' : 'bg-slate-800'}`}>
                        <m.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-bold">{m.label}</div>
                        <div className={`text-[10px] font-bold uppercase tracking-wider ${connectionMethod === m.id ? 'text-slate-900/60' : 'text-slate-500'}`}>{m.badge}</div>
                      </div>
                      {connectionMethod === m.id && <Check className="w-5 h-5" />}
                    </button>
                  ))}
                </div>
                
                {connectionMethod === 'built_in_wifi' && (
                  <div className="pt-2 animate-fadeIn">
                    <h4 className="text-[10px] text-slate-500 uppercase font-bold mb-3 tracking-widest ml-1">IP Address</h4>
                    <input
                      type="text"
                      value={ipOrId}
                      onChange={(e) => setIpOrId(e.target.value)}
                      placeholder="192.168.1.120"
                      className="w-full px-5 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-white font-mono text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-8 pt-4 flex items-center justify-between">
          {step > 1 ? (
            <button
              onClick={() => setStep((s) => (s - 1) as any)}
              className="flex items-center gap-2 px-6 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              onClick={() => setStep((s) => (s + 1) as any)}
              className="flex items-center gap-2 px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl transition-all shadow-xl shadow-emerald-500/20 ml-auto"
            >
              <span>Continue</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleFinishPairing}
              disabled={isSaving}
              className="flex items-center gap-2 px-10 py-4 bg-white hover:bg-slate-100 text-slate-950 font-black rounded-2xl transition-all shadow-xl ml-auto disabled:opacity-50"
            >
              {isSaving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
              <span>{isSaving ? 'Saving...' : 'Finish Setup'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
