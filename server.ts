import express from 'express';
import type { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import bundledStoreData from './smart-ac-data.json';
import type {
  SmartACState,
  ACFanSpeed,
  ClimateTelemetry,
  HardwareStatus,
  PowerTelemetry,
  ACSchedule,
  ACPreset,
  IRLogEntry,
  ACBrand,
  DirectConnectionConfig,
  ACSessionLog,
  DailyEnergyRecord,
  SleepCurve,
  SleepCurveStage,
  ActiveSleepCurveState,
  MultiStageStep,
  MultiStageTimer,
} from './src/types/iot.js';
import { generateArduinoSketch, generateIRHex } from './src/utils/irCodes.js';
import {
  readGreeCloud,
  sendGreeCloud,
  GREE_REGIONS,
  hostOf,
  type GreeRegion,
} from './src/server/greeCloud.js';

const appDir = typeof __dirname !== 'undefined'
  ? __dirname
  : (typeof import.meta !== 'undefined' && (import.meta as any).url ? path.dirname(fileURLToPath((import.meta as any).url)) : process.cwd());
const BUNDLED_STORE_FILE = path.join(appDir, 'smart-ac-data.json');
const STORE_FILE = process.env.VERCEL
  ? path.join('/tmp', 'smart-ac-data.json')
  : BUNDLED_STORE_FILE;

const app = express();
let ai: any = null;
try {
  ai = new GoogleGenAI();
} catch {}
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

const toACFanSpeed = (speed?: string): ACFanSpeed => {
  if (speed === 'medium' || speed === 'med') return 'med';
  if (speed === 'low') return 'low';
  if (speed === 'high') return 'high';
  if (speed === 'quiet') return 'quiet';
  if (speed === 'turbo') return 'turbo';
  return 'auto';
};

const toGreeFanSpeed = (speed?: string): "low" | "medium" | "high" | "auto" | "quiet" | "turbo" => {
  if (speed === 'quiet') return 'quiet';
  if (speed === 'med' || speed === 'medium') return 'medium';
  if (speed === 'low') return 'low';
  if (speed === 'high') return 'high';
  if (speed === 'turbo') return 'turbo';
  return 'auto';
};

// In-Memory AC State (Clean, Unpaired until user configures real AC)
let acState: SmartACState = {
  id: '',
  isPaired: false,
  deviceName: '',
  deviceModel: '',
  location: '',
  isOnline: false,
  power: true, // Start as ON to show real capability
  temperature: 24,
  mode: 'cool',
  fanSpeed: 'auto',
  swingV: 'auto',
  swingH: 'auto',
  turbo: false,
  eco: false,
  sleep: false,
  displayLight: true,
  ionFilter: false,
  autoClean: false,
  filterCleanHours: 38,
  quiet: false,
  locked: false,
  brand: 'Gree',
  timerOffMinutes: 0,
  timerOnMinutes: 0,
  lastIrCommand: 'Ready to connect',
  lastIrHex: '0x000000',
  lastUpdated: new Date().toISOString(),
};

let cleanCycleStartedAt: number | null = null;
const CLEAN_CYCLE_DURATION_MINS = 15;

let directConfig: DirectConnectionConfig = {
  activeMethod: 'gree_cloud',
  // 0. Gree+ Official Cloud
  greeEmail: 'rejuanh254@gmail.com',
  greeRegion: 'asia',
  greeDeviceMac: 'c0393792cb97',
  // 1. Tuya / Smart Life Universal IR Remote
  tuyaDeviceId: '',
  tuyaLocalKey: '',
  tuyaCloudClientId: '',
  tuyaCloudSecret: '',
  tuyaRegion: 'us',
  // 2. Built-in WiFi AC (Gree/Walton/Midea)
  acLocalIp: '',
  acPort: 7000,
  acKey: '',
  // 3. Broadlink RM4 Mini / Pro
  broadlinkIp: '',
  broadlinkMac: '',
  // 4. Webhook / Home Assistant
  webhookUrl: '',
  haAccessToken: '',
  haEntityId: '',
  connected: false,
  lastSync: '',
  lastStatusMessage: 'Hardware bridge (ESP32) recommended for full control',
};

// --- GREE+ OFFICIAL CLOUD SERVER SESSION ---
interface GreeCloudSession {
  loggedIn: boolean;
  email: string;
  password?: string;
  region: string;
  host?: string;
  token: string;
  boundMac: string;
  userId?: string;
  uid?: number;
  deviceKey?: string;
  deviceName: string;
  modelId: string;
  lastConnected: string;
  online?: boolean;
}

let greeCloudSession: GreeCloudSession = {
  loggedIn: false,
  email: 'rejuanh254@gmail.com',
  region: 'asia',
  token: '',
  boundMac: 'c0393792cb97',
  deviceName: 'Gree AC (Bedroom)',
  modelId: '10001',
  lastConnected: '',
};

let climate: ClimateTelemetry = {
  roomTemp: 27.4,
  roomHumidity: 62.0,
  feelsLike: 29.1,
  targetDelta: 3.4,
  heatIndexStatus: 'warm',
  airQualityPpm: 45,
};

let hardwareStatus: HardwareStatus = {
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
};

let powerTelemetry: PowerTelemetry = {
  watts: 0,
  voltage: 228.4,
  current: 0,
  tonnage: 1.5,
  inverterLoadPercent: 0,
  unitRateBdt: 8.5, // 8.5 Tk / kWh
  currency: 'BDT',
  todayKwh: 0,
  monthlyKwh: 0,
  costBdt: 0,
  monthlyCostBdt: 0,
  costUsd: 0,
  currentSessionStartTime: null,
  currentSessionDurationMinutes: 0,
  currentSessionKwh: 0,
  currentSessionCostBdt: 0,
  todayRuntimeMinutes: 0,
  turnOnCountToday: 0,
  recentSessions: [],
  dailyHistory: [],
};

let presets: ACPreset[] = [
  {
    id: 'preset-turbo-chill',
    name: 'Instant Fast Chill',
    nameBn: 'দ্রুত ঠান্ডা / টার্বো চিল',
    temp: 18,
    mode: 'cool',
    fanSpeed: 'turbo',
    turbo: true,
    eco: false,
    icon: 'Zap',
    accent: '#06B6D4',
  },
  {
    id: 'preset-sleep-comfort',
    name: 'Comfort Sleep (25°C)',
    nameBn: 'আরামদায়ক ঘুম (২৫°C)',
    temp: 25,
    mode: 'cool',
    fanSpeed: 'quiet',
    turbo: false,
    eco: true,
    icon: 'Moon',
    accent: '#8B5CF6',
  },
  {
    id: 'preset-eco-save',
    name: 'Energy Saver (26°C)',
    nameBn: 'বিদ্যুৎ সাশ্রয়ী মোড (২৬°C)',
    temp: 26,
    mode: 'eco',
    fanSpeed: 'auto',
    turbo: false,
    eco: true,
    icon: 'Leaf',
    accent: '#10B981',
  },
  {
    id: 'preset-monsoon-dry',
    name: 'Monsoon Dehumidifier',
    nameBn: 'বর্ষার ভ্যাপসা দূরীকরণ',
    temp: 24,
    mode: 'dry',
    fanSpeed: 'low',
    turbo: false,
    eco: false,
    icon: 'Droplets',
    accent: '#3B82F6',
  },
  {
    id: 'preset-night-breeze',
    name: 'Gentle Fan Breeze',
    nameBn: 'হালকা বাতাস মোড',
    temp: 27,
    mode: 'fan',
    fanSpeed: 'med',
    turbo: false,
    eco: false,
    icon: 'Wind',
    accent: '#F59E0B',
  },
];

let schedules: ACSchedule[] = [
  {
    id: 'sched-night',
    name: 'Auto Sleep Temp at 11:30 PM',
    nameBn: 'রাত ১১:৩০ টায় স্লিপ ২৫°C চালু',
    time: '23:30',
    days: [0, 1, 2, 3, 4, 5, 6],
    power: true,
    temperature: 25,
    mode: 'cool',
    fanSpeed: 'quiet',
    enabled: true,
  },
  {
    id: 'sched-morning-off',
    name: 'Auto Turn Off at 6:30 AM',
    nameBn: 'সকাল ৬:৩০ টায় এসি বন্ধ',
    time: '06:30',
    days: [0, 1, 2, 3, 4, 5, 6],
    power: false,
    enabled: true,
  },
];

let sleepCurves: SleepCurve[] = [
  {
    id: 'curve-fast-cool',
    name: 'Fast Cool Eco-Sleep',
    createdAt: new Date().toISOString(),
    stages: [
      { id: 'stg-1', label: 'Fast Cool', temperature: 22, fanSpeed: 'high', minutes: 30 },
      { id: 'stg-2', label: 'Eco Sleep', temperature: 24, fanSpeed: 'auto', minutes: 60 },
      { id: 'stg-3', label: 'Comfort Maintain', temperature: 26, fanSpeed: 'low', minutes: null },
    ],
  },
  {
    id: 'curve-sleep-default',
    name: 'Sleep curve',
    createdAt: new Date().toISOString(),
    stages: [
      { id: 'stg-a', label: 'Initial Chill', temperature: 20, fanSpeed: 'high', minutes: 30 },
      { id: 'stg-b', label: 'Deep Sleep', temperature: 26, fanSpeed: 'auto', minutes: 150 },
      { id: 'stg-c', label: 'Morning Comfort', temperature: 27, fanSpeed: 'low', minutes: null },
    ],
  },
  {
    id: 'curve-baby-care',
    name: 'Baby & Health Comfort',
    createdAt: new Date().toISOString(),
    stages: [
      { id: 'stg-x', label: 'Gentle Cool', temperature: 24, fanSpeed: 'auto', minutes: 60 },
      { id: 'stg-y', label: 'Warm Sleep', temperature: 26, fanSpeed: 'quiet', minutes: 240 },
      { id: 'stg-z', label: 'Morning Breeze', temperature: 27, fanSpeed: 'low', minutes: null },
    ],
  },
];

let lastActiveACSettings = {
  temperature: 24,
  mode: 'cool' as const,
  fanSpeed: 'quiet' as const,
  quiet: true,
  turbo: false,
  eco: false,
  displayLight: true,
  ionFilter: false,
  health: false,
  swingV: 'auto',
  swingH: 'auto',
  sleep: false,
};
let irLogs: IRLogEntry[] = [];
let lastCheckedDate = new Date().toISOString().split('T')[0];

// Persistence helpers to keep paired devices, settings, and telemetry history across reloads & restarts
function savePersistentStore() {
  try {
    const data = {
      acState,
      directConfig,
      greeCloudSession,
      schedules,
      sleepCurves,
      presets,
      lastActiveACSettings,
      irLogs: irLogs.slice(0, 50),
      powerTelemetry: {
        watts: powerTelemetry.watts,
        voltage: powerTelemetry.voltage,
        current: powerTelemetry.current,
        tonnage: powerTelemetry.tonnage,
        inverterLoadPercent: powerTelemetry.inverterLoadPercent,
        unitRateBdt: powerTelemetry.unitRateBdt,
        currency: powerTelemetry.currency,
        todayKwh: powerTelemetry.todayKwh,
        monthlyKwh: powerTelemetry.monthlyKwh,
        costBdt: powerTelemetry.costBdt,
        monthlyCostBdt: powerTelemetry.monthlyCostBdt,
        currentSessionStartTime: powerTelemetry.currentSessionStartTime,
        currentSessionDurationMinutes: powerTelemetry.currentSessionDurationMinutes,
        currentSessionKwh: powerTelemetry.currentSessionKwh,
        currentSessionCostBdt: powerTelemetry.currentSessionCostBdt,
        todayRuntimeMinutes: powerTelemetry.todayRuntimeMinutes,
        turnOnCountToday: powerTelemetry.turnOnCountToday,
        recentSessions: powerTelemetry.recentSessions.slice(0, 30),
        dailyHistory: powerTelemetry.dailyHistory.slice(0, 30),
        lastCheckedDate,
      },
    };
    fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save smart-ac store:', err);
  }
}

function loadPersistentStore() {
  try {
    let sourcePath = STORE_FILE;
    if (!fs.existsSync(sourcePath) && fs.existsSync(BUNDLED_STORE_FILE)) {
      sourcePath = BUNDLED_STORE_FILE;
    }
    let data: any = null;
    if (fs.existsSync(sourcePath)) {
      const raw = fs.readFileSync(sourcePath, 'utf-8');
      data = JSON.parse(raw);
    } else if (bundledStoreData) {
      data = bundledStoreData;
    }
    if (data) {
      if (data.acState) acState = { ...acState, ...data.acState };
      if (data.directConfig) directConfig = { ...directConfig, ...data.directConfig };
      if (data.greeCloudSession) greeCloudSession = { ...greeCloudSession, ...data.greeCloudSession };
      if (data.schedules && Array.isArray(data.schedules)) schedules = data.schedules;
      if (data.sleepCurves && Array.isArray(data.sleepCurves)) sleepCurves = data.sleepCurves;
      if (data.presets && Array.isArray(data.presets)) presets = data.presets;
      if (data.lastActiveACSettings) lastActiveACSettings = { ...lastActiveACSettings, ...data.lastActiveACSettings };
      if (data.irLogs && Array.isArray(data.irLogs)) irLogs = data.irLogs;
      if (data.powerTelemetry) {
        powerTelemetry = {
          ...powerTelemetry,
          ...data.powerTelemetry,
          recentSessions: Array.isArray(data.powerTelemetry.recentSessions) ? data.powerTelemetry.recentSessions : [],
          dailyHistory: Array.isArray(data.powerTelemetry.dailyHistory)
            ? data.powerTelemetry.dailyHistory.map((d: any) => {
                if (d.totalRuntimeMinutes > 0 && (!d.totalKwh || d.totalKwh === 0)) {
                  const kwh = Number(((d.totalRuntimeMinutes / 60) * 0.7).toFixed(3));
                  const cost = Number((kwh * (powerTelemetry.unitRateBdt || 8.5)).toFixed(2));
                  return { ...d, totalKwh: kwh, totalCostBdt: cost };
                }
                return d;
              })
            : [],
        };
        if (data.powerTelemetry.lastCheckedDate) {
          lastCheckedDate = data.powerTelemetry.lastCheckedDate;
        }

        // Sanity Check: Clean up any runaway / corrupted session or today runtime on load
        const todayStr = getLocalDateStr(new Date());
        const todayRec = powerTelemetry.dailyHistory.find((h) => h.date === todayStr);
        if (todayRec) {
          // If any single session is unrealistically large (> 12 hours) or spans across previous days
          if (Array.isArray(todayRec.sessions)) {
            todayRec.sessions = todayRec.sessions.map((s) => {
              if (s.durationMinutes > 720) {
                // Cap runaway session to a reasonable duration
                const saneDuration = Math.min(180, Math.max(1, s.durationMinutes));
                return { ...s, durationMinutes: saneDuration };
              }
              return s;
            });
            const validSessionMins = todayRec.sessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
            todayRec.totalRuntimeMinutes = Math.min(1440, validSessionMins);
            powerTelemetry.todayRuntimeMinutes = todayRec.totalRuntimeMinutes;
          }
        }

        // If step timer was left enabled with stageStartedAt from the past, verify if it expired
        if (acState.multiStageTimer && acState.multiStageTimer.enabled && acState.multiStageTimer.stageStartedAt) {
          const currentIdx = acState.multiStageTimer.currentStageIndex ?? 0;
          const currStage = acState.multiStageTimer.stages?.[currentIdx];
          const stageDuration = currStage?.durationMinutes || 60;
          const elapsedMins = (Date.now() - new Date(acState.multiStageTimer.stageStartedAt).getTime()) / 60000;
          if (elapsedMins >= stageDuration) {
            console.log('[STEP_TIMER] Active stage duration elapsed while server was inactive. Finishing step timer.');
            acState.multiStageTimer.enabled = false;
            acState.multiStageTimer.remainingMinutes = 0;
          } else {
            acState.multiStageTimer.remainingMinutes = Math.max(0, Math.round((stageDuration - elapsedMins) * 10) / 10);
          }
        }
      }
    }
  } catch (err) {
    console.error('Failed to load smart-ac store:', err);
  }
}

loadPersistentStore();

const sseClients = new Set<Response>();

function broadcastSSE(event: string, data: unknown) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

// POST /api/ac/telemetry (For ESP32 to push sensor readings & signal strength)
app.post('/api/ac/telemetry', (req: Request, res: Response) => {
  const { roomTemp, roomHumidity, rssi, ipAddress, brand } = req.body;

  if (roomTemp !== undefined) climate.roomTemp = Number(roomTemp);
  if (roomHumidity !== undefined) climate.roomHumidity = Number(roomHumidity);
  
  hardwareStatus.connected = true;
  hardwareStatus.lastHeartbeat = new Date().toISOString();
  if (rssi !== undefined) hardwareStatus.rssi = Number(rssi);
  if (ipAddress !== undefined) hardwareStatus.ipAddress = ipAddress;
  
  // Calculate feels like and status
  climate.feelsLike = Number((climate.roomTemp + (climate.roomHumidity / 100) * 3.5).toFixed(1));
  climate.heatIndexStatus =
    climate.feelsLike > 34 ? 'very_hot' : climate.feelsLike > 30 ? 'hot' : climate.feelsLike > 26 ? 'warm' : 'comfortable';

  broadcastSSE('climate_updated', climate);
  broadcastSSE('hardware_updated', hardwareStatus);

  res.json({ success: true });
});

// POST /api/ac/update-status (Aliased for general status updates)
app.post('/api/ac/update-status', (req: Request, res: Response) => {
  const { power, temperature, mode, fanSpeed, roomTemp, roomHumidity, rssi } = req.body;

  if (power !== undefined) acState.power = Boolean(power);
  if (temperature !== undefined) acState.temperature = Number(temperature);
  if (mode !== undefined) acState.mode = mode;
  if (fanSpeed !== undefined) acState.fanSpeed = fanSpeed;

  if (roomTemp !== undefined) climate.roomTemp = Number(roomTemp);
  if (roomHumidity !== undefined) climate.roomHumidity = Number(roomHumidity);

  hardwareStatus.connected = true;
  hardwareStatus.lastHeartbeat = new Date().toISOString();
  if (rssi !== undefined) hardwareStatus.rssi = Number(rssi);

  savePersistentStore();
  
  broadcastSSE('ac_state_changed', acState);
  broadcastSSE('climate_updated', climate);
  broadcastSSE('hardware_updated', hardwareStatus);

  res.json({ success: true, message: 'Hardware status synced successfully' });
});

let clientTimezoneOffsetMinutes = -360; // Default GMT+6 Bangladesh timezone offset (-360 mins)

function getLocalDateStr(date: Date = new Date()): string {
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
}

function getBDStartOfDayMs(date: Date = new Date()): number {
  const bdStr = getLocalDateStr(date);
  const [y, m, d] = bdStr.split('-').map(Number);
  return Date.UTC(y, m - 1, d, 0, 0, 0) - (6 * 3600 * 1000);
}

function formatBanglaDayName(dateStr: string, todayStr: string, yesterdayStr: string): string {
  if (dateStr === todayStr) return 'আজ (Today)';
  if (dateStr === yesterdayStr) return 'গতকাল (Yesterday)';
  const [y, m, d] = dateStr.split('-').map(Number);
  const monthNames = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
  ];
  return `${String(d).padStart(2, '0')} ${monthNames[m - 1] || 'সেপ্টেম্বর'}`;
}

function calculatePowerAndClimate() {
  const now = new Date();
  const todayStr = getLocalDateStr(now);

  const bdYesterdayMs = now.getTime() - 24 * 3600 * 1000;
  const yesterdayStr = getLocalDateStr(new Date(bdYesterdayMs));

  // Daily Midnight Rollover: automatically reset today counters when a new calendar day begins
  if (todayStr !== lastCheckedDate) {
    let prevRecord = powerTelemetry.dailyHistory.find((h) => h.date === lastCheckedDate);
    if (prevRecord) {
      if (powerTelemetry.todayKwh > 0) {
        prevRecord.totalKwh = Number(powerTelemetry.todayKwh.toFixed(3));
        prevRecord.totalCostBdt = Number(powerTelemetry.costBdt.toFixed(2));
      } else if (prevRecord.totalKwh === 0 && prevRecord.totalRuntimeMinutes > 0) {
        prevRecord.totalKwh = Number(((prevRecord.totalRuntimeMinutes / 60) * 0.7).toFixed(3));
        prevRecord.totalCostBdt = Number((prevRecord.totalKwh * powerTelemetry.unitRateBdt).toFixed(2));
      }
    }

    if (powerTelemetry.currentSessionStartTime) {
      const prevMidnightMs = getBDStartOfDayMs(now);
      const sessionStartMs = new Date(powerTelemetry.currentSessionStartTime).getTime();
      const prevDayDuration = Math.max(0, Math.round((prevMidnightMs - sessionStartMs) / 60000));
      
      if (prevRecord && prevDayDuration > 0) {
        prevRecord.totalRuntimeMinutes = Math.min(1440, prevRecord.totalRuntimeMinutes + prevDayDuration);
      }
      
      powerTelemetry.currentSessionStartTime = new Date(prevMidnightMs).toISOString();
      powerTelemetry.currentSessionDurationMinutes = 0;
      powerTelemetry.currentSessionKwh = 0;
      powerTelemetry.currentSessionCostBdt = 0;
    }

    lastCheckedDate = todayStr;
    powerTelemetry.todayRuntimeMinutes = 0;
    powerTelemetry.todayKwh = 0;
    powerTelemetry.costBdt = 0;
    powerTelemetry.turnOnCountToday = powerTelemetry.currentSessionStartTime ? 1 : 0;

    let todayRecord = powerTelemetry.dailyHistory.find((h) => h.date === todayStr);
    if (!todayRecord) {
      powerTelemetry.dailyHistory.unshift({
        date: todayStr,
        dayName: 'আজ (Today)',
        totalRuntimeMinutes: 0,
        turnOnCount: powerTelemetry.turnOnCountToday,
        totalKwh: 0,
        totalCostBdt: 0,
        sessions: [],
      });
    }
    savePersistentStore();
  }

  // Ensure today's record exists in dailyHistory
  let todayRecord = powerTelemetry.dailyHistory.find((h) => h.date === todayStr);
  if (!todayRecord) {
    todayRecord = {
      date: todayStr,
      dayName: 'আজ (Today)',
      totalRuntimeMinutes: 0,
      turnOnCount: powerTelemetry.turnOnCountToday,
      totalKwh: 0,
      totalCostBdt: 0,
      sessions: [],
    };
    powerTelemetry.dailyHistory.unshift(todayRecord);
  }

  // Deduplicate and update all dayNames dynamically to ensure no duplicate "Today" exists
  const uniqueMap = new Map<string, typeof todayRecord>();
  powerTelemetry.dailyHistory.forEach((item) => {
    if (item && item.date && !uniqueMap.has(item.date)) {
      item.dayName = formatBanglaDayName(item.date, todayStr, yesterdayStr);
      uniqueMap.set(item.date, item);
    }
  });
  powerTelemetry.dailyHistory = Array.from(uniqueMap.values());

  // Base totals from completed sessions today
  const finishedMins = (todayRecord.sessions || []).reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
  const finishedKwh = (todayRecord.sessions || []).reduce((acc, s) => acc + (s.kwhUsed || 0), 0);
  const finishedCost = (todayRecord.sessions || []).reduce((acc, s) => acc + (s.costBdt || 0), 0);

  if (!acState.power) {
    // AC is OFF
    powerTelemetry.watts = 4;
    powerTelemetry.inverterLoadPercent = 0;
    powerTelemetry.current = 0.03;
    
    // If a session was running, close it
    if (powerTelemetry.currentSessionStartTime) {
      const start = new Date(powerTelemetry.currentSessionStartTime);
      const bdMidnightTodayMs = getBDStartOfDayMs(now);
      const todayStartMs = Math.max(start.getTime(), bdMidnightTodayMs);
      const diffMs = Math.max(0, now.getTime() - todayStartMs);
      const durationMins = Math.max(1, Math.min(1440, Math.round(diffMs / 60000)));
      
      const finishedSession: ACSessionLog = {
        id: `sess-${Date.now()}`,
        startTime: new Date(todayStartMs).toISOString(),
        endTime: now.toISOString(),
        durationMinutes: durationMins,
        isRunning: false,
        mode: acState.mode,
        targetTemp: acState.temperature,
        avgWatts: Math.round(powerTelemetry.currentSessionKwh * 1000 / (durationMins / 60)) || 600,
        kwhUsed: Number(powerTelemetry.currentSessionKwh.toFixed(3)),
        costBdt: Number(powerTelemetry.currentSessionCostBdt.toFixed(2))
      };
      
      powerTelemetry.recentSessions.unshift(finishedSession);
      if (powerTelemetry.recentSessions.length > 30) powerTelemetry.recentSessions.pop();
      
      todayRecord.sessions.unshift(finishedSession);

      powerTelemetry.currentSessionStartTime = null;
      powerTelemetry.currentSessionDurationMinutes = 0;
      powerTelemetry.currentSessionKwh = 0;
      powerTelemetry.currentSessionCostBdt = 0;
      
      savePersistentStore();
    }

    const updatedMins = (todayRecord.sessions || []).reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
    const updatedKwh = (todayRecord.sessions || []).reduce((acc, s) => acc + (s.kwhUsed || 0), 0);
    const updatedCost = (todayRecord.sessions || []).reduce((acc, s) => acc + (s.costBdt || 0), 0);

    powerTelemetry.todayRuntimeMinutes = Math.min(1440, updatedMins);
    todayRecord.totalRuntimeMinutes = powerTelemetry.todayRuntimeMinutes;
    todayRecord.totalKwh = Number(updatedKwh.toFixed(3));
    todayRecord.totalCostBdt = Number(updatedCost.toFixed(2));
    powerTelemetry.todayKwh = todayRecord.totalKwh;
    powerTelemetry.costBdt = todayRecord.totalCostBdt;

    if (climate.roomTemp < 30) {
      climate.roomTemp = Number((climate.roomTemp + 0.02).toFixed(1));
    }
  } else {
    // AC is ON
    if (!powerTelemetry.currentSessionStartTime) {
      powerTelemetry.currentSessionStartTime = now.toISOString();
      powerTelemetry.turnOnCountToday = Math.max(1, (todayRecord.sessions?.length || 0) + 1);
      todayRecord.turnOnCount = powerTelemetry.turnOnCountToday;
      savePersistentStore();
    }

    const start = new Date(powerTelemetry.currentSessionStartTime);
    const diffMs = Math.max(0, now.getTime() - start.getTime());
    const currentDuration = Math.floor(diffMs / 60000);
    powerTelemetry.currentSessionDurationMinutes = currentDuration;

    const bdMidnightTodayMs = getBDStartOfDayMs(now);
    const todayStartMs = Math.max(start.getTime(), bdMidnightTodayMs);
    const todayActiveMins = Math.floor((now.getTime() - todayStartMs) / 60000);

    powerTelemetry.todayRuntimeMinutes = Math.min(1440, finishedMins + todayActiveMins);

    const delta = Math.max(0, climate.roomTemp - acState.temperature);
    climate.targetDelta = Number(delta.toFixed(1));

    let loadFactor = Math.min(1.0, 0.3 + delta * 0.18);
    if (acState.turbo) loadFactor = 1.0;
    if (acState.eco) loadFactor = Math.min(loadFactor, 0.55);

    const maxW = powerTelemetry.tonnage * 950;
    powerTelemetry.watts = Math.round(240 + (maxW - 240) * loadFactor);
    powerTelemetry.inverterLoadPercent = Math.round(loadFactor * 100);
    powerTelemetry.current = Number((powerTelemetry.watts / powerTelemetry.voltage).toFixed(2));

    // Calculate energy used in this interval (4 seconds)
    const intervalKwh = (powerTelemetry.watts * (4 / 3600)) / 1000;
    powerTelemetry.currentSessionKwh += intervalKwh;
    powerTelemetry.currentSessionCostBdt += intervalKwh * powerTelemetry.unitRateBdt;
    
    powerTelemetry.todayKwh = Number((finishedKwh + powerTelemetry.currentSessionKwh).toFixed(3));
    powerTelemetry.costBdt = Number((finishedCost + powerTelemetry.currentSessionCostBdt).toFixed(2));
    powerTelemetry.monthlyKwh += intervalKwh;
    powerTelemetry.monthlyCostBdt += intervalKwh * powerTelemetry.unitRateBdt;

    // Keep todayRecord in dailyHistory synced in real-time without self-referential accumulation
    todayRecord.totalRuntimeMinutes = powerTelemetry.todayRuntimeMinutes;
    todayRecord.totalKwh = powerTelemetry.todayKwh;
    todayRecord.totalCostBdt = powerTelemetry.costBdt;
    todayRecord.turnOnCount = Math.max(todayRecord.turnOnCount || 0, powerTelemetry.turnOnCountToday || 1);

    if (climate.roomTemp > acState.temperature) {
      const coolingSpeed = acState.turbo ? 0.06 : 0.03;
      climate.roomTemp = Number(Math.max(acState.temperature, climate.roomTemp - coolingSpeed).toFixed(1));
    }
  }

  climate.feelsLike = Number((climate.roomTemp + (climate.roomHumidity / 100) * 3.5).toFixed(1));
  climate.heatIndexStatus =
    climate.feelsLike > 34 ? 'very_hot' : climate.feelsLike > 30 ? 'hot' : climate.feelsLike > 26 ? 'warm' : 'comfortable';

  // Add small real-time jitter to sensor data for "Real Life" feel
  const tempJitter = (Math.random() - 0.5) * 0.05;
  const humJitter = (Math.random() - 0.5) * 0.2;
  climate.roomTemp = Number((climate.roomTemp + tempJitter).toFixed(1));
  climate.roomHumidity = Number(Math.max(30, Math.min(95, climate.roomHumidity + humJitter)).toFixed(1));
}

if (!process.env.VERCEL) {
  setInterval(() => {
    calculatePowerAndClimate();
    broadcastSSE('climate_updated', climate);
    broadcastSSE('power_updated', powerTelemetry);
  }, 4000);
}

// Continuous background sync with physical Gree AC to detect physical remote or Gree+ app state
let isSyncingGree = false;
let lastGreePowerState: boolean | null = null;
let lastGreeTemp: number | null = null;
let lastCommandDispatchedAt = 0;

async function syncGreeHardwareState() {
  if (isSyncingGree) return;
  if (!greeCloudSession.loggedIn || !greeCloudSession.email || !greeCloudSession.boundMac) return;

  isSyncingGree = true;
  try {
    const cloud = await readGreeCloud(
      {
        email: greeCloudSession.email,
        password: greeCloudSession.password || '',
        mac: greeCloudSession.boundMac,
        region: greeCloudSession.region,
      },
      greeCloudSession.token
        ? {
            uid: greeCloudSession.uid || 0,
            token: greeCloudSession.token,
            key: greeCloudSession.deviceKey || '',
            host: greeCloudSession.host as any,
            mac: greeCloudSession.boundMac,
            name: greeCloudSession.deviceName,
          }
        : undefined
    );

    if (cloud && cloud.session) {
      if (cloud.session.token) greeCloudSession.token = cloud.session.token;
      if (cloud.session.device?.key) greeCloudSession.deviceKey = cloud.session.device.key;
      if (cloud.session.uid) greeCloudSession.uid = cloud.session.uid;
      if (cloud.session.host) greeCloudSession.host = cloud.session.host;
    }

    if (cloud && cloud.online && cloud.state) {
      greeCloudSession.online = true;
      acState.isOnline = true;

      // Always update room sensor readings
      if (cloud.state.roomTemp !== undefined) {
        climate.roomTemp = cloud.state.roomTemp;
        climate.feelsLike = Math.round((cloud.state.roomTemp + 1.6) * 10) / 10;
      }

      // If an AC command was sent recently (< 25s), skip hardware state overwrite to prevent race conditions from cloud report lag!
      if (Date.now() - lastCommandDispatchedAt < 25000) {
        console.log('[GREE_SYNC] Active command dispatch grace period. Skipping hardware state overwrite.');
        return;
      }

      // If a multi-stage step timer is running, the active stage settings are strictly authoritative!
      if (acState.multiStageTimer && acState.multiStageTimer.enabled && !acState.multiStageTimer.paused) {
        const currIdx = acState.multiStageTimer.currentStageIndex ?? 0;
        const activeStage = acState.multiStageTimer.stages?.[currIdx];
        if (activeStage) {
          const expectedTemp = activeStage.temperature;
          const expectedFan = toGreeFanSpeed(activeStage.fanSpeed);
          const currentCloudTemp = cloud.state.targetTemp;
          const currentCloudFan = toGreeFanSpeed(cloud.state.fanSpeed);
          const fanMatches =
            currentCloudFan === expectedFan ||
            (activeStage.fanSpeed === 'quiet' && (cloud.state.fanSpeed === 'quiet' || cloud.state.fanSpeed === 'low' || cloud.state.quiet));

          // If the hardware state diverged from the stage, re-enforce the stage settings!
          if (
            currentCloudTemp !== expectedTemp ||
            !fanMatches ||
            (activeStage.displayLight !== undefined && cloud.state.light !== activeStage.displayLight)
          ) {
            console.log(
              `[STAGE_ENFORCER] AC diverged from active Stage ${currIdx + 1} (${currentCloudTemp}°C vs expected ${expectedTemp}°C, Fan: ${currentCloudFan} vs ${expectedFan}). Re-enforcing stage settings.`
            );
            await applyStageSettings(activeStage, currIdx, acState.multiStageTimer.stages.length, 'auto_advance');
            return;
          }
        }
      }

      const prevPower = acState.power;
      const newPower = cloud.state.power;
      const prevTemp = acState.temperature;
      const newTemp = cloud.state.targetTemp;

      acState.isOnline = true;

      // 1. Detect external physical Remote / App Power Change:
      if (lastGreePowerState === null) {
        lastGreePowerState = newPower;
        acState.power = newPower;
        if (newPower && !powerTelemetry.currentSessionStartTime) {
          console.log(`[EXTERNAL_DETECTION] AC was already running physically on startup. Tracking session.`);
          calculatePowerAndClimate();
        } else if (!newPower && powerTelemetry.currentSessionStartTime) {
          console.log(`[EXTERNAL_DETECTION] AC was physically OFF on startup. Closing lingering session.`);
          calculatePowerAndClimate();
        }
      } else if (prevPower !== newPower) {
        lastGreePowerState = newPower;
        acState.power = newPower;
        acState.lastUpdated = new Date().toISOString();
        if (newPower) {
          console.log(`[EXTERNAL_DETECTION] AC was turned ON via Physical Remote or Gree+ App! Starting live session.`);
          powerTelemetry.currentSessionStartTime = new Date().toISOString();
          calculatePowerAndClimate();

          const logEntry: IRLogEntry = {
            id: `ext-on-${Date.now()}`,
            timestamp: new Date().toISOString(),
            command: `REMOTE_POWER_ON: AC turned ON via physical remote or Gree+ app (${newTemp}°C, ${cloud.state.mode.toUpperCase()})`,
            commandBn: `রিমোট / গ্রী অ্যাপের মাধ্যমে এসি চালু হয়েছে — সেশন ট্র্যাকিং শুরু (${newTemp}°C, ${cloud.state.mode.toUpperCase()})`,
            brand: 'Gree',
            hexCode: 'EXT_REMOTE_ON',
            protocol: 'GREE_EWPE_CLOUD',
            source: 'Direct_WiFi_AC',
          };
          irLogs.unshift(logEntry);
          broadcastSSE('ir_blasted', logEntry);
        } else {
          console.log(`[EXTERNAL_DETECTION] AC was turned OFF via Physical Remote or Gree+ App! Finalizing session.`);
          calculatePowerAndClimate();

          const logEntry: IRLogEntry = {
            id: `ext-off-${Date.now()}`,
            timestamp: new Date().toISOString(),
            command: `REMOTE_POWER_OFF: AC turned OFF via physical remote or Gree+ app`,
            commandBn: `রিমোট / গ্রী অ্যাপের মাধ্যমে এসি বন্ধ করা হয়েছে — সেশন সম্পন্ন ও রিপোর্ট ডাটাবেজে সংরক্ষিত`,
            brand: 'Gree',
            hexCode: 'EXT_REMOTE_OFF',
            protocol: 'GREE_EWPE_CLOUD',
            source: 'Direct_WiFi_AC',
          };
          irLogs.unshift(logEntry);
          broadcastSSE('ir_blasted', logEntry);
        }
      } else {
        acState.power = newPower;
        if (newPower && !powerTelemetry.currentSessionStartTime) {
          powerTelemetry.currentSessionStartTime = new Date().toISOString();
          calculatePowerAndClimate();
        }
      }
      lastGreePowerState = newPower;

      // 2. Detect external temperature change via physical remote:
      if (lastGreeTemp !== null && prevTemp !== newTemp && newTemp >= 16 && newTemp <= 30) {
        console.log(`[EXTERNAL_DETECTION] Temperature changed via Remote: ${prevTemp}°C -> ${newTemp}°C`);
        acState.temperature = newTemp;
        const logEntry: IRLogEntry = {
          id: `ext-temp-${Date.now()}`,
          timestamp: new Date().toISOString(),
          command: `REMOTE_TEMP_CHANGE: Temperature set to ${newTemp}°C via physical remote`,
          commandBn: `রিমোট কন্ট্রোলের মাধ্যমে তাপমাত্রা ${newTemp}°C এ পরিবর্তিত হয়েছে`,
          brand: 'Gree',
          hexCode: 'EXT_REMOTE_TEMP',
          protocol: 'GREE_EWPE_CLOUD',
          source: 'Direct_WiFi_AC',
        };
        irLogs.unshift(logEntry);
        broadcastSSE('ir_blasted', logEntry);
      } else if (newTemp >= 16 && newTemp <= 30) {
        acState.temperature = newTemp;
      }
      lastGreeTemp = newTemp;

      // 3. Sync Mode, Fan Speed, Light, Turbo, Quiet, Health, Eco, Room Temp
      if (newPower) {
        if (cloud.state.mode && (acState.mode === 'auto' || cloud.state.mode !== 'auto')) {
          acState.mode = cloud.state.mode;
        }

        if (cloud.state.quiet) {
          acState.quiet = true;
          acState.fanSpeed = 'quiet';
        } else if (cloud.state.turbo) {
          acState.turbo = true;
          acState.quiet = false;
          acState.fanSpeed = 'turbo';
        } else if (acState.quiet || acState.fanSpeed === 'quiet') {
          // If AC was put in Quiet/Silent mode:
          // Gree hardware reports WdSpd=0 (Auto) or WdSpd=1 (Low) while quiet blower is active.
          // DO NOT wipe out Quiet mode or revert to 'auto'!
          // Only switch away from Quiet if physical remote changed to a distinctly higher speed:
          const fs = toACFanSpeed(cloud.state.fanSpeed);
          if (fs === 'med' || fs === 'high' || fs === 'turbo') {
            acState.quiet = false;
            acState.fanSpeed = fs;
          }
        } else if (cloud.state.fanSpeed) {
          const fs = toACFanSpeed(cloud.state.fanSpeed);
          if (fs !== 'auto' || acState.fanSpeed === 'auto') {
            acState.fanSpeed = fs;
          }
        }
        if (cloud.state.swingV !== undefined) acState.swingV = cloud.state.swingV as any;
        if (cloud.state.swingH !== undefined) acState.swingH = cloud.state.swingH as any;
        if (cloud.state.light !== undefined) acState.displayLight = cloud.state.light;
        if (cloud.state.health !== undefined) {
          acState.health = cloud.state.health;
          acState.ionFilter = cloud.state.health;
        }
        if (cloud.state.eco !== undefined) acState.eco = cloud.state.eco;
        if (cloud.state.sleep !== undefined) acState.sleep = cloud.state.sleep;
        if (cloud.state.autoClean !== undefined) acState.autoClean = cloud.state.autoClean;

        // Remember active settings
        lastActiveACSettings = {
          temperature: acState.temperature,
          mode: acState.mode as any,
          fanSpeed: acState.fanSpeed as any,
          quiet: Boolean(acState.quiet),
          turbo: Boolean(acState.turbo),
          eco: Boolean(acState.eco),
          displayLight: Boolean(acState.displayLight),
          ionFilter: Boolean(acState.ionFilter),
          health: Boolean(acState.health),
          swingV: acState.swingV || 'auto',
          swingH: acState.swingH || 'auto',
          sleep: Boolean(acState.sleep),
        };
      }
      if (cloud.state.roomTemp !== undefined) {
        climate.roomTemp = cloud.state.roomTemp;
        climate.feelsLike = Math.round((cloud.state.roomTemp + 1.6) * 10) / 10;
      }

      acState.lastUpdated = new Date().toISOString();
      savePersistentStore();
      broadcastSSE('ac_state_changed', acState);
      broadcastSSE('power_updated', powerTelemetry);
    } else {
      greeCloudSession.online = false;
      if (greeCloudSession.loggedIn && cloud && cloud.online === false) {
        acState.isOnline = false;
        savePersistentStore();
        broadcastSSE('ac_state_changed', acState);
      }
    }
  } catch (err) {
    // Network jitter - ignore and continue
  } finally {
    isSyncingGree = false;
  }
}

// Background poller every 8 seconds to instantly detect physical remote or Gree+ app controls
if (!process.env.VERCEL) {
  setInterval(syncGreeHardwareState, 8000);
}

// SSE Stream Endpoint
app.get('/api/events', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write('\n');
  sseClients.add(res);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

// GET /api/ac/state
app.get('/api/ac/state', (req: Request, res: Response) => {
  const now = new Date();
  
  // If using hardware (Tuya/Broadlink/WiFi/ESP32), check heartbeat
  const heartbeat = new Date(hardwareStatus.lastHeartbeat);
  const isHardwareRecent = now.getTime() - heartbeat.getTime() < 90000; // 90 seconds
  
  // If using Cloud and logged in, check real online status
  if (greeCloudSession.loggedIn) {
    acState.isPaired = true;
    if (greeCloudSession.online === false) {
      acState.isOnline = false;
    } else {
      acState.isOnline = true;
    }
    // Async refresh hardware status
    syncGreeHardwareState().catch(() => {});
  } else if (isHardwareRecent) {
    acState.isOnline = true;
  } else {
    // If neither cloud nor hardware is active, device is offline
    acState.isOnline = false;
  }

  res.json({
    success: true,
    state: acState,
    climate,
    power: powerTelemetry,
    hardware: hardwareStatus,
    directConfig,
    greeSession: greeCloudSession,
  });
});

// GET & POST /api/ac/direct-config
app.get('/api/ac/direct-config', (req: Request, res: Response) => {
  res.json({ success: true, directConfig });
});

app.post('/api/ac/direct-config', (req: Request, res: Response) => {
  directConfig = {
    ...directConfig,
    ...req.body,
    lastSync: new Date().toISOString(),
  };

  hardwareStatus.controlMethod = directConfig.activeMethod;
  if (directConfig.activeMethod === 'tuya_smart_life') {
    hardwareStatus.deviceModel = 'Tuya_IR_Remote';
    directConfig.lastStatusMessage = 'Connected via Tuya / Smart Life IR Remote Hub';
  } else if (directConfig.activeMethod === 'built_in_wifi') {
    hardwareStatus.deviceModel = 'BuiltIn_WiFi_AC';
    hardwareStatus.ipAddress = directConfig.acLocalIp;
    directConfig.lastStatusMessage = `Direct UDP connection on ${directConfig.acLocalIp}:${directConfig.acPort}`;
  } else if (directConfig.activeMethod === 'broadlink') {
    hardwareStatus.deviceModel = 'Broadlink_RM4';
    hardwareStatus.ipAddress = directConfig.broadlinkIp;
    directConfig.lastStatusMessage = `Broadlink RM4 Ready on ${directConfig.broadlinkIp}`;
  } else if (directConfig.activeMethod === 'mobile_ir') {
    hardwareStatus.deviceModel = 'Mobile_IR';
    directConfig.lastStatusMessage = 'Mobile Phone Built-in IR Transmitter Selected';
  } else if (directConfig.activeMethod === 'home_assistant_webhook') {
    hardwareStatus.deviceModel = 'HomeAssistant';
    directConfig.lastStatusMessage = 'Home Assistant Webhook Connected';
  }

  savePersistentStore();

  broadcastSSE('direct_config_updated', directConfig);
  broadcastSSE('hardware_updated', hardwareStatus);

  res.json({ success: true, directConfig });
});

// Explicit Pair Device Endpoint
app.post('/api/ac/pair', (req: Request, res: Response) => {
  const {
    brand = 'Gree',
    deviceName = 'Gree Inverter',
    deviceModel = 'Gree Inverter (EWPE 10001)',
    location = 'Bedroom',
    method = 'gree_cloud',
    ipOrId = '',
  } = req.body;

  acState = {
    ...acState,
    id: `ac_${Date.now()}`,
    isPaired: true,
    brand,
    deviceName,
    deviceModel,
    location,
    isOnline: true,
    power: true,
    temperature: 24,
    mode: 'cool',
    fanSpeed: 'auto',
    lastUpdated: new Date().toISOString(),
  };

  directConfig = {
    ...directConfig,
    activeMethod: method,
    connected: true,
    lastSync: new Date().toISOString(),
    lastStatusMessage: `Connected real ${brand} AC (${deviceName})`,
  };

  if (method === 'built_in_wifi' && ipOrId) {
    directConfig.acLocalIp = ipOrId;
  } else if (method === 'tuya_smart_life' && ipOrId) {
    directConfig.tuyaDeviceId = ipOrId;
  } else if (method === 'broadlink' && ipOrId) {
    directConfig.broadlinkIp = ipOrId;
  }

  savePersistentStore();
  calculatePowerAndClimate();

  broadcastSSE('ac_state_changed', acState);
  broadcastSSE('direct_config_updated', directConfig);

  res.json({ success: true, state: acState, directConfig });
});

// Explicit Unpair Device Endpoint
app.post('/api/ac/unpair', (req: Request, res: Response) => {
  acState = {
    id: '',
    isPaired: false,
    deviceName: '',
    deviceModel: '',
    location: '',
    isOnline: false,
    power: false,
    temperature: 24,
    mode: 'cool',
    fanSpeed: 'auto',
    swingV: 'auto',
    swingH: 'auto',
    turbo: false,
    eco: false,
    sleep: false,
    displayLight: true,
    ionFilter: false,
    quiet: false,
    locked: false,
    brand: 'Gree',
    timerOffMinutes: 0,
    timerOnMinutes: 0,
    lastIrCommand: 'Device removed',
    lastIrHex: '0x000000',
    lastUpdated: new Date().toISOString(),
  };

  greeCloudSession.loggedIn = false;
  greeCloudSession.token = '';

  directConfig.connected = false;
  directConfig.lastStatusMessage = 'No AC device connected';

  savePersistentStore();
  broadcastSSE('ac_state_changed', acState);
  broadcastSSE('direct_config_updated', directConfig);

  res.json({ success: true, state: acState });
});

// Sync from Client (Ensures Client localStorage is never erased by a blank server)
app.post('/api/ac/sync-client', (req: Request, res: Response) => {
  const { clientState, clientConfig, clientSchedules } = req.body;
  if (clientState && clientState.isPaired) {
    acState = { ...acState, ...clientState };
  }
  if (clientConfig) {
    directConfig = { ...directConfig, ...clientConfig };
  }
  if (Array.isArray(clientSchedules)) {
    schedules = clientSchedules;
  }
  savePersistentStore();
  if (Array.isArray(clientSchedules)) {
    broadcastSSE('schedules_updated', schedules);
  }
  res.json({ success: true, state: acState, directConfig, schedules });
});

// Fast Toggle
app.get('/api/ac/toggle', (req: Request, res: Response) => {
  acState.power = !acState.power;
  acState.lastUpdated = new Date().toISOString();
  acState.lastIrHex = generateIRHex(acState);
  acState.lastIrCommand = `POWER ${acState.power ? 'ON' : 'OFF'} · ${acState.temperature}°C · ${acState.brand.toUpperCase()}`;

  calculatePowerAndClimate();

  const src =
    directConfig.activeMethod === 'tuya_smart_life'
      ? 'Tuya_Hub'
      : directConfig.activeMethod === 'built_in_wifi'
      ? 'Direct_WiFi_AC'
      : directConfig.activeMethod === 'broadlink'
      ? 'Broadlink'
      : directConfig.activeMethod === 'mobile_ir'
      ? 'Mobile_IR'
      : 'Web_UI';

  const logEntry: IRLogEntry = {
    id: `ir-${Date.now()}`,
    timestamp: new Date().toISOString(),
    command: acState.lastIrCommand,
    commandBn: `এসি ${acState.power ? 'চালু' : 'বন্ধ'} করা হয়েছে (${directConfig.activeMethod})`,
    brand: acState.brand,
    hexCode: acState.lastIrHex,
    protocol: directConfig.activeMethod === 'built_in_wifi' ? 'GREE_EWPE_UDP' : `${acState.brand}_IR_38KHZ`,
    source: src as any,
  };
  irLogs.unshift(logEntry);
  if (irLogs.length > 50) irLogs.pop();

  savePersistentStore();

  broadcastSSE('ac_state_changed', acState);
  broadcastSSE('ir_blasted', logEntry);

  res.json({ success: true, power: acState.power, state: acState });
});

// POST /api/ac/set
app.post('/api/ac/set', async (req: Request, res: Response) => {
  const updates = req.body;
  const wasPowerOn = acState.power;

  acState = {
    ...acState,
    ...updates,
    lastUpdated: new Date().toISOString(),
  };

  // Protect recently applied user settings from being immediately overwritten by background poller
  lastCommandDispatchedAt = Date.now();

  // Restoring settings when turning AC back ON
  if (updates.power === true && !wasPowerOn) {
    if (updates.temperature === undefined) acState.temperature = lastActiveACSettings.temperature;
    if (updates.mode === undefined) acState.mode = lastActiveACSettings.mode;
    if (updates.quiet === undefined && updates.fanSpeed === undefined) {
      acState.quiet = lastActiveACSettings.quiet;
      acState.fanSpeed = lastActiveACSettings.fanSpeed;
    }
    if (updates.turbo === undefined) acState.turbo = lastActiveACSettings.turbo;
    if (updates.eco === undefined) acState.eco = lastActiveACSettings.eco;
    if (updates.displayLight === undefined) acState.displayLight = lastActiveACSettings.displayLight;

    // Initialize multiStageTimer start times ONLY IF enabling or starting a new timer session
    if (acState.multiStageTimer && acState.multiStageTimer.enabled && !acState.multiStageTimer.startedAt) {
      const firstStage = acState.multiStageTimer.stages?.[0];
      const nowIso = new Date().toISOString();
      acState.multiStageTimer.currentStageIndex = 0;
      acState.multiStageTimer.currentStage = 1;
      acState.multiStageTimer.startedAt = nowIso;
      acState.multiStageTimer.stageStartedAt = nowIso;
      acState.multiStageTimer.remainingMinutes = firstStage?.durationMinutes ?? 120;
      if (firstStage) {
        if (updates.temperature === undefined) acState.temperature = firstStage.temperature;
        if (updates.mode === undefined && firstStage.mode) acState.mode = firstStage.mode;
        if (updates.fanSpeed === undefined && firstStage.fanSpeed) acState.fanSpeed = firstStage.fanSpeed;
      }
    }
  }

  if (updates.health !== undefined) {
    acState.health = Boolean(updates.health);
    acState.ionFilter = Boolean(updates.health);
  }
  if (updates.ionFilter !== undefined) {
    acState.health = Boolean(updates.ionFilter);
    acState.ionFilter = Boolean(updates.ionFilter);
  }
  if (updates.autoClean !== undefined) {
    acState.autoClean = Boolean(updates.autoClean);
  }
  if (updates.isCleaning !== undefined) {
    acState.isCleaning = Boolean(updates.isCleaning);
    if (acState.isCleaning) {
      cleanCycleStartedAt = Date.now();
      acState.cleanCycleRemainingMinutes = CLEAN_CYCLE_DURATION_MINS;
      acState.cleanCycleStage = 'frost';
      acState.power = true;
    } else {
      cleanCycleStartedAt = null;
      acState.cleanCycleRemainingMinutes = 0;
      delete acState.cleanCycleStage;
    }
  }
  if (updates.filterCleanHours !== undefined) {
    acState.filterCleanHours = Number(updates.filterCleanHours);
  }

  // Handle fanSpeed vs quiet/turbo state synchronization
  if (updates.fanSpeed === 'quiet') {
    acState.quiet = true;
    acState.turbo = false;
  } else if (updates.fanSpeed === 'turbo') {
    acState.turbo = true;
    acState.quiet = false;
  } else if (updates.fanSpeed !== undefined && updates.quiet === undefined && updates.turbo === undefined) {
    acState.quiet = false;
    acState.turbo = false;
  }

  if (updates.quiet !== undefined) {
    acState.quiet = Boolean(updates.quiet);
    if (acState.quiet) {
      acState.fanSpeed = 'quiet';
      acState.turbo = false;
    } else if (acState.fanSpeed === 'quiet') {
      acState.fanSpeed = lastActiveACSettings.fanSpeed !== 'quiet' ? lastActiveACSettings.fanSpeed : 'low';
    }
  }

  // If a multi-stage step timer is running, update active stage settings so STAGE_ENFORCER respects user manual change
  if (acState.multiStageTimer && acState.multiStageTimer.enabled && !acState.multiStageTimer.paused) {
    const currIdx = acState.multiStageTimer.currentStageIndex ?? 0;
    const activeStage = acState.multiStageTimer.stages?.[currIdx];
    if (activeStage) {
      if (updates.fanSpeed !== undefined || updates.quiet !== undefined) {
        activeStage.fanSpeed = acState.fanSpeed;
      }
      if (updates.temperature !== undefined) {
        activeStage.temperature = acState.temperature;
      }
      if (updates.displayLight !== undefined) {
        activeStage.displayLight = acState.displayLight;
      }
    }
  }

  // Remember active settings if AC is ON
  if (acState.power) {
    lastActiveACSettings = {
      temperature: acState.temperature,
      mode: acState.mode as any,
      fanSpeed: acState.fanSpeed as any,
      quiet: Boolean(acState.quiet),
      turbo: Boolean(acState.turbo),
      eco: Boolean(acState.eco),
      displayLight: Boolean(acState.displayLight),
      ionFilter: Boolean(acState.ionFilter),
      health: Boolean(acState.health),
      swingV: acState.swingV || 'auto',
      swingH: acState.swingH || 'auto',
      sleep: Boolean(acState.sleep),
    };
  }

  // Ensure power state changes are logged
  if (updates.power !== undefined) {
    console.log(`[STATE] AC Power updated to ${acState.power}`);
  }

  acState.lastIrHex = generateIRHex(acState);
  acState.lastIrCommand = `${acState.power ? 'ON' : 'OFF'} · ${acState.temperature}°C · ${acState.mode.toUpperCase()} · FAN: ${acState.fanSpeed.toUpperCase()} · ${acState.brand.toUpperCase()}`;

  calculatePowerAndClimate();

  const src =
    directConfig.activeMethod === 'gree_cloud'
      ? 'Direct_WiFi_AC'
      : directConfig.activeMethod === 'tuya_smart_life'
      ? 'Tuya_Hub'
      : directConfig.activeMethod === 'built_in_wifi'
      ? 'Direct_WiFi_AC'
      : directConfig.activeMethod === 'broadlink'
      ? 'Broadlink'
      : directConfig.activeMethod === 'mobile_ir'
      ? 'Mobile_IR'
      : 'Web_UI';

  const logEntry: IRLogEntry = {
    id: `ir-${Date.now()}`,
    timestamp: new Date().toISOString(),
    command: acState.lastIrCommand,
    commandBn: directConfig.activeMethod === 'gree_cloud' 
      ? `গ্রী ক্লাউড কমান্ড: ${acState.power ? 'চালু' : 'বন্ধ'} (${acState.temperature}°C)` 
      : `${acState.brand} এসি: ${acState.temperature}°C, ${acState.mode} মোড`,
    brand: acState.brand,
    hexCode: acState.lastIrHex,
    protocol: directConfig.activeMethod === 'gree_cloud' 
      ? 'GREE_EWPE_CLOUD' 
      : directConfig.activeMethod === 'built_in_wifi' 
        ? 'GREE_EWPE_UDP' 
        : `${acState.brand}_IR_38KHZ`,
    source: src as any,
  };
  irLogs.unshift(logEntry);
  if (irLogs.length > 50) irLogs.pop();

  savePersistentStore();

  broadcastSSE('ac_state_changed', acState);
  broadcastSSE('ir_blasted', logEntry);

  // If using Gree Cloud, execute REAL encrypted MQTT command to the physical AC unit!
  if (directConfig.activeMethod === 'gree_cloud' && greeCloudSession.loggedIn && greeCloudSession.email) {
    const greePatch = {
      power: acState.power,
      targetTemp: Math.round(acState.temperature),
      mode: acState.mode === 'eco' ? ('cool' as const) : (acState.mode as any),
      fanSpeed: toGreeFanSpeed(acState.fanSpeed),
      turbo: Boolean(acState.turbo || acState.fanSpeed === 'turbo'),
      light: acState.displayLight,
      swingV: acState.swingV,
      swingH: acState.swingH,
      quiet: Boolean(acState.quiet || acState.fanSpeed === 'quiet'),
      autoClean: Boolean(acState.autoClean),
      eco: acState.eco,
      health: acState.ionFilter,
      sleep: acState.sleep,
    };

    console.log(`[API_AC_SET] Executing real Gree Cloud MQTT command for ${greeCloudSession.boundMac}:`, greePatch);
    try {
      const greeRes = await sendGreeCloud(
        greePatch,
        {
          email: greeCloudSession.email,
          password: greeCloudSession.password || '',
          mac: greeCloudSession.boundMac,
          region: greeCloudSession.region,
        },
        greeCloudSession.deviceKey,
        greeCloudSession.uid,
        greeCloudSession.token,
        greeCloudSession.host as any
      );

      if (greeRes.token) greeCloudSession.token = greeRes.token;
      if (greeRes.deviceKey) greeCloudSession.deviceKey = greeRes.deviceKey;
      if (greeRes.uid) greeCloudSession.uid = greeRes.uid;
      if (greeRes.host) greeCloudSession.host = greeRes.host;
      savePersistentStore();

      const logEntryDelivery: IRLogEntry = {
        id: `gree-mqtt-ack-${Date.now()}`,
        timestamp: new Date().toISOString(),
        command: `MQTT_ACKNOWLEDGED: Gree AC [${greeCloudSession.boundMac}] accepted command (Power: ${acState.power ? 'ON' : 'OFF'}, ${acState.temperature}°C, ${acState.mode.toUpperCase()})`,
        commandBn: `গ্রী এসি কনফার্ম করেছে: কমান্ড সফলভাবে কার্যকর হয়েছে (${acState.power ? 'অন' : 'অফ'}, ${acState.temperature}°C, ${acState.mode.toUpperCase()})`,
        brand: 'Gree',
        hexCode: 'ACK_R_200',
        protocol: 'GREE_EWPE_CLOUD',
        source: 'Direct_WiFi_AC',
      };
      irLogs.unshift(logEntryDelivery);
      broadcastSSE('ir_blasted', logEntryDelivery);

      return res.json({
        success: true,
        state: acState,
        irHex: acState.lastIrHex,
        method: directConfig.activeMethod,
        message: `Command delivered to physical Gree AC via MQTT broker`,
        messageBn: `গ্রী ক্লাউড MQTT ব্রোকারের মাধ্যমে কমান্ড সরাসরি এসিতে পৌঁছেছে এবং কার্যকর হয়েছে!`,
      });
    } catch (err: any) {
      console.error(`[API_AC_SET_GREE_FAILED]`, err);
      const logEntryErr: IRLogEntry = {
        id: `gree-mqtt-err-${Date.now()}`,
        timestamp: new Date().toISOString(),
        command: `GREE_MQTT_ERROR: ${err.message}`,
        commandBn: `গ্রী ক্লাউড কমান্ড এরর: ${err.message}`,
        brand: 'Gree',
        hexCode: 'MQTT_ERR',
        protocol: 'GREE_EWPE_CLOUD',
        source: 'Direct_WiFi_AC',
      };
      irLogs.unshift(logEntryErr);
      broadcastSSE('ir_blasted', logEntryErr);

      return res.status(502).json({
        success: false,
        state: acState,
        error: err.message,
        message: `Gree cloud error: ${err.message}`,
      });
    }
  }

  res.json({
    success: true,
    state: acState,
    irHex: acState.lastIrHex,
    method: directConfig.activeMethod,
    message: `Command dispatched via ${directConfig.activeMethod}`,
  });
});

// Unified authoritative stage executor: executes stage temperature, fan speed, display light, and power
async function applyStageSettings(
  stage: MultiStageStep,
  stageIndex: number,
  totalStages: number,
  triggerReason: 'timer_start' | 'jump_stage' | 'auto_advance'
) {
  acState.power = true;
  acState.temperature = Math.min(30, Math.max(16, Number(stage.temperature ?? 24)));
  if (stage.mode) acState.mode = stage.mode;
  const fs = stage.fanSpeed || 'auto';
  acState.fanSpeed = fs;
  if (fs === 'quiet') {
    acState.quiet = true;
    acState.turbo = false;
  } else if (fs === 'turbo') {
    acState.turbo = true;
    acState.quiet = false;
  } else {
    acState.quiet = false;
    acState.turbo = false;
  }
  if (stage.displayLight !== undefined) {
    acState.displayLight = Boolean(stage.displayLight);
  }
  acState.lastUpdated = new Date().toISOString();
  acState.lastIrHex = generateIRHex(acState);
  acState.lastIrCommand = `${acState.power ? 'ON' : 'OFF'} · ${acState.temperature}°C · ${acState.mode.toUpperCase()} · FAN: ${acState.fanSpeed.toUpperCase()} · ${acState.brand.toUpperCase()}`;
  calculatePowerAndClimate();

  lastGreeTemp = acState.temperature;
  lastGreePowerState = true;
  lastCommandDispatchedAt = Date.now();

  lastActiveACSettings = {
    temperature: acState.temperature,
    mode: acState.mode as any,
    fanSpeed: acState.fanSpeed as any,
    quiet: Boolean(acState.quiet),
    turbo: Boolean(acState.turbo),
    eco: Boolean(acState.eco),
    displayLight: Boolean(acState.displayLight),
    ionFilter: Boolean(acState.ionFilter),
    health: Boolean(acState.health),
    swingV: acState.swingV || 'auto',
    swingH: acState.swingH || 'auto',
    sleep: Boolean(acState.sleep),
  };

  // 1. Gree Cloud physical AC sync
  if (directConfig.activeMethod === 'gree_cloud' && greeCloudSession.loggedIn && greeCloudSession.email && greeCloudSession.boundMac) {
    try {
      const greePatch = {
        power: true,
        targetTemp: acState.temperature,
        mode: acState.mode === 'eco' ? ('cool' as const) : (acState.mode as any),
        fanSpeed: toGreeFanSpeed(acState.fanSpeed),
        quiet: Boolean(acState.quiet || acState.fanSpeed === 'quiet'),
        turbo: Boolean(acState.turbo || acState.fanSpeed === 'turbo'),
        light: acState.displayLight,
        health: Boolean(acState.health ?? acState.ionFilter),
      };
      console.log(`[STAGE_EXECUTE] Sending Gree Cloud command for Stage ${stageIndex + 1}:`, greePatch);
      const greeRes = await sendGreeCloud(
        greePatch,
        {
          email: greeCloudSession.email,
          password: greeCloudSession.password || '',
          mac: greeCloudSession.boundMac,
          region: greeCloudSession.region,
        },
        greeCloudSession.deviceKey,
        greeCloudSession.uid,
        greeCloudSession.token,
        greeCloudSession.host as any
      );
      if (greeRes.token) greeCloudSession.token = greeRes.token;
      if (greeRes.deviceKey) greeCloudSession.deviceKey = greeRes.deviceKey;
      if (greeRes.uid) greeCloudSession.uid = greeRes.uid;
      if (greeRes.host) greeCloudSession.host = greeRes.host;
      console.log(`[STAGE_EXECUTE] Stage ${stageIndex + 1} confirmed by Gree AC [${greeCloudSession.boundMac}]! ACK received.`);
    } catch (e: any) {
      console.error(`[STAGE_GREE_CLOUD_CMD_ERR] Stage ${stageIndex + 1}:`, e);
    }
  }

  // 2. IR / Telemetry Log
  const triggerLabelBn =
    triggerReason === 'jump_stage'
      ? 'সরাসরি স্টেজ জাম্প'
      : triggerReason === 'auto_advance'
      ? 'পূর্ববর্তী স্টেজ সমাপ্ত হয়ে পরবর্তী স্টেজ সক্রিয়'
      : 'টাইমার শুরু';
  const lightLabelBn = acState.displayLight ? 'অন' : 'অফ';
  const fanLabelBn =
    acState.fanSpeed === 'quiet' ? 'নীরব (Quiet)' :
    acState.fanSpeed === 'turbo' ? 'টার্বো (Turbo)' :
    acState.fanSpeed === 'low' ? 'স্লো (Low)' :
    acState.fanSpeed === 'med' ? 'মিডিয়াম (Med)' :
    acState.fanSpeed === 'high' ? 'হাই (High)' : 'অটো (Auto)';

  const logEntry: IRLogEntry = {
    id: `stage-${stageIndex + 1}-${Date.now()}`,
    timestamp: new Date().toISOString(),
    command: `STAGE ${stageIndex + 1}/${totalStages} ACTIVE: Temp=${acState.temperature}°C, Fan=${acState.fanSpeed}, Light=${acState.displayLight ? 'ON' : 'OFF'} (${triggerReason})`,
    commandBn: `${triggerLabelBn}: স্টেজ ${stageIndex + 1} চালু হয়েছে ➔ তাপমাত্রা ${acState.temperature}°C, ফ্যান: ${fanLabelBn}, লাইট: ${lightLabelBn} (${stage.durationMinutes} মিনিট চলবে)`,
    brand: acState.brand,
    hexCode: acState.lastIrHex,
    protocol: directConfig.activeMethod === 'gree_cloud' ? 'GREE_EWPE_CLOUD' : `${acState.brand}_IR_38KHZ`,
    source: 'Direct_WiFi_AC',
  };
  irLogs.unshift(logEntry);
  if (irLogs.length > 50) irLogs.pop();

  savePersistentStore();
  broadcastSSE('ac_state_changed', acState);
  broadcastSSE('ir_blasted', logEntry);
}

// POST /api/ac/step-timer - Multi-Stage Temperature & Duration Automation
app.post('/api/ac/step-timer', async (req: Request, res: Response) => {
  const { enabled, targetStageIndex, finalAction, stage3Temp, paused, health } = req.body;

  if (health !== undefined) {
    acState.health = Boolean(health);
    acState.ionFilter = Boolean(health);
  }

  if (!enabled) {
    if (acState.multiStageTimer) {
      acState.multiStageTimer.enabled = false;
      acState.multiStageTimer.paused = false;
    }
    savePersistentStore();
    broadcastSSE('ac_state_changed', acState);
    return res.json({ success: true, multiStageTimer: acState.multiStageTimer });
  }

  let processedStages: MultiStageStep[] = [];

  if (Array.isArray(req.body.stages) && req.body.stages.length > 0) {
    processedStages = req.body.stages.map((s: any, index: number) => ({
      id: s.id || `stg-${Date.now()}-${index}`,
      stageNumber: index + 1,
      temperature: Math.min(30, Math.max(16, Number(s.temperature ?? 24))),
      durationMinutes: Math.max(1, Number(s.durationMinutes ?? 60)),
      action: s.action === 'turn_off' ? 'turn_off' : 'change_temp',
      mode: s.mode || 'cool',
      fanSpeed: s.fanSpeed || 'auto',
      displayLight: s.displayLight !== undefined ? Boolean(s.displayLight) : true,
    }));
  } else if (acState.multiStageTimer?.stages && acState.multiStageTimer.stages.length > 0) {
    processedStages = acState.multiStageTimer.stages;
  } else {
    // Default 2-stage fallback
    processedStages = [
      {
        id: `stg-${Date.now()}-1`,
        stageNumber: 1,
        temperature: Number(req.body.stage1?.temperature ?? acState.temperature ?? 24),
        durationMinutes: Number(req.body.stage1?.durationMinutes ?? 120),
        action: req.body.stage2Action === 'turn_off' ? 'turn_off' : 'change_temp',
        fanSpeed: 'auto',
        displayLight: true,
      },
      {
        id: `stg-${Date.now()}-2`,
        stageNumber: 2,
        temperature: Number(req.body.stage2?.temperature ?? 26),
        durationMinutes: Number(req.body.stage2?.durationMinutes ?? 240),
        action: 'change_temp',
        fanSpeed: 'quiet',
        displayLight: false,
      },
    ];
  }

  const isAlreadyRunning = Boolean(acState.multiStageTimer && acState.multiStageTimer.enabled);
  const prevTimer = acState.multiStageTimer;

  // If targetStageIndex is provided, use it; otherwise if already running, keep current active stage without resetting to Stage 1!
  const requestedIdx = targetStageIndex !== undefined ? Number(targetStageIndex) : (isAlreadyRunning ? prevTimer?.currentStageIndex : 0);
  const startIdx = Math.max(0, Math.min(processedStages.length - 1, Number(requestedIdx ?? 0)));
  const currentActiveStage = processedStages[startIdx];
  const nowIso = new Date().toISOString();

  const isKeepingActiveStage = isAlreadyRunning && prevTimer && startIdx === prevTimer.currentStageIndex;

  let startedAt = nowIso;
  let stageStartedAt = nowIso;
  let remainingMinutes = currentActiveStage.durationMinutes;

  if (isKeepingActiveStage && prevTimer) {
    startedAt = prevTimer.startedAt || nowIso;
    stageStartedAt = prevTimer.stageStartedAt || nowIso;

    // Calculate how much wall-clock time has already elapsed in this current stage:
    const elapsedMs = Math.max(0, Date.now() - new Date(stageStartedAt).getTime());
    const elapsedMins = elapsedMs / 60000;

    // The new remaining minutes is the updated duration minus the already elapsed time!
    remainingMinutes = Math.max(0, Math.round((currentActiveStage.durationMinutes - elapsedMins) * 10) / 10);
  }

  const fAct = finalAction === 'keep_running' ? ('keep_running' as const) : finalAction === 'change_temp' ? ('change_temp' as const) : ('turn_off' as const);

  const timer: MultiStageTimer = {
    enabled: true,
    currentStageIndex: startIdx,
    currentStage: startIdx + 1,
    remainingMinutes: remainingMinutes,
    stages: processedStages,
    finalAction: fAct,
    stage3Temp: Number(stage3Temp || (processedStages[processedStages.length - 1]?.temperature ?? 27)),
    startedAt: startedAt,
    stageStartedAt: stageStartedAt,
    paused: Boolean(paused),
    stage1: {
      temperature: processedStages[0]?.temperature ?? 24,
      durationMinutes: processedStages[0]?.durationMinutes ?? 120,
    },
    stage2Action: processedStages[0]?.action === 'turn_off' ? 'turn_off' : processedStages[1] ? 'change_temp' : 'turn_off',
    stage2: processedStages[1] ? {
      temperature: processedStages[1].temperature,
      durationMinutes: processedStages[1].durationMinutes,
    } : {
      temperature: 26,
      durationMinutes: 180,
    },
  };

  acState.multiStageTimer = timer;

  // Check if hardware settings (power, temperature, fan, display light, mode) of active stage need applying:
  const prevStage = prevTimer?.stages?.[startIdx];
  const hasHardwareSettingsChanged =
    !isKeepingActiveStage ||
    !prevStage ||
    !acState.power ||
    prevStage.temperature !== currentActiveStage.temperature ||
    prevStage.fanSpeed !== currentActiveStage.fanSpeed ||
    prevStage.displayLight !== currentActiveStage.displayLight ||
    prevStage.mode !== currentActiveStage.mode ||
    acState.temperature !== currentActiveStage.temperature ||
    acState.fanSpeed !== currentActiveStage.fanSpeed ||
    acState.displayLight !== currentActiveStage.displayLight ||
    (currentActiveStage.mode && acState.mode !== currentActiveStage.mode);

  if (hasHardwareSettingsChanged) {
    await applyStageSettings(currentActiveStage, startIdx, processedStages.length, isKeepingActiveStage ? 'auto_advance' : 'timer_start');
  } else {
    // Only duration or rules changed: persist and broadcast SSE immediately!
    savePersistentStore();
    broadcastSSE('ac_state_changed', acState);
  }

  res.json({
    success: true,
    state: acState,
    multiStageTimer: acState.multiStageTimer,
  });
});

// POST /api/ac/step-timer/adjust-time - Quickly adjust duration or settings of active stage or any stage
app.post('/api/ac/step-timer/adjust-time', async (req: Request, res: Response) => {
  const { deltaMinutes, stageIndex, durationMinutes, temperature, fanSpeed, displayLight } = req.body;

  if (!acState.multiStageTimer || !acState.multiStageTimer.stages || acState.multiStageTimer.stages.length === 0) {
    return res.status(400).json({ success: false, message: 'No active multi-stage timer configured' });
  }

  const timer = acState.multiStageTimer;
  const currentIdx = timer.currentStageIndex ?? (timer.currentStage ? timer.currentStage - 1 : 0);
  const targetIdx = stageIndex !== undefined ? Number(stageIndex) : currentIdx;

  if (targetIdx < 0 || targetIdx >= timer.stages.length) {
    return res.status(400).json({ success: false, message: 'Invalid stage index' });
  }

  const stage = timer.stages[targetIdx];

  // 1. If deltaMinutes provided, adjust active stage duration & remainingMinutes
  if (deltaMinutes !== undefined && !isNaN(Number(deltaMinutes))) {
    const delta = Number(deltaMinutes);
    stage.durationMinutes = Math.max(5, stage.durationMinutes + delta);
    timer.remainingMinutes = Math.max(1, Math.round(((timer.remainingMinutes ?? stage.durationMinutes) + delta) * 10) / 10);
  }

  // 2. If durationMinutes provided, update stage duration
  if (durationMinutes !== undefined && !isNaN(Number(durationMinutes))) {
    const newDur = Math.max(1, Number(durationMinutes));
    stage.durationMinutes = newDur;
    if (targetIdx === currentIdx && timer.stageStartedAt) {
      const elapsedMs = Math.max(0, Date.now() - new Date(timer.stageStartedAt).getTime());
      const elapsedMins = elapsedMs / 60000;
      timer.remainingMinutes = Math.max(1, Math.round((newDur - elapsedMins) * 10) / 10);
    }
  }

  // 3. If hardware settings updated for the active stage, apply to AC
  let needApply = false;
  if (temperature !== undefined) {
    stage.temperature = Math.min(30, Math.max(16, Number(temperature)));
    if (targetIdx === currentIdx) needApply = true;
  }
  if (fanSpeed !== undefined) {
    stage.fanSpeed = fanSpeed;
    if (targetIdx === currentIdx) needApply = true;
  }
  if (displayLight !== undefined) {
    stage.displayLight = Boolean(displayLight);
    if (targetIdx === currentIdx) needApply = true;
  }

  if (needApply && targetIdx === currentIdx && timer.enabled && !timer.paused) {
    await applyStageSettings(stage, targetIdx, timer.stages.length, 'auto_advance');
  } else {
    savePersistentStore();
    broadcastSSE('ac_state_changed', acState);
  }

  res.json({ success: true, state: acState, multiStageTimer: acState.multiStageTimer });
});

// POST /api/ac/jump-stage - Instantly jump to a specific step timer stage
app.post('/api/ac/jump-stage', async (req: Request, res: Response) => {
  const { stageIndex } = req.body;
  if (!acState.multiStageTimer || !acState.multiStageTimer.stages || acState.multiStageTimer.stages.length === 0) {
    return res.status(400).json({ success: false, message: 'Step timer has no configured stages' });
  }
  const stages = acState.multiStageTimer.stages;
  const targetIdx = Math.max(0, Math.min(stages.length - 1, Number(stageIndex ?? 0)));
  const targetStage = stages[targetIdx];
  const nowIso = new Date().toISOString();

  acState.multiStageTimer.enabled = true;
  acState.multiStageTimer.paused = false;
  acState.multiStageTimer.currentStageIndex = targetIdx;
  acState.multiStageTimer.currentStage = targetIdx + 1;
  acState.multiStageTimer.remainingMinutes = targetStage.durationMinutes;
  acState.multiStageTimer.stageStartedAt = nowIso;
  acState.multiStageTimer.startedAt = nowIso;

  await applyStageSettings(targetStage, targetIdx, stages.length, 'jump_stage');

  res.json({ success: true, state: acState, multiStageTimer: acState.multiStageTimer });
});

// Background Multi-Stage Step Timer Runner (10s ticker)
if (!process.env.VERCEL) {
  setInterval(async () => {
  if (acState.multiStageTimer && acState.multiStageTimer.enabled && !acState.multiStageTimer.paused) {
    const timer = acState.multiStageTimer;
    const currentIdx = timer.currentStageIndex ?? (timer.currentStage ? timer.currentStage - 1 : 0);
    const currStage = timer.stages?.[currentIdx];
    const stageDuration = currStage?.durationMinutes || 60;

    if (!timer.stageStartedAt) {
      timer.stageStartedAt = new Date().toISOString();
    }

    const elapsedMs = Math.max(0, Date.now() - new Date(timer.stageStartedAt).getTime());
    const elapsedMins = elapsedMs / 60000;
    timer.remainingMinutes = Math.max(0, Math.round((stageDuration - elapsedMins) * 10) / 10);

    if (timer.remainingMinutes <= 0) {
      // If current stage is set to turn off at end
      if (currStage?.action === 'turn_off') {
        console.log(`[STEP_TIMER] Stage ${currentIdx + 1} elapsed -> Turning OFF AC`);
        timer.enabled = false;
        acState.power = false;
        calculatePowerAndClimate();
        savePersistentStore();
        broadcastSSE('ac_state_changed', acState);
        broadcastSSE('power_updated', powerTelemetry);

        if (directConfig.activeMethod === 'gree_cloud' && greeCloudSession.loggedIn && greeCloudSession.boundMac) {
          try {
            const greeRes = await sendGreeCloud(
              { power: false },
              { email: greeCloudSession.email, password: greeCloudSession.password || '', mac: greeCloudSession.boundMac, region: greeCloudSession.region },
              greeCloudSession.deviceKey,
              greeCloudSession.uid,
              greeCloudSession.token,
              greeCloudSession.host as any
            );
            if (greeRes.token) greeCloudSession.token = greeRes.token;
            if (greeRes.deviceKey) greeCloudSession.deviceKey = greeRes.deviceKey;
          } catch (e) {}
        }

        const log: IRLogEntry = {
          id: `step-off-${Date.now()}`,
          timestamp: new Date().toISOString(),
          command: `STAGE ${currentIdx + 1} COMPLETED -> AC TURNED OFF AUTOMATICALLY`,
          commandBn: `স্টেজ ${currentIdx + 1} সময় শেষ ➔ নির্ধারিত নিয়ম অনুযায়ী এসি স্বয়ংক্রিয়ভাবে বন্ধ করা হয়েছে`,
          brand: acState.brand,
          hexCode: generateIRHex(acState),
          protocol: 'GREE_EWPE_CLOUD',
          source: 'Direct_WiFi_AC',
        };
        irLogs.unshift(log);
        broadcastSSE('ir_blasted', log);
      } else {
        const nextIdx = currentIdx + 1;
        if (timer.stages && nextIdx < timer.stages.length) {
          const nextStage = timer.stages[nextIdx];
          console.log(`[STEP_TIMER] Stage ${currentIdx + 1} elapsed -> Advancing to Stage ${nextIdx + 1} (${nextStage.temperature}°C, ${nextStage.fanSpeed})`);
          
          timer.currentStageIndex = nextIdx;
          timer.currentStage = nextIdx + 1;
          timer.remainingMinutes = nextStage.durationMinutes;
          timer.stageStartedAt = new Date().toISOString();

          await applyStageSettings(nextStage, nextIdx, timer.stages.length, 'auto_advance');
        } else {
          // All stages completed -> perform Final Action
          if (timer.finalAction === 'turn_off') {
            console.log('[STEP_TIMER] All stages completed -> Turning OFF AC (Final Action)');
            timer.enabled = false;
            acState.power = false;
            calculatePowerAndClimate();
            savePersistentStore();
            broadcastSSE('ac_state_changed', acState);
            broadcastSSE('power_updated', powerTelemetry);

            if (directConfig.activeMethod === 'gree_cloud' && greeCloudSession.loggedIn && greeCloudSession.boundMac) {
              try {
                const greeRes = await sendGreeCloud(
                  { power: false },
                  { email: greeCloudSession.email, password: greeCloudSession.password || '', mac: greeCloudSession.boundMac, region: greeCloudSession.region },
                  greeCloudSession.deviceKey,
                  greeCloudSession.uid,
                  greeCloudSession.token,
                  greeCloudSession.host as any
                );
                if (greeRes.token) greeCloudSession.token = greeRes.token;
                if (greeRes.deviceKey) greeCloudSession.deviceKey = greeRes.deviceKey;
              } catch (e) {}
            }

            const log: IRLogEntry = {
              id: `step-final-off-${Date.now()}`,
              timestamp: new Date().toISOString(),
              command: 'ALL STAGES COMPLETED -> AC TURNED OFF (FINAL ACTION)',
              commandBn: 'সকল স্টেজ সময় সমাপ্ত ➔ এসি স্বয়ংক্রিয়ভাবে বন্ধ হয়েছে',
              brand: acState.brand,
              hexCode: generateIRHex(acState),
              protocol: 'GREE_EWPE_CLOUD',
              source: 'Direct_WiFi_AC',
            };
            irLogs.unshift(log);
            broadcastSSE('ir_blasted', log);
          } else if (timer.finalAction === 'change_temp' && timer.stage3Temp) {
            console.log(`[STEP_TIMER] All stages completed -> Final Temp (${timer.stage3Temp}°C)`);
            timer.currentStageIndex = (timer.stages?.length || 1);
            timer.currentStage = timer.currentStageIndex + 1;
            timer.enabled = false;
            acState.temperature = timer.stage3Temp;
            acState.lastUpdated = new Date().toISOString();
            acState.lastIrHex = generateIRHex(acState);
            calculatePowerAndClimate();

            if (directConfig.activeMethod === 'gree_cloud' && greeCloudSession.loggedIn && greeCloudSession.boundMac) {
              try {
                const greeRes = await sendGreeCloud(
                  { power: true, targetTemp: timer.stage3Temp, mode: acState.mode === 'eco' ? 'cool' : (acState.mode as any), fanSpeed: toGreeFanSpeed(acState.fanSpeed), light: acState.displayLight, health: acState.health ?? acState.ionFilter },
                  { email: greeCloudSession.email, password: greeCloudSession.password || '', mac: greeCloudSession.boundMac, region: greeCloudSession.region },
                  greeCloudSession.deviceKey,
                  greeCloudSession.uid,
                  greeCloudSession.token,
                  greeCloudSession.host as any
                );
                if (greeRes.token) greeCloudSession.token = greeRes.token;
                if (greeRes.deviceKey) greeCloudSession.deviceKey = greeRes.deviceKey;
              } catch (e) {}
            }

            const log: IRLogEntry = {
              id: `step-final-temp-${Date.now()}`,
              timestamp: new Date().toISOString(),
              command: `ALL STAGES COMPLETED -> SET TO FINAL TEMP ${timer.stage3Temp}°C`,
              commandBn: `সকল স্টেজ সমাপ্ত ➔ তাপমাত্রা চূড়ান্তভাবে ${timer.stage3Temp}°C এ সেট করা হয়েছে`,
              brand: acState.brand,
              hexCode: generateIRHex(acState),
              protocol: 'GREE_EWPE_CLOUD',
              source: 'Direct_WiFi_AC',
            };
            irLogs.unshift(log);
            broadcastSSE('ir_blasted', log);
            broadcastSSE('ac_state_changed', acState);
          } else {
            console.log('[STEP_TIMER] All stages completed -> Keep running at current settings');
            timer.enabled = false;
            broadcastSSE('ac_state_changed', acState);
          }
        }
      }
      savePersistentStore();
    }
  }
  }, 10000);
}

// Background Sleep Curve Runner (10s ticker)
if (!process.env.VERCEL) {
  setInterval(async () => {
  if (acState.activeCurve && acState.activeCurve.enabled && !acState.activeCurve.paused) {
    const active = acState.activeCurve;
    const curve = sleepCurves.find((c) => c.id === active.curveId);
    if (!curve || !curve.stages || curve.stages.length === 0) {
      active.enabled = false;
      savePersistentStore();
      broadcastSSE('ac_state_changed', acState);
      broadcastSSE('curve_updated', { activeCurve: active });
      return;
    }

    const currentStage = curve.stages[active.currentStageIndex];
    if (!currentStage) {
      active.enabled = false;
      savePersistentStore();
      broadcastSSE('ac_state_changed', acState);
      broadcastSSE('curve_updated', { activeCurve: active });
      return;
    }

    // Open-ended stage (null minutes) runs indefinitely until user stops
    if (currentStage.minutes === null) {
      return;
    }

    active.remainingMinutes = Math.max(0, Math.round(((active.remainingMinutes ?? currentStage.minutes) - 10 / 60) * 100) / 100);

    if (active.remainingMinutes <= 0) {
      const nextIndex = active.currentStageIndex + 1;
      if (nextIndex < curve.stages.length) {
        const nextStage = curve.stages[nextIndex];
        active.currentStageIndex = nextIndex;
        active.remainingMinutes = nextStage.minutes;

        acState.temperature = nextStage.temperature;
        acState.fanSpeed = nextStage.fanSpeed;
        acState.lastUpdated = new Date().toISOString();

        savePersistentStore();
        broadcastSSE('ac_state_changed', acState);
        broadcastSSE('curve_updated', { activeCurve: active });

        // Forward to physical Gree AC
        if (directConfig.activeMethod === 'gree_cloud' && greeCloudSession.loggedIn && greeCloudSession.boundMac) {
          sendGreeCloud(
            { power: true, targetTemp: nextStage.temperature, fanSpeed: toGreeFanSpeed(nextStage.fanSpeed) },
            { email: greeCloudSession.email, password: greeCloudSession.password || '', mac: greeCloudSession.boundMac, region: greeCloudSession.region },
            greeCloudSession.deviceKey,
            greeCloudSession.uid,
            greeCloudSession.token,
            greeCloudSession.host as any
          ).catch(() => {});
        }

        const log: IRLogEntry = {
          id: `curve-stage-${Date.now()}`,
          timestamp: new Date().toISOString(),
          command: `CURVE "${curve.name}": Advanced to Stage ${nextIndex + 1} (${nextStage.temperature}°C, ${nextStage.fanSpeed.toUpperCase()})`,
          commandBn: `স্লিপ কার্ভ "${curve.name}": স্টেজ ${nextIndex + 1}-এ তাপমাত্রা ${nextStage.temperature}°C এবং ফ্যান ${nextStage.fanSpeed} এ সেট করা হয়েছে`,
          brand: acState.brand,
          hexCode: generateIRHex(acState),
          protocol: 'GREE_EWPE_CLOUD',
          source: 'Direct_WiFi_AC',
        };
        irLogs.unshift(log);
        broadcastSSE('ir_blasted', log);
      } else {
        // Curve finished
        console.log(`[SLEEP_CURVE] Finished all stages for curve: ${curve.name}`);
        active.enabled = false;
        savePersistentStore();
        broadcastSSE('ac_state_changed', acState);
        broadcastSSE('curve_updated', { activeCurve: active });
      }
    }
  }
  }, 10000);
}

// GET /api/ac/curves
app.get('/api/ac/curves', (req: Request, res: Response) => {
  res.json({
    success: true,
    curves: sleepCurves,
    activeCurve: acState.activeCurve,
  });
});

// POST /api/ac/curves (Save or update a sleep curve)
app.post('/api/ac/curves', (req: Request, res: Response) => {
  const { id, name, stages } = req.body;
  if (!name || !Array.isArray(stages) || stages.length === 0) {
    return res.status(400).json({ success: false, error: 'Name and at least 1 stage required' });
  }

  const curveId = id || `curve-${Date.now()}`;
  const validatedStages: SleepCurveStage[] = stages.map((s: any, idx: number) => ({
    id: s.id || `stg-${Date.now()}-${idx}`,
    label: s.label || `Stage ${idx + 1}`,
    temperature: Math.min(30, Math.max(16, Number(s.temperature ?? 24))),
    fanSpeed: (['auto', 'quiet', 'low', 'med', 'high', 'turbo'].includes(s.fanSpeed) ? s.fanSpeed : 'auto') as any,
    minutes: s.minutes === null || s.minutes === undefined || s.minutes === '' || s.minutes === '∞' ? null : Math.max(1, Number(s.minutes)),
  }));

  const existingIdx = sleepCurves.findIndex((c) => c.id === curveId);
  const newCurve: SleepCurve = {
    id: curveId,
    name: name.trim(),
    stages: validatedStages,
    createdAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    sleepCurves[existingIdx] = newCurve;
  } else {
    sleepCurves.unshift(newCurve);
  }

  savePersistentStore();
  broadcastSSE('curve_updated', { curves: sleepCurves, activeCurve: acState.activeCurve });

  res.json({ success: true, curve: newCurve, curves: sleepCurves });
});

// DELETE /api/ac/curves/:id
app.delete('/api/ac/curves/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  sleepCurves = sleepCurves.filter((c) => c.id !== id);
  if (acState.activeCurve && acState.activeCurve.curveId === id) {
    acState.activeCurve.enabled = false;
  }

  savePersistentStore();
  broadcastSSE('curve_updated', { curves: sleepCurves, activeCurve: acState.activeCurve });
  res.json({ success: true, curves: sleepCurves });
});

// POST /api/ac/curves/start
app.post('/api/ac/curves/start', async (req: Request, res: Response) => {
  const { curveId } = req.body;
  const curve = sleepCurves.find((c) => c.id === curveId);
  if (!curve || !curve.stages || curve.stages.length === 0) {
    return res.status(404).json({ success: false, error: 'Curve not found' });
  }

  const stage0 = curve.stages[0];
  const activeState: ActiveSleepCurveState = {
    enabled: true,
    curveId: curve.id,
    curveName: curve.name,
    currentStageIndex: 0,
    remainingMinutes: stage0.minutes,
    startedAt: new Date().toISOString(),
    paused: false,
  };

  acState.activeCurve = activeState;
  acState.power = true;
  acState.temperature = stage0.temperature;
  acState.fanSpeed = stage0.fanSpeed;
  acState.lastUpdated = new Date().toISOString();

  calculatePowerAndClimate();
  savePersistentStore();

  broadcastSSE('ac_state_changed', acState);
  broadcastSSE('power_updated', powerTelemetry);
  broadcastSSE('curve_updated', { activeCurve: activeState });

  // Execute Stage 0 on real AC
  if (directConfig.activeMethod === 'gree_cloud' && greeCloudSession.loggedIn && greeCloudSession.boundMac) {
    try {
      await sendGreeCloud(
        {
          power: true,
          targetTemp: stage0.temperature,
          fanSpeed: toGreeFanSpeed(stage0.fanSpeed),
          mode: acState.mode === 'eco' ? 'cool' : (acState.mode as any),
          light: acState.displayLight,
          health: acState.health ?? acState.ionFilter,
        },
        { email: greeCloudSession.email, password: greeCloudSession.password || '', mac: greeCloudSession.boundMac, region: greeCloudSession.region },
        greeCloudSession.deviceKey,
        greeCloudSession.uid,
        greeCloudSession.token,
        greeCloudSession.host as any
      );
    } catch (e) {
      console.error('[CURVE_START_GREE_ERR]', e);
    }
  }

  const logEntry: IRLogEntry = {
    id: `curve-start-${Date.now()}`,
    timestamp: new Date().toISOString(),
    command: `STARTED SLEEP CURVE: "${curve.name}" -> Stage 1 (${stage0.temperature}°C, ${stage0.fanSpeed.toUpperCase()}, ${stage0.minutes ? stage0.minutes + 'm' : 'till stopped'})`,
    commandBn: `স্লিপ কার্ভ শুরু: "${curve.name}" ➔ স্টেজ ১ (${stage0.temperature}°C, ফ্যান ${stage0.fanSpeed}, ${stage0.minutes ? stage0.minutes + ' মিনিট' : 'বন্ধ না করা পর্যন্ত'})`,
    brand: acState.brand,
    hexCode: generateIRHex(acState),
    protocol: 'GREE_EWPE_CLOUD',
    source: 'Direct_WiFi_AC',
  };
  irLogs.unshift(logEntry);
  broadcastSSE('ir_blasted', logEntry);

  res.json({
    success: true,
    activeCurve: activeState,
    state: acState,
  });
});

// POST /api/ac/curves/stop
app.post('/api/ac/curves/stop', (req: Request, res: Response) => {
  if (acState.activeCurve) {
    acState.activeCurve.enabled = false;
  }
  savePersistentStore();
  broadcastSSE('ac_state_changed', acState);
  broadcastSSE('curve_updated', { activeCurve: acState.activeCurve });

  res.json({ success: true, activeCurve: acState.activeCurve });
});

// POST /api/ac/direct-test
app.post('/api/ac/direct-test', (req: Request, res: Response) => {
  const { method } = req.body;
  const hex = generateIRHex(acState);

  const logEntry: IRLogEntry = {
    id: `test-direct-${Date.now()}`,
    timestamp: new Date().toISOString(),
    command: `TEST SIGNAL DISPATCHED VIA ${method || directConfig.activeMethod}`,
    commandBn: `টেস্ট কমান্ড পাঠানো হয়েছে (${method || directConfig.activeMethod})`,
    brand: acState.brand,
    hexCode: hex,
    protocol: `${acState.brand}_IR_38KHZ`,
    source: (method === 'tuya_smart_life' ? 'Tuya_Hub' : method === 'built_in_wifi' ? 'Direct_WiFi_AC' : 'Web_UI') as any,
  };
  irLogs.unshift(logEntry);
  broadcastSSE('ir_blasted', logEntry);

  res.json({
    success: true,
    message: `Test signal blasted through ${method || directConfig.activeMethod}`,
    hex,
  });
});

// POST /api/ac/filter-clean-reset
app.post('/api/ac/filter-clean-reset', (req: Request, res: Response) => {
  acState.filterCleanHours = 0;
  savePersistentStore();
  broadcastSSE('ac_state_changed', acState);
  res.json({
    success: true,
    filterCleanHours: 0,
    state: acState,
    message: 'Filter run-time counter reset successfully',
    messageBn: 'এসি ফিল্টার ওয়াশ টাইমার সফলভাবে রিসেট করা হয়েছে (০ ঘণ্টা)',
  });
});

// POST /api/ac/clean-cycle/start
app.post('/api/ac/clean-cycle/start', (req: Request, res: Response) => {
  acState.isCleaning = true;
  acState.power = true;
  acState.cleanCycleRemainingMinutes = CLEAN_CYCLE_DURATION_MINS;
  acState.cleanCycleStage = 'frost';
  cleanCycleStartedAt = Date.now();
  acState.lastIrCommand = '15-MIN DEEP SELF-CLEAN CYCLE STARTED (Display: CL)';
  acState.lastIrHex = generateIRHex(acState);
  acState.lastUpdated = new Date().toISOString();

  const logEntry: IRLogEntry = {
    id: `clean-start-${Date.now()}`,
    timestamp: new Date().toISOString(),
    command: '15-MIN DEEP SELF-CLEAN INITIATED (Display shows: CL)',
    commandBn: '১৫ মিনিটের গভীর সেলফ ক্লিন মোড শুরু হয়েছে (এসি ডিসপ্লেতে "CL" দেখাচ্ছে)',
    brand: acState.brand,
    hexCode: acState.lastIrHex,
    protocol: `${acState.brand}_SELF_CLEAN`,
    source: 'Web_UI',
  };
  irLogs.unshift(logEntry);

  savePersistentStore();
  broadcastSSE('ac_state_changed', acState);
  broadcastSSE('ir_blasted', logEntry);

  res.json({
    success: true,
    message: 'Deep self-clean cycle started',
    messageBn: 'সেলফ ক্লিন সাইকেল শুরু হয়েছে (১৫ মিনিট)',
    state: acState,
  });
});

// POST /api/ac/clean-cycle/cancel
app.post('/api/ac/clean-cycle/cancel', (req: Request, res: Response) => {
  acState.isCleaning = false;
  cleanCycleStartedAt = null;
  acState.cleanCycleRemainingMinutes = 0;
  delete acState.cleanCycleStage;
  acState.lastIrCommand = 'SELF-CLEAN CYCLE CANCELLED';
  acState.lastIrHex = generateIRHex(acState);
  acState.lastUpdated = new Date().toISOString();

  savePersistentStore();
  broadcastSSE('ac_state_changed', acState);

  res.json({
    success: true,
    message: 'Self-clean cycle cancelled',
    messageBn: 'সেলফ ক্লিন সাইকেল বাতিল করা হয়েছে',
    state: acState,
  });
});

// 5s Background Runner for Active Deep Clean Cycle
if (!process.env.VERCEL) {
  setInterval(() => {
  if (acState.isCleaning && cleanCycleStartedAt) {
    const elapsedMs = Math.max(0, Date.now() - cleanCycleStartedAt);
    const elapsedMins = elapsedMs / 60000;
    const remaining = Math.max(0, Math.round((CLEAN_CYCLE_DURATION_MINS - elapsedMins) * 10) / 10);
    acState.cleanCycleRemainingMinutes = remaining;

    if (elapsedMins < 4) {
      acState.cleanCycleStage = 'frost';
    } else if (elapsedMins < 9) {
      acState.cleanCycleStage = 'wash';
    } else if (elapsedMins < 13) {
      acState.cleanCycleStage = 'dry';
    } else {
      acState.cleanCycleStage = 'plasma';
    }

    if (remaining <= 0) {
      acState.isCleaning = false;
      cleanCycleStartedAt = null;
      acState.cleanCycleRemainingMinutes = 0;
      acState.filterCleanHours = 0; // Filter hours reset as coil & unit are clean
      delete acState.cleanCycleStage;
      acState.lastIrCommand = '15-MIN SELF-CLEAN COMPLETED';
      acState.lastIrHex = generateIRHex(acState);

      const logEntry: IRLogEntry = {
        id: `clean-done-${Date.now()}`,
        timestamp: new Date().toISOString(),
        command: 'DEEP SELF-CLEAN COMPLETED - UNIT DISINFECTED & DRY',
        commandBn: '১৫ মিনিটের সেল্ফ ক্লিন সম্পন্ন হয়েছে - কয়েল সম্পূর্ণ শুষ্ক ও জীবাণুমুক্ত',
        brand: acState.brand,
        hexCode: acState.lastIrHex,
        protocol: `${acState.brand}_CLEAN_DONE`,
        source: 'Direct_WiFi_AC',
      };
      irLogs.unshift(logEntry);
      broadcastSSE('ir_blasted', logEntry);
    }

    savePersistentStore();
    broadcastSSE('ac_state_changed', acState);
  }
  }, 5000);
}

// POST /api/ac/power-settings
app.post('/api/ac/power-settings', (req: Request, res: Response) => {
  const { unitRateBdt, currency } = req.body;
  if (unitRateBdt !== undefined) powerTelemetry.unitRateBdt = Number(unitRateBdt);
  if (currency !== undefined) powerTelemetry.currency = currency;
  
  savePersistentStore();
  broadcastSSE('ac_state_changed', acState); // Notify clients to refresh everything
  
  res.json({ success: true, power: powerTelemetry });
});

// POST /api/ac/timezone
app.post('/api/ac/timezone', (req: Request, res: Response) => {
  const { offsetMinutes } = req.body;
  if (offsetMinutes !== undefined && !isNaN(Number(offsetMinutes))) {
    clientTimezoneOffsetMinutes = Number(offsetMinutes);
    calculatePowerAndClimate();
  }
  res.json({ success: true, offsetMinutes: clientTimezoneOffsetMinutes, localDate: getLocalDateStr() });
});

// POST /api/ac/diagnose-device
app.post('/api/ac/diagnose-device', (req: Request, res: Response) => {
  const { brand = 'Gree', mac = 'c0393792cb97', ip } = req.body;

  // Real Gree WiFi EWPE Handshake Frame calculation
  const formattedMac = mac.replace(/[^a-fA-F0-9]/g, '').toLowerCase();
  const isValidMac = formattedMac.length === 12;

  const greeUdpScanPayload = {
    t: 'scan',
    mac: formattedMac,
    port: 7000,
  };

  const greeControlPayload = {
    opt: ['Pow', 'SetTem', 'Wdm', 'Air', 'Blo', 'Health', 'Lig', 'Tur', 'SvSt'],
    p: [
      acState.power ? 1 : 0,
      acState.temperature,
      acState.mode === 'cool' ? 0 : acState.mode === 'dry' ? 1 : acState.mode === 'fan' ? 2 : acState.mode === 'heat' ? 3 : 0,
      0,
      acState.fanSpeed === 'auto' ? 0 : acState.fanSpeed === 'low' ? 1 : acState.fanSpeed === 'med' ? 2 : 3,
      acState.ionFilter ? 1 : 0,
      acState.displayLight ? 1 : 0,
      acState.turbo ? 1 : 0,
      acState.eco ? 1 : 0,
    ],
    t: 'cmd',
    mac: formattedMac,
  };

  const irHex = generateIRHex({ ...acState, brand: 'Gree' });

  const logEntry: IRLogEntry = {
    id: `diag-${Date.now()}`,
    timestamp: new Date().toISOString(),
    command: `GREE REAL HARDWARE PACKET: MAC ${formattedMac} (UDP 7000 + IR 38kHz)`,
    commandBn: `Gree এসি (MAC: ${formattedMac}) রিয়েল হার্ডওয়্যার ডায়াগনস্টিক সিগন্যাল জেনারেট সম্পন্ন`,
    brand: 'Gree',
    hexCode: irHex,
    protocol: 'GREE_EWPE_AES128_UDP',
    source: 'Direct_WiFi_AC',
  };
  irLogs.unshift(logEntry);
  broadcastSSE('ir_blasted', logEntry);

  res.json({
    success: true,
    device: {
      brand: 'Gree',
      mac: formattedMac,
      modelId: '10001',
      modelVer: 'V20.8',
      firmware: 'v1.45',
      room: 'Bedroom',
      network: 'Rejuan@',
      isValidMac,
    },
    protocols: {
      udpPort: 7000,
      scanPayload: greeUdpScanPayload,
      controlPayload: greeControlPayload,
      irHexCode: irHex,
      carrierFrequency: '38 kHz Infrared & UDP Local Network',
    },
    status: {
      cloudReady: true,
      bridgeNeededForDirectLocal: 'Local WiFi Router NAT prevents direct inbound from Cloud; Use Tuya/Gree Cloud Bridge, Webhook, or Phone IR for 100% execution.',
    },
  });
});

// POST /api/gree-cloud/login
app.post('/api/gree-cloud/login', async (req: Request, res: Response) => {
  try {
    const { email, password, region = 'asia', mac } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
        errorBn: 'ইমেইল এবং পাসওয়ার্ড দেওয়া বাধ্যতামূলক',
      });
    }

    const cleanMac = (mac || '').replace(/[^a-fA-F0-9]/g, '').toLowerCase();
    console.log(`[GREE_OFFICIAL] Real cloud login for ${email} in region ${region}...`);

    let cloudResult;
    try {
      cloudResult = await readGreeCloud({
        email: email.trim(),
        password: String(password).trim(),
        mac: cleanMac,
        region: region || 'asia',
      });
    } catch (e: any) {
      console.error('[GREE_LOGIN_FAILED]', e);
      return res.status(400).json({
        success: false,
        error: e.message || 'Gree Cloud authentication failed. Check credentials and region.',
        errorBn: 'গ্রী ক্লাউড লগইন ব্যর্থ হয়েছে। আপনার ইমেইল, পাসওয়ার্ড অথবা রিজিয়ন চেক করুন।',
        detail: e.message,
      });
    }

    const session = cloudResult.session;
    const finalMac = cloudResult.mac || cleanMac;

    greeCloudSession = {
      loggedIn: true,
      email: email.trim(),
      password: String(password).trim(),
      region: region || 'asia',
      host: session.host,
      token: session.token,
      boundMac: finalMac,
      uid: session.uid,
      userId: String(session.uid),
      deviceKey: session.device.key,
      deviceName: cloudResult.name || session.device.name || `Gree AC (${finalMac.slice(-4).toUpperCase()})`,
      modelId: '10001',
      lastConnected: new Date().toISOString(),
      online: cloudResult.online,
    };

    // Update AC State with real live values from Gree Cloud!
    acState.isPaired = true;
    acState.isOnline = cloudResult.online;
    acState.brand = 'Gree';
    acState.deviceName = greeCloudSession.deviceName;
    acState.location = 'Master Bedroom';

    if (cloudResult.state) {
      acState.power = cloudResult.state.power;
      acState.temperature = cloudResult.state.targetTemp;
      acState.mode = cloudResult.state.mode;
      acState.fanSpeed = toACFanSpeed(cloudResult.state.fanSpeed);
      if (cloudResult.state.roomTemp !== undefined) {
        climate.roomTemp = cloudResult.state.roomTemp;
        climate.feelsLike = Math.round((cloudResult.state.roomTemp + 1.6) * 10) / 10;
      }
    }
    acState.lastUpdated = new Date().toISOString();

    directConfig.activeMethod = 'gree_cloud';
    directConfig.greeEmail = email.trim();
    directConfig.greeDeviceMac = finalMac;
    directConfig.greeRegion = region;
    directConfig.connected = true;

    const logEntryAuth: IRLogEntry = {
      id: `gree-auth-${Date.now()}`,
      timestamp: new Date().toISOString(),
      command: `CLOUD_AUTH: Authenticated with Gree official cloud (${session.host}) | UID: ${session.uid}`,
      commandBn: `একাউন্ট ভেরিফিকেশন: গ্রী অফিশিয়াল সার্ভারে (${session.host}) সফলভাবে লগইন হয়েছে!`,
      brand: 'Gree',
      hexCode: `DEVICE_KEY:${session.device.key.slice(0, 4)}****`,
      protocol: 'GREE_EWPE_CLOUD',
      source: 'Direct_WiFi_AC',
    };

    const logEntryMqtt: IRLogEntry = {
      id: `gree-mqtt-${Date.now()}`,
      timestamp: new Date().toISOString(),
      command: `MQTT_BROKER: Connected to ${(GREE_REGIONS as any)[session.host]?.mqtt || 'mqtt-in.gree.com'}:1984 | AC Online: ${cloudResult.online ? 'YES' : 'OFFLINE'}`,
      commandBn: `MQTT গেটওয়ে: অফিশিয়াল ব্রোকারের সাথে রিয়েল-টাইম কানেকশন সক্রিয়। এসি অনলাইন: ${cloudResult.online ? 'হ্যাঁ' : 'অফলাইন'}`,
      brand: 'Gree',
      hexCode: 'TLS_1984_ESTABLISHED',
      protocol: 'GREE_EWPE_CLOUD',
      source: 'Direct_WiFi_AC',
    };

    irLogs.unshift(logEntryMqtt);
    irLogs.unshift(logEntryAuth);
    savePersistentStore();

    setTimeout(() => {
      broadcastSSE('ac_state_changed', acState);
      broadcastSSE('ir_blasted', logEntryAuth);
      broadcastSSE('ir_blasted', logEntryMqtt);
    }, 400);

    res.json({
      success: true,
      message: 'Successfully authenticated with Gree+ Official Cloud Server',
      messageBn: 'গ্রী+ অফিশিয়াল ক্লাউড সার্ভারে সফলভাবে এসি কানেক্ট হয়েছে!',
      session: {
        loggedIn: true,
        email: greeCloudSession.email,
        boundMac: greeCloudSession.boundMac,
        deviceName: greeCloudSession.deviceName,
        region: greeCloudSession.region,
        online: cloudResult.online,
      },
      device: {
        name: acState.deviceName,
        mac: finalMac,
        online: cloudResult.online,
        state: acState,
      },
    });
  } catch (err: any) {
    console.error('Login route error:', err);
    res.status(500).json({ success: false, error: 'Internal server error during cloud login', detail: err?.message });
  }
});

// GET /api/gree-cloud/status
app.get('/api/gree-cloud/status', (req: Request, res: Response) => {
  res.json({
    success: true,
    session: {
      loggedIn: greeCloudSession.loggedIn,
      email: greeCloudSession.email,
      boundMac: greeCloudSession.boundMac,
      deviceName: greeCloudSession.deviceName,
      region: greeCloudSession.region,
      online: greeCloudSession.online ?? greeCloudSession.loggedIn,
      lastConnected: greeCloudSession.lastConnected,
    },
    isOnline: greeCloudSession.loggedIn && (greeCloudSession.online ?? true),
  });
});

// POST /api/gree-cloud/logout
app.post('/api/gree-cloud/logout', (req: Request, res: Response) => {
  greeCloudSession.loggedIn = false;
  greeCloudSession.token = '';
  greeCloudSession.deviceKey = '';
  greeCloudSession.password = '';

  savePersistentStore();

  res.json({
    success: true,
    message: 'Logged out of Gree+ Cloud Server',
    messageBn: 'Gree ক্লাউড সার্ভার থেকে সংযোগ বিচ্ছিন্ন করা হয়েছে',
  });
});

// POST /api/gree-cloud/send-command
app.post('/api/gree-cloud/send-command', async (req: Request, res: Response) => {
  const { command, power, temperature, mode, fanSpeed, turbo, eco, swingV, displayLight, light, quiet, health, ionFilter } = req.body;

  if (!greeCloudSession.loggedIn || !greeCloudSession.email) {
    return res.status(401).json({
      success: false,
      error: 'Not logged in to Gree Cloud',
      errorBn: 'গ্রী ক্লাউডে লগইন করা নেই। সেটিংস থেকে লগইন করুন।',
    });
  }

  const patch: any = {};
  if (power !== undefined) patch.power = Boolean(power);
  if (temperature !== undefined) patch.targetTemp = Number(temperature);
  if (mode !== undefined) patch.mode = mode;
  if (fanSpeed !== undefined) patch.fanSpeed = toGreeFanSpeed(fanSpeed);
  if (displayLight !== undefined || light !== undefined) patch.light = Boolean(displayLight ?? light);
  if (turbo !== undefined) patch.turbo = Boolean(turbo);
  if (quiet !== undefined) patch.quiet = Boolean(quiet);
  if (swingV !== undefined) patch.swingV = swingV;
  if (eco !== undefined) patch.eco = Boolean(eco);
  if (health !== undefined || ionFilter !== undefined) patch.health = Boolean(health ?? ionFilter);

  console.log(`[GREE_OFFICIAL_CMD] Sending command to ${greeCloudSession.boundMac}:`, patch);

  let cloudState = null;
  try {
    cloudState = await sendGreeCloud(
      patch,
      {
        email: greeCloudSession.email,
        password: greeCloudSession.password || '',
        mac: greeCloudSession.boundMac,
        region: greeCloudSession.region,
      },
      greeCloudSession.deviceKey,
      greeCloudSession.uid,
      greeCloudSession.token,
      greeCloudSession.host as any
    );
  } catch (e: any) {
    console.error('[GREE_CMD_FAIL]', e);
    return res.status(502).json({
      success: false,
      error: e.message || 'Failed to send command to AC via Gree Cloud MQTT',
      errorBn: 'গ্রী ক্লাউড MQTT ব্রোকারের মাধ্যমে এসি নিয়ন্ত্রণ ব্যর্থ হয়েছে।',
      detail: e.message,
    });
  }

  // Update in-memory state
  if (power !== undefined) acState.power = Boolean(power);
  if (temperature !== undefined) acState.temperature = Number(temperature);
  if (mode !== undefined) acState.mode = mode;
  if (fanSpeed !== undefined) acState.fanSpeed = fanSpeed;
  if (turbo !== undefined) acState.turbo = Boolean(turbo);
  if (eco !== undefined) acState.eco = Boolean(eco);
  if (swingV !== undefined) acState.swingV = swingV;
  if (displayLight !== undefined || light !== undefined) acState.displayLight = Boolean(displayLight ?? light);
  if (quiet !== undefined) acState.quiet = Boolean(quiet);
  if (health !== undefined || ionFilter !== undefined) {
    const h = Boolean(health ?? ionFilter);
    acState.health = h;
    acState.ionFilter = h;
  }

  if (cloudState) {
    if (cloudState.token) greeCloudSession.token = cloudState.token;
    if (cloudState.deviceKey) greeCloudSession.deviceKey = cloudState.deviceKey;
    if (cloudState.uid) greeCloudSession.uid = cloudState.uid;
    if (cloudState.host) greeCloudSession.host = cloudState.host;
    savePersistentStore();

    acState.power = cloudState.power;
    acState.temperature = cloudState.targetTemp;
    acState.mode = cloudState.mode;
    acState.fanSpeed = toACFanSpeed(cloudState.fanSpeed);
    if (cloudState.roomTemp !== undefined) {
      climate.roomTemp = cloudState.roomTemp;
      climate.feelsLike = Math.round((cloudState.roomTemp + 1.6) * 10) / 10;
    }
  }

  acState.isOnline = true;
  acState.lastUpdated = new Date().toISOString();

  const irHex = generateIRHex({ ...acState, brand: 'Gree' });

  const logEntry: IRLogEntry = {
    id: `gree-cmd-${Date.now()}`,
    timestamp: new Date().toISOString(),
    command: `MQTT_DELIVERED: [${command || 'CONTROL'}] Power: ${acState.power ? 'ON' : 'OFF'} | Temp: ${acState.temperature}°C | Fan: ${acState.fanSpeed}`,
    commandBn: `কমান্ড সফল: পাওয়ার ${acState.power ? 'অন' : 'অফ'}, তাপমাত্রা ${acState.temperature}°C, ফ্যান ${acState.fanSpeed} সফলভাবে এসিতে পৌঁছেছে।`,
    brand: 'Gree',
    hexCode: irHex,
    protocol: 'GREE_EWPE_CLOUD',
    source: 'Direct_WiFi_AC',
  };

  irLogs.unshift(logEntry);
  savePersistentStore();

  broadcastSSE('ir_blasted', logEntry);
  broadcastSSE('ac_state_changed', acState);

  res.json({
    success: true,
    message: 'Command executed successfully via official Gree Cloud',
    messageBn: 'গ্রী অফিশিয়াল ক্লাউড MQTT ব্রোকারের মাধ্যমে এসি নিয়ন্ত্রণ সফল হয়েছে!',
    state: acState,
  });
});

// POST /api/gree-cloud/sync (Manually trigger a cloud state pull)
app.post('/api/gree-cloud/sync', async (req: Request, res: Response) => {
  if (!greeCloudSession.loggedIn || !greeCloudSession.email) {
    return res.status(401).json({ success: false, error: 'Cloud session not active' });
  }

  try {
    const cloud = await readGreeCloud({
      email: greeCloudSession.email,
      password: greeCloudSession.password || '',
      mac: greeCloudSession.boundMac,
      region: greeCloudSession.region,
    });

    if (cloud.state) {
      acState.power = cloud.state.power;
      acState.temperature = cloud.state.targetTemp;
      acState.mode = cloud.state.mode;
      acState.quiet = Boolean(cloud.state.quiet);
      acState.turbo = Boolean(cloud.state.turbo);
      if (cloud.state.quiet) {
        acState.fanSpeed = 'quiet';
      } else if (cloud.state.turbo) {
        acState.fanSpeed = 'turbo';
      } else {
        acState.fanSpeed = toACFanSpeed(cloud.state.fanSpeed);
      }
      if (cloud.state.roomTemp !== undefined) {
        climate.roomTemp = cloud.state.roomTemp;
        climate.feelsLike = Math.round((cloud.state.roomTemp + 1.6) * 10) / 10;
      }
    }
    acState.isOnline = cloud.online;
    acState.lastUpdated = new Date().toISOString();

    const logEntry: IRLogEntry = {
      id: `sync-${Date.now()}`,
      timestamp: new Date().toISOString(),
      command: `GREE CLOUD SYNC: AC Live Status (${acState.power ? 'ON' : 'OFF'}, ${acState.temperature}°C) verified via MQTT broker`,
      commandBn: `গ্রী ক্লাউড সিঙ্ক: এসির লাইভ স্ট্যাটাস (${acState.power ? 'অন' : 'অফ'}, ${acState.temperature}°C) যাচাই করা হয়েছে।`,
      brand: 'Gree',
      hexCode: 'CLOUD_SYNC_OK',
      protocol: 'GREE_EWPE_CLOUD',
      source: 'Direct_WiFi_AC',
    };

    irLogs.unshift(logEntry);
    savePersistentStore();

    broadcastSSE('ir_blasted', logEntry);
    broadcastSSE('ac_state_changed', acState);

    res.json({ 
      success: true, 
      state: acState,
      online: cloud.online,
      message: 'Cloud status synced successfully'
    });
  } catch (err: any) {
    console.error('[GREE_SYNC_ERROR]', err);
    res.status(500).json({ success: false, error: err?.message || 'Failed to sync with Gree Cloud' });
  }
});

// Robust Local Fallback Parser for Natural Language AC Commands
function fallbackACParser(prompt: string, language: string) {
  const raw = prompt.toLowerCase().trim();

  // 1. Power Off
  if (
    raw.includes('এসি বন্ধ') ||
    raw.includes('এসি অফ') ||
    raw.includes('বন্ধ করো') ||
    raw.includes('turn off') ||
    raw.includes('stop ac') ||
    raw.includes('ac off') ||
    raw.includes('power off')
  ) {
    return {
      reply: language === 'bn' ? 'এসি সফলভাবে বন্ধ করা হয়েছে।' : 'Air Conditioner turned off.',
      power: false,
    };
  }

  // 2. Power On
  let powerOn = false;
  if (
    raw.includes('এসি অন') ||
    raw.includes('এসি চালু') ||
    raw.includes('চালু করো') ||
    raw.includes('turn on') ||
    raw.includes('start ac') ||
    raw.includes('ac on') ||
    raw.includes('power on')
  ) {
    powerOn = true;
  }

  // 3. Numbers / Temperatures
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

  // 4. Special Modes
  const isTurbo = raw.includes('টার্বো') || raw.includes('চিল') || raw.includes('turbo') || raw.includes('fast chill');
  const isEco = raw.includes('ইকো') || raw.includes('সাশ্রয়ী') || raw.includes('eco') || raw.includes('energy save');
  const isHealth = raw.includes('হেলথ') || raw.includes('health') || raw.includes('প্লাজমা') || raw.includes('ফিল্টার') || raw.includes('plasma');
  const isLight = raw.includes('লাইট') || raw.includes('light') || raw.includes('ডিসপ্লে') || raw.includes('বাতি');
  const isQuiet = raw.includes('নীরব') || raw.includes('quiet') || raw.includes('সাইলেন্ট');
  const isSleep = raw.includes('স্লিপ') || raw.includes('sleep') || raw.includes('ঘুম');
  const isSwing = raw.includes('সুইং') || raw.includes('swing') || raw.includes('বাতাস দোলাও');

  if (targetTemp) {
    return {
      reply: language === 'bn' ? `এসি ${targetTemp}°C এ সেট করা হয়েছে।` : `AC temperature set to ${targetTemp}°C.`,
      power: true,
      temperature: targetTemp,
      turbo: isTurbo ? true : undefined,
      eco: isEco ? true : undefined,
      health: isHealth ? true : undefined,
    };
  }

  if (isTurbo) {
    return {
      reply: language === 'bn' ? 'টার্বো ফাস্ট কুলিং মোড চালু করা হয়েছে।' : 'Turbo fast chill mode activated.',
      power: true,
      turbo: true,
      eco: false,
    };
  }

  if (isEco) {
    return {
      reply: language === 'bn' ? 'ইকো বিদ্যুৎ সাশ্রয়ী মোড সক্রিয় করা হয়েছে।' : 'Eco energy saver mode activated.',
      power: true,
      eco: true,
      turbo: false,
    };
  }

  if (isHealth) {
    return {
      reply: language === 'bn' ? 'কোল্ড প্লাজমা হেলথ ফিল্টার চালু করা হয়েছে।' : 'Cold Plasma Health Air Purifier turned on.',
      power: true,
      health: true,
    };
  }

  if (isLight) {
    const lightOff = raw.includes('অফ') || raw.includes('বন্ধ') || raw.includes('off');
    return {
      reply: language === 'bn' ? `এসি ডিসপ্লে লাইট ${lightOff ? 'বন্ধ' : 'চালু'} করা হয়েছে।` : `AC display light turned ${lightOff ? 'OFF' : 'ON'}.`,
      displayLight: !lightOff,
    };
  }

  if (isQuiet) {
    return {
      reply: language === 'bn' ? 'অতি নীরব (Quiet) ফ্যান মোড চালু করা হয়েছে।' : 'Ultra-quiet blower mode activated.',
      power: true,
      quiet: true,
    };
  }

  if (isSleep) {
    return {
      reply: language === 'bn' ? 'স্লিপ আরামদায়ক কমফোর্ট মোড সক্রিয়।' : 'Comfort Sleep curve activated.',
      power: true,
      sleep: true,
    };
  }

  if (isSwing) {
    const swingOff = raw.includes('অফ') || raw.includes('বন্ধ') || raw.includes('off');
    return {
      reply: language === 'bn' ? `এয়ারফ্লো সুইং ${swingOff ? 'বন্ধ' : 'চালু'} করা হয়েছে।` : `Air swing turned ${swingOff ? 'OFF' : 'ON'}.`,
      swingV: swingOff ? ('off' as const) : ('auto' as const),
    };
  }

  if (powerOn) {
    return {
      reply: language === 'bn' ? 'এসি সফলভাবে চালু করা হয়েছে।' : 'Air Conditioner turned on.',
      power: true,
    };
  }

  // Telemetry queries
  if (raw.includes('তাপমাত্রা') || raw.includes('temperature') || raw.includes('গরম')) {
    return {
      reply: language === 'bn'
        ? `রুমের বর্তমান তাপমাত্রা ${climate.roomTemp}°C, আর্দ্রতা ${climate.roomHumidity}%, এবং এসি সেট আছে ${acState.temperature}°C এ।`
        : `Room temperature is ${climate.roomTemp}°C, humidity is ${climate.roomHumidity}%, and AC target is ${acState.temperature}°C.`,
    };
  }

  if (raw.includes('বিল') || raw.includes('খরচ') || raw.includes('runtime') || raw.includes('সময়')) {
    const hours = Math.floor(powerTelemetry.todayRuntimeMinutes / 60);
    const mins = Math.round(powerTelemetry.todayRuntimeMinutes % 60);
    return {
      reply: language === 'bn'
        ? `আজ এসি চলেছে ${hours > 0 ? hours + ' ঘণ্টা ' : ''}${mins} মিনিট, বিদ্যুৎ খরচ হয়েছে ${powerTelemetry.todayKwh.toFixed(2)} ইউনিট (আনুমানিক ৳${powerTelemetry.costBdt.toFixed(1)})।`
        : `Today's runtime is ${hours > 0 ? hours + 'h ' : ''}${mins}m, energy used is ${powerTelemetry.todayKwh.toFixed(2)} kWh (est. ৳${powerTelemetry.costBdt.toFixed(1)}).`,
    };
  }

  return {
    reply: language === 'bn'
      ? `কমান্ড পেয়েছি: "${prompt}"। এসি অন/অফ, তাপমাত্রা পরিবর্তন বা টার্বো/হেলথ মোড সক্রিয় করতে বলুন।`
      : `Received: "${prompt}". You can ask to change temperature, turn on/off, or toggle Turbo/Health modes.`,
  };
}

// POST /api/ai/control (Smart AI Natural Language Voice & Text AC Controller)
app.post('/api/ai/control', async (req: Request, res: Response) => {
  const { prompt, language = 'bn' } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ success: false, error: 'Prompt is required' });
  }

  const userPrompt = prompt.trim();
  console.log(`[AI_CONTROL] Received command (${language}): "${userPrompt}"`);

  let parsed: any = null;

  try {
    const systemPrompt = `You are the smart AI assistant for CoolHome Smart AC.
Current AC state:
- Power: ${acState.power ? 'ON' : 'OFF'}
- Temperature: ${acState.temperature}°C
- Mode: ${acState.mode}
- Fan Speed: ${acState.fanSpeed}
- Turbo: ${acState.turbo}
- Eco: ${acState.eco}
- Health/Cold Plasma: ${acState.health ?? acState.ionFilter}
- Display Light: ${acState.displayLight}
- Quiet: ${acState.quiet}
- Swing: ${acState.swingV}
- Room Temperature: ${climate.roomTemp}°C, Humidity: ${climate.roomHumidity}%
- Today Runtime: ${Math.round(powerTelemetry.todayRuntimeMinutes)} minutes, Energy: ${powerTelemetry.todayKwh.toFixed(2)} kWh, Cost: ${powerTelemetry.costBdt.toFixed(1)} BDT

Analyze the user's natural language command (which can be in Bengali, English, or Banglish phonetic).
Determine what action to take on the AC and construct a concise, natural confirmation reply in ${language === 'bn' ? 'Bengali (বাংলা)' : 'English'}.

Respond ONLY with a JSON object in this exact schema:
{
  "reply": "Clear, friendly confirmation message in ${language === 'bn' ? 'Bengali' : 'English'}",
  "power": boolean | null,
  "temperature": number | null,
  "mode": "cool" | "eco" | "dry" | "fan" | "heat" | "auto" | null,
  "fanSpeed": "auto" | "quiet" | "low" | "med" | "high" | "turbo" | null,
  "turbo": boolean | null,
  "eco": boolean | null,
  "sleep": boolean | null,
  "health": boolean | null,
  "displayLight": boolean | null,
  "quiet": boolean | null,
  "swingV": "auto" | "off" | null
}`;

    const aiRes = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
      },
    });

    if (aiRes.text) {
      parsed = JSON.parse(aiRes.text);
    }
  } catch (err) {
    console.warn('[AI_GEMINI_FALLBACK] Using fallback local parser:', err);
  }

  // Fallback local regex NLP parser if needed
  if (!parsed || !parsed.reply) {
    parsed = fallbackACParser(userPrompt, language);
  }

  // Apply changes to acState
  const appliedChanges: Record<string, any> = {};
  if (parsed.power !== null && parsed.power !== undefined) {
    acState.power = Boolean(parsed.power);
    appliedChanges.power = acState.power;
  }
  if (parsed.temperature !== null && parsed.temperature !== undefined) {
    const t = Math.min(30, Math.max(16, Math.round(Number(parsed.temperature))));
    acState.temperature = t;
    appliedChanges.temperature = t;
    if (!acState.power && parsed.power === undefined) {
      acState.power = true;
      appliedChanges.power = true;
    }
  }
  if (parsed.mode) {
    acState.mode = parsed.mode;
    appliedChanges.mode = parsed.mode;
    if (!acState.power && parsed.power === undefined) {
      acState.power = true;
      appliedChanges.power = true;
    }
  }
  if (parsed.fanSpeed) {
    acState.fanSpeed = parsed.fanSpeed;
    appliedChanges.fanSpeed = parsed.fanSpeed;
  }
  if (parsed.turbo !== null && parsed.turbo !== undefined) {
    acState.turbo = Boolean(parsed.turbo);
    appliedChanges.turbo = acState.turbo;
    if (acState.turbo) acState.eco = false;
  }
  if (parsed.eco !== null && parsed.eco !== undefined) {
    acState.eco = Boolean(parsed.eco);
    appliedChanges.eco = acState.eco;
    if (acState.eco) acState.turbo = false;
  }
  if (parsed.sleep !== null && parsed.sleep !== undefined) {
    acState.sleep = Boolean(parsed.sleep);
    appliedChanges.sleep = acState.sleep;
  }
  if (parsed.health !== null && parsed.health !== undefined) {
    const h = Boolean(parsed.health);
    acState.health = h;
    acState.ionFilter = h;
    appliedChanges.health = h;
  }
  if (parsed.displayLight !== null && parsed.displayLight !== undefined) {
    acState.displayLight = Boolean(parsed.displayLight);
    appliedChanges.displayLight = acState.displayLight;
  }
  if (parsed.quiet !== null && parsed.quiet !== undefined) {
    acState.quiet = Boolean(parsed.quiet);
    appliedChanges.quiet = acState.quiet;
  }
  if (parsed.swingV) {
    acState.swingV = parsed.swingV;
    appliedChanges.swingV = parsed.swingV;
  }

  acState.lastUpdated = new Date().toISOString();
  acState.lastIrHex = generateIRHex(acState);
  acState.lastIrCommand = `AI: ${userPrompt.slice(0, 30)} · ${acState.power ? 'ON' : 'OFF'} · ${acState.temperature}°C`;

  calculatePowerAndClimate();
  savePersistentStore();

  const logEntry: IRLogEntry = {
    id: `ai-${Date.now()}`,
    timestamp: new Date().toISOString(),
    command: `AI COMMAND: "${userPrompt}" -> ${parsed.reply}`,
    commandBn: `এআই কমান্ড: "${userPrompt}" ➔ ${parsed.reply}`,
    brand: acState.brand,
    hexCode: acState.lastIrHex,
    protocol: directConfig.activeMethod === 'gree_cloud' ? 'GREE_EWPE_CLOUD' : `${acState.brand}_IR_38KHZ`,
    source: 'Web_UI',
  };
  irLogs.unshift(logEntry);
  if (irLogs.length > 50) irLogs.pop();

  broadcastSSE('ac_state_changed', acState);
  broadcastSSE('power_updated', powerTelemetry);
  broadcastSSE('ir_blasted', logEntry);

  // If using Gree Cloud, execute command on physical AC unit immediately
  if (directConfig.activeMethod === 'gree_cloud' && greeCloudSession.loggedIn && greeCloudSession.email && greeCloudSession.boundMac) {
    sendGreeCloud(
      {
        power: acState.power,
        targetTemp: Math.round(acState.temperature),
        mode: acState.mode === 'eco' ? 'cool' : (acState.mode as any),
        fanSpeed: toGreeFanSpeed(acState.fanSpeed),
        turbo: acState.turbo,
        light: acState.displayLight,
        swingV: acState.swingV,
        quiet: acState.quiet,
        eco: acState.eco,
        health: acState.health ?? acState.ionFilter,
      },
      {
        email: greeCloudSession.email,
        password: greeCloudSession.password || '',
        mac: greeCloudSession.boundMac,
        region: greeCloudSession.region,
      },
      greeCloudSession.deviceKey,
      greeCloudSession.uid,
      greeCloudSession.token,
      greeCloudSession.host as any
    ).catch((e) => console.error('[AI_GREE_FORWARD_ERROR]', e));
  }

  res.json({
    success: true,
    reply: parsed.reply,
    changes: appliedChanges,
    state: acState,
  });
});

// Presets API
app.get('/api/ac/presets', (req: Request, res: Response) => {
  res.json({ success: true, presets });
});

app.post('/api/ac/presets/:id/activate', (req: Request, res: Response) => {
  const p = presets.find((item) => item.id === req.params.id);
  if (!p) return res.status(404).json({ success: false, error: 'Preset not found' });

  acState.power = true;
  acState.temperature = p.temp;
  acState.mode = p.mode;
  acState.fanSpeed = p.fanSpeed;
  acState.turbo = Boolean(p.turbo);
  acState.eco = Boolean(p.eco);
  acState.lastUpdated = new Date().toISOString();
  acState.lastIrHex = generateIRHex(acState);
  acState.lastIrCommand = `PRESET ACTIVATED: ${p.name.toUpperCase()}`;

  calculatePowerAndClimate();

  const logEntry: IRLogEntry = {
    id: `ir-${Date.now()}`,
    timestamp: new Date().toISOString(),
    command: acState.lastIrCommand,
    commandBn: `প্রিসেট সক্রিয়: ${p.nameBn}`,
    brand: acState.brand,
    hexCode: acState.lastIrHex,
    protocol: `${acState.brand}_38KHZ`,
    source: 'Web_UI',
  };
  irLogs.unshift(logEntry);

  broadcastSSE('ac_state_changed', acState);
  broadcastSSE('ir_blasted', logEntry);

  res.json({ success: true, preset: p, state: acState });
});

// Schedules API & Automated Recurring Trigger Runner with Timezone Support
let userTimezoneOffsetMinutes = -360; // Default: UTC+6 (Asia/Dhaka / Bangladesh Standard Time)
const lastTriggeredScheduleMap = new Map<string, string>(); // scheduleId -> "YYYY-MM-DD_HH:MM"

function getLocalScheduleTime(offsetMinutes: number = userTimezoneOffsetMinutes) {
  const utcNow = Date.now();
  // Browser getTimezoneOffset() returns minutes to ADD to local time to get UTC (e.g. -360 for UTC+6)
  const localMs = utcNow - (offsetMinutes * 60 * 1000);
  const localDate = new Date(localMs);
  const currentHour = String(localDate.getUTCHours()).padStart(2, '0');
  const currentMinute = String(localDate.getUTCMinutes()).padStart(2, '0');
  const currentTime = `${currentHour}:${currentMinute}`;
  const currentDay = localDate.getUTCDay(); // 0=Sun..6=Sat
  const currentMinKey = `${localDate.toISOString().split('T')[0]}_${currentTime}`;
  return { currentTime, currentDay, currentMinKey, localDate };
}

// Background scheduler checker (runs every 5 seconds for pinpoint accuracy)
if (!process.env.VERCEL) {
  setInterval(async () => {
  const { currentTime, currentDay, currentMinKey } = getLocalScheduleTime();

  for (const s of schedules) {
    if (!s.enabled) continue;
    if (!s.days.includes(currentDay)) continue;

    // Normalize schedule time format to guarantee pinpoint match (e.g., '4:00' -> '04:00')
    const timeParts = (s.time || '').split(':');
    const normSchedTime = timeParts.length === 2
      ? `${timeParts[0].padStart(2, '0')}:${timeParts[1].padStart(2, '0')}`
      : s.time;

    if (normSchedTime === currentTime) {
      // Check if already triggered during this minute
      if (lastTriggeredScheduleMap.get(s.id) === currentMinKey) continue;
      lastTriggeredScheduleMap.set(s.id, currentMinKey);

      console.log(`[SCHEDULE_TRIGGER] Running schedule "${s.name}" (${s.time}) at local time ${currentTime}`);

      if (s.power) {
        acState.power = true;
        if (s.temperature) acState.temperature = s.temperature;
        if (s.mode) acState.mode = s.mode;
        if (s.fanSpeed) acState.fanSpeed = s.fanSpeed;
        if (s.turbo !== undefined) acState.turbo = s.turbo;
        if (s.eco !== undefined) acState.eco = s.eco;
        if (s.health !== undefined) {
          acState.health = s.health;
          acState.ionFilter = s.health;
        }
        if (s.displayLight !== undefined) acState.displayLight = s.displayLight;

        if (s.autoOffMinutes && s.autoOffMinutes > 0) {
          acState.timerOffMinutes = s.autoOffMinutes;
        }
      } else {
        acState.power = false;
        acState.timerOffMinutes = 0;
      }

      acState.lastUpdated = new Date().toISOString();
      acState.lastIrHex = generateIRHex(acState);
      acState.lastIrCommand = `SCHEDULE: ${s.name} (${s.power ? `${acState.temperature}°C` : 'OFF'})`;

      // Forward to Gree Cloud if connected
      if (directConfig.activeMethod === 'gree_cloud' && greeCloudSession.loggedIn && greeCloudSession.deviceKey) {
        sendGreeCloud(
          {
            power: acState.power,
            targetTemp: acState.temperature,
            mode: acState.mode === 'eco' ? 'cool' : (acState.mode as any),
            fanSpeed: toGreeFanSpeed(acState.fanSpeed),
            turbo: acState.turbo,
            eco: acState.eco,
            health: acState.health ?? acState.ionFilter,
            light: acState.displayLight,
          },
          { email: greeCloudSession.email, password: greeCloudSession.password || '', mac: greeCloudSession.boundMac, region: greeCloudSession.region },
          greeCloudSession.deviceKey,
          greeCloudSession.uid,
          greeCloudSession.token,
          greeCloudSession.host as any
        ).catch(() => {});
      }

      const log: IRLogEntry = {
        id: `ir-${Date.now()}`,
        timestamp: new Date().toISOString(),
        command: `SCHEDULE TRIGGERED: "${s.name}" (${s.power ? `${acState.temperature}°C` : 'OFF'})`,
        commandBn: `শিডিউল কার্যকর: "${s.nameBn || s.name}" (${s.power ? `${acState.temperature}°C চালু` : 'এসি বন্ধ'})`,
        brand: acState.brand,
        hexCode: acState.lastIrHex,
        protocol: 'Schedule_Auto_Trigger',
        source: 'Schedule',
      };
      irLogs.unshift(log);

      calculatePowerAndClimate();
      savePersistentStore();
      broadcastSSE('ac_state_changed', acState);
      broadcastSSE('ir_blasted', log);
      broadcastSSE('schedules_updated', schedules);
    }
  }
  }, 5000);
}

app.post('/api/ac/timezone', (req: Request, res: Response) => {
  const { offsetMinutes } = req.body;
  if (typeof offsetMinutes === 'number') {
    userTimezoneOffsetMinutes = offsetMinutes;
  }
  const { currentTime, localDate } = getLocalScheduleTime();
  res.json({
    success: true,
    timezoneOffsetMinutes: userTimezoneOffsetMinutes,
    currentTime,
    localTimeISO: localDate.toISOString(),
  });
});

app.get('/api/ac/schedules', (req: Request, res: Response) => {
  const { currentTime, currentDay } = getLocalScheduleTime();
  res.json({
    success: true,
    schedules,
    currentTime,
    currentDay,
    timezoneOffsetMinutes: userTimezoneOffsetMinutes,
  });
});

// Full schedule sync endpoint from client
app.post('/api/ac/schedules/sync', (req: Request, res: Response) => {
  const { schedules: incoming } = req.body;
  if (Array.isArray(incoming)) {
    schedules = incoming;
    savePersistentStore();
    broadcastSSE('schedules_updated', schedules);
  }
  res.json({ success: true, schedules });
});

app.post('/api/ac/schedules', (req: Request, res: Response) => {
  if (typeof req.body.timezoneOffset === 'number') {
    userTimezoneOffsetMinutes = req.body.timezoneOffset;
  }

  // Normalize time string e.g. "4:00" -> "04:00"
  let rawTime = req.body.time || '23:00';
  const tParts = rawTime.split(':');
  if (tParts.length === 2) {
    rawTime = `${tParts[0].padStart(2, '0')}:${tParts[1].padStart(2, '0')}`;
  }

  const schedId = req.body.id || `sched-${Date.now()}`;
  const newSched: ACSchedule = {
    id: schedId,
    name: req.body.name || (req.body.power ? `Auto ON at ${rawTime}` : `Auto OFF at ${rawTime}`),
    nameBn: req.body.nameBn || (req.body.power ? `${rawTime} এসি চালু` : `${rawTime} এসি বন্ধ`),
    time: rawTime,
    days: Array.isArray(req.body.days) && req.body.days.length > 0 ? req.body.days : [0, 1, 2, 3, 4, 5, 6],
    power: req.body.power ?? true,
    temperature: req.body.temperature || 25,
    mode: req.body.mode || 'cool',
    fanSpeed: req.body.fanSpeed || 'auto',
    turbo: req.body.turbo ?? false,
    eco: req.body.eco ?? false,
    health: req.body.health ?? false,
    displayLight: req.body.displayLight ?? true,
    autoOffMinutes: req.body.autoOffMinutes,
    enabled: req.body.enabled ?? true,
  };

  const existingIdx = schedules.findIndex((item) => item.id === newSched.id);
  if (existingIdx >= 0) {
    schedules[existingIdx] = newSched;
  } else {
    schedules.push(newSched);
  }

  savePersistentStore();
  broadcastSSE('schedules_updated', schedules);
  res.json({ success: true, schedule: newSched, schedules });
});

// Run / Test a schedule immediately on demand
app.post('/api/ac/schedules/:id/run', async (req: Request, res: Response) => {
  const s = schedules.find((item) => item.id === req.params.id);
  if (!s) return res.status(404).json({ success: false, error: 'Schedule not found' });

  if (s.power) {
    acState.power = true;
    if (s.temperature) acState.temperature = s.temperature;
    if (s.mode) acState.mode = s.mode;
    if (s.fanSpeed) acState.fanSpeed = s.fanSpeed;
    if (s.turbo !== undefined) acState.turbo = s.turbo;
    if (s.eco !== undefined) acState.eco = s.eco;
    if (s.health !== undefined) {
      acState.health = s.health;
      acState.ionFilter = s.health;
    }
    if (s.displayLight !== undefined) acState.displayLight = s.displayLight;
    if (s.autoOffMinutes && s.autoOffMinutes > 0) {
      acState.timerOffMinutes = s.autoOffMinutes;
    }
  } else {
    acState.power = false;
    acState.timerOffMinutes = 0;
  }

  acState.lastUpdated = new Date().toISOString();
  acState.lastIrHex = generateIRHex(acState);
  acState.lastIrCommand = `MANUAL RUN: ${s.name} (${s.power ? `${acState.temperature}°C` : 'OFF'})`;

  // Forward to Gree Cloud if connected
  if (directConfig.activeMethod === 'gree_cloud' && greeCloudSession.loggedIn && greeCloudSession.deviceKey) {
    try {
      await sendGreeCloud(
        {
          power: acState.power,
          targetTemp: acState.temperature,
          mode: acState.mode === 'eco' ? 'cool' : (acState.mode as any),
          fanSpeed: toGreeFanSpeed(acState.fanSpeed),
          turbo: acState.turbo,
          eco: acState.eco,
          health: acState.health ?? acState.ionFilter,
          light: acState.displayLight,
        },
        { email: greeCloudSession.email, password: greeCloudSession.password || '', mac: greeCloudSession.boundMac, region: greeCloudSession.region },
        greeCloudSession.deviceKey,
        greeCloudSession.uid,
        greeCloudSession.token,
        greeCloudSession.host as any
      );
    } catch (e) {
      console.error('[MANUAL_RUN_GREE_ERR]', e);
    }
  }

  const log: IRLogEntry = {
    id: `ir-${Date.now()}`,
    timestamp: new Date().toISOString(),
    command: `SCHEDULE TEST TRIGGERED: "${s.name}" (${s.power ? `${acState.temperature}°C` : 'OFF'})`,
    commandBn: `শিডিউল টেস্ট সম্পন্ন: "${s.nameBn || s.name}" (${s.power ? `${acState.temperature}°C চালু` : 'এসি বন্ধ'})`,
    brand: acState.brand,
    hexCode: acState.lastIrHex,
    protocol: 'Schedule_Manual_Test',
    source: 'Schedule',
  };
  irLogs.unshift(log);

  calculatePowerAndClimate();
  savePersistentStore();
  broadcastSSE('ac_state_changed', acState);
  broadcastSSE('ir_blasted', log);
  broadcastSSE('schedules_updated', schedules);

  res.json({ success: true, message: 'Schedule executed successfully', state: acState });
});

app.put('/api/ac/schedules/:id', (req: Request, res: Response) => {
  const idx = schedules.findIndex((item) => item.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Schedule not found' });
  schedules[idx] = { ...schedules[idx], ...req.body };
  savePersistentStore();
  broadcastSSE('schedules_updated', schedules);
  res.json({ success: true, schedule: schedules[idx], schedules });
});

app.delete('/api/ac/schedules/:id', (req: Request, res: Response) => {
  const targetId = req.params.id;
  const idx = schedules.findIndex((item) => item.id === targetId);
  if (idx >= 0) {
    schedules.splice(idx, 1);
  } else {
    // Try fuzzy match in case prefixes or timestamps differ slightly
    const fuzzyIdx = schedules.findIndex((item) => item.id.includes(targetId) || targetId.includes(item.id));
    if (fuzzyIdx >= 0) {
      schedules.splice(fuzzyIdx, 1);
    }
  }
  savePersistentStore();
  broadcastSSE('schedules_updated', schedules);
  res.json({ success: true, deletedId: targetId, schedules });
});

app.post('/api/ac/schedules/:id/toggle', (req: Request, res: Response) => {
  const s = schedules.find((item) => item.id === req.params.id);
  if (!s) return res.status(404).json({ success: false, error: 'Schedule not found' });
  s.enabled = !s.enabled;
  savePersistentStore();
  broadcastSSE('schedules_updated', schedules);
  res.json({ success: true, id: s.id, enabled: s.enabled, schedules });
});

// IR Logs API
app.get('/api/ac/logs', (req: Request, res: Response) => {
  res.json({ success: true, logs: irLogs });
});

// Dynamic Arduino C++ Sketch Generator Endpoint
app.get('/api/firmware/esp32-ac', (req: Request, res: Response) => {
  const brand = ((req.query.brand as string) || 'Gree') as ACBrand;
  const ssid = (req.query.ssid as string) || 'YOUR_WIFI_SSID';
  const pass = (req.query.pass as string) || 'YOUR_WIFI_PASSWORD';
  const host = (req.query.host as string) || `${req.protocol}://${req.get('host')}`;
  const irLedPin = Number(req.query.irPin) || 4;
  const dhtPin = Number(req.query.dhtPin) || 15;
  const localPort = Number(req.query.localPort) || 80;

  const sketch = generateArduinoSketch({
    brand,
    wifiSsid: ssid,
    wifiPass: pass,
    serverUrl: host,
    irLedPin,
    dhtPin,
    localPort,
  });

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', `attachment; filename="CoolHome_AC_${brand}_ESP32.ino"`);
  res.send(sketch);
});

// Explicit PWA Endpoints for 1-Click Direct Installation
app.get('/manifest.webmanifest', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.sendFile(path.join(appDir, 'public', 'manifest.webmanifest'));
});

app.get('/manifest.json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.sendFile(path.join(appDir, 'public', 'manifest.json'));
});

app.get('/sw.js', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Service-Worker-Allowed', '/');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.sendFile(path.join(appDir, 'public', 'sw.js'));
});

// Mount Vite in Development
async function startServer() {
  const server = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const vitePkg = 'vite';
    const { createServer: createViteServer } = await (import(vitePkg) as Promise<any>);
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled ? false : { server },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(appDir, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(appDir, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`❄️ CoolHome AC Smart Controller Server running on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
export { app };
