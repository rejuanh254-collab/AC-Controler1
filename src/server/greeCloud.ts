import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import tls from "node:tls";

export const GREE_REGIONS = {
  "eugrih.gree.com": { label: "Europe", mqtt: "mqtt-eu.gree.com" },
  "ingrih.gree.com": { label: "India / South Asia", mqtt: "mqtt-in.gree.com" },
  "hkgrih.gree.com": { label: "East & South-East Asia", mqtt: "mqtt-as.gree.com" },
  "megrih.gree.com": { label: "Middle East", mqtt: "mqtt-me.gree.com" },
  "nagrih.gree.com": { label: "North America", mqtt: "mqtt-na.gree.com" },
  "augrih.gree.com": { label: "Australia", mqtt: "mqtt-au.gree.com" },
} as const;

export type GreeRegion = keyof typeof GREE_REGIONS;

export type GreeCredentials = {
  email: string;
  password: string;
  mac: string;
  region: string;
};

export type GreePatch = {
  power?: boolean;
  targetTemp?: number;
  mode?: "cool" | "fan" | "dry" | "heat" | "auto";
  fanSpeed?: "low" | "medium" | "high" | "auto" | "quiet" | "med" | "turbo";
  turbo?: boolean;
  light?: boolean;
  swingV?: string;
  swingH?: string;
  autoClean?: boolean;
  blo?: boolean;
  quiet?: boolean;
  eco?: boolean;
  health?: boolean;
  sleep?: boolean;
};

export type GreeState = {
  power: boolean;
  targetTemp: number;
  mode: "cool" | "fan" | "dry" | "heat" | "auto";
  fanSpeed: "low" | "medium" | "high" | "auto" | "quiet" | "med" | "turbo";
  roomTemp?: number;
  turbo?: boolean;
  light?: boolean;
  swingV?: string;
  swingH?: string;
  autoClean?: boolean;
  blo?: boolean;
  quiet?: boolean;
  health?: boolean;
  eco?: boolean;
  sleep?: boolean;
};

const APP_ID = "4920681951525131286";
const APP_HASH = "0fa513124aa97781d1f3f40d61ca1a89";
const API_KEY = "#G$&^jgfujy6ujxt";

const FAN: Record<string, number> = { auto: 0, quiet: 1, low: 1, med: 3, medium: 3, high: 5, turbo: 5 };
const MODE = { auto: 0, cool: 1, dry: 2, fan: 3, heat: 4 } as const;

export const SWING_V_MAP: Record<string, number> = {
  off: 0,
  auto: 1,
  highest: 2,
  high: 3,
  middle: 4,
  low: 5,
  lowest: 6,
};

export const SWING_H_MAP: Record<string, number> = {
  off: 0,
  auto: 1,
  left: 2,
  'left-mid': 3,
  middle: 4,
  center: 4,
  'right-mid': 5,
  right: 6,
  wide: 10,
};

const FAN_R: Record<number, GreeState["fanSpeed"]> = {
  0: "auto",
  1: "low",
  2: "low",
  3: "medium",
  4: "high",
  5: "high",
};

const MODE_R: Record<number, GreeState["mode"]> = {
  0: "auto",
  1: "cool",
  2: "dry",
  3: "fan",
  4: "heat",
};

const md5 = (value: string) => createHash("md5").update(value).digest("hex");

const keyBytes = (key: string) => {
  const out = Buffer.alloc(16);
  Buffer.from(key).copy(out);
  return out;
};

const encrypt = (key: string, value: string) => {
  const cipher = createCipheriv("aes-128-ecb", keyBytes(key), null);
  return Buffer.concat([cipher.update(value, "utf8"), cipher.final()]).toString("base64");
};

const decrypt = (key: string, value: string) => {
  const decipher = createDecipheriv("aes-128-ecb", keyBytes(key), null);
  return Buffer.concat([decipher.update(Buffer.from(value, "base64")), decipher.final()]).toString("utf8");
};

export const hostOf = (region: string): GreeRegion => {
  const clean = (region || "").toLowerCase().trim();
  if (clean in GREE_REGIONS) return clean as GreeRegion;
  if (clean === "asia" || clean === "in" || clean === "south_asia") return "ingrih.gree.com";
  if (clean === "eu" || clean === "europe") return "eugrih.gree.com";
  if (clean === "global" || clean === "hk" || clean === "sea" || clean === "east_asia") return "hkgrih.gree.com";
  if (clean === "us" || clean === "na" || clean === "north_america") return "nagrih.gree.com";
  if (clean === "me" || clean === "middle_east") return "megrih.gree.com";
  if (clean === "au" || clean === "australia") return "augrih.gree.com";
  return "ingrih.gree.com";
};

function fieldsFor(patch: GreePatch) {
  const isQuiet = Boolean(patch.quiet || patch.fanSpeed === "quiet");
  const isTurbo = Boolean(patch.turbo || patch.fanSpeed === "turbo");

  const opt: string[] = ["Pow", "Mod", "SetTem", "WdSpd", "TemUn"];
  const p: number[] = [
    patch.power !== undefined ? (patch.power ? 1 : 0) : 1,
    MODE[patch.mode ?? "cool"] ?? 1,
    Math.round(patch.targetTemp ?? 25),
    isQuiet ? 1 : (isTurbo ? 5 : (FAN[patch.fanSpeed ?? "auto"] ?? 0)),
    0, // TemUn (0 = Celsius)
  ];

  if (patch.turbo !== undefined || patch.fanSpeed !== undefined) {
    opt.push("Tur");
    p.push(isTurbo ? 1 : 0);
  }
  if (patch.light !== undefined) {
    opt.push("Lig");
    p.push(patch.light ? 1 : 0);
  }
  if (patch.swingV !== undefined) {
    opt.push("SwUpDn");
    p.push(SWING_V_MAP[patch.swingV] ?? (patch.swingV === "off" ? 0 : 1));
  }
  if (patch.swingH !== undefined) {
    opt.push("SwLr");
    p.push(SWING_H_MAP[patch.swingH] ?? (patch.swingH === "off" ? 0 : 1));
  }
  if (patch.quiet !== undefined || patch.fanSpeed !== undefined) {
    opt.push("Quiet");
    p.push(isQuiet ? 1 : 0);
  }
  if (patch.eco !== undefined) {
    opt.push("SvSt");
    p.push(patch.eco ? 1 : 0);
  }
  if (patch.health !== undefined) {
    opt.push("Health");
    p.push(patch.health ? 1 : 0);
  }
  if (patch.sleep !== undefined) {
    opt.push("Snum");
    p.push(patch.sleep ? 1 : 0);
  }
  if (patch.autoClean !== undefined || patch.blo !== undefined) {
    opt.push("Blo");
    p.push(patch.autoClean || patch.blo ? 1 : 0);
  }

  return { opt, p };
}

async function api(host: GreeRegion, endpoint: string, payload: Record<string, unknown>, props: string[]) {
  const now = new Date();
  const time = now.toISOString().slice(0, 19).replace("T", " ");
  const epoch = Math.floor(now.getTime() / 1000);
  const body = {
    api: { appId: APP_ID, r: epoch, t: time, vc: md5(`${APP_ID}_${APP_HASH}_${time}_${epoch}`) },
    datVc: md5(`${APP_HASH}_${props.map((prop) => payload[prop]).join("_")}`),
    ...payload,
  };

  const response = await fetch(`https://${host}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Gaen1: "5ac2bdf935bcca70",
      Charset: "utf-8",
    },
    body: encrypt(API_KEY, JSON.stringify(body)),
  });

  if (!response.ok) throw new Error(`Gree server HTTP ${response.status}`);
  const json = (await response.json()) as { enRes?: string; r?: number; msg?: string };
  return (json.enRes ? JSON.parse(decrypt(API_KEY, json.enRes)) : json) as Record<string, any>;
}

export type GreeDevice = { mac: string; key: string; online: boolean; name: string };

export async function loginAndFind(credentials: GreeCredentials) {
  const host = hostOf(credentials.region);
  const time = new Date().toISOString().slice(0, 19).replace("T", " ");
  const password = md5(md5(md5(credentials.password) + credentials.password) + time);

  console.log(`[GREE_CLOUD] Logging in to ${host} as ${credentials.email}...`);

  const login = await api(host, "/App/UserLoginV2", { psw: password, t: time, user: credentials.email }, ["user", "psw", "t"]);

  if (!login.uid || !login.token) {
    const errorMsg = login.r === 411
      ? "Gree+ rejected the email or password for this region. Please check credentials."
      : `Gree+ login failed: ${login.msg ?? login.r ?? "Unknown error"}`;
    throw new Error(errorMsg);
  }

  console.log(`[GREE_CLOUD] Login OK. UID: ${login.uid}. Fetching device list...`);

  const homes = await api(host, "/App/GetHomes", { token: login.token, uid: login.uid }, ["token", "uid"]);
  let device: GreeDevice | null = null;
  const targetMac = credentials.mac ? credentials.mac.replace(/[:-]/g, "").toLowerCase() : "";
  const allFoundDevs: GreeDevice[] = [];

  for (const home of homes.home ?? []) {
    const rooms = await api(host, "/App/GetDevsInRoomsOfHomeV2", { token: login.token, homeId: home.id, uid: login.uid }, ["token", "uid", "homeId"]);
    for (const room of rooms.rooms ?? []) {
      for (const candidate of room.devs ?? []) {
        const cMac = String(candidate.mac).replace(/[:-]/g, "").toLowerCase();
        const found = {
          mac: cMac,
          key: String(candidate.key).trim(),
          online: Boolean(candidate.online ?? 1),
          name: String(candidate.name ?? "").trim() || `Gree AC (${cMac.slice(-4).toUpperCase()})`,
        };
        allFoundDevs.push(found);
        if (targetMac && cMac === targetMac) {
          device = found;
        }
      }
    }
  }

  // If user provided a MAC, use that; if not found but exactly 1 device exists, auto-bind that device
  if (!device && allFoundDevs.length > 0) {
    if (!targetMac || allFoundDevs.length === 1) {
      device = allFoundDevs[0];
      console.log(`[GREE_CLOUD] Target MAC not matched, automatically bound to registered AC: ${device.mac}`);
    }
  }

  if (!device) {
    throw new Error(
      allFoundDevs.length > 0
        ? `MAC ${credentials.mac} not found. Found devices in Gree+ account: ${allFoundDevs.map(d => d.mac).join(", ")}`
        : "No AC devices found in this Gree+ account. Please bind your AC in the official Gree+ mobile app first."
    );
  }

  console.log(`[GREE_CLOUD] AC linked successfully: ${device.name} [MAC: ${device.mac}, Online: ${device.online}]`);

  return { host, uid: Number(login.uid), token: String(login.token), device, allDevices: allFoundDevs };
}

function mqttRequest(broker: string, uid: number, token: string, mac: string, pack: string, timeoutMs = 6000) {
  return new Promise<Record<string, any> | null>((resolve, reject) => {
    const encodeString = (value: string) => {
      const bytes = Buffer.from(value);
      return [bytes.length >> 8, bytes.length & 255, ...bytes];
    };

    const remainingLength = (value: number) => {
      const output: number[] = [];
      do {
        let digit = value % 128;
        value = Math.floor(value / 128);
        if (value > 0) digit |= 128;
        output.push(digit);
      } while (value > 0);
      return output;
    };

    const packet = (header: number, body: number[]) => Buffer.from([header, ...remainingLength(body.length), ...body]);

    let buffer = Buffer.alloc(0);
    let finished = false;

    console.log(`[GREE_MQTT] Connecting to TLS ${broker}:1984...`);

    const socket = tls.connect({ host: broker, port: 1984, servername: broker });
    const timer = setTimeout(() => finish(null), timeoutMs);

    const finish = (value: Record<string, any> | null, error?: Error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      try {
        socket.write(Buffer.from([0xe0, 0]));
        socket.end();
      } catch {
        // The socket may already be closed.
      }
      if (error) reject(error);
      else resolve(value);
    };

    socket.on("error", (error) => finish(null, new Error(`Gree cloud connection failed: ${error.message}`)));

    socket.on("secureConnect", () => {
      const clientId = `app_${randomBytes(8).toString("hex")}`;
      console.log(`[GREE_MQTT] Connected. Handshaking with clientId ${clientId}...`);
      socket.write(packet(0x10, [...encodeString("MQTT"), 4, 0xc2, 0, 60, ...encodeString(clientId), ...encodeString(String(uid)), ...encodeString(token)]));
    });

    socket.on("data", (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]);
      while (buffer.length >= 2) {
        let length = 0;
        let multiplier = 1;
        let index = 1;
        for (;;) {
          const byte = buffer[index++];
          if (byte === undefined) return;
          length += (byte & 127) * multiplier;
          multiplier *= 128;
          if (!(byte & 128)) break;
        }
        if (buffer.length < index + length) return;
        const type = buffer[0]! >> 4;
        const body = buffer.subarray(index, index + length);
        buffer = buffer.subarray(index + length);

        if (type === 2) {
          if (body[1] !== 0) return finish(null, new Error("Gree cloud refused the session"));
          console.log(`[GREE_MQTT] Session accepted. Subscribing to response/${mac}/#`);
          socket.write(packet(0x82, [0, 1, ...encodeString(`response/${mac}/#`), 0]));
        } else if (type === 9) {
          console.log(`[GREE_MQTT] Subscribed. Sending command pack to request/${mac}`);
          const message = { cid: String(Date.now()), i: 0, pack, t: "pack", tcid: mac, uid };
          socket.write(packet(0x30, [...encodeString(`request/${mac}`), ...Buffer.from(JSON.stringify(message))]));
        } else if (type === 3) {
          const topicLength = body.readUInt16BE(0);
          try {
            const parsed = JSON.parse(body.subarray(2 + topicLength).toString("utf8")) as Record<string, any>;
            console.log(`[GREE_MQTT] Received response packet from AC!`);
            finish(parsed);
          } catch {
            finish(null);
          }
        }
      }
    });
  });
}

function parseState(key: string, response: Record<string, any> | null): GreeState | null {
  if (!response?.pack) return null;
  try {
    const data = JSON.parse(decrypt(key, response.pack)) as {
      cols?: string[];
      opt?: string[];
      dat?: number[];
      val?: number[];
      p?: number[];
    };
    const columns = data.cols ?? data.opt ?? [];
    const values = data.dat ?? data.val ?? data.p ?? [];
    const fields = Object.fromEntries(columns.map((column, index) => [column, values[index]]));

    if (fields.Pow === undefined) return null;

    const isQuiet = fields.Quiet === 1 || fields.Quiet === 2;
    const isTurbo = fields.Tur === 1;

    return {
      power: fields.Pow === 1,
      targetTemp: Number(fields.SetTem ?? 24),
      mode: MODE_R[fields.Mod] ?? "cool",
      fanSpeed: isQuiet ? "quiet" : (isTurbo ? "turbo" : (FAN_R[fields.WdSpd] ?? "auto")),
      light: fields.Lig !== undefined ? fields.Lig === 1 : undefined,
      turbo: isTurbo,
      quiet: isQuiet,
      health: fields.Health !== undefined ? fields.Health === 1 : undefined,
      eco: fields.SvSt !== undefined ? fields.SvSt === 1 : undefined,
      sleep: fields.Snum !== undefined ? fields.Snum > 0 : undefined,
      autoClean: fields.Blo !== undefined ? fields.Blo === 1 : undefined,
      blo: fields.Blo !== undefined ? fields.Blo === 1 : undefined,
      ...(fields.SwUpDn !== undefined ? { swingV: Object.entries(SWING_V_MAP).find(([, v]) => v === fields.SwUpDn)?.[0] ?? (fields.SwUpDn === 0 ? "off" : "auto") } : {}),
      ...(fields.SwLr !== undefined ? { swingH: Object.entries(SWING_H_MAP).find(([, v]) => v === fields.SwLr)?.[0] ?? (fields.SwLr === 0 ? "off" : "auto") } : {}),
      ...(fields.TemSen ? { roomTemp: fields.TemSen > 40 ? fields.TemSen - 40 : fields.TemSen } : {}),
    };
  } catch (e) {
    console.error("[GREE_PARSE_STATE_ERROR]", e);
    return null;
  }
}

const statusColumns = ["Pow", "SetTem", "Mod", "WdSpd", "TemSen", "Lig", "Tur", "Quiet", "SwUpDn", "SwLr", "Blo", "Health", "SvSt", "Snum"];

export async function readGreeCloud(
  credentials: GreeCredentials,
  cachedSession?: { uid: number; token: string; key: string; host: GreeRegion; mac: string; name?: string }
) {
  let host = cachedSession?.host;
  let uid = cachedSession?.uid;
  let token = cachedSession?.token;
  let key = cachedSession?.key;
  let mac = cachedSession?.mac || (credentials.mac ? credentials.mac.replace(/[:-]/g, "").toLowerCase() : "");
  let name = cachedSession?.name || `Gree AC (${mac.slice(-4).toUpperCase()})`;

  let sessionData: any = cachedSession ? { device: { online: true, mac, name, key }, host, uid, token } : null;

  if (!host || !uid || !token || !key || !mac) {
    sessionData = await loginAndFind(credentials);
    if (!sessionData.device.online) {
      return { online: false, state: null, name: sessionData.device.name, mac: sessionData.device.mac, session: sessionData };
    }
    host = sessionData.host;
    uid = sessionData.uid;
    token = sessionData.token;
    key = sessionData.device.key;
    mac = sessionData.device.mac;
    name = sessionData.device.name;
  }

  const broker = GREE_REGIONS[host!].mqtt;
  const pack = encrypt(key!, JSON.stringify({ t: "status", cols: statusColumns }));

  let response: Record<string, any> | null = null;
  try {
    response = await mqttRequest(broker, uid!, token!, mac!, pack);
  } catch (err: any) {
    if (!credentials.password) {
      return {
        online: false,
        state: null,
        name: name!,
        mac: mac!,
        session: sessionData,
      };
    }
    try {
      const freshSession = await loginAndFind(credentials);
      host = freshSession.host;
      uid = freshSession.uid;
      token = freshSession.token;
      key = freshSession.device.key;
      mac = freshSession.device.mac;
      name = freshSession.device.name;
      const freshBroker = GREE_REGIONS[host].mqtt;
      const freshPack = encrypt(key, JSON.stringify({ t: "status", cols: statusColumns }));
      response = await mqttRequest(freshBroker, uid, token, mac, freshPack);
    } catch (e) {
      return {
        online: false,
        state: null,
        name: name!,
        mac: mac!,
        session: sessionData,
      };
    }
  }

  return {
    online: true,
    state: parseState(key!, response),
    name: name!,
    mac: mac!,
    session: {
      host: host!,
      uid: uid!,
      token: token!,
      device: { mac: mac!, key: key!, name: name!, online: true },
    },
  };
}

export async function sendGreeCloud(
  patch: GreePatch,
  credentials: GreeCredentials,
  deviceKey?: string,
  uid?: number,
  token?: string,
  host?: GreeRegion
) {
  let finalHost = host;
  let finalUid = uid;
  let finalToken = token;
  let finalKey = deviceKey;
  let finalMac = credentials.mac ? credentials.mac.replace(/[:-]/g, "").toLowerCase() : "";

  if (!finalKey || !finalUid || !finalToken || !finalHost) {
    const session = await loginAndFind(credentials);
    if (!session.device.online) throw new Error("AC is reported offline in Gree+ cloud");
    finalHost = session.host;
    finalUid = session.uid;
    finalToken = session.token;
    finalKey = session.device.key;
    finalMac = session.device.mac;
  }

  const broker = GREE_REGIONS[finalHost!].mqtt;
  const fields = fieldsFor(patch);
  const cmdPack = encrypt(finalKey!, JSON.stringify({ t: "cmd", ...fields }));

  console.log(`[GREE_CLOUD] Sending command to AC [${finalMac}] via ${broker}...`, patch);
  let cmdRes: any;
  try {
    cmdRes = await mqttRequest(broker, finalUid!, finalToken!, finalMac, cmdPack);
  } catch (err: any) {
    console.warn(`[GREE_RETRY] MQTT attempt failed (${err.message}). Logging in fresh and retrying...`);
    const freshSession = await loginAndFind(credentials);
    finalHost = freshSession.host;
    finalUid = freshSession.uid;
    finalToken = freshSession.token;
    finalKey = freshSession.device.key;
    finalMac = freshSession.device.mac;
    const freshBroker = GREE_REGIONS[finalHost].mqtt;
    const freshCmdPack = encrypt(finalKey, JSON.stringify({ t: "cmd", ...fields }));
    cmdRes = await mqttRequest(freshBroker, finalUid, finalToken, finalMac, freshCmdPack);
  }

  console.log(`[GREE_CLOUD] Command delivered successfully to AC [${finalMac}]! ACK:`, cmdRes);

  return {
    power: patch.power !== undefined ? patch.power : true,
    targetTemp: patch.targetTemp !== undefined ? patch.targetTemp : 25,
    mode: patch.mode || "cool",
    fanSpeed: patch.fanSpeed || "auto",
    roomTemp: undefined as number | undefined,
    token: finalToken,
    deviceKey: finalKey,
    uid: finalUid,
    host: finalHost,
    rawAck: cmdRes,
  };
}
