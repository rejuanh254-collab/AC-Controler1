import React, { useState } from 'react';
import { useSmartAC } from '../context/SmartACContext';
import { Sparkles, Check, X, Tag, Cpu, MapPin, Radio, ShieldCheck } from 'lucide-react';
import type { ACBrand } from '../types/iot';

interface ACDeviceEditModalProps {
  onClose: () => void;
}

const POPULAR_PRESET_MODELS: Record<ACBrand, { defaultName: string; model: string; tonnage: number }[]> = {
  Walton: [
    { defaultName: 'Walton Inverna Smart Inverter 1.5T', model: 'WSI-INVERNA-18F (WiFi Smart)', tonnage: 1.5 },
    { defaultName: 'Walton Diamond Smart Inverter 1.0T', model: 'WSI-DIAMOND-12C', tonnage: 1.0 },
    { defaultName: 'Walton Oceanus Super Inverter 2.0T', model: 'WSI-OCEANUS-24H', tonnage: 2.0 },
  ],
  Gree: [
    { defaultName: 'Gree Fairy WiFi Smart AC 1.5T', model: 'GWH18AAC-K6DNA1A', tonnage: 1.5 },
    { defaultName: 'Gree Lomo Inverter AC 1.0T', model: 'GWH12QC-K3DNB4G', tonnage: 1.0 },
    { defaultName: 'Gree Pular Inverter AC 2.0T', model: 'GWH24AGD-K6DNA1A', tonnage: 2.0 },
  ],
  General: [
    { defaultName: 'General High-Efficiency Split 1.5T', model: 'ASGA18FUTB', tonnage: 1.5 },
    { defaultName: 'General Tropical Inverter 2.0T', model: 'ASGA24FUTC', tonnage: 2.0 },
  ],
  Midea: [
    { defaultName: 'Midea Xtreme Save Inverter 1.5T', model: 'MSAGB-18HRFN1', tonnage: 1.5 },
    { defaultName: 'Midea Mission WiFi Smart 1.0T', model: 'MSMBB-12HRFN1', tonnage: 1.0 },
  ],
  Carrier: [
    { defaultName: 'Carrier Emperia Inverter 1.5T', model: 'CAI18ER3R30F0', tonnage: 1.5 },
  ],
  Panasonic: [
    { defaultName: 'Panasonic Nanoe-G Smart Inverter 1.5T', model: 'CS-KU18XKYF', tonnage: 1.5 },
  ],
  LG: [
    { defaultName: 'LG Dual Inverter Smart ThinQ 1.5T', model: 'MS-Q18YNZA', tonnage: 1.5 },
  ],
  Daikin: [
    { defaultName: 'Daikin Triple Display Inverter 1.5T', model: 'FTKL50TV16U', tonnage: 1.5 },
  ],
  Samsung: [
    { defaultName: 'Samsung WindFree Smart Inverter 1.5T', model: 'AR18CY3ZAWK', tonnage: 1.5 },
  ],
  Haier: [
    { defaultName: 'Haier Triple Inverter Clean Cool 1.5T', model: 'HSU-18CleanCool', tonnage: 1.5 },
  ],
  Singer: [
    { defaultName: 'Singer Green Inverter Smart 1.5T', model: 'SAS18L70INV', tonnage: 1.5 },
  ],
  Mitsubishi: [
    { defaultName: 'Mitsubishi Heavy Duty Inverter 1.5T', model: 'SRK18YXP-W6', tonnage: 1.5 },
  ],
  Electrolux: [
    { defaultName: 'Electrolux UltimateHome Smart AC 1.5T', model: 'ESV183C3XA', tonnage: 1.5 },
  ],
  Universal: [
    { defaultName: 'Universal Smart Inverter AC 1.5T', model: 'UNIV-AC-IR-38K', tonnage: 1.5 },
  ],
};

export const ACDeviceEditModal: React.FC<ACDeviceEditModalProps> = ({ onClose }) => {
  const { ac, updateAC, setBrand, language } = useSmartAC();

  const [deviceName, setDeviceName] = useState(ac.deviceName || 'Walton Inverna Smart Inverter 1.5T');
  const [deviceModel, setDeviceModel] = useState(ac.deviceModel || 'WSI-INVERNA-18F');
  const [location, setLocation] = useState(ac.location || 'Master Bedroom');
  const [selectedBrand, setSelectedBrand] = useState<ACBrand>(ac.brand);
  const [isSaved, setIsSaved] = useState(false);

  const handleApplyPreset = (preset: { defaultName: string; model: string; tonnage: number }) => {
    setDeviceName(preset.defaultName);
    setDeviceModel(preset.model);
  };

  const handleSave = async () => {
    await setBrand(selectedBrand);
    await updateAC({
      deviceName,
      deviceModel,
      location,
      brand: selectedBrand,
    });
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 900);
  };

  const presetsForBrand = POPULAR_PRESET_MODELS[selectedBrand] || POPULAR_PRESET_MODELS.Walton;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-cyan-500/20">
              <Tag className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {language === 'bn' ? 'এসির রিয়েল ডিভাইসের নাম ও তথ্য সেট করুন' : 'Set Real AC Device Info & Model'}
              </h3>
              <p className="text-xs text-slate-400">
                {language === 'bn'
                  ? 'আপনার ঘরের আসল এসির ব্র্যান্ড, মডেল ও নাম সংরক্ষণ করুন।'
                  : 'Customize your real AC brand, hardware model number, and room.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Brand Selection */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>{language === 'bn' ? 'এসির ব্র্যান্ড সিলেক্ট করুন' : 'Select AC Brand'}</span>
            </label>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value as ACBrand)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500 font-semibold"
            >
              {Object.keys(POPULAR_PRESET_MODELS).map((b) => (
                <option key={b} value={b}>
                  {b} {b === 'Walton' ? '(Bangladesh Inverter)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Preset Models for this brand */}
          {presetsForBrand.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                {language === 'bn' ? 'জনপ্রিয় মডেলসমূহ (এক ক্লিকে বসান):' : 'Popular Models (1-Tap Select):'}
              </span>
              <div className="grid grid-cols-1 gap-2">
                {presetsForBrand.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className="p-2.5 rounded-xl bg-slate-950/70 hover:bg-cyan-500/10 border border-slate-800 hover:border-cyan-500/40 text-left transition-all flex items-center justify-between group"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-200 group-hover:text-cyan-300">
                        {p.defaultName}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        Model: {p.model} · {p.tonnage} Ton
                      </div>
                    </div>
                    <span className="text-[11px] text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity font-semibold">
                      {language === 'bn' ? 'সিলেক্ট ➔' : 'Select ➔'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom Device Name */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-cyan-400" />
              <span>{language === 'bn' ? 'ডিভাইসের আসল নাম (Device Name)' : 'Real Device Display Name'}</span>
            </label>
            <input
              type="text"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="e.g. Walton Inverna 1.5 Ton Master Bed"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500 font-medium"
            />
          </div>

          {/* Model Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5 uppercase tracking-wider">
                {language === 'bn' ? 'মডেল নম্বর (Model)' : 'Model Number'}
              </label>
              <input
                type="text"
                value={deviceModel}
                onChange={(e) => setDeviceModel(e.target.value)}
                placeholder="WSI-INVERNA-18F"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                <span>{language === 'bn' ? 'রুমের অবস্থান (Room)' : 'Room Location'}</span>
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Master Bedroom"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Notice about persistence */}
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-300">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {language === 'bn'
                ? 'সংরক্ষণ করার পর এই ডিভাইসের নাম ও লাস্ট সেভ সেটিংস ব্রাউজার এবং সিস্টেমে স্থায়ীভাবে থাকবে। আপনি নিজে পরিবর্তন না করা পর্যন্ত এটি বদলাবে না।'
                : 'All settings are permanently saved to persistent storage and will remain active until you explicitly change them.'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-800 flex items-center justify-end gap-3 bg-slate-950/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
          >
            {language === 'bn' ? 'বাতিল' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-2"
          >
            {isSaved ? <Check className="w-4 h-4" /> : null}
            <span>{isSaved ? (language === 'bn' ? 'সংরক্ষিত হয়েছে!' : 'Saved!') : (language === 'bn' ? 'তথ্য সেভ করুন' : 'Save Info')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
