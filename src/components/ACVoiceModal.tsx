import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Sparkles,
  Send,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Volume2,
  ShieldAlert,
  Lock,
  RefreshCw,
  Keyboard,
  X,
  Compass,
  ArrowRight,
  Check,
} from 'lucide-react';
import { useSmartAC } from '../context/SmartACContext';

export const ACVoiceModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { language, setLanguage, processACVoiceCommand, fetchData } = useSmartAC();
  const [activeTab, setActiveTab] = useState<'voice' | 'text'>('voice');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const [lastResponse, setLastResponse] = useState<string | null>(null);
  const [appliedChanges, setAppliedChanges] = useState<Record<string, any> | null>(null);
  const [isError, setIsError] = useState(false);

  // Microphone Permission Window State
  const [showPermissionWindow, setShowPermissionWindow] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied' | 'unknown'>('unknown');
  const [permissionErrorDetail, setPermissionErrorDetail] = useState<string>('');
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  const recognitionRef = useRef<any>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  // Check initial permission status if browser supports it
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'microphone' as PermissionName })
        .then((res) => {
          setPermissionStatus(res.state as 'prompt' | 'granted' | 'denied');
          res.onchange = () => {
            setPermissionStatus(res.state as 'prompt' | 'granted' | 'denied');
            if (res.state === 'granted') {
              setShowPermissionWindow(false);
            }
          };
        })
        .catch(() => {
          setPermissionStatus('unknown');
        });
    }
  }, []);

  // Initialize SpeechRecognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = language === 'bn' ? 'bn-BD' : 'en-US';

    rec.onstart = () => {
      setIsListening(true);
      setShowPermissionWindow(false);
      setTranscript('');
      setLastResponse(null);
      setAppliedChanges(null);
      setIsError(false);
    };

    rec.onresult = (event: any) => {
      const current = event.resultIndex;
      const text = event.results[current][0].transcript;
      setTranscript(text);

      if (event.results[current].isFinal) {
        handleCommand(text);
      }
    };

    rec.onerror = (e: any) => {
      console.warn('Speech recognition error:', e?.error);
      setIsListening(false);

      if (
        e?.error === 'not-allowed' ||
        e?.error === 'service-not-allowed' ||
        e?.error === 'permission-denied'
      ) {
        setPermissionStatus('denied');
        setShowPermissionWindow(true);
        setPermissionErrorDetail(
          language === 'bn'
            ? 'ব্রাউজারে মাইক্রোফোনের অনুমতি ব্লক বা প্রত্যাখ্যান করা আছে।'
            : 'Microphone permission was denied or blocked by your browser.'
        );
      } else if (e?.error === 'no-speech') {
        setIsError(true);
        setLastResponse(
          language === 'bn'
            ? 'কোনো কথা শুনতে পাওয়া যায়নি। পুনরায় বাটনে চাপ দিয়ে বলুন।'
            : 'No speech was detected. Please try again.'
        );
      } else {
        setIsError(true);
        setLastResponse(
          language === 'bn'
            ? 'ভয়েস শুনতে সমস্যা হয়েছে। পুনরায় বলুন বা নিচে লিখে পাঠান।'
            : 'Speech recognition error. Please speak again or type below.'
        );
      }
    };

    rec.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = rec;

    return () => {
      try {
        rec.abort();
      } catch {}
    };
  }, [language]);

  // Direct Permission Requester
  const requestMicrophoneAccess = async () => {
    setIsRequestingPermission(true);
    setPermissionErrorDetail('');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setIsRequestingPermission(false);
      setShowPermissionWindow(true);
      setPermissionErrorDetail(
        language === 'bn'
          ? 'এই ব্রাউজারে মাইক্রোফোন সাপোর্ট নেই। অনুগ্রহ করে টেক্সট মোড ব্যবহার করুন।'
          : 'Microphone access is not supported in this browser. Please use text mode.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Granted!
      stream.getTracks().forEach((track) => track.stop());
      setPermissionStatus('granted');
      setShowPermissionWindow(false);
      setIsRequestingPermission(false);

      // Start recognition immediately
      setTimeout(() => {
        if (recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch {}
        }
      }, 200);
    } catch (err: any) {
      console.warn('Microphone permission request rejected:', err);
      setIsRequestingPermission(false);
      setPermissionStatus('denied');
      setShowPermissionWindow(true);
      setPermissionErrorDetail(
        language === 'bn'
          ? 'মাইক্রোফোনের অনুমতি প্রত্যাখ্যান করা হয়েছে। ব্রাউজারের অ্যাড্রেস বার থেকে Allow করুন।'
          : 'Microphone permission was denied. Please allow it from your browser address bar.'
      );
    }
  };

  // When clicking on Voice button
  const handleVoiceButtonClick = async () => {
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
      return;
    }

    // Check if permission is known to be granted
    if (permissionStatus === 'granted') {
      try {
        recognitionRef.current?.start();
        return;
      } catch {}
    }

    // If permission is denied or prompt, open permission window or request
    if (permissionStatus === 'denied') {
      setShowPermissionWindow(true);
      return;
    }

    // Try requesting directly; if fails or needs explicit window, show window
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
        setPermissionStatus('granted');
        setShowPermissionWindow(false);
        recognitionRef.current?.start();
      } catch (err) {
        setShowPermissionWindow(true);
      }
    } else {
      setShowPermissionWindow(true);
    }
  };

  const speakReply = (text: string) => {
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language === 'bn' ? 'bn-BD' : 'en-US';
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
      } catch {}
    }
  };

  const handleCommand = async (text: string) => {
    if (!text.trim()) return;
    setIsProcessing(true);
    setIsError(false);
    setTranscript(text);

    try {
      const res = await fetch('/api/ai/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, language }),
      });

      if (res.ok) {
        const data = await res.json();
        setLastResponse(data.reply);
        setAppliedChanges(data.changes || null);
        speakReply(data.reply);
        fetchData();
      } else {
        throw new Error('AI Server responded with error');
      }
    } catch {
      // Local NLP fallback
      const localResult = processACVoiceCommand(text);
      setLastResponse(localResult.reply);
      setIsError(!localResult.success);
      speakReply(localResult.reply);
      fetchData();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || isProcessing) return;
    const cmd = textInput.trim();
    setTextInput('');
    handleCommand(cmd);
  };

  const samplePromptsBn = [
    { label: 'এসি ২৪ এ চালাও', cmd: 'এসি ২৪ ডিগ্রিতে দাও' },
    { label: 'টার্বো মোড অন', cmd: 'টার্বো মোড চালু করো' },
    { label: 'ইকো সাশ্রয়ী মোড', cmd: 'ইকো বিদ্যুৎ সাশ্রয়ী মোড দাও' },
    { label: 'হেলথ ফিল্টার অন', cmd: 'হেলথ ফিল্টার অন করো' },
    { label: 'ডিসপ্লে লাইট অফ', cmd: 'ডিসপ্লে লাইট বন্ধ করো' },
    { label: 'নীরব ফ্যান মোড', cmd: 'নীরব ফ্যান মোড চালু করো' },
    { label: 'এসি বন্ধ করো', cmd: 'এসি বন্ধ করো' },
    { label: 'রুমের তাপমাত্রা কত?', cmd: 'রুমের তাপমাত্রা কত?' },
    { label: 'বিদ্যুৎ বিল ও সময়', cmd: 'আজকের বিদ্যুৎ খরচ ও রানিং টাইম কত?' },
  ];

  const samplePromptsEn = [
    { label: 'Set to 24°C', cmd: 'Set AC to 24 degrees' },
    { label: 'Turbo Chill', cmd: 'Turn on Turbo mode' },
    { label: 'Eco Saver Mode', cmd: 'Switch to Eco mode' },
    { label: 'Health Air Filter', cmd: 'Turn on Health mode' },
    { label: 'Turn Off Light', cmd: 'Turn off display light' },
    { label: 'Quiet Fan', cmd: 'Enable ultra-quiet fan' },
    { label: 'Turn Off AC', cmd: 'Turn off AC' },
    { label: 'Room Temp?', cmd: 'What is the room temperature?' },
    { label: 'Runtime & Cost', cmd: 'What is today running time and cost?' },
  ];

  const samplePrompts = language === 'bn' ? samplePromptsBn : samplePromptsEn;

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5 my-auto max-h-[92vh] overflow-y-auto text-center">
        {/* Top Header */}
        <div className="sticky -top-5 sm:-top-7 bg-slate-900/95 backdrop-blur-md z-20 pt-1 pb-3 border-b border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 text-left">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-purple-600 text-slate-950 flex items-center justify-center shadow-lg shadow-cyan-500/20 shrink-0">
              <Sparkles className="w-5 h-5 text-slate-950 fill-current" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                {language === 'bn' ? 'এআই এসি কন্ট্রোলার' : 'AI AC Assistant'}
              </h2>
              <p className="text-[11px] text-cyan-400 font-medium">
                {language === 'bn' ? 'ভয়েস ও টেক্সট উভয় মোডে নিয়ন্ত্রণ' : 'Natural Voice & Text Control'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Switch */}
            <button
              onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}
              className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-all"
            >
              {language === 'bn' ? 'বাংলা' : 'EN'}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* DUAL MODE SELECTOR TABS: Voice & Text */}
        <div className="bg-slate-950 p-1 rounded-2xl border border-slate-800 flex items-center shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab('voice')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'voice'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Mic className="w-4 h-4" />
            <span>{language === 'bn' ? 'ভয়েস মোড (Voice)' : 'Voice Mode'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('text');
              setTimeout(() => textInputRef.current?.focus(), 100);
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'text'
                ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-md font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Keyboard className="w-4 h-4" />
            <span>{language === 'bn' ? 'টেক্সট মোড (Text)' : 'Text Mode'}</span>
          </button>
        </div>

        {/* VOICE MODE INTERFACE */}
        {activeTab === 'voice' && (
          <div className="py-2 relative flex flex-col items-center justify-center space-y-3">
            {/* Visualizer Waves */}
            <div className="relative flex items-center justify-center my-3">
              {isListening && (
                <>
                  <div className="absolute w-36 h-36 rounded-full bg-cyan-500/15 animate-ping"></div>
                  <div className="absolute w-28 h-28 rounded-full bg-cyan-500/25 animate-pulse"></div>
                </>
              )}

              <button
                type="button"
                onClick={handleVoiceButtonClick}
                className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl ${
                  isListening
                    ? 'bg-gradient-to-tr from-cyan-400 to-blue-500 text-slate-950 shadow-cyan-500/50 scale-110'
                    : 'bg-slate-800 hover:bg-slate-700 text-cyan-400 border-2 border-cyan-500/30 hover:border-cyan-400 hover:scale-105 active:scale-95 shadow-cyan-950/50'
                }`}
              >
                {isListening ? (
                  <Mic className="w-10 h-10 animate-bounce text-slate-950" />
                ) : (
                  <Mic className="w-10 h-10 text-cyan-400" />
                )}
              </button>
            </div>

            {/* Listening Status Message */}
            <div>
              <p className="text-sm font-bold text-white flex items-center justify-center gap-2">
                {isListening ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                    <span className="text-cyan-300">{language === 'bn' ? 'শুনছি... আপনার কমান্ড বলুন' : 'Listening... Speak your command'}</span>
                  </>
                ) : isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 text-purple-400 animate-spin" />
                    <span className="text-purple-300">{language === 'bn' ? 'এআই নির্দেশ বিশ্লেষণ করছে...' : 'Processing with Gemini AI...'}</span>
                  </>
                ) : (
                  <span className="text-slate-300 font-semibold">{language === 'bn' ? 'কথা বলতে মাইকে চাপ দিন' : 'Tap microphone to speak'}</span>
                )}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {language === 'bn' ? 'বাংলা বা ইংরেজিতে কথা বলুন' : 'Speak in Bengali or English'}
              </p>
            </div>
          </div>
        )}

        {/* TEXT INPUT AREA (Available in both tabs for instant convenience) */}
        <div className="space-y-2">
          <form onSubmit={handleTextSubmit} className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <input
                ref={textInputRef}
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={
                  language === 'bn'
                    ? 'যেমন: "এসি ২৪ এ দাও এবং টার্বো অন করো"...'
                    : 'e.g. "Set AC to 24 and turn on turbo"...'
                }
                className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-cyan-500 transition-colors pr-20"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {textInput && (
                  <button
                    type="button"
                    onClick={() => setTextInput('')}
                    className="p-1 text-slate-500 hover:text-slate-300 text-xs"
                  >
                    ✕
                  </button>
                )}
                {/* Quick Mic trigger button inside the text input bar */}
                <button
                  type="button"
                  onClick={handleVoiceButtonClick}
                  className={`p-1.5 rounded-xl transition-all ${
                    isListening
                      ? 'bg-cyan-500 text-slate-950 animate-pulse'
                      : 'text-slate-400 hover:text-cyan-400 hover:bg-slate-900'
                  }`}
                  title={language === 'bn' ? 'ভয়েস দিয়ে বলুন' : 'Speak command'}
                >
                  <Mic className="w-4 h-4" />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={!textInput.trim() || isProcessing}
              className="p-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold transition-all shadow-lg shadow-cyan-500/20 active:scale-95 flex items-center justify-center shrink-0"
              title="Send Command"
            >
              {isProcessing ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </form>
        </div>

        {/* TRANSCRIPT & AI RESPONSE BUBBLE */}
        {(transcript || lastResponse || isProcessing) && (
          <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/90 text-left space-y-2.5 animate-fadeIn">
            {transcript && (
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {language === 'bn' ? 'আপনার কমান্ড:' : 'Your Command:'}
                </span>
                <p className="text-xs sm:text-sm text-cyan-300 font-medium italic">
                  &ldquo;{transcript}&rdquo;
                </p>
              </div>
            )}

            {isProcessing && (
              <div className="flex items-center gap-2 text-xs text-purple-400 animate-pulse pt-1">
                <Sparkles className="w-4 h-4" />
                <span>{language === 'bn' ? 'এআই নির্দেশ বিশ্লেষণ করছে...' : 'Analyzing command with AI...'}</span>
              </div>
            )}

            {lastResponse && (
              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                <div className="flex items-start gap-2">
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      isError ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    {isError ? <AlertCircle className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1">
                    <p
                      className={`text-xs sm:text-sm font-semibold leading-relaxed ${
                        isError ? 'text-amber-300' : 'text-slate-100'
                      }`}
                    >
                      {lastResponse}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => speakReply(lastResponse)}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-cyan-400 transition-colors"
                    title="Replay Voice"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Applied changes badges */}
                {appliedChanges && Object.keys(appliedChanges).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {appliedChanges.power !== undefined && (
                      <span className="px-2 py-0.5 rounded-md bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold">
                        পাওয়ার: {appliedChanges.power ? 'চালু (ON)' : 'বন্ধ (OFF)'}
                      </span>
                    )}
                    {appliedChanges.temperature !== undefined && (
                      <span className="px-2 py-0.5 rounded-md bg-purple-950/80 border border-purple-500/30 text-purple-300 text-[10px] font-mono font-bold">
                        {appliedChanges.temperature}°C
                      </span>
                    )}
                    {appliedChanges.turbo && (
                      <span className="px-2 py-0.5 rounded-md bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold">
                        টার্বো: ON
                      </span>
                    )}
                    {appliedChanges.eco && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono font-bold">
                        ইকো: ON
                      </span>
                    )}
                    {appliedChanges.health && (
                      <span className="px-2 py-0.5 rounded-md bg-teal-950/80 border border-teal-500/30 text-teal-300 text-[10px] font-mono font-bold">
                        হেলথ: ON
                      </span>
                    )}
                    {appliedChanges.displayLight !== undefined && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-950/80 border border-amber-500/30 text-amber-300 text-[10px] font-mono font-bold">
                        লাইট: {appliedChanges.displayLight ? 'ON' : 'OFF'}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* QUICK SUGGESTED COMMAND CHIPS */}
        <div className="space-y-2 text-left pt-1 border-t border-slate-800">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span>{language === 'bn' ? 'ক্লিক করে দ্রুত কমান্ড রান করুন:' : 'Suggested Prompts (Click to run):'}</span>
          </p>

          <div className="flex flex-wrap gap-1.5">
            {samplePrompts.map((item) => (
              <button
                key={item.cmd}
                type="button"
                onClick={() => handleCommand(item.cmd)}
                className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-white rounded-xl text-xs transition-all active:scale-95 shadow-sm"
              >
                &ldquo;{item.label}&rdquo;
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* DEDICATED MICROPHONE PERMISSION POPUP WINDOW (উইন্ডো) */}
      {showPermissionWindow && (
        <div className="fixed inset-0 z-60 bg-slate-950/90 backdrop-blur-lg flex items-center justify-center p-4 animate-fadeIn">
          <div className="relative w-full max-w-md bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 text-left">
            {/* Top Bar with Dismiss */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/10 shrink-0">
                  <ShieldAlert className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {language === 'bn' ? 'মাইক্রোফোনের অনুমতি প্রয়োজন' : 'Microphone Permission Required'}
                  </h3>
                  <p className="text-xs text-amber-400/90 font-medium">
                    {language === 'bn' ? 'ভয়েস কন্ট্রোল ব্যবহারের জন্য পারমিশন দিন' : 'Grant access to enable voice commands'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowPermissionWindow(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Explanation */}
            <div className="space-y-2 text-xs text-slate-300">
              <p className="leading-relaxed">
                {language === 'bn'
                  ? 'আপনার কণ্ঠস্বর শুনে এসির পাওয়ার, তাপমাত্রা ও মোড পরিবর্তন করতে ব্রাউজারের মাইক্রোফোন ব্যবহারের অনুমতি প্রয়োজন।'
                  : 'To listen to your voice commands and control the AC temperature and features, browser microphone access is needed.'}
              </p>
              {permissionErrorDetail && (
                <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-300 text-[11px] font-medium">
                  ⚠️ {permissionErrorDetail}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <button
                type="button"
                disabled={isRequestingPermission}
                onClick={requestMicrophoneAccess}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50"
              >
                {isRequestingPermission ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Mic className="w-4 h-4 fill-current" />
                )}
                <span>{language === 'bn' ? 'অনুমতি প্রদান করুন (Allow)' : 'Allow Microphone'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowPermissionWindow(false);
                  setActiveTab('text');
                  setTimeout(() => textInputRef.current?.focus(), 150);
                }}
                className="py-3 px-4 bg-slate-800 hover:bg-slate-750 text-slate-200 font-semibold rounded-2xl text-xs flex items-center justify-center gap-2 transition-colors border border-slate-700"
              >
                <Keyboard className="w-4 h-4" />
                <span>{language === 'bn' ? 'টেক্সট দিয়ে টাইপ করুন' : 'Use Text Instead'}</span>
              </button>
            </div>

            {/* Step-by-Step Browser Setting Guide */}
            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800/80 space-y-2.5 text-xs">
              <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>{language === 'bn' ? 'ব্রাউজারে কীভাবে অনুমতি চালু করবেন:' : 'How to allow in browser settings:'}</span>
              </p>

              <ul className="space-y-2 text-[11px] text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    ১
                  </span>
                  <span>
                    {language === 'bn'
                      ? 'ব্রাউজারের অ্যাড্রেস বারের বাম পাশে তালা (🔒) অথবা সেটিংস আইকনে ক্লিক করুন।'
                      : 'Click the lock (🔒) or tune settings icon on the left of your address bar.'}
                  </span>
                </li>

                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    ২
                  </span>
                  <span>
                    {language === 'bn'
                      ? 'সেখান থেকে Permissions মেনুতে গিয়ে "Microphone" অপশনটি "Allow" বা চালু করুন।'
                      : 'Under Permissions, find "Microphone" and switch it to "Allow".'}
                  </span>
                </li>

                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    ৩
                  </span>
                  <span>
                    {language === 'bn'
                      ? 'এরপর উপরের "অনুমতি প্রদান করুন (Allow)" বাটনে চাপুন অথবা পেজ রিফ্রেশ করুন।'
                      : 'Then tap the "Allow Microphone" button above or refresh the page.'}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
