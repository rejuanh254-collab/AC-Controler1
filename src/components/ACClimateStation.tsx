import React from 'react';
import {
  Thermometer,
  Droplets,
  Zap,
  Activity,
  DollarSign,
  TrendingDown,
  Gauge,
  Cpu,
} from 'lucide-react';
import { useSmartAC } from '../context/SmartACContext';

export const ACClimateStation: React.FC = () => {
  const { climate, power, ac, language, t } = useSmartAC();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* 1. Room Climate & DHT22 Sensor Hub */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-amber-400" />
            <span>{language === 'bn' ? 'রুমের পরিবেশ ও সেন্সর রিডিং' : 'Room Climate Telemetry'}</span>
          </h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            ESP32 DHT22 (GPIO 15)
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          {/* Room Temp */}
          <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
              {t.roomTemp}
            </span>
            <p className="text-2xl sm:text-3xl font-extrabold font-mono text-white tabular-nums">
              {climate.roomTemp}°C
            </p>
            <p className="text-[10px] text-slate-500 font-mono">
              {((climate.roomTemp * 9) / 5 + 32).toFixed(1)}°F
            </p>
          </div>

          {/* Humidity */}
          <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
              {t.humidity}
            </span>
            <p className="text-2xl sm:text-3xl font-extrabold font-mono text-blue-400 tabular-nums">
              {climate.roomHumidity}%
            </p>
            <p className="text-[10px] text-slate-500">
              {climate.roomHumidity > 65 ? 'High (Use Dry Mode)' : 'Optimal Comfort'}
            </p>
          </div>

          {/* Feels Like Heat Index */}
          <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
              {t.feelsLike}
            </span>
            <p className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-300 tabular-nums">
              {climate.feelsLike}°C
            </p>
            <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {climate.heatIndexStatus}
            </span>
          </div>
        </div>

        {/* Cooling Progress Bar */}
        <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5 text-cyan-400" />
              <span>{language === 'bn' ? 'টার্গেট তাপমাত্রার দিকে অগ্রগমন' : 'Cooling Towards Target'}</span>
            </span>
            <span className="font-mono text-cyan-400 font-bold">
              {ac.power ? `Delta: ${climate.targetDelta}°C` : 'Off'}
            </span>
          </div>
          <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.max(10, Math.min(100, (1 - climate.targetDelta / 8) * 100))}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* 2. Inverter Power Meter & Electricity Cost */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span>{language === 'bn' ? 'ইনভার্টার পাওয়ার মিটার ও লাইভ বিল' : 'Inverter Power & Live Bill'}</span>
          </h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            {power.tonnage} Ton Inverter
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
          {/* Active Wattage */}
          <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Active Power</span>
            <p className="text-xl sm:text-2xl font-extrabold font-mono text-amber-300 tabular-nums">
              {ac.power ? `${power.watts}W` : '4W'}
            </p>
            <p className="text-[10px] text-slate-500">{ac.power ? `${power.inverterLoadPercent}% Load` : 'Standby'}</p>
          </div>

          {/* Today kWh */}
          <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">{t.todayEnergy}</span>
            <p className="text-xl sm:text-2xl font-extrabold font-mono text-cyan-300 tabular-nums">
              {power.todayKwh.toFixed(2)}
            </p>
            <p className="text-[10px] text-slate-500 font-mono">Units</p>
          </div>

          {/* Today Cost */}
          <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Today Cost</span>
            <p className="text-xl sm:text-2xl font-extrabold font-mono text-emerald-400 tabular-nums">
              ৳{power.costBdt.toFixed(2)}
            </p>
            <p className="text-[10px] text-slate-500 font-mono">৳{power.unitRateBdt}/Unit</p>
          </div>

          {/* Monthly Bill */}
          <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Monthly Bill</span>
            <p className="text-xl sm:text-2xl font-extrabold font-mono text-cyan-400 tabular-nums">
              ৳{power.monthlyCostBdt.toFixed(0)}
            </p>
            <p className="text-[10px] text-slate-500 font-mono">Est. Total</p>
          </div>
        </div>

        {/* Live Session Status */}
        <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>{language === 'bn' ? 'বর্তমান সেশন' : 'Live Session'}</span>
            </h4>
            {ac.power ? (
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 animate-pulse">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                RUNNING
              </span>
            ) : (
              <span className="text-[10px] font-bold text-slate-500">IDLE</span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[10px] text-slate-500 uppercase">Duration</p>
              <p className="text-sm font-bold text-white font-mono">
                {power.currentSessionDurationMinutes} min
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase">Energy</p>
              <p className="text-sm font-bold text-cyan-400 font-mono">
                {power.currentSessionKwh.toFixed(3)} unit
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase">Cost</p>
              <p className="text-sm font-bold text-emerald-400 font-mono">
                ৳{power.currentSessionCostBdt.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Weekly History Summary */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-400 flex items-center gap-2 px-1">
            <Gauge className="w-3.5 h-3.5 text-amber-400" />
            <span>{language === 'bn' ? 'গত ৭ দিনের হিস্ট্রি' : 'Last 7 Days History'}</span>
          </h4>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-none">
            {power.dailyHistory.map((day) => {
              const now = new Date();
              const year = now.getFullYear();
              const month = String(now.getMonth() + 1).padStart(2, '0');
              const dateNum = String(now.getDate()).padStart(2, '0');
              const todayStr = `${year}-${month}-${dateNum}`;

              const yest = new Date(now);
              yest.setDate(now.getDate() - 1);
              const yYear = yest.getFullYear();
              const yMonth = String(yest.getMonth() + 1).padStart(2, '0');
              const yDateNum = String(yest.getDate()).padStart(2, '0');
              const yesterdayStr = `${yYear}-${yMonth}-${yDateNum}`;

              let displayDayName = day.dayName;
              if (day.date === todayStr) {
                displayDayName = language === 'bn' ? 'আজ (Today)' : 'Today';
              } else if (day.date === yesterdayStr) {
                displayDayName = language === 'bn' ? 'গতকাল (Yesterday)' : 'Yesterday';
              } else {
                try {
                  displayDayName = new Date(day.date + 'T00:00:00').toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  });
                } catch {}
              }

              const displayHours = (Math.min(1440, day.totalRuntimeMinutes) / 60).toFixed(1);

              return (
                <div key={day.date} className="bg-slate-950/40 border border-slate-800/60 p-2.5 rounded-xl flex items-center justify-between text-[11px]">
                  <div className="space-y-0.5">
                    <p className="font-bold text-white">{displayDayName}</p>
                    <p className="text-slate-500 text-[10px]">{day.date}</p>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <p className="text-slate-400 uppercase text-[9px]">Runtime</p>
                      <p className="font-mono text-white">{displayHours}h</p>
                    </div>
                    <div>
                      <p className="text-slate-400 uppercase text-[9px]">Energy</p>
                      <p className="font-mono text-cyan-400">{day.totalKwh.toFixed(1)} unit</p>
                    </div>
                    <div className="min-w-[60px]">
                      <p className="text-slate-400 uppercase text-[9px]">Cost</p>
                      <p className="font-mono text-emerald-400">৳{day.totalCostBdt.toFixed(0)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="md:col-span-2 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <span>
          {language === 'bn'
            ? 'ইনভার্টার ভ্যারিয়েবল কম্প্রেসর অ্যালগরিদম সক্রিয়'
            : 'Variable Speed Inverter Compressor Logic Active'}
        </span>
        <span className="text-emerald-400 font-mono font-bold">
          {ac.eco ? 'Eco Mode: -40% W' : ac.turbo ? 'Turbo: 100% W' : 'Modulating'}
        </span>
      </div>
    </div>
  );
};
