import React, { useState, useEffect } from 'react';
import {
  Clock,
  Plus,
  Power,
  Moon,
  BarChart3,
  ArrowRight,
  Square,
  Settings2,
  Sparkles,
  Thermometer,
  Trash2,
  ShieldCheck,
  Check,
  Calendar,
  Zap,
  Wind,
  Sun,
  Eye,
  Timer,
  Play,
  CheckCircle2,
} from 'lucide-react';
import { useSmartAC } from '../context/SmartACContext';
import { ACUsageReports } from './ACUsageReports';
import { ACStepTimerModal } from './ACStepTimerModal';
import { ACMode, ACFanSpeed } from '../types/iot';

export const ACTimersAndSchedules: React.FC = () => {
  const { schedules, toggleSchedule, addSchedule, deleteSchedule, runScheduleNow, ac, updateAC, cancelStepTimer, jumpToStage, adjustStepTimerTime, language } = useSmartAC();
  const stepTimer = ac.multiStageTimer;
  const isStepRunning = Boolean(stepTimer && stepTimer.enabled);
  const [activeView, setActiveView] = useState<'schedule' | 'report'>('schedule');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showStepModal, setShowStepModal] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testSuccessMessage, setTestSuccessMessage] = useState<string | null>(null);
  const [liveTime, setLiveTime] = useState<string>('');

  useEffect(() => {
    const updateClock = () => {
      const d = new Date();
      const h = d.getHours();
      const m = String(d.getMinutes()).padStart(2, '0');
      const s = String(d.getSeconds()).padStart(2, '0');
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      setLiveTime(`${h12}:${m}:${s} ${ampm}`);
    };
    updateClock();
    const t = setInterval(updateClock, 1000);
    return () => clearInterval(t);
  }, []);

  const handleTestRun = async (sched: any) => {
    setTestingId(sched.id);
    const ok = await runScheduleNow(sched.id);
    if (ok) {
      setTestSuccessMessage(
        language === 'bn'
          ? `"${sched.nameBn || sched.name}" শিডিউল সফলভাবে টেস্ট রান হয়েছে!`
          : `"${sched.name}" executed successfully!`
      );
      setTimeout(() => setTestSuccessMessage(null), 3500);
    }
    setTimeout(() => setTestingId(null), 1000);
  };

  // Form states for new schedule
  const [time, setTime] = useState('23:00');
  const [powerOn, setPowerOn] = useState(true);
  const [targetTemp, setTargetTemp] = useState(25);
  const [mode, setMode] = useState<ACMode>('cool');
  const [fanSpeed, setFanSpeed] = useState<ACFanSpeed>('auto');
  const [health, setHealth] = useState(true);
  const [displayLight, setDisplayLight] = useState(false);
  const [autoOffMinutes, setAutoOffMinutes] = useState<number | undefined>(undefined);
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [customName, setCustomName] = useState('');
  const [customNameBn, setCustomNameBn] = useState('');

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

  const activeStages = stepTimer?.stages || [
    { id: '1', stageNumber: 1, temperature: stepTimer?.stage1?.temperature ?? ac.temperature ?? 24, durationMinutes: stepTimer?.stage1?.durationMinutes ?? 120, action: stepTimer?.stage2Action },
    { id: '2', stageNumber: 2, temperature: stepTimer?.stage2?.temperature ?? 26, durationMinutes: stepTimer?.stage2?.durationMinutes ?? 240, action: 'change_temp' },
  ];

  const currentStageIdx = isStepRunning ? (stepTimer?.currentStageIndex ?? 0) : 0;
  const now = new Date();

  // Determine current active stage timing anchored to live clock
  const activeStageRemMins = isStepRunning && typeof stepTimer?.remainingMinutes === 'number'
    ? Math.max(0, stepTimer.remainingMinutes)
    : (activeStages[currentStageIdx]?.durationMinutes ?? 60);

  const activeStageStartTime = isStepRunning && stepTimer?.stageStartedAt
    ? new Date(stepTimer.stageStartedAt)
    : now;

  const activeStageEndTime = new Date(now.getTime() + activeStageRemMins * 60 * 1000);

  const activeStageSchedules = activeStages.map((stg, idx) => {
    let start: Date;
    let end: Date;

    if (isStepRunning) {
      if (idx === currentStageIdx) {
        start = activeStageStartTime;
        end = activeStageEndTime;
      } else if (idx > currentStageIdx) {
        // Future stages: follow from activeStageEndTime
        const futureMinsBeforeThis = activeStages
          .slice(currentStageIdx + 1, idx)
          .reduce((acc, curr) => acc + curr.durationMinutes, 0);
        start = new Date(activeStageEndTime.getTime() + futureMinsBeforeThis * 60 * 1000);
        end = new Date(start.getTime() + stg.durationMinutes * 60 * 1000);
      } else {
        // Past stages (already completed): prior to activeStageStartTime
        const minsAfterThisUntilActive = activeStages
          .slice(idx + 1, currentStageIdx)
          .reduce((acc, curr) => acc + curr.durationMinutes, 0);
        end = new Date(activeStageStartTime.getTime() - minsAfterThisUntilActive * 60 * 1000);
        start = new Date(end.getTime() - stg.durationMinutes * 60 * 1000);
      }
    } else {
      // Preview when timer is not running: preview sequentially from now
      const prevMs = activeStages.slice(0, idx).reduce((acc, curr) => acc + curr.durationMinutes * 60 * 1000, 0);
      start = new Date(now.getTime() + prevMs);
      end = new Date(start.getTime() + stg.durationMinutes * 60 * 1000);
    }

    return {
      stageNumber: idx + 1,
      startTime: start,
      endTime: end,
      temperature: stg.temperature,
      durationMinutes: stg.durationMinutes,
      action: stg.action,
      fanSpeed: stg.fanSpeed || 'auto',
      displayLight: stg.displayLight !== undefined ? stg.displayLight : true,
      mode: stg.mode || 'cool',
    };
  });

  // Format 24-hr time to 12-hr with AM/PM
  const formatTime12h = (t: string) => {
    if (!t) return '';
    const [hStr, mStr] = t.split(':');
    let h = parseInt(hStr, 10);
    const m = mStr || '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    if (language === 'bn') {
      const bnPeriod = ampm === 'PM' ? (h >= 4 && h < 8 ? 'সন্ধ্যা' : h >= 8 ? 'রাত' : 'দুপুর') : (h >= 4 && h < 12 ? 'সকাল' : 'ভোর');
      return `${bnPeriod} ${h}:${m}`;
    }
    return `${h}:${m} ${ampm}`;
  };

  const dayLabelsBn = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'];
  const dayLabelsEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const toggleDay = (dayIdx: number) => {
    if (selectedDays.includes(dayIdx)) {
      if (selectedDays.length === 1) return; // keep at least 1 day
      setSelectedDays(selectedDays.filter((d) => d !== dayIdx));
    } else {
      setSelectedDays([...selectedDays, dayIdx].sort());
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!time) return;

    const timeLabel = formatTime12h(time);
    const defaultName = powerOn
      ? `Auto ON at ${timeLabel} (${targetTemp}°C)`
      : `Auto OFF at ${timeLabel}`;
    const defaultNameBn = powerOn
      ? `${timeLabel} এসি চালু (${targetTemp}°C)`
      : `${timeLabel} এসি বন্ধ`;

    addSchedule({
      name: customName.trim() || defaultName,
      nameBn: customNameBn.trim() || defaultNameBn,
      time,
      days: selectedDays,
      power: powerOn,
      temperature: powerOn ? targetTemp : undefined,
      mode: powerOn ? mode : undefined,
      fanSpeed: powerOn ? fanSpeed : undefined,
      health: powerOn ? health : false,
      displayLight: powerOn ? displayLight : true,
      autoOffMinutes: powerOn && autoOffMinutes && autoOffMinutes > 0 ? autoOffMinutes : undefined,
      enabled: true,
    });

    // Reset modal
    setCustomName('');
    setCustomNameBn('');
    setShowAddModal(false);
    setTestSuccessMessage(
      language === 'bn'
        ? 'নতুন শিডিউল সফলভাবে সংরক্ষণ করা হয়েছে!'
        : 'New schedule saved successfully!'
    );
    setTimeout(() => setTestSuccessMessage(null), 3500);
  };

  const handleSleepTimer = (minutes: number) => {
    updateAC({ timerOffMinutes: minutes });
  };

  // Add 1-click smart preset schedules
  const applyPresetSchedule = (presetType: 'night_sleep' | 'evening_cool' | 'dawn_off') => {
    if (presetType === 'night_sleep') {
      addSchedule({
        name: 'Night Sleep Routine (25°C + Health Filter)',
        nameBn: 'রাত ১১:০০ স্লিপ রুটিন (২৫°C + হেলথ ফিল্টার)',
        time: '23:00',
        days: [0, 1, 2, 3, 4, 5, 6],
        power: true,
        temperature: 25,
        mode: 'cool',
        fanSpeed: 'quiet',
        health: true,
        displayLight: false,
        autoOffMinutes: 360, // 6 hours
        enabled: true,
      });
    } else if (presetType === 'evening_cool') {
      addSchedule({
        name: 'Evening Chill Rush (23°C Turbo)',
        nameBn: 'সন্ধ্যা ৭:০০ ইভনিং কুলিং (২৩°C টার্বো)',
        time: '19:00',
        days: [0, 1, 2, 3, 4, 5, 6],
        power: true,
        temperature: 23,
        mode: 'cool',
        fanSpeed: 'turbo',
        health: true,
        displayLight: true,
        enabled: true,
      });
    } else if (presetType === 'dawn_off') {
      addSchedule({
        name: 'Morning Auto Shut-Off (6:30 AM)',
        nameBn: 'সকাল ৬:৩০ এসি বন্ধ',
        time: '06:30',
        days: [0, 1, 2, 3, 4, 5, 6],
        power: false,
        enabled: true,
      });
    }
    setTestSuccessMessage(
      language === 'bn'
        ? 'প্রিসেট শিডিউল সফলভাবে তৈরি করা হয়েছে!'
        : 'Preset schedule added successfully!'
    );
    setTimeout(() => setTestSuccessMessage(null), 3500);
  };

  const handleDelete = (id: string, name: string) => {
    deleteSchedule(id);
    setTestSuccessMessage(
      language === 'bn'
        ? `"${name}" শিডিউলটি ডিলিট করা হয়েছে!`
        : `Schedule "${name}" deleted!`
    );
    setTimeout(() => setTestSuccessMessage(null), 3000);
  };

  const handleToggle = (sched: any) => {
    toggleSchedule(sched.id);
    const willEnable = !sched.enabled;
    const name = language === 'bn' ? sched.nameBn || sched.name : sched.name;
    setTestSuccessMessage(
      language === 'bn'
        ? `"${name}" শিডিউল ${willEnable ? 'চালু (Active)' : 'বন্ধ (Inactive)'} করা হয়েছে!`
        : `Schedule "${name}" ${willEnable ? 'enabled' : 'disabled'}!`
    );
    setTimeout(() => setTestSuccessMessage(null), 2500);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Segmented Control for Switch between Schedule and Report */}
      <div className="bg-slate-900/80 border border-slate-800 p-1 rounded-2xl flex items-center shadow-inner">
        <button
          onClick={() => setActiveView('report')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeView === 'report'
              ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>{language === 'bn' ? 'ব্যবহারের রিপোর্ট' : 'Usage Report'}</span>
        </button>
        <button
          onClick={() => setActiveView('schedule')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeView === 'schedule'
              ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>{language === 'bn' ? 'অটো শিডিউল ও টাইমার' : 'Schedules & Timers'}</span>
        </button>
      </div>

      {activeView === 'report' ? (
        <ACUsageReports />
      ) : (
        <>
          {/* 0. SMART MULTI-STAGE STEP TIMER & TEMPERATURE RULE */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-purple-950/30 border border-purple-500/30 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-purple-500/20">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <span>{language === 'bn' ? 'স্মার্ট স্টেপ টাইমার ও হেলথ কার্ভ' : 'Multi-Stage Temperature Automation'}</span>
                    {isStepRunning && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse">
                        ● {language === 'bn' ? 'রানিং' : 'Active'}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {language === 'bn'
                      ? 'শুরুতে এক তাপমাত্রা, নির্দিষ্ট সময় পর স্বয়ংক্রিয় পরিবর্তন ও ভোরবেলায় অটো-অফ'
                      : 'Timed temperature transition & automatic shutdown workflow'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowStepModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold rounded-xl text-xs shadow-md shadow-purple-500/20 flex items-center gap-2 transition-all hover:scale-102 active:scale-98"
              >
                <Settings2 className="w-3.5 h-3.5" />
                <span>
                  {isStepRunning
                    ? language === 'bn'
                      ? 'টাইমার পরিবর্তন'
                      : 'Edit Rules'
                    : language === 'bn'
                    ? 'নতুন স্টেপ টাইমার'
                    : 'Setup Step Timer'}
                </span>
              </button>
            </div>

            {/* If Step Timer is Running: Live Stage Info & Countdown */}
            {isStepRunning ? (
              <div className="p-4 bg-slate-950/70 border border-purple-500/40 rounded-2xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-purple-500 text-white font-bold flex items-center justify-center text-xs">
                      {stepTimer?.currentStage}
                    </span>
                    <div>
                      <p className="font-bold text-white text-xs">
                        {language === 'bn' ? `স্টেজ ${stepTimer?.currentStage} চলছে` : `Stage ${stepTimer?.currentStage} in Progress`}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 flex-wrap">
                        <span>{language === 'bn' ? 'টার্গেট:' : 'Target:'} <b className="text-cyan-300">{ac.temperature}°C</b></span>
                        <span className="text-slate-600">•</span>
                        <span>ফ্যান: <b className="text-slate-300">{ac.fanSpeed}</b></span>
                        <span className="text-slate-600">•</span>
                        <span>লাইট: <b className="text-slate-300">{ac.displayLight ? (language === 'bn' ? 'অন' : 'ON') : (language === 'bn' ? 'অফ' : 'OFF')}</b></span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 uppercase font-mono">{language === 'bn' ? 'বাকি সময়:' : 'Time Left:'}</p>
                      <p className="text-sm font-extrabold text-cyan-400 font-mono">
                        {Math.ceil(stepTimer?.remainingMinutes ?? 0)} {language === 'bn' ? 'মিনিট' : 'mins'}
                      </p>
                    </div>
                    <button
                      onClick={cancelStepTimer}
                      className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition-colors"
                      title="Stop Timer"
                    >
                      <Square className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Quick Running Stage Time Adjust Controls */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-900/80 rounded-xl border border-slate-800 text-xs">
                  <span className="text-[11px] text-slate-300 font-medium flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{language === 'bn' ? 'চলমান স্টেজের সময় দ্রুত পরিবর্তন:' : 'Quick adjust running stage time:'}</span>
                  </span>
                  <div className="flex items-center gap-1.5 font-mono">
                    <button
                      onClick={() => adjustStepTimerTime({ deltaMinutes: -30 })}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-rose-500/20 hover:text-rose-300 text-slate-300 border border-slate-700 text-xs transition-colors font-semibold"
                      title={language === 'bn' ? '৩০ মিনিট কমান' : 'Decrease 30 mins'}
                    >
                      -30m
                    </button>
                    <button
                      onClick={() => adjustStepTimerTime({ deltaMinutes: -15 })}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-rose-500/20 hover:text-rose-300 text-slate-300 border border-slate-700 text-xs transition-colors font-semibold"
                      title={language === 'bn' ? '১৫ মিনিট কমান' : 'Decrease 15 mins'}
                    >
                      -15m
                    </button>
                    <button
                      onClick={() => adjustStepTimerTime({ deltaMinutes: 15 })}
                      className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/35 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-colors"
                      title={language === 'bn' ? '১৫ মিনিট বাড়ান' : 'Add 15 mins'}
                    >
                      +15m
                    </button>
                    <button
                      onClick={() => adjustStepTimerTime({ deltaMinutes: 30 })}
                      className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/35 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-colors"
                      title={language === 'bn' ? '৩০ মিনিট বাড়ান' : 'Add 30 mins'}
                    >
                      +30m
                    </button>
                    <button
                      onClick={() => adjustStepTimerTime({ deltaMinutes: 60 })}
                      className="px-2.5 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/35 text-blue-300 border border-blue-500/40 text-xs font-bold transition-colors"
                      title={language === 'bn' ? '১ ঘণ্টা বাড়ান' : 'Add 1 hour'}
                    >
                      +1h
                    </button>
                  </div>
                </div>

                {/* Active Stage Start Time & Current Stage Schedule Window */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2 bg-slate-900/90 rounded-xl border border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">{language === 'bn' ? 'স্টেজ শুরু সময়:' : 'Stage Start Time:'}</span>
                    <span className="text-cyan-300 font-bold">{formatClockTime(activeStageStartTime)}</span>
                  </div>
                  {activeStageSchedules[currentStageIdx] && (
                    <div className="p-2 bg-slate-900/90 rounded-xl border border-cyan-500/30 flex items-center justify-between">
                      <span className="text-[10px] text-cyan-300">{language === 'bn' ? `${currentStageIdx + 1}ম স্টেজ সময়সূচী:` : `Stage ${currentStageIdx + 1} Schedule:`}</span>
                      <span className="text-white font-bold">{formatClockTime(activeStageSchedules[currentStageIdx].startTime)} – {formatClockTime(activeStageSchedules[currentStageIdx].endTime)}</span>
                    </div>
                  )}
                </div>

                {/* Dynamic Stages Progress Visual */}
                <div className="space-y-2 pt-1">
                  <div className="grid grid-cols-1 gap-2 text-[11px] text-slate-300 font-mono">
                    {activeStageSchedules.map((sched, idx) => {
                      const isActive = idx === (stepTimer?.currentStageIndex ?? 0);
                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all ${
                            isActive
                              ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/60 font-semibold shadow-md shadow-cyan-500/10'
                              : 'bg-slate-900/90 text-slate-300 border-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-base">{isActive ? '▶️' : '⏱️'}</span>
                            <div>
                              <div className="font-bold text-xs flex items-center gap-2 flex-wrap">
                                <span className={isActive ? 'text-cyan-300 font-extrabold' : 'text-white'}>
                                  {language === 'bn' ? `স্টেজ ${sched.stageNumber}` : `Stage ${sched.stageNumber}`}:
                                </span>
                                <span className="text-cyan-300 font-mono font-extrabold text-sm">{sched.temperature}°C</span>
                                <span className="text-slate-600 font-normal">|</span>
                                <span className="text-slate-300 font-normal text-[11px]">
                                  {sched.fanSpeed === 'quiet' ? (language === 'bn' ? 'নীরব (Quiet)' : 'Quiet') :
                                   sched.fanSpeed === 'turbo' ? (language === 'bn' ? 'টার্বো (Turbo)' : 'Turbo') :
                                   sched.fanSpeed === 'low' ? (language === 'bn' ? 'স্লো (Low)' : 'Low') :
                                   sched.fanSpeed === 'med' ? (language === 'bn' ? 'মিডিয়াম (Med)' : 'Med') :
                                   sched.fanSpeed === 'high' ? (language === 'bn' ? 'হাই (High)' : 'High') : (language === 'bn' ? 'অটো ফ্যান' : 'Auto Fan')}
                                </span>
                                <span className="text-slate-600 font-normal">|</span>
                                <span className="text-slate-300 font-normal text-[11px]">
                                  {sched.displayLight !== false ? (language === 'bn' ? 'লাইট অন' : 'Light ON') : (language === 'bn' ? 'লাইট অফ' : 'Light OFF')}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                {formatClockTime(sched.startTime)} – {formatClockTime(sched.endTime)} ({sched.durationMinutes} {language === 'bn' ? 'মিনিট' : 'mins'})
                              </div>
                              <div className="flex flex-wrap items-center gap-1 mt-1.5 pt-1.5 border-t border-slate-800/60">
                                <span className="text-[10px] text-slate-400 font-sans">
                                  {language === 'bn' ? 'সময় পরিবর্তন:' : 'Duration:'}
                                </span>
                                {[30, 60, 90, 120, 180, 240].map((dur) => (
                                  <button
                                    key={dur}
                                    onClick={() => adjustStepTimerTime({ stageIndex: idx, durationMinutes: dur })}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-all ${
                                      sched.durationMinutes === dur
                                        ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                                        : 'bg-slate-800/90 text-slate-400 hover:text-white border border-slate-700'
                                    }`}
                                    title={language === 'bn' ? `স্টেজ ${sched.stageNumber} এর সময় ${dur} মিনিট নির্ধারণ করুন` : `Set duration to ${dur} mins`}
                                  >
                                    {dur >= 60 ? `${dur / 60}h` : `${dur}m`}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div>
                            {isActive ? (
                              <span className="px-2.5 py-1 rounded-xl bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold flex items-center gap-1.5 shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                <span>{language === 'bn' ? 'বর্তমানে রানিং' : 'Active Now'}</span>
                              </span>
                            ) : (
                              <button
                                onClick={() => jumpToStage(idx)}
                                className="px-3 py-1 bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 font-extrabold rounded-xl border border-cyan-500/35 text-[11px] transition-all flex items-center gap-1 shadow-sm active:scale-95"
                              >
                                <span>{language === 'bn' ? `এখনই স্টেজ ${sched.stageNumber} চালু করুন ➔` : `Jump to Stage ${sched.stageNumber} ➔`}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-[11px] text-amber-300/90 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                    💡 <b>{language === 'bn' ? 'তথ্য:' : 'Note:'}</b> {language === 'bn' 
                      ? `বর্তমানে স্টেজ ${stepTimer?.currentStage || 1} চলায় এসি তার সেটিং অনুযায়ী ${ac.temperature}°C (ফ্যান: ${ac.fanSpeed}, লাইট: ${ac.displayLight ? 'অন' : 'অফ'}) এ চলছে। এই স্টেজের সময় শেষ হলে স্বয়ংক্রিয়ভাবে পরবর্তী স্টেজটি তার নির্ধারিত সেটিং অনুযায়ী চলবে, অথবা আপনি চাইলে যে কোনো সময় উপরের "এখনই স্টেজ চালু করুন" বাটনে ক্লিক করে সাথে সাথে ওই স্টেজে যেতে পারেন।`
                      : `Currently running Stage ${(stepTimer?.currentStageIndex ?? 0) + 1} at ${ac.temperature}°C (Fan: ${ac.fanSpeed}, Light: ${ac.displayLight ? 'ON' : 'OFF'}). Once this stage completes, the next stage will automatically run according to its settings, or click any Jump button above to activate immediately.`}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <p className="text-slate-300 font-medium">
                    {language === 'bn'
                      ? 'উদাহরণ: শুরুতে ২৪°C তাপমাত্রায় ২ ঘণ্টা চলবে ➔ এরপর তাপমাত্রা বেড়ে ২৬°C হবে ➔ ভোরবেলায় এসি বন্ধ হবে।'
                      : 'Example: 24°C for 2 hours -> Auto shift to 26°C for 4 hours -> Auto shutdown at dawn.'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {language === 'bn' ? 'গভীর রাতে অতিরিক্ত ঠান্ডা ও বিদ্যুৎ অপচয় রোধ করতে নিখুঁত সমাধান।' : 'Prevents midnight over-chilling and saves electricity.'}
                  </p>
                </div>
                <button
                  onClick={() => setShowStepModal(true)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-cyan-300 border border-slate-700 rounded-xl text-xs font-bold transition-colors shrink-0"
                >
                  {language === 'bn' ? 'টাইমার সেট করুন ➔' : 'Configure ➔'}
                </button>
              </div>
            )}
          </div>

          {/* 1. Quick Off Sleep Timers */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Moon className="w-4 h-4 text-purple-400" />
                <span>{language === 'bn' ? 'কুইক স্লিপ অটো-অফ টাইমার' : 'Quick Auto-Off Sleep Timer'}</span>
              </h3>
              <span className="text-xs font-mono text-cyan-400 font-semibold">
                {ac.timerOffMinutes > 0 ? `Active: ${ac.timerOffMinutes} mins` : 'Disabled'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {[
                { label: '30 Mins', val: 30 },
                { label: '1 Hour', val: 60 },
                { label: '2 Hours', val: 120 },
                { label: '4 Hours', val: 240 },
                { label: '8 Hours (Night)', val: 480 },
              ].map((timer) => (
                <button
                  key={timer.val}
                  onClick={() => handleSleepTimer(ac.timerOffMinutes === timer.val ? 0 : timer.val)}
                  className={`py-2.5 px-3 rounded-2xl border text-xs font-semibold transition-all ${
                    ac.timerOffMinutes === timer.val
                      ? 'bg-purple-500 text-white font-bold shadow-md shadow-purple-500/30 border-purple-400 scale-102'
                      : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  {timer.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Automated Schedules Section */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <span>{language === 'bn' ? 'প্রতিদিনের স্বয়ংক্রিয় এসি শিডিউল' : 'Daily Automated AC Schedules'}</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {language === 'bn'
                    ? 'নির্দিষ্ট সময়ে এসি অন/অফ, হেলথ ফিল্টার ও তাপমাত্রার স্বয়ংক্রিয় শিডিউল'
                    : 'Scheduled automated IR triggers for comfort & sleep routines.'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {liveTime && (
                  <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-cyan-400 flex items-center gap-1.5 shadow-inner">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>{language === 'bn' ? 'ডিভাইস সময়:' : 'Local Time:'} <b>{liveTime}</b></span>
                  </div>
                )}

                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-xl text-xs shadow-md shadow-cyan-500/20 transition-all active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'নতুন শিডিউল যোগ করুন' : 'Add New Schedule'}</span>
                </button>
              </div>
            </div>

            {/* Test Success Feedback Toast */}
            {testSuccessMessage && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-300 animate-fadeIn shadow-lg">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold">{testSuccessMessage}</span>
              </div>
            )}

            {/* Quick 1-Click Schedule Presets */}
            <div className="p-3.5 bg-slate-950/80 border border-slate-800/80 rounded-2xl space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span>{language === 'bn' ? '১-ক্লিকে শিডিউল প্রিসেট তৈরি করুন:' : '1-Click Quick Schedule Templates:'}</span>
              </span>
              <div className="flex flex-wrap gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => applyPresetSchedule('night_sleep')}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-700/80 text-cyan-300 text-xs font-medium flex items-center gap-1.5 transition-all hover:border-cyan-500/40 active:scale-95"
                >
                  <Moon className="w-3.5 h-3.5 text-purple-400" />
                  <span>{language === 'bn' ? 'রাত ১১:০০ এ ২৫°C স্লিপ + হেলথ' : '11 PM Sleep 25°C + Health'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => applyPresetSchedule('evening_cool')}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-700/80 text-cyan-300 text-xs font-medium flex items-center gap-1.5 transition-all hover:border-cyan-500/40 active:scale-95"
                >
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{language === 'bn' ? 'সন্ধ্যা ৭:০০ এ ২৩°C টার্বো' : '7 PM Fast Chill 23°C'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => applyPresetSchedule('dawn_off')}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-700/80 text-rose-300 text-xs font-medium flex items-center gap-1.5 transition-all hover:border-rose-500/40 active:scale-95"
                >
                  <Power className="w-3.5 h-3.5 text-rose-400" />
                  <span>{language === 'bn' ? 'সকাল ৬:৩০ এসি বন্ধ' : '6:30 AM Auto Off'}</span>
                </button>
              </div>
            </div>

            {/* Schedule Cards List */}
            {schedules.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                {language === 'bn'
                  ? 'কোনো অটো শিডিউল নেই। উপরের "নতুন শিডিউল যোগ করুন" বাটনে চাপ দিয়ে যোগ করুন।'
                  : 'No scheduled routines yet. Click "Add New Schedule" to create one.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                {schedules.map((sched) => {
                  const title = language === 'bn' ? sched.nameBn || sched.name : sched.name;
                  const formattedTime = formatTime12h(sched.time);
                  const isAllDays = sched.days?.length === 7;
                  const isTesting = testingId === sched.id;

                  return (
                    <div
                      key={sched.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                        sched.enabled
                          ? 'bg-slate-950/90 border-slate-800 text-white shadow-md hover:border-slate-700'
                          : 'bg-slate-950/40 border-slate-900 text-slate-500 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-mono font-bold shrink-0 border ${
                              sched.enabled
                                ? sched.power
                                  ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                                  : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                                : 'bg-slate-900 border-slate-800 text-slate-500'
                            }`}
                          >
                            <span className="text-xs font-bold">{sched.time}</span>
                            <span className="text-[9px] uppercase tracking-tighter opacity-80">
                              {parseInt(sched.time.split(':')[0], 10) >= 12 ? 'PM' : 'AM'}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <h4 className="text-xs sm:text-sm font-bold leading-tight">{title}</h4>
                            <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                              <span
                                className={`px-2 py-0.5 rounded-md font-bold ${
                                  sched.power
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                }`}
                              >
                                {sched.power ? (language === 'bn' ? 'এসি চালু (ON)' : 'POWER ON') : (language === 'bn' ? 'এসি বন্ধ (OFF)' : 'POWER OFF')}
                              </span>

                              {sched.power && sched.temperature && (
                                <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                  {sched.temperature}°C {sched.mode ? sched.mode.toUpperCase() : ''}
                                </span>
                              )}

                              {sched.power && sched.health && (
                                <span className="px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-300 border border-teal-500/30">
                                  🌿 {language === 'bn' ? 'হেলথ' : 'Health'}
                                </span>
                              )}

                              {sched.power && sched.autoOffMinutes && sched.autoOffMinutes > 0 && (
                                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  ⏱️ {Math.round(sched.autoOffMinutes / 60)}h {language === 'bn' ? 'পর বন্ধ' : 'off'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Toggle switch & delete */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleToggle(sched)}
                            className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-1 ${
                              sched.enabled ? 'bg-cyan-500' : 'bg-slate-800'
                            }`}
                            title={sched.enabled ? 'Disable Schedule' : 'Enable Schedule'}
                          >
                            <div
                              className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${
                                sched.enabled ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>

                          <button
                            onClick={() => handleDelete(sched.id, title)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-900 transition-colors"
                            title="Delete Schedule"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Card Footer: Active Days & Instant Test Button */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-[10px]">
                        <div className="flex items-center gap-1">
                          <span className="text-slate-500 font-medium mr-1">
                            {language === 'bn' ? 'সক্রিয় দিন:' : 'Days:'}
                          </span>
                          {isAllDays ? (
                            <span className="text-cyan-400 font-semibold">{language === 'bn' ? 'প্রতিদিন' : 'Everyday'}</span>
                          ) : (
                            sched.days?.map((d) => (
                              <span
                                key={d}
                                className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 font-mono"
                              >
                                {language === 'bn' ? dayLabelsBn[d] : dayLabelsEn[d]}
                              </span>
                            ))
                          )}
                        </div>

                        {/* Instant Test Button */}
                        <button
                          type="button"
                          disabled={isTesting}
                          onClick={() => handleTestRun(sched)}
                          className={`px-2.5 py-1 rounded-lg border flex items-center gap-1 font-semibold text-[10px] transition-all active:scale-95 ${
                            isTesting
                              ? 'bg-cyan-500 text-slate-950 border-cyan-400 animate-pulse'
                              : 'bg-slate-900 hover:bg-slate-850 text-cyan-300 border-slate-800 hover:border-cyan-500/40'
                          }`}
                          title="Test trigger this schedule right now"
                        >
                          <Play className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
                          <span>{isTesting ? (language === 'bn' ? 'চলছে...' : 'Testing...') : (language === 'bn' ? 'টেস্ট চালান' : 'Test Run')}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* COMPREHENSIVE ADD SCHEDULE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5 my-auto max-h-[92vh] overflow-y-auto text-left">
            <div className="sticky -top-5 sm:-top-7 bg-slate-900/95 backdrop-blur-md z-20 pt-1 pb-3 border-b border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30 shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">
                    {language === 'bn' ? 'নতুন এসি শিডিউল তৈরি করুন' : 'Create Smart AC Schedule'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {language === 'bn' ? 'সময়, তাপমাত্রা ও হেলথ অপশন নির্ধারণ করুন' : 'Configure time, temperature & health'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors shrink-0"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              {/* TIME & ACTION */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    {language === 'bn' ? 'শিডিউল সময় (২৪ ঘণ্টা):' : 'Schedule Time (24h):'}
                  </label>
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-cyan-500"
                  />
                  <span className="text-[10px] text-cyan-400 mt-1 block font-mono">
                    ➔ {formatTime12h(time)}
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    {language === 'bn' ? 'এসির অ্যাকশন:' : 'AC Action:'}
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setPowerOn(true)}
                      className={`py-2 rounded-lg font-bold text-xs transition-all ${
                        powerOn
                          ? 'bg-cyan-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {language === 'bn' ? 'এসি চালু (ON)' : 'Turn ON'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPowerOn(false)}
                      className={`py-2 rounded-lg font-bold text-xs transition-all ${
                        !powerOn
                          ? 'bg-rose-500 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {language === 'bn' ? 'এসি বন্ধ (OFF)' : 'Turn OFF'}
                    </button>
                  </div>
                </div>
              </div>

              {/* IF POWER ON: TEMPERATURE, HEALTH, LIGHT & AUTO-OFF */}
              {powerOn && (
                <div className="space-y-3.5 p-4 bg-slate-950/80 rounded-2xl border border-slate-800/90">
                  {/* Temperature Slider */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-bold text-slate-300">
                        {language === 'bn' ? 'টার্গেট তাপমাত্রা (১৬° - ৩০°C):' : 'Target Temperature:'}
                      </label>
                      <span className="font-mono font-bold text-cyan-400 text-sm">{targetTemp}°C</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="16"
                        max="30"
                        value={targetTemp}
                        onChange={(e) => setTargetTemp(Number(e.target.value))}
                        className="flex-1 accent-cyan-500 cursor-pointer"
                      />
                      <span className="w-10 text-center font-mono font-bold text-white bg-slate-900 py-1 rounded-lg border border-slate-800">
                        {targetTemp}°
                      </span>
                    </div>
                  </div>

                  {/* Mode & Fan Speed */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">
                        {language === 'bn' ? 'মোড:' : 'AC Mode:'}
                      </label>
                      <select
                        value={mode}
                        onChange={(e) => setMode(e.target.value as ACMode)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white capitalize focus:outline-none focus:border-cyan-500"
                      >
                        <option value="cool">Cool (ঠান্ডা)</option>
                        <option value="auto">Auto (স্বয়ংক্রিয়)</option>
                        <option value="eco">Eco (সাশ্রয়ী)</option>
                        <option value="dry">Dry (আর্দ্রতা দূর)</option>
                        <option value="fan">Fan Only (শুধু ফ্যান)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">
                        {language === 'bn' ? 'ফ্যান স্পিড:' : 'Fan Speed:'}
                      </label>
                      <select
                        value={fanSpeed}
                        onChange={(e) => setFanSpeed(e.target.value as ACFanSpeed)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white capitalize focus:outline-none focus:border-cyan-500"
                      >
                        <option value="auto">Auto</option>
                        <option value="quiet">Quiet (নীরব)</option>
                        <option value="low">Low (কম)</option>
                        <option value="med">Medium (মাঝারি)</option>
                        <option value="high">High (উচ্চ)</option>
                        <option value="turbo">Turbo (টার্বো)</option>
                      </select>
                    </div>
                  </div>

                  {/* HEALTH FILTER & DISPLAY LIGHT TOGGLES */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setHealth(!health)}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                        health
                          ? 'bg-teal-500/20 border-teal-500/50 text-teal-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4" />
                        <span className="font-semibold">{language === 'bn' ? 'হেলথ ফিল্টার' : 'Health Filter'}</span>
                      </div>
                      <span className={`text-[10px] font-bold ${health ? 'text-teal-400' : 'text-slate-500'}`}>
                        {health ? 'ON' : 'OFF'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDisplayLight(!displayLight)}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                        displayLight
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Sun className="w-4 h-4" />
                        <span className="font-semibold">{language === 'bn' ? 'ডিসপ্লে লাইট' : 'Display Light'}</span>
                      </div>
                      <span className={`text-[10px] font-bold ${displayLight ? 'text-amber-400' : 'text-slate-500'}`}>
                        {displayLight ? 'ON' : 'OFF'}
                      </span>
                    </button>
                  </div>

                  {/* AUTO TURN-OFF DURATION */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      {language === 'bn' ? 'চালু হওয়ার কত সময় পর অটো-অফ হবে (ঐচ্ছিক):' : 'Auto Turn-Off After:'}
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { label: language === 'bn' ? 'বন্ধ হবে না' : 'Continuous', val: undefined },
                        { label: '2 Hours', val: 120 },
                        { label: '4 Hours', val: 240 },
                        { label: '6 Hours', val: 360 },
                      ].map((opt) => (
                        <button
                          key={String(opt.val)}
                          type="button"
                          onClick={() => setAutoOffMinutes(opt.val)}
                          className={`py-1.5 px-2 rounded-lg text-[10px] font-semibold transition-all border ${
                            autoOffMinutes === opt.val
                              ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* REPEAT DAYS OF WEEK */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-slate-300">
                    {language === 'bn' ? 'সপ্তাহের দিনসমূহ নির্বাচন করুন:' : 'Repeat Days:'}
                  </label>
                  <div className="flex items-center gap-2 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setSelectedDays([0, 1, 2, 3, 4, 5, 6])}
                      className="text-cyan-400 hover:underline"
                    >
                      {language === 'bn' ? 'প্রতিদিন' : 'All'}
                    </button>
                    <span className="text-slate-600">·</span>
                    <button
                      type="button"
                      onClick={() => setSelectedDays([0, 1, 2, 3, 4])}
                      className="text-slate-400 hover:text-white"
                    >
                      {language === 'bn' ? 'রবি-বৃহস্পতি' : 'Sun-Thu'}
                    </button>
                    <span className="text-slate-600">·</span>
                    <button
                      type="button"
                      onClick={() => setSelectedDays([5, 6])}
                      className="text-slate-400 hover:text-white"
                    >
                      {language === 'bn' ? 'ছুটির দিন' : 'Fri-Sat'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1.5">
                  {[0, 1, 2, 3, 4, 5, 6].map((dayIdx) => {
                    const isSelected = selectedDays.includes(dayIdx);
                    return (
                      <button
                        key={dayIdx}
                        type="button"
                        onClick={() => toggleDay(dayIdx)}
                        className={`py-2 rounded-xl text-center font-bold text-[11px] transition-all border ${
                          isSelected
                            ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-sm'
                            : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {language === 'bn' ? dayLabelsBn[dayIdx] : dayLabelsEn[dayIdx]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 text-xs text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-750 transition-colors"
                >
                  {language === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-cyan-500/20 active:scale-95 transition-all"
                >
                  {language === 'bn' ? 'শিডিউল সংরক্ষণ করুন' : 'Save Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Multi-Stage Step Timer Modal */}
      {showStepModal && <ACStepTimerModal onClose={() => setShowStepModal(false)} />}
    </div>
  );
};
