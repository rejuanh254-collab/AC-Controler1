import React, { useState, useRef } from 'react';
import { useSmartAC } from '../context/SmartACContext';
import { MultiStageStep } from '../types/iot';
import {
  Clock,
  Power,
  X,
  ArrowRight,
  Sparkles,
  Play,
  Square,
  Thermometer,
  Zap,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Layers,
  Settings2,
  RefreshCw,
  Wind,
  Sun,
  Moon,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react';

interface ACStepTimerModalProps {
  onClose: () => void;
}

export const ACStepTimerModal: React.FC<ACStepTimerModalProps> = ({ onClose }) => {
  const { ac, climate, setStepTimer, cancelStepTimer, jumpToStage, toggleHealth, updateAC, language } = useSmartAC();

  const activeTimer = ac.multiStageTimer;
  const isRunning = Boolean(activeTimer && activeTimer.enabled);
  const activeStageIndex = (activeTimer?.currentStageIndex ?? (activeTimer?.currentStage ? activeTimer.currentStage - 1 : 0));
  const [hasUserModifiedStage1, setHasUserModifiedStage1] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize dynamic stages list: ALWAYS prioritize existing saved stages in activeTimer
  const [stages, setStages] = useState<MultiStageStep[]>(() => {
    if (activeTimer && Array.isArray(activeTimer.stages) && activeTimer.stages.length > 0) {
      return activeTimer.stages.map((s, idx) => ({
        id: s.id || `stg-${idx + 1}`,
        stageNumber: idx + 1,
        temperature: s.temperature ?? 24,
        durationMinutes: s.durationMinutes ?? 120,
        action: s.action || 'change_temp',
        mode: s.mode || 'cool',
        fanSpeed: s.fanSpeed || 'auto',
        displayLight: s.displayLight !== undefined ? s.displayLight : true,
      }));
    }
    // Default initial stages if brand new
    return [
      {
        id: 'stg-1',
        stageNumber: 1,
        temperature: ac.temperature ?? 24,
        durationMinutes: 120, // 2 hours
        action: 'change_temp',
        mode: 'cool',
        fanSpeed: ac.fanSpeed || 'auto',
        displayLight: ac.displayLight !== undefined ? ac.displayLight : true,
      },
      {
        id: 'stg-2',
        stageNumber: 2,
        temperature: Math.min(30, (ac.temperature ?? 24) + 2),
        durationMinutes: 240, // 4 hours
        action: 'change_temp',
        mode: 'cool',
        fanSpeed: 'quiet',
        displayLight: false, // Default light off for sleep stage
      },
    ];
  });

  const [finalAction, setFinalAction] = useState<'turn_off' | 'keep_running' | 'change_temp'>(
    activeTimer?.finalAction ?? 'turn_off'
  );
  const [stage3Temp, setStage3Temp] = useState<number>(activeTimer?.stage3Temp ?? 27);
  const [enableHealth, setEnableHealth] = useState<boolean>(Boolean(ac.ionFilter || ac.health));

  // Stage Manipulation Helpers
  const addStage = () => {
    const lastStage = stages[stages.length - 1];
    const nextTemp = lastStage ? Math.min(30, lastStage.temperature + 1) : 26;
    const newStage: MultiStageStep = {
      id: `stg-${Date.now()}-${stages.length + 1}`,
      stageNumber: stages.length + 1,
      temperature: nextTemp,
      durationMinutes: 120, // 2 hours default
      action: 'change_temp',
      mode: 'cool',
      fanSpeed: lastStage?.fanSpeed || ac.fanSpeed || 'auto',
      displayLight: lastStage?.displayLight !== undefined ? lastStage.displayLight : true,
    };
    setStages([...stages, newStage]);
  };

  const removeStage = (index: number) => {
    if (stages.length <= 1) return;
    const updated = stages.filter((_, idx) => idx !== index).map((s, idx) => ({ ...s, stageNumber: idx + 1 }));
    setStages(updated);
  };

  const moveStage = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= stages.length) return;
    const copy = [...stages];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;
    setStages(copy.map((s, idx) => ({ ...s, stageNumber: idx + 1 })));
  };

  const saveLiveStages = async (stagesToSave: MultiStageStep[]) => {
    if (!isRunning) return;
    try {
      setSaveStatus('saving');
      const targetIdx = activeStageIndex;
      const firstStage = stagesToSave[0];
      const secondStage = stagesToSave[1];
      await setStepTimer({
        enabled: true,
        targetStageIndex: targetIdx,
        stages: stagesToSave,
        finalAction,
        stage3Temp,
        health: enableHealth,
        stage1: {
          temperature: firstStage?.temperature ?? 24,
          durationMinutes: firstStage?.durationMinutes ?? 120,
        },
        stage2Action: firstStage?.action === 'turn_off' ? 'turn_off' : secondStage ? 'change_temp' : 'turn_off',
        stage2: secondStage ? {
          temperature: secondStage.temperature,
          durationMinutes: secondStage.durationMinutes,
        } : {
          temperature: 26,
          durationMinutes: 180,
        },
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch {
      setSaveStatus('error');
    }
  };

  const updateStage = (index: number, updates: Partial<MultiStageStep>, immediate = false) => {
    const copy = [...stages];
    copy[index] = { ...copy[index], ...updates };
    setStages(copy);

    if (isRunning) {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      if (immediate) {
        saveLiveStages(copy);
      } else {
        autoSaveTimerRef.current = setTimeout(() => {
          saveLiveStages(copy);
        }, 700);
      }
    }
  };

  // Start timer from Stage 1 or update running timer
  const handleStart = async () => {
    // CRITICAL: If timer is already running, KEEP CURRENT ACTIVE STAGE! DO NOT RESET TO STAGE 1!
    const targetIdx = isRunning ? activeStageIndex : 0;
    const firstStage = stages[0];
    const secondStage = stages[1];

    await setStepTimer({
      enabled: true,
      targetStageIndex: targetIdx,
      stages,
      finalAction,
      stage3Temp,
      health: enableHealth,
      stage1: {
        temperature: firstStage?.temperature ?? 24,
        durationMinutes: firstStage?.durationMinutes ?? 120,
      },
      stage2Action: firstStage?.action === 'turn_off' ? 'turn_off' : secondStage ? 'change_temp' : 'turn_off',
      stage2: secondStage ? {
        temperature: secondStage.temperature,
        durationMinutes: secondStage.durationMinutes,
      } : {
        temperature: 26,
        durationMinutes: 180,
      },
    });

    onClose();
  };

  // Start directly from any selected stage
  const handleStartAtStage = async (stageIdx: number) => {
    await setStepTimer({
      enabled: true,
      targetStageIndex: stageIdx,
      stages,
      finalAction,
      stage3Temp,
      health: enableHealth,
    });

    onClose();
  };

  const handleStop = async () => {
    await cancelStepTimer();
    onClose();
  };

  // Helper format minutes to hours and minutes
  const formatMins = (mins: number) => {
    const rounded = Math.round(mins);
    const h = Math.floor(rounded / 60);
    const m = rounded % 60;
    if (language === 'bn') {
      if (h > 0 && m > 0) return `${h} ঘণ্টা ${m} মিনিট`;
      if (h > 0) return `${h} ঘণ্টা`;
      return `${m} মিনিট`;
    }
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  // Helper format clock time (e.g., 10:15 PM / রাত ১০:১৫)
  const formatClockTime = (d: Date) => {
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    if (language === 'bn') {
      const period =
        ampm === 'PM'
          ? h >= 16 && h < 20
            ? 'সন্ধ্যা'
            : h >= 20
            ? 'রাত'
            : 'দুপুর'
          : h >= 4 && h < 12
          ? 'সকাল'
          : 'ভোর';
      return `${period} ${h12}:${m} (${ampm})`;
    }
    return `${h12}:${m} ${ampm}`;
  };

  const getStageLabelBn = (num: number) => {
    const bnSuffixes: Record<number, string> = {
      1: '১ম স্টেজ',
      2: '২য় স্টেজ',
      3: '৩য় স্টেজ',
      4: '৪র্থ স্টেজ',
      5: '৫ম স্টেজ',
      6: '৬ষ্ঠ স্টেজ',
      7: '৭ম স্টেজ',
      8: '৮ম স্টেজ',
      9: '৯ম স্টেজ',
      10: '১০ম স্টেজ',
    };
    return bnSuffixes[num] || `${num}ম স্টেজ`;
  };

  // Calculate dynamic live schedules anchored to real wall-clock time
  const now = new Date();

  const activeStageRemMins = isRunning && typeof activeTimer?.remainingMinutes === 'number'
    ? Math.max(0, activeTimer.remainingMinutes)
    : (stages[activeStageIndex]?.durationMinutes ?? 60);

  const activeStageStartTime = isRunning && activeTimer?.stageStartedAt
    ? new Date(activeTimer.stageStartedAt)
    : now;

  const activeStageEndTime = new Date(now.getTime() + activeStageRemMins * 60 * 1000);

  const stageSchedules = stages.map((stg, idx) => {
    let start: Date;
    let end: Date;

    if (isRunning) {
      if (idx === activeStageIndex) {
        start = activeStageStartTime;
        end = activeStageEndTime;
      } else if (idx > activeStageIndex) {
        // Future stages: follow from activeStageEndTime
        const futureMinsBeforeThis = stages
          .slice(activeStageIndex + 1, idx)
          .reduce((acc, curr) => acc + curr.durationMinutes, 0);
        start = new Date(activeStageEndTime.getTime() + futureMinsBeforeThis * 60 * 1000);
        end = new Date(start.getTime() + stg.durationMinutes * 60 * 1000);
      } else {
        // Past stages: ended prior to activeStageStartTime
        const minsAfterThisUntilActive = stages
          .slice(idx + 1, activeStageIndex)
          .reduce((acc, curr) => acc + curr.durationMinutes, 0);
        end = new Date(activeStageStartTime.getTime() - minsAfterThisUntilActive * 60 * 1000);
        start = new Date(end.getTime() - stg.durationMinutes * 60 * 1000);
      }
    } else {
      // Preview when timer is not yet running: sequentially from now
      const prevMs = stages.slice(0, idx).reduce((acc, curr) => acc + curr.durationMinutes * 60 * 1000, 0);
      start = new Date(now.getTime() + prevMs);
      end = new Date(start.getTime() + stg.durationMinutes * 60 * 1000);
    }

    return {
      stageNumber: idx + 1,
      startTime: start,
      endTime: end,
      durationMinutes: stg.durationMinutes,
      temperature: stg.temperature,
      action: stg.action,
    };
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md overflow-y-auto p-3 sm:p-6 flex justify-center items-start sm:items-center animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5 my-auto max-h-[92vh] overflow-y-auto">
        {/* Sticky Header */}
        <div className="sticky -top-5 sm:-top-7 bg-slate-900/95 backdrop-blur-md z-20 pt-1 pb-4 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-purple-500/20 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white leading-tight flex items-center gap-2">
                <span>{language === 'bn' ? 'মাল্টি-স্টেজ স্মার্ট টাইমার' : 'Multi-Stage Dynamic Step Timer'}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {stages.length} {language === 'bn' ? 'টি স্টেজ' : 'Stages'}
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400">
                {language === 'bn'
                  ? 'একাধিক স্টেজ যোগ করুন — প্রতি স্টেজে নির্দিষ্ট তাপমাত্রা ও সময়কাল সেটিং'
                  : 'Add multiple dynamic stages with custom temperature & time windows'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors shrink-0"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Active Status Banner if Timer is Running */}
        {isRunning && (
          <div className="bg-gradient-to-r from-purple-950/60 via-slate-900 to-cyan-950/60 border border-purple-500/40 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 font-bold text-purple-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                {language === 'bn'
                  ? `টাইমার সক্রিয়: স্টেজ ${activeStageIndex + 1} / ${stages.length}`
                  : `Timer Active: Stage ${activeStageIndex + 1} of ${stages.length}`}
              </span>
              <span className="font-mono text-cyan-300 font-bold bg-slate-900 px-2.5 py-0.5 rounded-lg border border-cyan-500/30">
                {formatMins(activeTimer?.remainingMinutes ?? 0)} {language === 'bn' ? 'বাকি' : 'left'}
              </span>
            </div>

            {/* Exact Start Time & Active Stage Schedule Window */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-medium">
                  {language === 'bn' ? 'স্টেজ শুরু সময়:' : 'Stage Start Time:'}
                </span>
                <span className="font-mono font-bold text-cyan-300 text-xs">
                  {formatClockTime(activeStageStartTime)}
                </span>
              </div>

              {stageSchedules[activeStageIndex] && (
                <div className="bg-slate-950/80 p-2.5 rounded-xl border border-cyan-500/30 flex items-center justify-between">
                  <span className="text-[11px] text-cyan-300 font-semibold">
                    {language === 'bn' ? `${getStageLabelBn(activeStageIndex + 1)} সময়সূচী:` : `Stage ${activeStageIndex + 1} Window:`}
                  </span>
                  <span className="font-mono font-bold text-white text-xs">
                    {formatClockTime(stageSchedules[activeStageIndex].startTime)} – {formatClockTime(stageSchedules[activeStageIndex].endTime)}
                  </span>
                </div>
              )}
            </div>

            {/* Live Auto-Save Status Notification */}
            <div className="flex items-center justify-between text-xs px-1 pt-1">
              <span className="text-[11px] text-slate-400">
                {language === 'bn' ? '💡 স্টেজ টাইম পরিবর্তন করলে স্বয়ংক্রিয়ভাবে সেভ হয় এবং বর্তমান স্টেজ রিসেট হয় না' : '💡 Changes save live automatically without resetting current stage'}
              </span>
              {saveStatus === 'saving' && (
                <span className="text-amber-400 font-medium flex items-center gap-1.5 text-[11px]">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>{language === 'bn' ? 'সেভ হচ্ছে...' : 'Saving...'}</span>
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="text-emerald-400 font-bold flex items-center gap-1.5 text-[11px]">
                  <Check className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? '✓ লাইভ সেভ হয়েছে' : '✓ Saved live'}</span>
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="text-rose-400 font-medium text-[11px]">
                  {language === 'bn' ? 'সেভ হয়নি' : 'Error saving'}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Dynamic Stages List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>{language === 'bn' ? 'কনফিগার করা স্টেজসমূহ (Configured Stages):' : 'Configured Stages:'}</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">
              {language === 'bn' ? `মোট ${stages.length} টি স্টেজ` : `${stages.length} Total Stages`}
            </span>
          </div>

          {stages.map((stage, idx) => {
            const sched = stageSchedules[idx];
            const isFirst = idx === 0;
            const isLast = idx === stages.length - 1;

            return (
              <div
                key={stage.id}
                className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 space-y-3.5 transition-all relative"
              >
                {/* Stage Header */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 text-slate-950 font-bold flex items-center justify-center text-xs shadow-sm">
                      {stage.stageNumber}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs">
                          {language === 'bn' ? getStageLabelBn(stage.stageNumber) : `Stage ${stage.stageNumber}`}
                        </span>
                        {isFirst && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            {language === 'bn' ? 'লাইভ সিঙ্কড' : 'Live Sync'}
                          </span>
                        )}
                      </div>
                      {sched && (
                        <p className="text-[10px] text-cyan-300 font-mono">
                          {formatClockTime(sched.startTime)} ➔ {formatClockTime(sched.endTime)} ({formatMins(sched.durationMinutes)})
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Sync with running AC set temperature */}
                    <button
                      type="button"
                      onClick={() => updateStage(idx, { temperature: ac.temperature })}
                      className="px-2 py-0.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-[11px] font-semibold transition-colors flex items-center gap-1 shadow-sm"
                      title={language === 'bn' ? 'এসির বর্তমান রানিং সেট টেম্পেচারে সিঙ্ক করুন' : 'Sync to running AC set temperature'}
                    >
                      <Thermometer className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{language === 'bn' ? `এসির সেট: ${ac.temperature}°C` : `AC Set: ${ac.temperature}°C`}</span>
                    </button>

                    <span className="font-mono text-cyan-400 font-bold text-sm bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
                      {stage.temperature}°C
                    </span>

                    {/* Move Up/Down Controls */}
                    <div className="flex items-center bg-slate-900 rounded-lg border border-slate-800 p-0.5">
                      <button
                        type="button"
                        disabled={isFirst}
                        onClick={() => moveStage(idx, 'up')}
                        className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
                        title="Move Up"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={isLast}
                        onClick={() => moveStage(idx, 'down')}
                        className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
                        title="Move Down"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Delete Stage Button */}
                    {stages.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeStage(idx)}
                        className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 transition-colors"
                        title={language === 'bn' ? 'স্টেজ মুছে ফেলুন' : 'Remove Stage'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Stage Temperature & Duration Settings */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1.5 font-medium flex items-center justify-between">
                      <span>{language === 'bn' ? 'টার্গেট তাপমাত্রা (১৬° - ৩০°C):' : 'Target Temperature:'}</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="16"
                        max="30"
                        value={stage.temperature}
                        onChange={(e) => updateStage(idx, { temperature: Number(e.target.value) })}
                        className="flex-1 accent-cyan-500 cursor-pointer"
                      />
                      <span className="w-10 text-center font-mono font-bold text-white bg-slate-900 py-1 rounded-lg border border-slate-800">
                        {stage.temperature}°
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1.5 font-medium">
                      {language === 'bn' ? 'এই স্টেজ কত সময় চলবে:' : 'Duration:'}
                    </label>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {[
                        { l: '15m', v: 15 },
                        { l: '30m', v: 30 },
                        { l: '1h', v: 60 },
                        { l: '1.5h', v: 90 },
                        { l: '2h', v: 120 },
                        { l: '3h', v: 180 },
                        { l: '4h', v: 240 },
                        { l: '6h', v: 360 },
                      ].map((btn) => (
                        <button
                          key={btn.v}
                          type="button"
                          onClick={() => updateStage(idx, { durationMinutes: btn.v }, true)}
                          className={`px-2 py-0.5 rounded-lg text-xs font-semibold transition-all ${
                            stage.durationMinutes === btn.v
                              ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                          }`}
                        >
                          {btn.l}
                        </button>
                      ))}
                      <div className="flex items-center gap-1 ml-auto">
                        <input
                          type="number"
                          min="1"
                          max="720"
                          value={stage.durationMinutes}
                          onChange={(e) => updateStage(idx, { durationMinutes: Math.max(1, Number(e.target.value)) })}
                          className="w-14 px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-cyan-300 font-mono text-center text-xs focus:outline-none focus:border-cyan-500"
                        />
                        <span className="text-[10px] text-slate-500 font-medium">{language === 'bn' ? 'মিনিট' : 'min'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stage Fan Speed & Display Light Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs border-t border-slate-900/80">
                  {/* Fan Speed Selection */}
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1.5 font-medium flex items-center gap-1.5">
                      <Wind className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{language === 'bn' ? 'ফ্যান স্পিড মোড:' : 'Fan Speed Mode:'}</span>
                    </label>
                    <div className="flex flex-wrap items-center gap-1">
                      {[
                        { id: 'auto', label: language === 'bn' ? 'অটো' : 'Auto' },
                        { id: 'quiet', label: language === 'bn' ? 'নীরব' : 'Quiet' },
                        { id: 'low', label: language === 'bn' ? 'স্লো' : 'Low' },
                        { id: 'med', label: language === 'bn' ? 'মিডিয়াম' : 'Med' },
                        { id: 'high', label: language === 'bn' ? 'হাই' : 'High' },
                        { id: 'turbo', label: language === 'bn' ? 'টার্বো' : 'Turbo' },
                      ].map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => updateStage(idx, { fanSpeed: f.id as any })}
                          className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                            (stage.fanSpeed || 'auto') === f.id
                              ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/50 font-bold shadow-sm'
                              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Display Light Toggle */}
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1.5 font-medium flex items-center gap-1.5">
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                      <span>{language === 'bn' ? 'এসির ডিসপ্লে লাইট:' : 'AC Display Light:'}</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateStage(idx, { displayLight: true })}
                        className={`flex-1 py-1 px-2.5 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
                          stage.displayLight !== false
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold shadow-sm'
                            : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        <Sun className="w-3.5 h-3.5 text-amber-400" />
                        <span>{language === 'bn' ? 'লাইট অন' : 'Light ON'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => updateStage(idx, { displayLight: false })}
                        className={`flex-1 py-1 px-2.5 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
                          stage.displayLight === false
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold shadow-sm'
                            : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        <Moon className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{language === 'bn' ? 'লাইট অফ (নাইট)' : 'Light OFF'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Stage Transition Action */}
                <div className="pt-1 flex items-center justify-between flex-wrap gap-2 border-t border-slate-900">
                  <span className="text-[11px] text-slate-400 font-medium">
                    {language === 'bn' ? `স্টেজ ${stage.stageNumber} শেষ হলে:` : `After Stage ${stage.stageNumber} finishes:`}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateStage(idx, { action: 'change_temp' })}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1.5 ${
                        stage.action !== 'turn_off'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      <Thermometer className="w-3.5 h-3.5 text-purple-400" />
                      <span>{language === 'bn' ? (isLast ? 'পরবর্তী একশন অনুযায়ী চলবে' : 'পরবর্তী স্টেজে যাবে') : (isLast ? 'Follow final rule' : 'Continue to next stage')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => updateStage(idx, { action: 'turn_off' })}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1.5 ${
                        stage.action === 'turn_off'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5 text-rose-400" />
                      <span>{language === 'bn' ? 'এই স্টেজেই এসি বন্ধ হবে' : 'Turn AC OFF after this stage'}</span>
                    </button>
                  </div>
                </div>

                {/* Direct Launch / Jump to this specific stage */}
                <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-900/60">
                  <div className="text-[11px] text-slate-400 flex items-center gap-2 font-mono">
                    <span className="text-cyan-400 font-bold">{stage.temperature}°C</span>
                    <span>• {stage.fanSpeed || 'auto'}</span>
                    <span>• {stage.displayLight !== false ? (language === 'bn' ? 'লাইট অন' : 'Light ON') : (language === 'bn' ? 'লাইট অফ' : 'Light OFF')}</span>
                  </div>

                  {isRunning && activeStageIndex === idx ? (
                    <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1.5 shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>{language === 'bn' ? 'বর্তমানে রানিং' : 'Currently Active'}</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleStartAtStage(idx)}
                      className="px-3 py-1 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/35 text-cyan-300 border border-cyan-500/40 text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>{language === 'bn' ? `এখনই স্টেজ ${stage.stageNumber} চালু করুন ➔` : `Run Stage ${stage.stageNumber} Now ➔`}</span>
                    </button>
                  )}
                </div>

                {/* Detailed Stage Time Schedule Banner */}
                {sched && (
                  <div className="p-2.5 bg-slate-900/90 border border-cyan-500/20 rounded-xl flex items-center justify-between text-xs">
                    <span className="text-cyan-300 font-medium flex items-center gap-1.5 text-[11px]">
                      <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>
                        {language === 'bn'
                          ? `${getStageLabelBn(stage.stageNumber)} সময়সূচী (${formatMins(stage.durationMinutes)}):`
                          : `Stage ${stage.stageNumber} Time Schedule (${formatMins(stage.durationMinutes)}):`}
                      </span>
                    </span>
                    <span className="font-mono text-white bg-slate-950 px-2 py-0.5 rounded-md border border-cyan-500/30 font-bold text-[11px]">
                      {formatClockTime(sched.startTime)} ➔ {formatClockTime(sched.endTime)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}

          {/* ADD NEW STAGE BUTTON */}
          <button
            type="button"
            onClick={addStage}
            className="w-full py-3 bg-slate-950/80 hover:bg-slate-800 border-2 border-dashed border-slate-800 hover:border-cyan-500/50 rounded-2xl font-bold text-xs text-cyan-300 hover:text-cyan-200 flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4 text-cyan-400" />
            <span>{language === 'bn' ? '+ নতুন স্টেজ যোগ করুন (Add New Stage)' : '+ Add Another Stage'}</span>
          </button>
        </div>

        {/* FINAL ACTION AFTER ALL STAGES COMPLETE */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
          <span className="font-bold text-white text-xs flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>
              {language === 'bn'
                ? `সকল স্টেজ সমাপ্তির পর চূড়ান্ত নিয়ম (Final Rule after ${stages.length} stages):`
                : `Final rule after all ${stages.length} stages complete:`}
            </span>
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setFinalAction('turn_off')}
              className={`px-3 py-2.5 rounded-xl border font-semibold transition-all text-left flex items-center gap-2 ${
                finalAction === 'turn_off'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              <Power className="w-3.5 h-3.5 shrink-0" />
              <span>{language === 'bn' ? 'এসি বন্ধ হবে' : 'Turn Off AC'}</span>
            </button>

            <button
              type="button"
              onClick={() => setFinalAction('keep_running')}
              className={`px-3 py-2.5 rounded-xl border font-semibold transition-all text-left flex items-center gap-2 ${
                finalAction === 'keep_running'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5 shrink-0" />
              <span>{language === 'bn' ? 'একই টেম্পে চলবে' : 'Keep Running'}</span>
            </button>

            <button
              type="button"
              onClick={() => setFinalAction('change_temp')}
              className={`px-3 py-2.5 rounded-xl border font-semibold transition-all text-left flex items-center gap-2 ${
                finalAction === 'change_temp'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              <Thermometer className="w-3.5 h-3.5 shrink-0" />
              <span>{language === 'bn' ? 'চূড়ান্ত টেম্পে চলবে' : 'Set Final Temp'}</span>
            </button>
          </div>

          {finalAction === 'change_temp' && (
            <div className="mt-3 p-3 rounded-xl bg-slate-900/90 border border-amber-500/30 space-y-2 animate-fadeIn text-xs">
              <label className="text-[11px] text-amber-300 block font-medium">
                {language === 'bn' ? 'চূড়ান্ত স্টেজ তাপমাত্রা (যেমন: ২৭° বা ২৮°C):' : 'Final Stage Temperature:'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="16"
                  max="30"
                  value={stage3Temp}
                  onChange={(e) => setStage3Temp(Number(e.target.value))}
                  className="flex-1 accent-amber-500 cursor-pointer"
                />
                <span className="w-10 text-center font-mono font-bold text-amber-300 bg-slate-950 py-1 rounded-lg border border-slate-800">
                  {stage3Temp}°
                </span>
              </div>
            </div>
          )}
        </div>

        {/* HEALTH (COLD PLASMA) FILTER TOGGLE OPTION */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-white text-xs">
                {language === 'bn' ? 'হেলথ ফিল্টার (Health / Cold Plasma)' : 'Health Mode (Cold Plasma)'}
              </p>
              <p className="text-[11px] text-slate-400">
                {language === 'bn'
                  ? 'টাইমার চলাকালে ব্যাকটেরিয়া ও ধূলিকণা মুক্ত বিশুদ্ধ বাতাস সরবরাহ'
                  : 'Activate plasma ionizer for dust & bacteria-free air'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setEnableHealth(!enableHealth)}
            className={`w-12 h-6.5 rounded-full transition-colors relative p-0.5 ${
              enableHealth ? 'bg-teal-500' : 'bg-slate-800'
            }`}
          >
            <div
              className={`w-5.5 h-5.5 rounded-full bg-white transition-transform ${
                enableHealth ? 'translate-x-5.5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* VISUAL TIMELINE SUMMARY */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2.5">
          <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">
            {language === 'bn' ? 'টাইমার রিয়েল-টাইম টাইমলাইন সামারি:' : 'REAL-TIME AUTOMATION TIMELINE:'}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-200">
            {stageSchedules.map((sched, idx) => (
              <React.Fragment key={idx}>
                <div className="px-3 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono space-y-0.5">
                  <div className="font-bold">{sched.temperature}°C ({formatMins(sched.durationMinutes)})</div>
                  <div className="text-[10px] text-cyan-400/90">{formatClockTime(sched.startTime)} – {formatClockTime(sched.endTime)}</div>
                </div>
                {idx < stageSchedules.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
              </React.Fragment>
            ))}

            <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />

            <span className={`px-2.5 py-1.5 rounded-xl font-mono ${
              finalAction === 'turn_off'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : finalAction === 'change_temp'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}>
              {finalAction === 'turn_off'
                ? (language === 'bn' ? 'শেষে এসি বন্ধ' : 'OFF at end')
                : finalAction === 'change_temp'
                ? (language === 'bn' ? `শেষে ${stage3Temp}°C` : `${stage3Temp}°C at end`)
                : (language === 'bn' ? 'চালু থাকবে' : 'Keep Running')}
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-3 pt-2">
          {isRunning ? (
            <button
              onClick={handleStop}
              className="flex-1 py-3 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all"
            >
              <Square className="w-4 h-4" />
              <span>{language === 'bn' ? 'টাইমার বাতিল / বন্ধ করুন' : 'Cancel & Stop Timer'}</span>
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-3 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-2xl font-semibold text-xs transition-colors"
            >
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </button>
          )}

          <button
            onClick={handleStart}
            className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all hover:scale-102 active:scale-98"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>
              {isRunning
                ? (language === 'bn' ? `টাইমার আপডেট করুন (স্টেজ ${activeStageIndex + 1} বজায় থাকবে)` : `Update Timer (Keep Stage ${activeStageIndex + 1})`)
                : (language === 'bn' ? 'স্টেপ টাইমার চালু করুন' : 'Start Step Timer')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
