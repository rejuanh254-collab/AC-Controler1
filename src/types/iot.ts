export type ACBrand =
  | 'Gree'
  | 'Walton'
  | 'General'
  | 'Midea'
  | 'Carrier'
  | 'Panasonic'
  | 'LG'
  | 'Daikin'
  | 'Samsung'
  | 'Haier'
  | 'Singer'
  | 'Mitsubishi'
  | 'Electrolux'
  | 'Universal';

export type ACMode = 'cool' | 'auto' | 'dry' | 'heat' | 'fan' | 'eco';
export type ACFanSpeed = 'auto' | 'quiet' | 'low' | 'med' | 'high' | 'turbo';
export type ACSwingV = 'auto' | 'highest' | 'high' | 'middle' | 'low' | 'lowest' | 'off';
export type ACSwingH = 'auto' | 'left' | 'left-mid' | 'middle' | 'right-mid' | 'right' | 'wide' | 'off';

export type ConnectionMethod =
  | 'gree_cloud'
  | 'tuya_smart_life'
  | 'built_in_wifi'
  | 'broadlink'
  | 'mobile_ir'
  | 'home_assistant_webhook'
  | 'esp32_ir';

export interface SleepCurveStage {
  id: string;
  label?: string;
  temperature: number; // 16 - 30
  fanSpeed: ACFanSpeed;
  minutes: number | null; // null represents ∞ (till stopped)
}

export interface SleepCurve {
  id: string;
  name: string;
  stages: SleepCurveStage[];
  createdAt: string;
}

export interface ActiveSleepCurveState {
  enabled: boolean;
  curveId: string;
  curveName: string;
  currentStageIndex: number; // 0-based
  remainingMinutes: number | null; // null if open-ended
  startedAt: string;
  paused?: boolean;
}

export interface MultiStageStep {
  id: string;
  stageNumber: number; // 1, 2, 3, 4...
  temperature: number; // 16 - 30
  durationMinutes: number; // duration in minutes
  action?: 'change_temp' | 'turn_off'; // action after this stage duration: 'change_temp' or 'turn_off'
  mode?: ACMode;
  fanSpeed?: ACFanSpeed;
  displayLight?: boolean;
}

export interface MultiStageTimer {
  enabled: boolean;
  currentStageIndex: number; // 0-based active stage index
  targetStageIndex?: number; // Optional index to start from
  currentStage?: number; // 1-based stage number for backward compatibility / display
  remainingMinutes: number;
  stages: MultiStageStep[];
  finalAction: 'turn_off' | 'keep_running' | 'change_temp';
  stage3Temp?: number;
  startedAt?: string;
  stageStartedAt?: string;
  paused?: boolean;
  health?: boolean;

  // Legacy fallback fields for backward compatibility
  stage1?: {
    temperature: number;
    durationMinutes: number;
  };
  stage2Action?: 'turn_off' | 'change_temp';
  stage2?: {
    temperature: number;
    durationMinutes: number;
  };
}

export interface SmartACState {
  id: string;
  isPaired: boolean; // True only when user actually pairs/configures their real AC
  deviceName: string;
  deviceModel: string;
  location: string;
  isOnline: boolean;
  power: boolean;
  temperature: number; // 16 - 30
  mode: ACMode;
  fanSpeed: ACFanSpeed;
  swingV: ACSwingV;
  swingH: ACSwingH;
  turbo: boolean;
  eco: boolean;
  sleep: boolean;
  displayLight: boolean;
  ionFilter: boolean;
  health?: boolean; // Gree Cold Plasma Air Purifier filter alias
  autoClean?: boolean; // Gree X-FAN / Self-Cleaning feature (Blo)
  isCleaning?: boolean; // Active 15-minute Deep Self-Clean cycle in progress
  cleanCycleRemainingMinutes?: number; // Minutes remaining in active clean cycle
  cleanCycleStage?: 'frost' | 'wash' | 'dry' | 'plasma'; // Stage of active self-clean
  filterCleanHours?: number; // Total running hours since last physical filter wash
  quiet: boolean;
  locked: boolean;
  brand: ACBrand;
  timerOffMinutes: number;
  timerOnMinutes: number;
  multiStageTimer?: MultiStageTimer;
  activeCurve?: ActiveSleepCurveState;
  lastIrCommand: string;
  lastIrHex: string;
  lastUpdated: string;
}

export interface ClimateTelemetry {
  roomTemp: number; // DHT22 or AC built-in sensor
  roomHumidity: number;
  feelsLike: number;
  targetDelta: number;
  heatIndexStatus: 'comfortable' | 'warm' | 'hot' | 'very_hot';
  airQualityPpm: number;
}

export interface DirectConnectionConfig {
  activeMethod: ConnectionMethod;
  // 0. Gree+ Official Cloud Account Login
  greeEmail: string;
  greePassword?: string;
  greeRegion: string;
  greeCloudToken?: string;
  greeDeviceMac: string;
  // 1. Tuya / Smart Life IR Blaster
  tuyaDeviceId: string;
  tuyaLocalKey: string;
  tuyaCloudClientId: string;
  tuyaCloudSecret: string;
  tuyaRegion: string;
  // 2. Built-in WiFi AC (Gree/Walton/Midea)
  acLocalIp: string;
  acPort: number;
  acKey: string;
  // 3. Broadlink RM4 Mini / Pro
  broadlinkIp: string;
  broadlinkMac: string;
  // 4. Webhook / Home Assistant
  webhookUrl: string;
  haAccessToken: string;
  haEntityId: string;
  // Status
  connected: boolean;
  lastSync: string;
  lastStatusMessage: string;
}

export interface HardwareStatus {
  connected: boolean;
  ipAddress: string;
  localPort: number;
  rssi: number; // Signal strength in dBm e.g. -58
  lastHeartbeat: string;
  firmwareVersion: string;
  irLedPin: number; // GPIO e.g. 4
  dhtPin: number; // GPIO e.g. 15
  controlMethod: ConnectionMethod;
  deviceModel: 'Tuya_IR_Remote' | 'BuiltIn_WiFi_AC' | 'Broadlink_RM4' | 'Mobile_IR' | 'ESP32' | 'HomeAssistant';
}

export interface ACSessionLog {
  id: string;
  startTime: string; // ISO string e.g. "2026-09-25T14:30:00.000Z"
  endTime?: string; // ISO string or undefined if running
  durationMinutes: number;
  isRunning: boolean;
  mode: ACMode;
  targetTemp: number;
  avgWatts: number;
  kwhUsed: number;
  costBdt: number;
}

export interface DailyEnergyRecord {
  date: string; // "2026-09-25"
  dayName: string; // "Friday" / "শুক্রবার"
  totalRuntimeMinutes: number;
  turnOnCount: number;
  totalKwh: number;
  totalCostBdt: number;
  sessions: ACSessionLog[];
}

export interface PowerTelemetry {
  watts: number;
  voltage: number;
  current: number;
  tonnage: number; // 1.0, 1.5, 2.0 Ton
  inverterLoadPercent: number;
  unitRateBdt: number; // e.g. 8.5 Tk / kWh
  currency: string;
  todayKwh: number;
  monthlyKwh: number;
  costBdt: number; // Today's cost in BDT
  monthlyCostBdt: number; // Monthly accumulated cost in BDT
  costUsd: number;
  // Live session and tracking
  currentSessionStartTime: string | null;
  currentSessionDurationMinutes: number;
  currentSessionKwh: number;
  currentSessionCostBdt: number;
  todayRuntimeMinutes: number;
  turnOnCountToday: number;
  recentSessions: ACSessionLog[];
  dailyHistory: DailyEnergyRecord[];
}

export interface ACSchedule {
  id: string;
  name: string;
  nameBn: string;
  time: string; // HH:MM
  days: number[]; // 0=Sun..6=Sat
  power: boolean;
  temperature?: number;
  mode?: ACMode;
  fanSpeed?: ACFanSpeed;
  turbo?: boolean;
  eco?: boolean;
  health?: boolean;
  displayLight?: boolean;
  autoOffMinutes?: number;
  enabled: boolean;
}

export interface ACPreset {
  id: string;
  name: string;
  nameBn: string;
  temp: number;
  mode: ACMode;
  fanSpeed: ACFanSpeed;
  turbo?: boolean;
  eco?: boolean;
  icon: string;
  accent: string;
}

export interface IRLogEntry {
  id: string;
  timestamp: string;
  command: string;
  commandBn: string;
  brand: ACBrand;
  hexCode: string;
  protocol: string;
  source: 'Web_UI' | 'Voice' | 'Schedule' | 'Tuya_Hub' | 'Direct_WiFi_AC' | 'Broadlink' | 'Mobile_IR';
}
