import React from 'react';
import { Zap, Moon, Leaf, Droplets, Wind, Sparkles } from 'lucide-react';
import { useSmartAC } from '../context/SmartACContext';

const PRESET_ICONS: Record<string, React.ReactNode> = {
  Zap: <Zap className="w-4 h-4" />,
  Moon: <Moon className="w-4 h-4" />,
  Leaf: <Leaf className="w-4 h-4" />,
  Droplets: <Droplets className="w-4 h-4" />,
  Wind: <Wind className="w-4 h-4" />,
};

export const ACPresetsBar: React.FC = () => {
  const { presets, activatePreset, language, t } = useSmartAC();

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>{t.presets}</span>
        </h2>
        <span className="text-[11px] text-slate-500 font-mono">1-Tap IR Optimization</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
        {presets.map((preset) => {
          const icon = PRESET_ICONS[preset.icon] || <Sparkles className="w-4 h-4" />;
          const label = language === 'bn' ? preset.nameBn : preset.name;

          return (
            <button
              key={preset.id}
              onClick={() => activatePreset(preset.id)}
              className="group flex items-center gap-3 p-3 bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/40 rounded-2xl text-left transition-all duration-200 shadow-md hover:scale-102 active:scale-98"
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
                style={{
                  backgroundColor: `${preset.accent}20`,
                  color: preset.accent,
                }}
              >
                {icon}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate group-hover:text-cyan-300">
                  {label}
                </p>
                <p className="text-[10px] font-mono text-slate-400 truncate">
                  {preset.temp}°C · {preset.mode.toUpperCase()}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
