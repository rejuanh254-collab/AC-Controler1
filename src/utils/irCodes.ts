import type { ACBrand, SmartACState } from '../types/iot';

export interface BrandConfig {
  name: ACBrand;
  cppClass: string;
  header: string;
  defaultTemp: number;
  maxTemp: number;
  minTemp: number;
  country: string;
  sampleModel: string;
}

export const BRAND_CONFIGS: Record<ACBrand, BrandConfig> = {
  Gree: {
    name: 'Gree',
    cppClass: 'IRGreeAC',
    header: 'ir_Gree.h',
    defaultTemp: 24,
    maxTemp: 30,
    minTemp: 16,
    country: 'International / Bangladesh (Most Common)',
    sampleModel: 'Gree Fairy / Lomo / Cozy Series',
  },
  Walton: {
    name: 'Walton',
    cppClass: 'IRGreeAC', // Walton ACs use Gree / Midea protocol
    header: 'ir_Gree.h',
    defaultTemp: 24,
    maxTemp: 30,
    minTemp: 16,
    country: 'Bangladesh (Inverna / Oceanus Series)',
    sampleModel: 'Walton Inverna / Venturo Series',
  },
  General: {
    name: 'General',
    cppClass: 'IRFujitsuAC',
    header: 'ir_Fujitsu.h',
    defaultTemp: 24,
    maxTemp: 30,
    minTemp: 16,
    country: 'Fujitsu General Japan',
    sampleModel: 'General Hyper Tropical / Classic',
  },
  Midea: {
    name: 'Midea',
    cppClass: 'IRMideaAC',
    header: 'ir_Midea.h',
    defaultTemp: 24,
    maxTemp: 30,
    minTemp: 17,
    country: 'Midea / Carrier Tech',
    sampleModel: 'Midea Blanc / All Easy Pro',
  },
  Carrier: {
    name: 'Carrier',
    cppClass: 'IRCarrierAC',
    header: 'ir_Carrier.h',
    defaultTemp: 24,
    maxTemp: 30,
    minTemp: 17,
    country: 'Carrier USA',
    sampleModel: 'Carrier EmPower / Ester',
  },
  Panasonic: {
    name: 'Panasonic',
    cppClass: 'IRPanasonicAc',
    header: 'ir_Panasonic.h',
    defaultTemp: 24,
    maxTemp: 30,
    minTemp: 16,
    country: 'Panasonic Japan / Malaysia',
    sampleModel: 'Panasonic Econavi / Aero Series',
  },
  LG: {
    name: 'LG',
    cppClass: 'IRLgAc',
    header: 'ir_LG.h',
    defaultTemp: 24,
    maxTemp: 30,
    minTemp: 18,
    country: 'LG Electronics Korea',
    sampleModel: 'LG Dual Inverter ArtCool / Mosquito Away',
  },
  Daikin: {
    name: 'Daikin',
    cppClass: 'IRDaikinESP',
    header: 'ir_Daikin.h',
    defaultTemp: 24,
    maxTemp: 32,
    minTemp: 18,
    country: 'Daikin Industries Japan',
    sampleModel: 'Daikin FTKF / FTHT Series',
  },
  Samsung: {
    name: 'Samsung',
    cppClass: 'IRSamsungAc',
    header: 'ir_Samsung.h',
    defaultTemp: 24,
    maxTemp: 30,
    minTemp: 16,
    country: 'Samsung WindFree / Digital Inverter',
    sampleModel: 'Samsung AR / WindFree Series',
  },
  Haier: {
    name: 'Haier',
    cppClass: 'IRHaierAC',
    header: 'ir_Haier.h',
    defaultTemp: 24,
    maxTemp: 30,
    minTemp: 16,
    country: 'Haier Triple Inverter',
    sampleModel: 'Haier CleanCool / PuriCool',
  },
  Singer: {
    name: 'Singer',
    cppClass: 'IRMideaAC',
    header: 'ir_Midea.h',
    defaultTemp: 24,
    maxTemp: 30,
    minTemp: 17,
    country: 'Singer Bangladesh',
    sampleModel: 'Singer Inverter 1.5 Ton',
  },
  Mitsubishi: {
    name: 'Mitsubishi',
    cppClass: 'IRMitsubishiAC',
    header: 'ir_Mitsubishi.h',
    defaultTemp: 24,
    maxTemp: 31,
    minTemp: 16,
    country: 'Mitsubishi Electric Heavy Industries',
    sampleModel: 'Mitsubishi MSZ / SRK Heavy Duty',
  },
  Electrolux: {
    name: 'Electrolux',
    cppClass: 'IRElectroluxAc',
    header: 'ir_Electrolux.h',
    defaultTemp: 24,
    maxTemp: 30,
    minTemp: 16,
    country: 'Electrolux Inverter',
    sampleModel: 'Electrolux UltimateHome',
  },
  Universal: {
    name: 'Universal',
    cppClass: 'IRsend',
    header: 'IRsend.h',
    defaultTemp: 24,
    maxTemp: 30,
    minTemp: 16,
    country: 'Universal 38kHz Pulse AC',
    sampleModel: 'Universal Chunghop / Qunda Protocol',
  },
};

// Generate realistic simulated hex command matching IR state
export function generateIRHex(ac: SmartACState): string {
  const brand = ac.brand || 'Gree';
  const p = ac.power ? '01' : '00';
  const t = (ac.temperature & 0xff).toString(16).padStart(2, '0').toUpperCase();
  const m = ac.mode === 'cool' ? '01' : ac.mode === 'dry' ? '02' : ac.mode === 'fan' ? '03' : ac.mode === 'heat' ? '04' : '00';
  const f = ac.fanSpeed === 'auto' ? '00' : ac.fanSpeed === 'low' ? '01' : ac.fanSpeed === 'med' ? '02' : '03';
  const checksum = ((ac.temperature * 7 + (ac.power ? 31 : 11)) & 0xff).toString(16).padStart(2, '0').toUpperCase();

  return `0x${brand.substring(0, 2).toUpperCase()}${p}${m}${f}${t}${checksum}`;
}

// Generate complete Arduino C++ code using IRremoteESP8266
export function generateArduinoSketch(options: {
  brand: ACBrand;
  wifiSsid: string;
  wifiPass: string;
  serverUrl: string;
  irLedPin: number;
  dhtPin: number;
  localPort: number;
}): string {
  const cfg = BRAND_CONFIGS[options.brand] || BRAND_CONFIGS.Gree;

  return `/*
 * ====================================================================
 *   CoolHome AC - ESP32 Smart Air Conditioner Hardware Controller
 *   Universal IR Transmitter Firmware (with IRremoteESP8266)
 * ====================================================================
 * 
 * Hardware Wiring:
 * 1. ESP32 Dev Module / NodeMCU ESP8266
 * 2. 940nm IR Transmitter LED -> GPIO ${options.irLedPin} (via 2N2222 NPN Transistor & 100Ω Resistor)
 * 3. DHT22 / DHT11 Temperature & Humidity Sensor -> GPIO ${options.dhtPin}
 * 4. Status Indicator LED (Optional) -> GPIO 2 (Builtin LED)
 * 
 * Target AC Brand: ${cfg.name} (${cfg.sampleModel})
 * Driver Class: ${cfg.cppClass} (${cfg.header})
 */

#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <IRremoteESP8266.h>
#include <IRsend.h>
#include <${cfg.header}>

// ---------------- 1. WiFi & Server Config ----------------
const char* WIFI_SSID     = "${options.wifiSsid}";
const char* WIFI_PASSWORD = "${options.wifiPass}";
const char* SERVER_URL    = "${options.serverUrl}"; // CoolHome Cloud Relay

// ---------------- 2. Hardware Pin Definitions ----------------
const uint16_t PIN_IR_LED = ${options.irLedPin};   // IR Blaster LED on GPIO ${options.irLedPin}
const uint8_t  PIN_DHT    = ${options.dhtPin};     // DHT22 Sensor on GPIO ${options.dhtPin}
const uint8_t  PIN_LED    = 2;                     // Built-in status LED

#define DHTTYPE DHT22
DHT dht(PIN_DHT, DHTTYPE);

// Instantiate IR Controller for ${cfg.name}
${cfg.cppClass} ac(PIN_IR_LED);

// Local WebServer for direct zero-latency control on local WiFi
WebServer localServer(${options.localPort});

// Internal state cache
bool     currentPower   = true;
uint8_t  currentTemp    = ${cfg.defaultTemp};
String   currentMode    = "cool";
String   currentFan     = "auto";
bool     currentTurbo   = false;
bool     currentEco     = false;

unsigned long lastPollTime   = 0;
const unsigned long POLL_MS  = 1500; // Cloud poll frequency

unsigned long lastSensorTime = 0;
const unsigned long SENSOR_MS = 8000; // Sensor push frequency

// Function Declarations
void connectWiFi();
void setupIR();
void setupLocalServer();
void applyACState(bool power, uint8_t temp, String mode, String fan, bool turbo, bool eco, bool light);
void pollCloudState();
void pushSensorTelemetry();
void blinkLed(int count, int delayMs);

void setup() {
  Serial.begin(115200);
  delay(500);
  pinMode(PIN_LED, OUTPUT);
  digitalWrite(PIN_LED, LOW);

  Serial.println("\\n==================================================");
  Serial.println("   CoolHome AC - ESP32 Smart AC Controller");
  Serial.println("   Brand Protocol: ${cfg.name}");
  Serial.println("==================================================");

  // Initialize Sensors & IR Emitter
  dht.begin();
  setupIR();

  // Connect to Local WiFi
  connectWiFi();

  // Start Local REST API Server
  setupLocalServer();

  // Send Initial Setup Command to AC (24°C Cool Mode)
  applyACState(true, 24, "cool", "auto", false, false, true);
}

void loop() {
  // Handle direct local HTTP requests
  localServer.handleClient();

  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  // 1. Poll cloud state changes
  if (millis() - lastPollTime >= POLL_MS) {
    lastPollTime = millis();
    pollCloudState();
  }

  // 2. Read temperature sensor & push telemetry
  if (millis() - lastSensorTime >= SENSOR_MS) {
    lastSensorTime = millis();
    pushSensorTelemetry();
  }
}

void setupIR() {
  ac.begin();
  Serial.println("[IR] ${cfg.name} AC IR Blaster initialized on GPIO " + String(PIN_IR_LED));
}

void connectWiFi() {
  Serial.print("[WiFi] Connecting to: ");
  Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 25) {
    delay(400);
    Serial.print(".");
    digitalWrite(PIN_LED, !digitalRead(PIN_LED));
    tries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    digitalWrite(PIN_LED, HIGH);
    Serial.println("\\n[WiFi] Connected! IP Address: " + WiFi.localIP().toString());
    Serial.println("[WiFi] Local Server Port: " + String(${options.localPort}));
  } else {
    digitalWrite(PIN_LED, LOW);
    Serial.println("\\n[WiFi] Failed to connect. Retrying...");
  }
}

// Applies state and sends real modulated 38kHz IR packet to AC unit
void applyACState(bool power, uint8_t temp, String mode, String fan, bool turbo, bool eco, bool light) {
  currentPower = power;
  currentTemp  = temp;
  currentMode  = mode;
  currentFan   = fan;
  currentTurbo = turbo;
  currentEco   = eco;

  // Configure AC State in driver
  if (!power) {
    ac.off();
  } else {
    ac.on();
    ac.setTemp(constrain(temp, ${cfg.minTemp}, ${cfg.maxTemp}));

    // Mode configuration
    if (mode == "cool")       ac.setMode(kGreeCool);
    else if (mode == "dry")   ac.setMode(kGreeDry);
    else if (mode == "fan")   ac.setMode(kGreeFan);
    else if (mode == "heat")  ac.setMode(kGreeHeat);
    else if (mode == "auto")  ac.setMode(kGreeAuto);

    // Fan Speed
    if (fan == "auto")   ac.setFan(kGreeFanAuto);
    else if (fan == "low")    ac.setFan(kGreeFanMin);
    else if (fan == "med")    ac.setFan(kGreeFanMed);
    else if (fan == "high")   ac.setFan(kGreeFanMax);
    else if (fan == "turbo")  ac.setTurbo(true);

    ac.setTurbo(turbo);
    ac.setLight(light);
  }

  // Transmit IR Signal
  ac.send();
  blinkLed(2, 60);

  Serial.printf("[IR BLAST] Brand: %s | Power: %s | Temp: %d C | Mode: %s | Fan: %s\\n",
                "${cfg.name}", power ? "ON" : "OFF", temp, mode.c_str(), fan.c_str());
}

// Local direct HTTP Endpoints (e.g., http://192.168.1.105:${options.localPort}/set?power=1&temp=24&mode=cool)
void setupLocalServer() {
  localServer.on("/status", HTTP_GET, []() {
    float t = dht.readTemperature();
    float h = dht.readHumidity();

    String json = "{\\"power\\":" + String(currentPower ? "true" : "false") +
                  ",\\"temp\\":" + String(currentTemp) +
                  ",\\"mode\\":\\"" + currentMode + "\\"" +
                  ",\\"roomTemp\\":" + String(isnan(t) ? 25.5 : t) +
                  ",\\"roomHumidity\\":" + String(isnan(h) ? 60.0 : h) +
                  ",\\"brand\\":\\"${cfg.name}\\"}";
    localServer.send(200, "application/json", json);
  });

  localServer.on("/set", HTTP_GET, []() {
    bool p = currentPower;
    uint8_t t = currentTemp;
    String m = currentMode;
    String f = currentFan;
    bool turbo = currentTurbo;
    bool eco = currentEco;

    if (localServer.hasArg("power")) p = (localServer.arg("power") == "1" || localServer.arg("power") == "true");
    if (localServer.hasArg("temp"))  t = localServer.arg("temp").toInt();
    if (localServer.hasArg("mode"))  m = localServer.arg("mode");
    if (localServer.hasArg("fan"))   f = localServer.arg("fan");
    if (localServer.hasArg("turbo")) turbo = (localServer.arg("turbo") == "1" || localServer.arg("turbo") == "true");

    applyACState(p, t, m, f, turbo, eco, true);
    localServer.send(200, "application/json", "{\\"success\\":true,\\"message\\":\\"IR Transmitted\\"}");
  });

  localServer.begin();
  Serial.println("[Local Server] Listening on port " + String(${options.localPort}));
}

void pollCloudState() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String url = String(SERVER_URL) + "/api/ac/state";
  http.begin(url);
  http.setTimeout(2500);

  int httpCode = http.GET();
  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    DynamicJsonDocument doc(1024);
    DeserializationError err = deserializeJson(doc, payload);

    if (!err && doc["success"]) {
      JsonObject state = doc["state"];
      bool newPower = state["power"];
      uint8_t newTemp = state["temperature"];
      String newMode = state["mode"].as<String>();
      String newFan = state["fanSpeed"].as<String>();
      bool newTurbo = state["turbo"];
      bool newEco = state["eco"];
      bool newLight = state["displayLight"];

      // Check if state changed from cloud
      if (newPower != currentPower || newTemp != currentTemp || newMode != currentMode ||
          newFan != currentFan || newTurbo != currentTurbo || newEco != currentEco) {
        Serial.println("[Cloud] State update received. Blasting IR signal...");
        applyACState(newPower, newTemp, newMode, newFan, newTurbo, newEco, newLight);
      }
    }
  }
  http.end();
}

void pushSensorTelemetry() {
  if (WiFi.status() != WL_CONNECTED) return;

  float t = dht.readTemperature();
  float h = dht.readHumidity();

  if (isnan(t) || isnan(h)) {
    Serial.println("[DHT] Warning: Reading DHT22 sensor failed");
    return;
  }

  HTTPClient http;
  String url = String(SERVER_URL) + "/api/ac/telemetry";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<256> doc;
  doc["roomTemp"] = t;
  doc["roomHumidity"] = h;
  doc["ipAddress"] = WiFi.localIP().toString();
  doc["rssi"] = WiFi.RSSI();
  doc["brand"] = "${cfg.name}";

  String body;
  serializeJson(doc, body);

  int code = http.POST(body);
  if (code == HTTP_CODE_OK) {
    // Serial.println("[Telemetry] Sensor data synced");
  }
  http.end();
}

void blinkLed(int count, int delayMs) {
  for (int i = 0; i < count; i++) {
    digitalWrite(PIN_LED, LOW);
    delay(delayMs);
    digitalWrite(PIN_LED, HIGH);
    delay(delayMs);
  }
}
`;
}
