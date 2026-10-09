import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type {
  SmartACState,
  ClimateTelemetry,
  HardwareStatus,
  PowerTelemetry,
  ACSchedule,
  ACPreset,
  IRLogEntry,
  ACBrand,
  ACMode,
  ACFanSpeed,
  DirectConnectionConfig,
  ConnectionMethod,
  MultiStageTimer,
  SleepCurve,
  SleepCurveStage,
  ActiveSleepCurveState,
} from '../types/iot';
import { translations, type Language } from '../utils/translations';
import { sound } from '../utils/sound';
import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  firebaseSignOut,
  onAuthStateChanged,
  type User,
  OperationType,
  handleFirestoreError,
} from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface SmartACContextType {
  ac: SmartACState;
  climate: ClimateTelemetry;
  hardware: HardwareStatus;
  power: PowerTelemetry;
  presets: ACPreset[];
  schedules: ACSchedule[];
  logs: IRLogEntry[];
  directConfig: DirectConnectionConfig;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (typeof translations)['en'];
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  isSendingIR: boolean;
  user: User | null;
  isAuthLoading: boolean;
  isDbSyncing: boolean;
  dbLastSynced: string | null;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  saveSettingsToDatabase: () => Promise<boolean>;
  loadSettingsFromDatabase: () => Promise<boolean>;
  greeSession: {
    loggedIn: boolean;
    email: string;
    region: string;
    token: string;
    boundMac: string;
    deviceName: string;
    modelId: string;
  };

  // Actions
  loginGreeCloud: (credentials: {
    email: string;
    password?: string;
    region?: string;
    mac?: string;
  }) => Promise<{ success: boolean; message: string; error?: string }>;
  logoutGreeCloud: () => Promise<void>;
  pairDevice: (data: {
    brand: ACBrand;
    deviceName: string;
    deviceModel: string;
    location: string;
    method: ConnectionMethod;
    ipOrId?: string;
  }) => Promise<void>;
  unpairDevice: () => Promise<void>;
  togglePower: () => Promise<void>;
  setTemperature: (temp: number) => Promise<void>;
  stepTemperature: (delta: number) => Promise<void>;
  setMode: (mode: ACMode) => Promise<void>;
  setFanSpeed: (speed: ACFanSpeed) => Promise<void>;
  setBrand: (brand: ACBrand) => Promise<void>;
  setDeviceMetadata: (name: string, model: string, location: string) => Promise<void>;
  toggleDeviceOnline: (isOnline?: boolean) => Promise<void>;
  toggleTurbo: () => Promise<void>;
  toggleEco: () => Promise<void>;
  toggleSleep: () => Promise<void>;
  toggleDisplayLight: () => Promise<void>;
  toggleIonizer: () => Promise<void>;
  toggleHealth: () => Promise<void>;
  toggleAutoClean: () => Promise<void>;
  startCleanCycle: () => Promise<void>;
  cancelCleanCycle: () => Promise<void>;
  resetFilterClean: () => Promise<void>;
  toggleQuiet: () => Promise<void>;
  toggleLock: () => Promise<void>;
  setStepTimer: (config: Partial<MultiStageTimer>) => Promise<void>;
  cancelStepTimer: () => Promise<void>;
  jumpToStage: (stageIndex: number) => Promise<void>;
  adjustStepTimerTime: (options: {
    deltaMinutes?: number;
    stageIndex?: number;
    durationMinutes?: number;
    temperature?: number;
    fanSpeed?: string;
    displayLight?: boolean;
  }) => Promise<void>;
  updateAC: (updates: Partial<SmartACState>) => Promise<void>;
  updateDirectConfig: (updates: Partial<DirectConnectionConfig>) => Promise<void>;
  updatePowerSettings: (updates: { unitRateBdt?: number; currency?: string }) => Promise<void>;
  setConnectionMethod: (method: ConnectionMethod) => Promise<void>;
  activatePreset: (id: string) => Promise<void>;
  toggleSchedule: (id: string) => Promise<void>;
  addSchedule: (schedule: Omit<ACSchedule, 'id'>) => Promise<void>;
  updateSchedule: (id: string, sched: Partial<ACSchedule>) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
  runScheduleNow: (id: string) => Promise<boolean>;
  testIrBlast: () => Promise<boolean>;
  testDirectConnection: (method?: ConnectionMethod) => Promise<boolean>;
  processACVoiceCommand: (transcript: string) => { success: boolean; reply: string };
  fetchData: () => Promise<void>;
}

const STORAGE_KEY_AC = 'COOLHOME_AC_STATE_V4';
const STORAGE_KEY_CONFIG = 'COOLHOME_AC_CONFIG_V4';
const STORAGE_KEY_LANG = 'COOLHOME_AC_LANG_V4';
const STORAGE_KEY_GREE = 'COOLHOME_GREE_SESSION_V4';
const STORAGE_KEY_SCHEDULES = 'COOLHOME_AC_SCHEDULES_V4';
const STORAGE_KEY_SCHEDULES_MODIFIED = 'COOLHOME_AC_SCHEDULES_MODIFIED_V4';

const persistSchedulesLocally = (list: ACSchedule[], isUserAction: boolean = true) => {
  try {
    localStorage.setItem(STORAGE_KEY_SCHEDULES, JSON.stringify(list));
    if (isUserAction) {
      localStorage.setItem(STORAGE_KEY_SCHEDULES_MODIFIED, 'true');
    }
  } catch {}
};

const DEFAULT_AC_STATE: SmartACState = {
  id: 'ac_gree_c0393792cb97',
  isPaired: true,
  deviceName: 'Gree AC',
  deviceModel: 'Gree Inverter 1.5T',
  location: 'Master Bedroom',
  isOnline: true,
  power: true,
  temperature: 25,
  mode: 'cool',
  fanSpeed: 'low',
  swingV: 'middle',
  swingH: 'right',
  turbo: false,
  eco: false,
  sleep: false,
  displayLight: true,
  ionFilter: true,
  autoClean: false,
  filterCleanHours: 0,
  quiet: false,
  locked: false,
  brand: 'Gree',
  timerOffMinutes: 0,
  timerOnMinutes: 0,
  lastIrCommand: 'Gree AC Connected',
  lastIrHex: '0xGR01010119CE',
  lastUpdated: new Date().toISOString(),
};

const SmartACContext = createContext<SmartACContextType | null>(null);

export const SmartACProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize state with localStorage persistence
  const [ac, setAc] = useState<SmartACState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_AC);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return { ...DEFAULT_AC_STATE, ...parsed };
        }
      }
    } catch {}
    return DEFAULT_AC_STATE;
  });

  const [directConfig, setDirectConfig] = useState<DirectConnectionConfig>(() => {
    const defaultConfig: DirectConnectionConfig = {
      activeMethod: 'gree_cloud',
      greeEmail: 'rejuanh254@gmail.com',
      greePassword: '',
      greeRegion: 'asia',
      greeCloudToken: '',
      greeDeviceMac: 'c0393792cb97',
      tuyaDeviceId: '',
      tuyaLocalKey: '',
      tuyaCloudClientId: '',
      tuyaCloudSecret: '',
      tuyaRegion: 'us',
      acLocalIp: '',
      acPort: 7000,
      acKey: '',
      broadlinkIp: '',
      broadlinkMac: '',
      webhookUrl: '',
      haAccessToken: '',
      haEntityId: '',
      connected: false,
      lastSync: '',
      lastStatusMessage: 'Gree+ Cloud Server Ready',
    };
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (saved) {
        return { ...defaultConfig, ...JSON.parse(saved) };
      }
    } catch {}
    return defaultConfig;
  });

  const [greeSession, setGreeSession] = useState<{
    loggedIn: boolean;
    email: string;
    region: string;
    token: string;
    boundMac: string;
    deviceName: string;
    modelId: string;
  }>(() => {
    const defaultGree = {
      loggedIn: false,
      email: 'rejuanh254@gmail.com',
      region: 'asia',
      token: '',
      boundMac: 'c0393792cb97',
      deviceName: 'Gree AC (Bedroom)',
      modelId: '10001',
    };
    try {
      const saved = localStorage.getItem(STORAGE_KEY_GREE);
      if (saved) {
        return { ...defaultGree, ...JSON.parse(saved) };
      }
    } catch {}
    return defaultGree;
  });

  const [climate, setClimate] = useState<ClimateTelemetry>({
    roomTemp: 27.4,
    roomHumidity: 62.0,
    feelsLike: 29.1,
    targetDelta: 3.4,
    heatIndexStatus: 'warm',
    airQualityPpm: 45,
  });

  const [hardware, setHardware] = useState<HardwareStatus>({
    connected: true,
    ipAddress: '192.168.1.120',
    localPort: 7000,
    rssi: -54,
    lastHeartbeat: new Date().toISOString(),
    firmwareVersion: 'v3.1.0-universal_ac',
    irLedPin: 4,
    dhtPin: 15,
    controlMethod: 'tuya_smart_life',
    deviceModel: 'Tuya_IR_Remote',
  });

  const [power, setPower] = useState<PowerTelemetry>({
    watts: 780,
    voltage: 228.4,
    current: 3.42,
    tonnage: 1.5,
    inverterLoadPercent: 54,
    unitRateBdt: 8.5,
    currency: 'BDT',
    todayKwh: 4.82,
    monthlyKwh: 142.5,
    costBdt: 40.97,
    monthlyCostBdt: 1211.25,
    costUsd: 11.2,
    currentSessionStartTime: null,
    currentSessionDurationMinutes: 0,
    currentSessionKwh: 0,
    currentSessionCostBdt: 0,
    todayRuntimeMinutes: 0,
    turnOnCountToday: 0,
    recentSessions: [],
    dailyHistory: [],
  });

  const [presets, setPresets] = useState<ACPreset[]>([]);
  const [schedules, setSchedules] = useState<ACSchedule[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SCHEDULES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const [logs, setLogs] = useState<IRLogEntry[]>([]);
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LANG);
      if (saved === 'en' || saved === 'bn') return saved;
    } catch {}
    return 'bn';
  });
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isSendingIR, setIsSendingIR] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [isDbSyncing, setIsDbSyncing] = useState<boolean>(false);
  const [dbLastSynced, setDbLastSynced] = useState<string | null>(null);

  // Sync Google Account Auth & restore saved settings from Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
      if (currentUser) {
        try {
          setIsDbSyncing(true);
          const docRef = doc(db, 'users', currentUser.uid, 'settings', 'acState');
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data();
            const savedState: Partial<SmartACState> = {
              isPaired: data.isPaired !== undefined ? Boolean(data.isPaired) : true,
              deviceName: data.deviceName || 'Gree AC',
              deviceModel: data.deviceModel || 'Gree Inverter 1.5T',
              location: data.location || 'Master Bedroom',
              brand: data.brand || 'Gree',
              isOnline: data.isOnline !== undefined ? Boolean(data.isOnline) : true,
              power: Boolean(data.power),
              temperature: Number(data.temperature),
              mode: data.mode || 'cool',
              fanSpeed: data.fanSpeed || 'low',
              turbo: Boolean(data.turbo),
              eco: Boolean(data.eco),
              sleep: Boolean(data.sleep),
              displayLight: Boolean(data.displayLight),
              ionFilter: Boolean(data.ionFilter),
              quiet: Boolean(data.quiet),
              swingV: data.swingV || 'middle',
              swingH: data.swingH || 'right',
            };
            setAc((prev) => {
              const updated = { ...prev, ...savedState, isPaired: true };
              try {
                localStorage.setItem(STORAGE_KEY_AC, JSON.stringify(updated));
              } catch {}
              return updated;
            });
            setDbLastSynced(new Date().toLocaleTimeString());
          } else {
            // First time this Google account signs in: save current AC state as initial settings
            const docRef = doc(db, 'users', currentUser.uid, 'settings', 'acState');
            const initialPayload = {
              userId: currentUser.uid,
              isPaired: ac.isPaired !== undefined ? ac.isPaired : true,
              deviceName: ac.deviceName || 'Gree AC',
              deviceModel: ac.deviceModel || 'Gree Inverter 1.5T',
              location: ac.location || 'Master Bedroom',
              brand: ac.brand || 'Gree',
              isOnline: true,
              power: ac.power,
              temperature: ac.temperature,
              mode: ac.mode,
              fanSpeed: ac.fanSpeed,
              turbo: ac.turbo,
              eco: ac.eco,
              sleep: ac.sleep,
              displayLight: ac.displayLight,
              ionFilter: ac.ionFilter,
              quiet: ac.quiet,
              swingV: ac.swingV,
              swingH: ac.swingH,
              updatedAt: new Date().toISOString(),
            };
            setDoc(docRef, initialPayload, { merge: true })
              .then(() => setDbLastSynced(new Date().toLocaleTimeString()))
              .catch((err) => handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}/settings/acState`));
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `users/${currentUser.uid}/settings/acState`);
        } finally {
          setIsDbSyncing(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY_LANG, lang);
    } catch {}
  };

  const t = translations[language];

  useEffect(() => {
    sound.enabled = soundEnabled;
  }, [soundEnabled]);

  const fetchData = useCallback(async () => {
    try {
      const [stateRes, presetsRes, schedRes, logsRes, dirRes] = await Promise.all([
        fetch('/api/ac/state').catch(() => null),
        fetch('/api/ac/presets').catch(() => null),
        fetch('/api/ac/schedules').catch(() => null),
        fetch('/api/ac/logs').catch(() => null),
        fetch('/api/ac/direct-config').catch(() => null),
      ]);

      if (stateRes && stateRes.ok) {
        const d = await stateRes.json();
        if (d.success) {
          // Check if local storage has a paired device that needs syncing to server
          const localSaved = localStorage.getItem(STORAGE_KEY_AC);
          let parsedLocal: SmartACState | null = null;
          try {
            if (localSaved) parsedLocal = JSON.parse(localSaved);
          } catch {}

          if (!d.state.isPaired && parsedLocal && parsedLocal.isPaired) {
            const localSchedRaw = localStorage.getItem(STORAGE_KEY_SCHEDULES);
            let localScheds: ACSchedule[] | undefined = undefined;
            try {
              if (localSchedRaw) localScheds = JSON.parse(localSchedRaw);
            } catch {}

            // Restore local state to server
            fetch('/api/ac/sync-client', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ clientState: parsedLocal, clientSchedules: localScheds }),
            }).catch(() => {});
            setAc(parsedLocal);
          } else {
            setAc(d.state);
            try {
              localStorage.setItem(STORAGE_KEY_AC, JSON.stringify(d.state));
            } catch {}
          }

          setClimate(d.climate);
          setPower(d.power);
          setHardware(d.hardware);
          if (d.directConfig) {
            setDirectConfig(d.directConfig);
            try {
              localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(d.directConfig));
            } catch {}
          }
        }
      } else {
        // Fallback for Vercel/Static hosting where backend is not running
        const localSaved = localStorage.getItem(STORAGE_KEY_AC);
        if (localSaved) {
          try {
            const parsed = JSON.parse(localSaved);
            if (parsed && typeof parsed === 'object') {
              setAc((prev) => ({ ...prev, ...parsed, isPaired: parsed.isPaired !== undefined ? parsed.isPaired : true }));
            }
          } catch {}
        } else {
          setAc(DEFAULT_AC_STATE);
          try {
            localStorage.setItem(STORAGE_KEY_AC, JSON.stringify(DEFAULT_AC_STATE));
          } catch {}
        }
      }
      if (presetsRes && presetsRes.ok) {
        const p = await presetsRes.json();
        if (p.success) setPresets(p.presets);
      }
      if (schedRes && schedRes.ok) {
        const s = await schedRes.json();
        if (s.success && Array.isArray(s.schedules)) {
          const userHasModified = localStorage.getItem(STORAGE_KEY_SCHEDULES_MODIFIED) === 'true';
          const localSaved = localStorage.getItem(STORAGE_KEY_SCHEDULES);
          let parsedLocal: ACSchedule[] | null = null;
          try {
            if (localSaved) parsedLocal = JSON.parse(localSaved);
          } catch {}

          if (userHasModified && Array.isArray(parsedLocal)) {
            // User has customized/deleted schedules locally: keep client version and sync to server
            const localStr = JSON.stringify(parsedLocal);
            const serverStr = JSON.stringify(s.schedules);
            if (localStr !== serverStr) {
              fetch('/api/ac/schedules/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ schedules: parsedLocal }),
              }).catch(() => {});
            }
            setSchedules(parsedLocal);
          } else {
            setSchedules(s.schedules);
            persistSchedulesLocally(s.schedules, false);
          }
        }
      }
      if (logsRes && logsRes.ok) {
        const l = await logsRes.json();
        if (l.success) setLogs(l.logs);
      }
      if (dirRes && dirRes.ok) {
        const dc = await dirRes.json();
        if (dc.success) setDirectConfig(dc.directConfig);
      }

      // If logged in with Gree Cloud, trigger a cloud poll simulation occasionally
      if (greeSession.loggedIn && Math.random() < 0.2) {
        fetch('/api/gree-cloud/sync', { method: 'POST' }).catch(() => {});
      }
    } catch {}
  }, [greeSession.loggedIn]);

  useEffect(() => {
    fetchData();

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/events');

      eventSource.addEventListener('ac_state_changed', (e: MessageEvent) => {
        try {
          const newAc = JSON.parse(e.data);
          setAc(newAc);
          localStorage.setItem(STORAGE_KEY_AC, JSON.stringify(newAc));
        } catch {}
      });

      eventSource.addEventListener('climate_updated', (e: MessageEvent) => {
        try {
          const newClimate = JSON.parse(e.data);
          setClimate(newClimate);
        } catch {}
      });

      eventSource.addEventListener('power_updated', (e: MessageEvent) => {
        try {
          const newPower = JSON.parse(e.data);
          setPower(newPower);
        } catch {}
      });

      eventSource.addEventListener('hardware_updated', (e: MessageEvent) => {
        try {
          const newHw = JSON.parse(e.data);
          setHardware(newHw);
        } catch {}
      });

      eventSource.addEventListener('ir_blasted', (e: MessageEvent) => {
        try {
          const logEntry = JSON.parse(e.data);
          setLogs((prev) => [logEntry, ...prev.slice(0, 40)]);
        } catch {}
      });

      eventSource.addEventListener('direct_config_updated', (e: MessageEvent) => {
        try {
          const newDc = JSON.parse(e.data);
          setDirectConfig(newDc);
          localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(newDc));
        } catch {}
      });

      eventSource.addEventListener('schedules_updated', (e: MessageEvent) => {
        try {
          const updatedScheds = JSON.parse(e.data);
          if (Array.isArray(updatedScheds)) {
            setSchedules(updatedScheds);
            persistSchedulesLocally(updatedScheds, true);
          }
        } catch {}
      });
    } catch {}

    const interval = setInterval(fetchData, 6000);

    // Sync client's real local timezone offset to server on load
    try {
      fetch('/api/ac/timezone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offsetMinutes: new Date().getTimezoneOffset() }),
      }).catch(() => {});
    } catch {}

    return () => {
      clearInterval(interval);
      if (eventSource) eventSource.close();
    };
  }, [fetchData]);

  // Client-side Schedule Fallback Runner (guarantees real-time execution in browser)
  const clientTriggeredMapRef = useRef<Record<string, string>>({});
  useEffect(() => {
    const schedTimer = setInterval(() => {
      const now = new Date();
      const curHour = String(now.getHours()).padStart(2, '0');
      const curMin = String(now.getMinutes()).padStart(2, '0');
      const curTime = `${curHour}:${curMin}`;
      const curDay = now.getDay();
      const curKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}_${curTime}`;

      schedules.forEach((s) => {
        const timeParts = (s.time || '').split(':');
        const normTime = timeParts.length === 2
          ? `${timeParts[0].padStart(2, '0')}:${timeParts[1].padStart(2, '0')}`
          : s.time;

        if (s.enabled && s.days.includes(curDay) && normTime === curTime) {
          if (clientTriggeredMapRef.current[s.id] !== curKey) {
            clientTriggeredMapRef.current[s.id] = curKey;
            console.log(`[CLIENT_SCHEDULE_EXEC] Triggering schedule "${s.name}" at ${curTime}`);
            if (s.power) {
              updateAC({
                power: true,
                temperature: s.temperature || 25,
                mode: s.mode || 'cool',
                fanSpeed: s.fanSpeed || 'auto',
                turbo: s.turbo ?? false,
                eco: s.eco ?? false,
                health: s.health ?? false,
                displayLight: s.displayLight ?? true,
                timerOffMinutes: s.autoOffMinutes || 0,
              });
            } else {
              updateAC({ power: false, timerOffMinutes: 0 });
            }
          }
        }
      });
    }, 4000);

    return () => clearInterval(schedTimer);
  }, [schedules]);

  const triggerIRVisual = () => {
    setIsSendingIR(true);
    sound.playClick(true);
    setTimeout(() => setIsSendingIR(false), 800);
  };

  const updateAC = async (updates: Partial<SmartACState>) => {
    triggerIRVisual();
    setAc((prev) => {
      const merged = { ...prev, ...updates };
      try {
        localStorage.setItem(STORAGE_KEY_AC, JSON.stringify(merged));
      } catch {}
      return merged;
    });

    try {
      const res = await fetch('/api/ac/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const d = await res.json();
        if (d.success) {
          setAc((prev) => {
            const merged = { ...prev, ...d.state };
            try {
              localStorage.setItem(STORAGE_KEY_AC, JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      }
    } catch {}

    // Automatically sync updated settings to Firestore for the signed-in Google account
    if (auth.currentUser) {
      try {
        const docRef = doc(db, 'users', auth.currentUser.uid, 'settings', 'acState');
        const stateToSave = {
          userId: auth.currentUser.uid,
          power: updates.power !== undefined ? updates.power : ac.power,
          temperature: updates.temperature !== undefined ? updates.temperature : ac.temperature,
          mode: updates.mode !== undefined ? updates.mode : ac.mode,
          fanSpeed: updates.fanSpeed !== undefined ? updates.fanSpeed : ac.fanSpeed,
          turbo: updates.turbo !== undefined ? updates.turbo : ac.turbo,
          eco: updates.eco !== undefined ? updates.eco : ac.eco,
          sleep: updates.sleep !== undefined ? updates.sleep : ac.sleep,
          displayLight: updates.displayLight !== undefined ? updates.displayLight : ac.displayLight,
          ionFilter: updates.ionFilter !== undefined ? updates.ionFilter : ac.ionFilter,
          quiet: updates.quiet !== undefined ? updates.quiet : ac.quiet,
          swingV: updates.swingV !== undefined ? updates.swingV : ac.swingV,
          swingH: updates.swingH !== undefined ? updates.swingH : ac.swingH,
          brand: ac.brand || 'Gree',
          deviceName: ac.deviceName || 'Gree AC',
          updatedAt: new Date().toISOString(),
        };
        setDoc(docRef, stateToSave, { merge: true })
          .then(() => {
            setDbLastSynced(new Date().toLocaleTimeString());
          })
          .catch((err) => {
            handleFirestoreError(err, OperationType.WRITE, `users/${auth.currentUser?.uid}/settings/acState`);
          });
      } catch (err) {
        console.error('[FIRESTORE_SYNC_ERR]', err);
      }
    }
  };

  const pairDevice = async (data: {
    brand: ACBrand;
    deviceName: string;
    deviceModel: string;
    location: string;
    method: ConnectionMethod;
    ipOrId?: string;
  }) => {
    sound.playChime();
    const newAcState: SmartACState = {
      ...DEFAULT_AC_STATE,
      id: `ac_${Date.now()}`,
      isPaired: true,
      brand: data.brand,
      deviceName: data.deviceName,
      deviceModel: data.deviceModel,
      location: data.location,
      isOnline: true,
      power: true,
      temperature: 24,
      mode: 'cool',
      fanSpeed: 'auto',
      lastUpdated: new Date().toISOString(),
    };

    const newConfig: Partial<DirectConnectionConfig> = {
      activeMethod: data.method,
      connected: true,
      lastSync: new Date().toISOString(),
      lastStatusMessage: `Connected real ${data.brand} AC (${data.deviceName})`,
    };

    if (data.method === 'built_in_wifi' && data.ipOrId) {
      newConfig.acLocalIp = data.ipOrId;
    } else if (data.method === 'tuya_smart_life' && data.ipOrId) {
      newConfig.tuyaDeviceId = data.ipOrId;
    } else if (data.method === 'broadlink' && data.ipOrId) {
      newConfig.broadlinkIp = data.ipOrId;
    }

    setAc(newAcState);
    try {
      localStorage.setItem(STORAGE_KEY_AC, JSON.stringify(newAcState));
    } catch {}

    try {
      await fetch('/api/ac/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: data.brand,
          deviceName: data.deviceName,
          deviceModel: data.deviceModel,
          location: data.location,
          method: data.method,
          ipOrId: data.ipOrId,
        }),
      });
    } catch {}

    await updateDirectConfig(newConfig);
  };

  const unpairDevice = async () => {
    sound.playClick(false);
    const resetAc: SmartACState = {
      ...DEFAULT_AC_STATE,
      id: '',
      isPaired: false,
      deviceName: '',
      deviceModel: '',
      location: '',
      isOnline: false,
      power: false,
      lastUpdated: new Date().toISOString(),
    };
    setAc(resetAc);
    try {
      localStorage.removeItem(STORAGE_KEY_AC);
      localStorage.setItem(STORAGE_KEY_AC, JSON.stringify(resetAc));
      localStorage.removeItem(STORAGE_KEY_GREE);
    } catch {}

    setGreeSession({
      loggedIn: false,
      email: '',
      region: 'asia',
      token: '',
      boundMac: '',
      deviceName: '',
      modelId: '',
    });

    const resetConfig: DirectConnectionConfig = {
      activeMethod: 'gree_cloud',
      greeEmail: 'rejuanh254@gmail.com',
      greeRegion: 'asia',
      greeDeviceMac: 'c0393792cb97',
      tuyaDeviceId: '',
      tuyaLocalKey: '',
      tuyaCloudClientId: '',
      tuyaCloudSecret: '',
      tuyaRegion: 'us',
      acLocalIp: '',
      acPort: 7000,
      acKey: '',
      broadlinkIp: '',
      broadlinkMac: '',
      webhookUrl: '',
      haAccessToken: '',
      haEntityId: '',
      connected: false,
      lastSync: '',
      lastStatusMessage: 'No real AC device configured yet',
    };
    setDirectConfig(resetConfig);
    try {
      localStorage.removeItem(STORAGE_KEY_CONFIG);
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(resetConfig));
    } catch {}

    try {
      await fetch('/api/ac/unpair', { method: 'POST' });
    } catch {}
  };

  const setDeviceMetadata = async (deviceName: string, deviceModel: string, location: string) => {
    sound.playChime();
    await updateAC({ deviceName, deviceModel, location });
  };

  const toggleDeviceOnline = async (isOnline?: boolean) => {
    sound.playClick(true);
    const target = isOnline !== undefined ? isOnline : !ac.isOnline;
    await updateAC({ isOnline: target });
  };

  const updateDirectConfig = async (updates: Partial<DirectConnectionConfig>) => {
    sound.playChime();
    setDirectConfig((prev) => {
      const merged = { ...prev, ...updates };
      try {
        localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(merged));
      } catch {}
      return merged;
    });
    try {
      const res = await fetch('/api/ac/direct-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const d = await res.json();
        if (d.success) {
          setDirectConfig((prev) => {
            const merged = { ...prev, ...d.directConfig };
            try {
              localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      }
    } catch {}
  };

  const updatePowerSettings = async (updates: { unitRateBdt?: number; currency?: string }) => {
    sound.playChime();
    try {
      const res = await fetch('/api/ac/power-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const d = await res.json();
        if (d.success) {
          setPower(d.power);
        }
      }
    } catch {}
  };

  const setConnectionMethod = async (method: ConnectionMethod) => {
    await updateDirectConfig({ activeMethod: method });
  };

  const togglePower = async () => {
    const nextPower = !ac.power;
    triggerIRVisual();
    if (nextPower) sound.playChime();
    else sound.playClick(false);

    await updateAC({ power: nextPower });
  };

  const setTemperature = async (temp: number) => {
    const clamped = Math.max(16, Math.min(30, temp));
    await updateAC({ temperature: clamped, power: true });
  };

  const stepTemperature = async (delta: number) => {
    const next = Math.max(16, Math.min(30, ac.temperature + delta));
    await setTemperature(next);
  };

  const setMode = async (mode: ACMode) => {
    await updateAC({ mode, power: true });
  };

  const setFanSpeed = async (fanSpeed: ACFanSpeed) => {
    const isQuiet = fanSpeed === 'quiet';
    const isTurbo = fanSpeed === 'turbo';
    await updateAC({
      fanSpeed,
      quiet: isQuiet,
      turbo: isTurbo,
      power: true,
    });
  };

  const setBrand = async (brand: ACBrand) => {
    sound.playChime();
    await updateAC({ brand });
  };

  const toggleTurbo = async () => {
    await updateAC({ turbo: !ac.turbo, eco: false, power: true });
  };

  const toggleEco = async () => {
    await updateAC({ eco: !ac.eco, turbo: false, power: true });
  };

  const toggleSleep = async () => {
    await updateAC({ sleep: !ac.sleep, power: true });
  };

  const toggleDisplayLight = async () => {
    await updateAC({ displayLight: !ac.displayLight });
  };

  const toggleIonizer = async () => {
    const nextVal = !ac.ionFilter;
    await updateAC({ ionFilter: nextVal, health: nextVal });
  };

  const toggleHealth = toggleIonizer;

  const toggleAutoClean = async () => {
    sound.playChime();
    const nextVal = !ac.autoClean;
    await updateAC({ autoClean: nextVal });
  };

  const startCleanCycle = async () => {
    sound.playChime();
    triggerIRVisual();
    try {
      const res = await fetch('/api/ac/clean-cycle/start', { method: 'POST' });
      if (res.ok) {
        const d = await res.json();
        if (d.success && d.state) {
          setAc(d.state);
        }
      }
    } catch (e) {
      console.error('Failed to start clean cycle:', e);
    }
  };

  const cancelCleanCycle = async () => {
    sound.playClick(false);
    triggerIRVisual();
    try {
      const res = await fetch('/api/ac/clean-cycle/cancel', { method: 'POST' });
      if (res.ok) {
        const d = await res.json();
        if (d.success && d.state) {
          setAc(d.state);
        }
      }
    } catch (e) {
      console.error('Failed to cancel clean cycle:', e);
    }
  };

  const resetFilterClean = async () => {
    sound.playChime();
    try {
      const res = await fetch('/api/ac/filter-clean-reset', { method: 'POST' });
      if (res.ok) {
        const d = await res.json();
        if (d.success && d.state) {
          setAc(d.state);
        }
      }
    } catch {}
  };

  const setStepTimer = async (config: Partial<MultiStageTimer>) => {
    try {
      sound.playClick(true);
      const res = await fetch('/api/ac/step-timer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        const d = await res.json();
        if (d.success && d.state) {
          setAc((prev) => ({ ...prev, ...d.state, multiStageTimer: d.multiStageTimer }));
        }
      }
    } catch (e) {
      console.error('Failed to set step timer:', e);
    }
  };

  const cancelStepTimer = async () => {
    try {
      sound.playClick(false);
      const res = await fetch('/api/ac/step-timer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: false }),
      });
      if (res.ok) {
        const d = await res.json();
        if (d.success) {
          setAc((prev) => ({ ...prev, multiStageTimer: d.multiStageTimer }));
        }
      }
    } catch (e) {
      console.error('Failed to cancel step timer:', e);
    }
  };

  const jumpToStage = async (stageIndex: number) => {
    try {
      sound.playClick(true);
      const res = await fetch('/api/ac/jump-stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageIndex }),
      });
      if (res.ok) {
        const d = await res.json();
        if (d.success && d.state) {
          setAc((prev) => ({ ...prev, ...d.state, multiStageTimer: d.multiStageTimer }));
        }
      }
    } catch (e) {
      console.error('Failed to jump stage:', e);
    }
  };

  const adjustStepTimerTime = async (options: {
    deltaMinutes?: number;
    stageIndex?: number;
    durationMinutes?: number;
    temperature?: number;
    fanSpeed?: string;
    displayLight?: boolean;
  }) => {
    try {
      sound.playClick(true);
      const res = await fetch('/api/ac/step-timer/adjust-time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      });
      if (res.ok) {
        const d = await res.json();
        if (d.success && d.state) {
          setAc((prev) => ({ ...prev, ...d.state, multiStageTimer: d.multiStageTimer }));
        }
      }
    } catch (e) {
      console.error('Failed to adjust step timer time:', e);
    }
  };

  const toggleQuiet = async () => {
    const nextQuiet = !(ac.quiet || ac.fanSpeed === 'quiet');
    await updateAC({
      quiet: nextQuiet,
      fanSpeed: nextQuiet ? 'quiet' : (ac.fanSpeed === 'quiet' ? 'low' : ac.fanSpeed || 'low'),
      turbo: false,
      power: true,
    });
  };

  const toggleLock = async () => {
    sound.playLockSound(!ac.locked);
    await updateAC({ locked: !ac.locked });
  };

  const activatePreset = async (id: string) => {
    sound.playChime();
    triggerIRVisual();
    try {
      const res = await fetch(`/api/ac/presets/${id}/activate`, { method: 'POST' });
      if (res.ok) {
        const d = await res.json();
        if (d.success) setAc(d.state);
      }
    } catch {}
  };

  const toggleSchedule = async (id: string) => {
    sound.playClick(true);
    let nextList: ACSchedule[] = [];
    setSchedules((prev) => {
      nextList = prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s));
      persistSchedulesLocally(nextList, true);
      return nextList;
    });
    try {
      const res = await fetch(`/api/ac/schedules/${id}/toggle`, { method: 'POST' });
      if (res.ok) {
        const d = await res.json();
        if (d.schedules && Array.isArray(d.schedules)) {
          setSchedules(d.schedules);
          persistSchedulesLocally(d.schedules, true);
        }
      }
    } catch {}
  };

  const addSchedule = async (sched: Omit<ACSchedule, 'id'>) => {
    sound.playChime();
    let rawTime = sched.time || '23:00';
    const tParts = rawTime.split(':');
    if (tParts.length === 2) {
      rawTime = `${tParts[0].padStart(2, '0')}:${tParts[1].padStart(2, '0')}`;
    }

    const newId = (sched as any).id || `sched-${Date.now()}`;
    const newSchedule: ACSchedule = {
      ...sched,
      id: newId,
      time: rawTime,
      enabled: sched.enabled ?? true,
    };

    // Instant optimistic update + persistent local storage save
    let nextList: ACSchedule[] = [];
    setSchedules((prev) => {
      const filtered = prev.filter((s) => s.id !== newId);
      nextList = [...filtered, newSchedule];
      persistSchedulesLocally(nextList, true);
      return nextList;
    });

    try {
      const res = await fetch('/api/ac/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newSchedule,
          timezoneOffset: new Date().getTimezoneOffset(),
        }),
      });
      if (res.ok) {
        const d = await res.json();
        if (d.schedules && Array.isArray(d.schedules)) {
          setSchedules(d.schedules);
          persistSchedulesLocally(d.schedules, true);
        }
      } else {
        fetch('/api/ac/schedules/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ schedules: nextList }),
        }).catch(() => {});
      }
    } catch (e) {
      console.warn('Network error adding schedule, saved locally:', e);
    }
  };

  const updateSchedule = async (id: string, sched: Partial<ACSchedule>) => {
    sound.playClick();
    let nextList: ACSchedule[] = [];
    setSchedules((prev) => {
      nextList = prev.map((s) => (s.id === id ? { ...s, ...sched } : s));
      persistSchedulesLocally(nextList, true);
      return nextList;
    });
    try {
      const res = await fetch(`/api/ac/schedules/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...sched,
          timezoneOffset: new Date().getTimezoneOffset(),
        }),
      });
      if (res.ok) {
        const d = await res.json();
        if (d.schedules && Array.isArray(d.schedules)) {
          setSchedules(d.schedules);
          persistSchedulesLocally(d.schedules, true);
        }
      }
    } catch {}
  };

  const deleteSchedule = async (id: string) => {
    sound.playClick(false);
    let nextList: ACSchedule[] = [];
    setSchedules((prev) => {
      nextList = prev.filter((s) => s.id !== id);
      persistSchedulesLocally(nextList, true);
      return nextList;
    });

    try {
      const res = await fetch(`/api/ac/schedules/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const d = await res.json();
        if (d.schedules && Array.isArray(d.schedules)) {
          setSchedules(d.schedules);
          persistSchedulesLocally(d.schedules, true);
        }
      } else {
        fetch('/api/ac/schedules/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ schedules: nextList }),
        }).catch(() => {});
      }
    } catch (e) {
      console.warn('Network error deleting schedule, deleted locally:', e);
    }
  };

  const runScheduleNow = async (id: string): Promise<boolean> => {
    try {
      sound.playChime();
      triggerIRVisual();
      const res = await fetch(`/api/ac/schedules/${id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const d = await res.json();
        if (d.success && d.state) {
          setAc(d.state);
        }
        return true;
      }
    } catch (e) {
      console.error('Failed to run schedule manually:', e);
    }
    return false;
  };

  const loginGreeCloud = async (credentials: {
    email: string;
    password?: string;
    region?: string;
    mac?: string;
  }): Promise<{ success: boolean; message: string; error?: string }> => {
    sound.playChime();
    try {
      const res = await fetch('/api/gree-cloud/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password || 'cloud_auth_pass',
          region: credentials.region || 'asia',
          mac: credentials.mac || 'c0393792cb97',
        }),
      });

      const text = await res.text();
      let d;
      try {
        d = JSON.parse(text);
      } catch (e) {
        return { success: false, message: language === 'bn' ? 'সার্ভার থেকে ভুল তথ্য এসেছে' : 'Server returned invalid response' };
      }

      if (res.ok && d.success) {
        const sessionData = {
          loggedIn: true,
          email: d.session.email,
          region: d.session.region,
          token: d.session.token,
          boundMac: d.session.boundMac,
          deviceName: d.session.deviceName,
          modelId: d.session.modelId,
        };
        setGreeSession(sessionData);
        try {
          localStorage.setItem(STORAGE_KEY_GREE, JSON.stringify(sessionData));
        } catch {}

        // Note: The server already updates and broadcasts the new AC state via SSE.
        // We don't need to call updateAC or updateDirectConfig manually here
        // to avoid race conditions and fake data showing up before real sync.

        return {
          success: true,
          message: d.messageBn || d.message || 'Gree Cloud connected successfully!',
        };
      } else {
        return {
          success: false,
          message: d.errorBn || d.error || 'Failed to authenticate with Gree Cloud',
          error: d.error,
        };
      }
    } catch (err: any) {
      console.error('Login error in context:', err);
      return {
        success: false,
        message: language === 'bn' 
          ? `কানেকশন এরর: ${err.message}` 
          : `Connection error: ${err.message}`,
        error: err.message,
      };
    }
  };

  const logoutGreeCloud = async () => {
    sound.playClick(false);
    try {
      await fetch('/api/gree-cloud/logout', { method: 'POST' });
    } catch {}
    setGreeSession((prev) => ({ ...prev, loggedIn: false, token: '' }));
    try {
      localStorage.removeItem(STORAGE_KEY_GREE);
    } catch {}
    await updateDirectConfig({ connected: false, greeCloudToken: '' });
  };

  const testIrBlast = async (): Promise<boolean> => {
    triggerIRVisual();
    try {
      const res = await fetch('/api/ac/hardware/test-ir', { method: 'POST' });
      return res.ok;
    } catch {
      return false;
    }
  };

  const testDirectConnection = async (method?: ConnectionMethod): Promise<boolean> => {
    triggerIRVisual();
    try {
      const res = await fetch('/api/ac/direct-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: method || directConfig.activeMethod }),
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  // Dedicated AC Natural Language Voice Parser (Bangla & English)
  const processACVoiceCommand = (transcript: string): { success: boolean; reply: string } => {
    const raw = transcript.toLowerCase().trim();

    if (
      raw.includes('এসি বন্ধ') ||
      raw.includes('এসি অফ') ||
      raw.includes('বন্ধ করো') ||
      raw.includes('turn off ac') ||
      raw.includes('stop ac') ||
      raw.includes('ac off')
    ) {
      updateAC({ power: false });
      return {
        success: true,
        reply: language === 'bn' ? 'এসি সফলভাবে বন্ধ করা হয়েছে।' : 'Air Conditioner turned off.',
      };
    }

    if (
      raw.includes('এসি অন') ||
      raw.includes('এসি চালু') ||
      raw.includes('চালু করো') ||
      raw.includes('turn on ac') ||
      raw.includes('start ac') ||
      raw.includes('ac on')
    ) {
      updateAC({ power: true });
      return {
        success: true,
        reply: language === 'bn' ? 'এসি চালু করা হয়েছে।' : 'Air Conditioner turned on.',
      };
    }

    const bnNums: Record<string, number> = {
      '১৬': 16, '১৭': 17, '১৮': 18, '১৯': 19, '২০': 20,
      '২১': 21, '২২': 22, '২৩': 23, '২৪': 24, '২৫': 25,
      '২৬': 26, '২৭': 27, '২৮': 28, '২৯': 29, '৩০': 30,
    };

    let targetTemp: number | null = null;
    for (const [bnStr, val] of Object.entries(bnNums)) {
      if (raw.includes(bnStr)) {
        targetTemp = val;
        break;
      }
    }

    if (!targetTemp) {
      const match = raw.match(/\b(1[6-9]|2[0-9]|30)\b/);
      if (match) targetTemp = parseInt(match[1], 10);
    }

    if (targetTemp) {
      setTemperature(targetTemp);
      return {
        success: true,
        reply:
          language === 'bn'
            ? `এসি ${targetTemp} ডিগ্রিতে সেট করা হয়েছে।`
            : `AC temperature set to ${targetTemp}°C.`,
      };
    }

    if (raw.includes('টার্বো') || raw.includes('চিল') || raw.includes('দ্রুত ঠান্ডা') || raw.includes('turbo')) {
      toggleTurbo();
      return {
        success: true,
        reply: language === 'bn' ? 'টার্বো ফাস্ট কুলিং সক্রিয় করা হয়েছে।' : 'Turbo Chill mode activated.',
      };
    }

    if (raw.includes('ইকো') || raw.includes('সাশ্রয়ী') || raw.includes('eco') || raw.includes('save energy')) {
      toggleEco();
      return {
        success: true,
        reply: language === 'bn' ? 'ইকো বিদ্যুৎ সাশ্রয়ী মোড সক্রিয়।' : 'Eco saving mode activated.',
      };
    }

    if (raw.includes('স্লিপ') || raw.includes('ঘুম') || raw.includes('sleep')) {
      toggleSleep();
      return {
        success: true,
        reply: language === 'bn' ? 'স্লিপ আরামদায়ক মোড সক্রিয়।' : 'Sleep Comfort curve activated.',
      };
    }

    if (raw.includes('হেলথ') || raw.includes('health') || raw.includes('ফিল্টার') || raw.includes('filter') || raw.includes('আয়ন')) {
      toggleHealth();
      return {
        success: true,
        reply: language === 'bn' ? 'হেলথ এয়ার পিউরিফায়ার মোড টগল করা হয়েছে।' : 'Health Air Purifier mode toggled.',
      };
    }

    if (
      raw.includes('ক্লিন') ||
      raw.includes('সেলফ ক্লিন') ||
      raw.includes('অটো ক্লিন') ||
      raw.includes('clean') ||
      raw.includes('self clean') ||
      raw.includes('auto clean') ||
      raw.includes('x-fan') ||
      raw.includes('xfan')
    ) {
      toggleAutoClean();
      return {
        success: true,
        reply:
          language === 'bn'
            ? 'সেলফ ক্লিন (Auto Clean / X-Fan) টগল করা হয়েছে।'
            : 'Self Clean (Auto Clean / X-Fan) toggled.',
      };
    }

    if (raw.includes('লাইট অফ') || raw.includes('লাইট বন্ধ') || raw.includes('light off')) {
      toggleDisplayLight();
      return {
        success: true,
        reply: language === 'bn' ? 'ডিসপ্লে লাইট বন্ধ করা হয়েছে।' : 'AC display light turned off.',
      };
    }

    if (raw.includes('লাইট অন') || raw.includes('লাইট চালু') || raw.includes('light on')) {
      toggleDisplayLight();
      return {
        success: true,
        reply: language === 'bn' ? 'ডিসপ্লে লাইট চালু করা হয়েছে।' : 'AC display light turned on.',
      };
    }

    if (raw.includes('নীরব') || raw.includes('কোয়াইট') || raw.includes('quiet')) {
      toggleQuiet();
      return {
        success: true,
        reply: language === 'bn' ? 'নীরব কুয়াইট ফ্যান মোড সক্রিয়।' : 'Quiet silent mode enabled.',
      };
    }

    if (raw.includes('তাপমাত্রা') || raw.includes('temperature') || raw.includes('গরম কেমন')) {
      return {
        success: true,
        reply:
          language === 'bn'
            ? `রুমের বর্তমান তাপমাত্রা ${climate.roomTemp}°C এবং এসির টার্গেট ${ac.temperature}°C।`
            : `Room temperature is ${climate.roomTemp}°C and AC is set to ${ac.temperature}°C.`,
      };
    }

    return {
      success: false,
      reply:
        language === 'bn'
          ? `কমান্ড বুঝতে পারিনি: "${transcript}"। "এসি ২৪ ডিগ্রিতে দাও" বা "টার্বো মোড দাও" বলুন।`
          : `Command not recognized: "${transcript}". Try "Set AC to 24" or "Turbo mode".`,
    };
  };

  const signInWithGoogle = async () => {
    try {
      sound.playClick();
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error('Google Sign In Error:', error);
      sound.playClick(false);
      if (error?.code === 'auth/unauthorized-domain') {
        alert(
          language === 'bn'
            ? 'Firebase-এ এই ডোমেইনটি অনুমোদিত নয়। অনুগ্রহ করে Firebase Console -> Authentication -> Settings -> Authorized Domains-এ "ac-controler1.vercel.app" যোগ করুন।'
            : 'Unauthorized domain. Please add "ac-controler1.vercel.app" to Firebase Console -> Authentication -> Settings -> Authorized Domains.'
        );
      } else if (error?.code === 'auth/popup-blocked') {
        alert(
          language === 'bn'
            ? 'ব্রাউজারে পপআপ ব্লক করা আছে। অনুগ্রহ করে পপআপ এলাউ (Allow) করুন।'
            : 'Popup blocked by browser. Please allow popups to sign in.'
        );
      } else if (error?.code !== 'auth/popup-closed-by-user') {
        alert(
          language === 'bn'
            ? `সাইন-ইন ত্রুটি: ${error?.message || 'অজানা সমস্যা'}`
            : `Sign in error: ${error?.message || 'Unknown error'}`
        );
      }
    }
  };

  const signOutUser = async () => {
    try {
      sound.playClick();
      await firebaseSignOut(auth);
      setUser(null);
      setDbLastSynced(null);
    } catch (error) {
      console.error('Sign Out Error:', error);
    }
  };

  const saveSettingsToDatabase = async (): Promise<boolean> => {
    if (!auth.currentUser) return false;
    try {
      setIsDbSyncing(true);
      const docRef = doc(db, 'users', auth.currentUser.uid, 'settings', 'acState');
      const payload = {
        userId: auth.currentUser.uid,
        isPaired: ac.isPaired,
        deviceName: ac.deviceName || 'Gree AC',
        deviceModel: ac.deviceModel || 'Gree Inverter 1.5T',
        location: ac.location || 'Master Bedroom',
        brand: ac.brand || 'Gree',
        isOnline: ac.isOnline !== undefined ? ac.isOnline : true,
        power: ac.power,
        temperature: ac.temperature,
        mode: ac.mode,
        fanSpeed: ac.fanSpeed,
        turbo: ac.turbo,
        eco: ac.eco,
        sleep: ac.sleep,
        displayLight: ac.displayLight,
        ionFilter: ac.ionFilter,
        quiet: ac.quiet,
        swingV: ac.swingV,
        swingH: ac.swingH,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(docRef, payload, { merge: true });
      setDbLastSynced(new Date().toLocaleTimeString());
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${auth.currentUser?.uid}/settings/acState`);
      return false;
    } finally {
      setIsDbSyncing(false);
    }
  };

  const loadSettingsFromDatabase = async (): Promise<boolean> => {
    if (!auth.currentUser) return false;
    try {
      setIsDbSyncing(true);
      const docRef = doc(db, 'users', auth.currentUser.uid, 'settings', 'acState');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        const loadedState: Partial<SmartACState> = {
          isPaired: data.isPaired !== undefined ? Boolean(data.isPaired) : true,
          deviceName: data.deviceName || 'Gree AC',
          deviceModel: data.deviceModel || 'Gree Inverter 1.5T',
          location: data.location || 'Master Bedroom',
          brand: data.brand || 'Gree',
          isOnline: data.isOnline !== undefined ? Boolean(data.isOnline) : true,
          power: Boolean(data.power),
          temperature: Number(data.temperature),
          mode: data.mode,
          fanSpeed: data.fanSpeed,
          turbo: Boolean(data.turbo),
          eco: Boolean(data.eco),
          sleep: Boolean(data.sleep),
          displayLight: Boolean(data.displayLight),
          ionFilter: Boolean(data.ionFilter),
          quiet: Boolean(data.quiet),
          swingV: data.swingV,
          swingH: data.swingH,
        };
        setAc((prev) => {
          const merged = { ...prev, ...loadedState, isPaired: true };
          try {
            localStorage.setItem(STORAGE_KEY_AC, JSON.stringify(merged));
          } catch {}
          return merged;
        });
        setDbLastSynced(new Date().toLocaleTimeString());
        await fetch('/api/ac/set', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(loadedState),
        }).catch(() => {});
        return true;
      }
      return false;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${auth.currentUser?.uid}/settings/acState`);
      return false;
    } finally {
      setIsDbSyncing(false);
    }
  };

  return (
    <SmartACContext.Provider
      value={{
        ac,
        climate,
        hardware,
        power,
        presets,
        schedules,
        logs,
        directConfig,
        language,
        setLanguage,
        t,
        soundEnabled,
        setSoundEnabled,
        isSendingIR,
        user,
        isAuthLoading,
        isDbSyncing,
        dbLastSynced,
        signInWithGoogle,
        signOutUser,
        saveSettingsToDatabase,
        loadSettingsFromDatabase,
        greeSession,
        loginGreeCloud,
        logoutGreeCloud,
        pairDevice,
        unpairDevice,
        togglePower,
        setTemperature,
        stepTemperature,
        setMode,
        setFanSpeed,
        setBrand,
        setDeviceMetadata,
        toggleDeviceOnline,
        toggleTurbo,
        toggleEco,
        toggleSleep,
        toggleDisplayLight,
        toggleIonizer,
        toggleHealth,
        toggleAutoClean,
        startCleanCycle,
        cancelCleanCycle,
        resetFilterClean,
        toggleQuiet,
        toggleLock,
        setStepTimer,
        cancelStepTimer,
        jumpToStage,
        adjustStepTimerTime,
        updateAC,
        updateDirectConfig,
        updatePowerSettings,
        setConnectionMethod,
        activatePreset,
        toggleSchedule,
        addSchedule,
        updateSchedule,
        deleteSchedule,
        runScheduleNow,
        testIrBlast,
        testDirectConnection,
        processACVoiceCommand,
        fetchData,
      }}
    >
      {children}
    </SmartACContext.Provider>
  );
};

export const useSmartAC = () => {
  const context = useContext(SmartACContext);
  if (!context) {
    throw new Error('useSmartAC must be used within a SmartACProvider');
  }
  return context;
};
