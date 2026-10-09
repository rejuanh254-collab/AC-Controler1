import React, { useState } from 'react';
import {
  Cpu,
  Radio,
  Wifi,
  Copy,
  Check,
  Download,
  Terminal,
  Layers,
  Code,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Send,
  HelpCircle,
  X,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';
import { useSmartAC } from '../context/SmartACContext';
import { BRAND_CONFIGS, generateArduinoSketch } from '../utils/irCodes';
import type { ACBrand } from '../types/iot';

export const ACHardwareModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { ac, setBrand, hardware, testIrBlast, language, t } = useSmartAC();
  const [activeTab, setActiveTab] = useState<'code' | 'wiring' | 'direct_api' | 'troubleshoot'>('code');
  const [wifiSsid, setWifiSsid] = useState('MyHome_WiFi_2.4G');
  const [wifiPass, setWifiPass] = useState('SmartHome1234');
  const [irPin, setIrPin] = useState(4);
  const [dhtPin, setDhtPin] = useState(15);
  const [copiedCode, setCopiedCode] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  const arduinoCode = generateArduinoSketch({
    brand: ac.brand,
    wifiSsid,
    wifiPass,
    serverUrl: currentOrigin,
    irLedPin: irPin,
    dhtPin,
    localPort: hardware.localPort || 80,
  });

  const handleCopyCode = () => {
    navigator.clipboard.writeText(arduinoCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleDownloadIno = () => {
    const blob = new Blob([arduinoCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CoolHome_AC_${ac.brand}_ESP32.ino`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleTriggerTest = async () => {
    setTestStatus('sending');
    const ok = await testIrBlast();
    if (ok) {
      setTestStatus('success');
      setTimeout(() => setTestStatus(null), 3000);
    } else {
      setTestStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-xl animate-fadeIn overflow-y-auto">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-8 pb-4 relative">
          <button
            onClick={onClose}
            className="absolute right-6 top-6 w-10 h-10 rounded-full bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <div className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] font-bold border border-cyan-500/30 uppercase tracking-wider">
              DIY Hardware
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              ESP32 Setup
            </div>
          </div>

          <h2 className="text-2xl font-black text-white leading-tight">
            {language === 'bn' ? 'রিয়েল হার্ডওয়্যার' : 'Physical Hardware'} <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
              {language === 'bn' ? 'ESP32 আইআর ব্লাস্টার সেটআপ' : 'ESP32 IR Blaster Setup'}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-2 max-w-md">
            {language === 'bn'
              ? 'আপনার এসির জন্য রেডিমেড Arduino C++ কোড ও ওয়্যারিং গাইড।'
              : 'Flashable Arduino IDE C++ firmware to control real physical ACs via 38kHz IR Transmitter.'}
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="px-8 mb-4">
          <div className="flex items-center gap-1.5 p-1.5 bg-slate-950 border border-slate-800 rounded-3xl overflow-x-auto scrollbar-none">
            {[
              { id: 'code', label: 'Arduino Code', icon: Code },
              { id: 'wiring', label: 'Wiring Guide', icon: Layers },
              { id: 'direct_api', label: 'Local API', icon: Terminal },
              { id: 'troubleshoot', label: 'Help', icon: HelpCircle },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[11px] font-bold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-6">
          {activeTab === 'code' && (
            <div className="space-y-6 animate-slideUp">
              {/* Configuration parameters */}
              <div className="bg-slate-950 border border-slate-800 rounded-[32px] p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase font-bold mb-2 ml-1 tracking-widest">
                    AC Brand
                  </label>
                  <div className="relative">
                    <select
                      value={ac.brand}
                      onChange={(e) => setBrand(e.target.value as ACBrand)}
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-cyan-500 appearance-none cursor-pointer"
                    >
                      {Object.keys(BRAND_CONFIGS).map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 uppercase font-bold mb-2 ml-1 tracking-widest">
                    WiFi SSID
                  </label>
                  <input
                    type="text"
                    value={wifiSsid}
                    onChange={(e) => setWifiSsid(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 uppercase font-bold mb-2 ml-1 tracking-widest">
                    WiFi Pass
                  </label>
                  <input
                    type="password"
                    value={wifiPass}
                    onChange={(e) => setWifiPass(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 uppercase font-bold mb-2 ml-1 tracking-widest">
                    IR Pin (GPIO)
                  </label>
                  <input
                    type="number"
                    value={irPin}
                    onChange={(e) => setIrPin(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-cyan-400 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Code Box */}
              <div className="bg-slate-950 border border-slate-800 rounded-[32px] p-1 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
                   <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-500/50"></div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest ml-2">
                      ESP32_FIRMWARE.INO
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyCode}
                      className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-all"
                    >
                      {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={handleDownloadIno}
                      className="p-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl transition-all"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="relative p-6 font-mono text-xs text-slate-300 max-h-80 overflow-y-auto scrollbar-thin">
                  <pre className="whitespace-pre">{arduinoCode}</pre>
                </div>
              </div>

              {/* Live Test */}
              <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 p-6 rounded-[32px] flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0 text-cyan-400">
                    <Radio className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Hardware Test Signal</h4>
                    <p className="text-xs text-slate-400">Blast a 38kHz pulse to check if real AC beeps.</p>
                  </div>
                </div>

                <button
                  onClick={handleTriggerTest}
                  disabled={testStatus === 'sending'}
                  className="px-6 py-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-2xl shadow-xl transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                >
                  {testStatus === 'sending' ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : testStatus === 'success' ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>{testStatus === 'sending' ? 'Sending...' : testStatus === 'success' ? 'Sent!' : 'Test Blast'}</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'wiring' && (
            <div className="space-y-6 animate-slideUp">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { name: 'ESP32 NodeMCU', desc: 'WiFi Dev Board (30-pin)', price: '~৳৪৫০' },
                  { name: 'IR LED Kit', desc: '940nm LED + Transistor', price: '~৳৩০' },
                  { name: 'DHT22 Sensor', desc: 'Temp & Humidity', price: '~৳৩০০' },
                ].map((part) => (
                  <div key={part.name} className="bg-slate-950 border border-slate-800 p-6 rounded-[32px] space-y-2">
                    <h5 className="font-bold text-white text-sm">{part.name}</h5>
                    <p className="text-[11px] text-slate-500">{part.desc}</p>
                    <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">{part.price}</div>
                  </div>
                ))}
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-[32px] overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/50 border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-4 text-slate-500 font-bold uppercase tracking-widest text-[10px]">Pin</th>
                      <th className="px-6 py-4 text-slate-500 font-bold uppercase tracking-widest text-[10px]">Connection</th>
                      <th className="px-6 py-4 text-slate-500 font-bold uppercase tracking-widest text-[10px]">Purpose</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {[
                      { pin: 'GPIO 4', conn: '2N2222 Transistor Base', desc: 'IR Signal Output' },
                      { pin: 'GPIO 15', conn: 'DHT22 Data Pin', desc: 'Sensor Data In' },
                      { pin: '5V / VIN', conn: 'LED (+) & DHT VCC', desc: 'Power Supply' },
                      { pin: 'GND', conn: 'Common Ground', desc: 'Reference' },
                    ].map((row) => (
                      <tr key={row.pin} className="hover:bg-slate-900/30 transition-colors">
                        <td className="px-6 py-4 font-mono text-cyan-400 font-bold">{row.pin}</td>
                        <td className="px-6 py-4 text-white font-medium">{row.conn}</td>
                        <td className="px-6 py-4 text-slate-500">{row.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'direct_api' && (
            <div className="space-y-6 animate-slideUp">
              <div className="bg-slate-950 border border-slate-800 rounded-[32px] p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20">
                    <Terminal className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Direct HTTP Control</h4>
                </div>
                
                <div className="space-y-4 pt-2">
                  <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl font-mono text-[11px]">
                    <div className="text-slate-500 mb-2">// Send command to AC</div>
                    <div className="text-cyan-400 break-all">
                      GET http://{hardware.ipAddress || '192.168.1.xxx'}/set?power=1&temp=24&mode=cool
                    </div>
                  </div>
                  
                  <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl font-mono text-[11px]">
                    <div className="text-slate-500 mb-2">// Get live sensor status</div>
                    <div className="text-cyan-400">
                      GET http://{hardware.ipAddress || '192.168.1.xxx'}/status
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'troubleshoot' && (
            <div className="space-y-6 animate-slideUp">
              <div className="bg-amber-500/10 border border-amber-500/20 p-8 rounded-[40px] space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-400 border border-amber-500/30">
                  <HelpCircle className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold text-white">Common Troubleshooting</h4>
                <div className="space-y-3">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    <span className="text-amber-400 font-bold block mb-1">1. Distance and Angle:</span>
                    The IR LED should be pointed directly at the AC receiver. Maximum distance is around 5 meters without an enclosure.
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    <span className="text-amber-400 font-bold block mb-1">2. Power Supply:</span>
                    ESP32 can be power hungry during WiFi transmission. Use a 2A+ USB adapter for stability.
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    <span className="text-amber-400 font-bold block mb-1">3. Server Sync:</span>
                    Ensure the ESP32 can reach our cloud URL: <code className="text-cyan-400">{currentOrigin}</code>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
