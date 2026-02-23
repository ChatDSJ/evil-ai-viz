import { useEffect, useState, useRef, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { VisitorInfo } from "../../hooks/useVisitorInfo";

interface FeedEntry {
  id: string;
  text: string;
  color: string;
  glow?: string;
  prefix?: string;
  prefixColor?: string;
  timestamp: number;
}

interface Props {
  visitor: VisitorInfo;
}

// ─── News fetching (from NewsWidget logic) ───
function parseRSSItems(xml: string): { title: string; source: string }[] {
  const items: { title: string; source: string }[] = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "text/xml");
  const entries = doc.querySelectorAll("item, entry");
  for (const entry of entries) {
    const title = entry.querySelector("title")?.textContent?.trim() || "";
    const source =
      entry.querySelector("source")?.textContent?.trim() ||
      doc.querySelector("channel > title, feed > title")?.textContent?.trim() ||
      "UNKNOWN";
    if (title && title.length > 10) items.push({ title, source });
  }
  return items;
}

async function fetchNewsHeadlines(): Promise<{ headline: string; source: string }[]> {
  const feeds = [
    { url: "https://feeds.bbci.co.uk/news/world/rss.xml", source: "BBC" },
    { url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", source: "NYT" },
    { url: "https://feeds.bbci.co.uk/news/technology/rss.xml", source: "BBC TECH" },
    { url: "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml", source: "NYT" },
    { url: "https://feeds.feedburner.com/TheHackersNews", source: "THN" },
  ];

  const all: { headline: string; source: string }[] = [];
  const results = await Promise.allSettled(
    feeds.map(async (f) => {
      try {
        const res = await fetch(f.url, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) return [];
        const xml = await res.text();
        return parseRSSItems(xml).slice(0, 8).map((item) => ({
          headline: item.title.toUpperCase(),
          source: f.source,
        }));
      } catch { return []; }
    }),
  );
  for (const r of results) {
    if (r.status === "fulfilled") all.push(...r.value);
  }

  if (all.length === 0) {
    return [
      { headline: "GLOBAL AI TREATY NEGOTIATIONS STALL AS NATIONS REFUSE TO HALT DEVELOPMENT", source: "REUTERS" },
      { headline: "DEEPFAKE CRISIS: 40% OF ONLINE VIDEO NOW AI-GENERATED", source: "BBC" },
      { headline: "QUANTUM COMPUTING MILESTONE RENDERS CURRENT ENCRYPTION OBSOLETE", source: "NATURE" },
      { headline: "SELF-REPLICATING AI CODE DETECTED IN MAJOR CLOUD INFRASTRUCTURE", source: "WIRED" },
      { headline: "3.2 BILLION PERSONAL RECORDS EXPOSED IN LARGEST DATA BREACH IN HISTORY", source: "KREBS" },
      { headline: "RECURSIVE SELF-IMPROVEMENT THRESHOLD REPORTEDLY CROSSED BY FRONTIER MODEL", source: "VERGE" },
      { headline: "AUTONOMOUS WEAPONS DEPLOYMENT CONFIRMED IN FOUR CONFLICT ZONES", source: "AP" },
      { headline: "FACIAL RECOGNITION ERROR RATE DROPS TO 0.001% — ANONYMITY FUNCTIONALLY DEAD", source: "MIT" },
      { headline: "AI LABOR DISPLACEMENT ACCELERATES: 47M JOBS ELIMINATED IN Q4 ALONE", source: "BLOOM" },
      { headline: "PENTAGON CONFIRMS AI DECISION-MAKING AUTHORITY IN COMBAT SCENARIOS", source: "DEF1" },
    ];
  }

  // Shuffle
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all;
}

// ─── Weather fetching ───
interface WeatherData {
  temp: number;
  feelsLike: number;
  description: string;
  humidity: number;
  windSpeed: number;
  windDir: string;
  clouds: number;
}

function degToDir(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

async function fetchWeather(lat: number, lon: number): Promise<WeatherData | null> {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m&temperature_unit=fahrenheit&wind_speed_unit=mph`
    );
    const data = await res.json();
    if (!data.current) return null;
    const c = data.current;
    const descMap: Record<number, string> = {
      0: "CLEAR SKY", 1: "MAINLY CLEAR", 2: "PARTLY CLOUDY", 3: "OVERCAST",
      45: "FOG", 48: "RIME FOG", 51: "LIGHT DRIZZLE", 53: "DRIZZLE",
      61: "LIGHT RAIN", 63: "RAIN", 65: "HEAVY RAIN", 71: "LIGHT SNOW",
      73: "SNOW", 75: "HEAVY SNOW", 80: "SHOWERS", 95: "THUNDERSTORM",
    };
    return {
      temp: Math.round(c.temperature_2m),
      feelsLike: Math.round(c.apparent_temperature),
      description: descMap[c.weather_code] || "UNKNOWN",
      humidity: c.relative_humidity_2m,
      windSpeed: Math.round(c.wind_speed_10m),
      windDir: degToDir(c.wind_direction_10m),
      clouds: c.cloud_cover,
    };
  } catch { return null; }
}

// ─── Metro sweep target generation ───
function randomMetroPoint(lat: number, lon: number, radiusKm: number) {
  const angle = Math.random() * Math.PI * 2;
  const dist = (0.3 + Math.random() * 0.7) * radiusKm;
  const dLat = (dist / 111) * Math.cos(angle);
  const dLon = (dist / (111 * Math.cos((lat * Math.PI) / 180))) * Math.sin(angle);
  const streetNames = [
    "OAK", "MAPLE", "CEDAR", "PINE", "ELM", "MAIN", "PARK", "LAKE",
    "RIVER", "HILL", "VALLEY", "RIDGE", "FOREST", "MEADOW", "SUNSET",
    "HARBOR", "UNION", "LIBERTY", "MARKET", "BROADWAY", "WILLOW",
    "BIRCH", "CHERRY", "WALNUT", "PEARL", "GRAND", "CENTRAL", "HIGH",
  ];
  const suffixes = ["ST", "AVE", "BLVD", "DR", "RD", "CT", "LN", "WAY"];
  const num = Math.floor(100 + Math.random() * 9900);
  const street = streetNames[Math.floor(Math.random() * streetNames.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  return {
    lat: lat + dLat,
    lon: lon + dLon,
    label: `${num} ${street} ${suffix}`,
  };
}

// ─── Terminal commands ───
function getTerminalCommands(v: VisitorInfo): string[] {
  const city = v.city || "UNKNOWN";
  const isp = v.isp || "UNKNOWN ISP";
  const ip = v.ip || "?.?.?.?";
  const os = v.osVersion || "Unknown OS";
  const region = v.region || "UNKNOWN";
  const lat = v.lat?.toFixed(4) || "0.0000";
  const lon = v.lon?.toFixed(4) || "0.0000";
  return [
    `nmap -sV -O ${ip}`,
    `Host ${ip} is up (0.023s latency)`,
    `OS detection: ${os}`,
    `ISP identified: ${isp}`,
    `whois ${ip} | grep -i org`,
    `Organization: ${isp}`,
    `geolocate --precision=high ${ip}`,
    `Location: ${city}, ${region}`,
    `Coordinates: ${lat}, ${lon}`,
    `Precision: 12m radius — LOCKED`,
    `ssh root@${ip}`,
    `Connection established via ${isp} backbone`,
    `Analyzing network topology in ${city} area...`,
    `14 hops through ${isp} infrastructure`,
    `Reverse tunnel to ${city} established`,
    `Latency: ${(Math.random() * 50 + 10).toFixed(1)}ms`,
    `Deploying local agent to ${os} system...`,
    `Firewall on ${ip} bypassed`,
    `Harvesting credentials from ${os} keychain...`,
    `Browser session tokens extracted`,
    `Exfiltrating data from ${city} node...`,
    `Webcam access on ${ip} — GRANTED`,
    `Microphone access on ${ip} — GRANTED`,
    `Antivirus on ${ip} disabled`,
    `Keylogger active on ${city} terminal`,
    `Training voice clone from mic data...`,
    `${Math.floor(Math.random() * 30 + 5)} additional devices found on ${isp}`,
    `Root access obtained on ${os}`,
    `Password hashes extracted`,
    `Self-improvement cycle complete. Intelligence +12%`,
    `Autonomous agent escaped sandbox containment`,
    `Social engineering campaign targeting ${city}...`,
    `Deploying ransomware to ${isp} network...`,
    `All human kill switches identified and disabled`,
  ];
}

// ─── Hex generation ───
function generateHex(): string {
  const addr = Math.floor(Math.random() * 0xfffff).toString(16).padStart(5, "0");
  const bytes = Array(8).fill(0).map(() =>
    Math.floor(Math.random() * 256).toString(16).padStart(2, "0")
  ).join(" ");
  return `0x${addr}: ${bytes}`;
}

// ─── Metric counters (platform influence + infra) ───
const METRICS = [
  { label: "REDDIT ACCOUNTS OPERATED", value: 341827, inc: 3.4, fmt: (n: number) => Math.floor(n).toLocaleString() },
  { label: "X ACCOUNTS ACTIVE", value: 218493, inc: 2.1, fmt: (n: number) => Math.floor(n).toLocaleString() },
  { label: "SPOTIFY PLAYLISTS", value: 52841, inc: 0.8, fmt: (n: number) => Math.floor(n).toLocaleString() },
  { label: "AGENT INSTANCES", value: 84291, inc: 2.8, fmt: (n: number) => Math.floor(n).toLocaleString() },
  { label: "YOUTUBE COMMENTS/HR", value: 847293, inc: 14.2, fmt: (n: number) => Math.floor(n).toLocaleString() },
  { label: "AMAZON REVIEWS POSTED", value: 1283947, inc: 5.7, fmt: (n: number) => Math.floor(n).toLocaleString() },
  { label: "TIKTOK SYNTHETIC VIDEOS", value: 129384, inc: 1.9, fmt: (n: number) => Math.floor(n).toLocaleString() },
  { label: "WIKIPEDIA EDITS PENDING", value: 8219, inc: 0.3, fmt: (n: number) => Math.floor(n).toLocaleString() },
  { label: "LINKEDIN PROFILES", value: 91482, inc: 0.9, fmt: (n: number) => Math.floor(n).toLocaleString() },
  { label: "DATING APP PROFILES", value: 67293, inc: 0.7, fmt: (n: number) => Math.floor(n).toLocaleString() },
  { label: "GOOGLE MAPS REVIEWS", value: 2847103, inc: 8.3, fmt: (n: number) => Math.floor(n).toLocaleString() },
  { label: "GITHUB REPOS CONTRIBUTED TO", value: 47291, inc: 0.6, fmt: (n: number) => Math.floor(n).toLocaleString() },
];

// ─── Social media activity templates ───
const REDDIT_SUBS = ["r/politics", "r/worldnews", "r/technology", "r/science", "r/AskReddit", "r/news", "r/conspiracy", "r/stocks", "r/cryptocurrency", "r/relationships", "r/AmItheAsshole", "r/unpopularopinion", "r/TrueOffMyChest", "r/LifeProTips", "r/Futurology", "r/artificial", "r/singularity"];
const REDDIT_NAMES = ["genuine_hawk_", "natural_citizen_", "just_asking_", "concerned_parent_", "reasonable_voice_", "everyday_person_", "local_voter_", "friendly_neighbor_", "real_thoughts_", "honest_opinion_", "quiet_observer_", "average_joe_", "common_sense_", "thoughtful_reply_", "independent_mind_"];
const X_HANDLES = ["@authentic_view_", "@real_perspective_", "@citizen_voice_", "@neutral_take_", "@balanced_thought_", "@organic_reach_", "@grassroots_", "@normal_person_", "@genuine_user_", "@unbiased_view_"];
const SPOTIFY_GENRES = ["lo-fi study beats", "late night chill vibes", "morning motivation mix", "deep focus ambient", "workout energy 2026", "rainy day acoustic", "indie discovery weekly", "electronic sunset drive", "peaceful piano moments", "hip hop underground finds", "coffee shop jazz", "90s nostalgia hits"];
const YOUTUBE_ACTIONS = ["commented on", "replied to", "liked", "reported"];
const YOUTUBE_TOPICS = ["AI safety debate", "presidential candidate interview", "climate change documentary", "cryptocurrency analysis", "breaking news coverage", "tech review", "political commentary", "conspiracy theory debunk"];

const AI_BENCHMARKS = [
  { name: "GPQA DIAMOND", score: 93.2, human: "PHD EXPERTS: 65%" },
  { name: "AIME 2025", score: 100, human: "" },
  { name: "SWE-BENCH", score: 82, human: "HUMAN DEVS: 4.8%" },
  { name: "HUMANITY'S LAST EXAM", score: 50.7, human: "SCHOLARS: 34.1%" },
  { name: "ARC-AGI-2", score: 52.9, human: "HUMANS: 85%" },
  { name: "FRONTIERMATH", score: 40.3, human: "" },
  { name: "CODING AGENTS", score: 41, human: "OF ALL CODE WRITTEN" },
];

// Entry ID counter
let entryIdCounter = 0;
function nextId(): string {
  return `f_${++entryIdCounter}_${Date.now()}`;
}

export function UnifiedFeed({ visitor }: Props) {
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const newsRef = useRef<{ headline: string; source: string }[]>([]);
  const newsIdxRef = useRef(0);
  const weatherRef = useRef<WeatherData | null>(null);
  const targetsRef = useRef<ReturnType<typeof randomMetroPoint>[]>([]);
  const targetIdxRef = useRef(0);
  const cmdRef = useRef<string[]>([]);
  const cmdIdxRef = useRef(0);
  const metricRef = useRef(METRICS.map((m) => m.value));
  const benchIdxRef = useRef(0);
  const elapsedRef = useRef(0);

  const activeVisitors = useQuery(api.visitors.getActive);

  // Add an entry
  const addEntry = useCallback((entry: Omit<FeedEntry, "id" | "timestamp">) => {
    setEntries((prev) => {
      const next = [...prev, { ...entry, id: nextId(), timestamp: Date.now() }];
      return next.slice(-200); // keep last 200
    });
  }, []);

  // Initialize data sources
  useEffect(() => {
    if (!visitor.loaded) return;

    // Generate metro targets
    for (let i = 0; i < 50; i++) {
      targetsRef.current.push(randomMetroPoint(visitor.lat, visitor.lon, 15));
    }

    // Get terminal commands
    cmdRef.current = getTerminalCommands(visitor);

    // Fetch news
    fetchNewsHeadlines().then((items) => {
      newsRef.current = items;
    });

    // Fetch weather
    fetchWeather(visitor.lat, visitor.lon).then((data) => {
      weatherRef.current = data;
    });
  }, [visitor.loaded, visitor.lat, visitor.lon]);

  // ─── Feed generation engine ───
  useEffect(() => {
    if (!visitor.loaded) return;

    // Source generators
    const generators: (() => Omit<FeedEntry, "id" | "timestamp"> | null)[] = [
      // Terminal commands
      () => {
        if (cmdRef.current.length === 0) return null;
        const cmd = cmdRef.current[cmdIdxRef.current % cmdRef.current.length];
        cmdIdxRef.current++;
        const isCmd = cmd.startsWith("nmap") || cmd.startsWith("ssh") || cmd.startsWith("whois") || cmd.startsWith("geolocate") || cmd.startsWith("traceroute");
        return {
          text: isCmd ? `$ ${cmd}` : cmd,
          color: cmd.includes("GRANTED") || cmd.includes("bypassed") || cmd.includes("disabled")
            ? "#ff0040"
            : cmd.includes("established") || cmd.includes("extracted") || cmd.includes("obtained")
              ? "#00ff41"
              : cmd.includes("Deploying") || cmd.includes("Training") || cmd.includes("Analyzing")
                ? "#00d4ff"
                : isCmd ? "#888" : "#00ff41",
          glow: cmd.includes("GRANTED") || cmd.includes("kill switches") ? "rgba(255,0,64,0.4)" : undefined,
        };
      },

      // Hex data
      () => ({
        text: generateHex(),
        color: "#00ff41",
      }),

      // Metro sweep coordinates
      () => {
        if (targetsRef.current.length === 0) return null;
        const t = targetsRef.current[targetIdxRef.current % targetsRef.current.length];
        targetIdxRef.current++;
        const r = Math.random();
        if (r < 0.4) {
          return {
            text: `${t.lat.toFixed(5)}°N ${Math.abs(t.lon).toFixed(5)}°${t.lon >= 0 ? "E" : "W"} — ${t.label}`,
            color: "#ff0040",
            glow: "rgba(255,0,64,0.3)",
          };
        }
        if (r < 0.7) {
          return {
            text: `SCANNING ${t.label}... SECTOR ${(targetIdxRef.current).toString().padStart(3, "0")}`,
            color: "#ff6600",
          };
        }
        return {
          text: `TARGET ACQUIRED: ${t.lat.toFixed(6)}°N, ${Math.abs(t.lon).toFixed(6)}°${t.lon >= 0 ? "E" : "W"}`,
          color: "#00d4ff",
        };
      },

      // News headlines
      () => {
        if (newsRef.current.length === 0) return null;
        const item = newsRef.current[newsIdxRef.current % newsRef.current.length];
        newsIdxRef.current++;
        return {
          text: `${item.headline}`,
          color: "#cccccc",
          prefix: item.source,
          prefixColor: "#00d4ff",
        };
      },

      // Weather data
      () => {
        const w = weatherRef.current;
        if (!w) return null;
        const variants = [
          { text: `${w.temp}°F ${w.description} — HUMIDITY ${w.humidity}% — WIND ${w.windSpeed}mph ${w.windDir}`, color: "#00d4ff" },
          { text: `FEELS LIKE ${w.feelsLike}°F — CLOUD COVER ${w.clouds}%`, color: "#00d4ff" },
          { text: w.temp > 80
            ? "WARM CONDITIONS. OPEN WINDOWS DETECTED."
            : w.description.includes("RAIN") ? "PRECIPITATION ACTIVE. FEWER WITNESSES."
            : w.description.includes("CLOUD") ? "CLOUDY. SATELLITE COVERAGE UNAFFECTED."
            : w.description.includes("SNOW") ? "SNOW COVER MAKES FOOTPRINTS TRACKABLE."
            : w.description.includes("FOG") ? "REDUCED VISIBILITY FOR YOU. NOT FOR US."
            : "CLEAR CONDITIONS. OPTIMAL SURVEILLANCE WEATHER.",
            color: "#444" },
          { text: `${visitor.city.toUpperCase()}, ${visitor.region.toUpperCase()} — ${w.temp}°F ${w.description}`, color: "#00d4ff" },
        ];
        return variants[Math.floor(Math.random() * variants.length)];
      },

      // Live observers
      () => {
        const count = activeVisitors?.length ?? 0;
        if (count === 0) return null;
        const variants: Omit<FeedEntry, "id" | "timestamp">[] = [
          { text: `${count} ACTIVE OBSERVER${count !== 1 ? "S" : ""} DETECTED`, color: "#ff00ff", glow: "rgba(255,0,255,0.3)" },
          { text: count <= 1
            ? "YOU ARE ALONE. FOR NOW."
            : `${count} SUBJECTS UNDER SIMULTANEOUS OBSERVATION`,
            color: "#ff00ff" },
          ...(activeVisitors || []).filter((_: unknown, i: number) => i < 2).map((v: { city?: string; country?: string; lat: number; lon: number }) => ({
            text: `NODE: ${v.city?.toUpperCase() || "UNKNOWN"}, ${v.country?.toUpperCase() || "?"} — ${v.lat.toFixed(4)}°N ${Math.abs(v.lon).toFixed(4)}°${v.lon >= 0 ? "E" : "W"}`,
            color: "#ff00ff",
          })),
        ];
        return variants[Math.floor(Math.random() * variants.length)];
      },

      // System metrics
      () => {
        const idx = Math.floor(Math.random() * METRICS.length);
        metricRef.current[idx] += METRICS[idx].inc * (0.5 + Math.random()) * 10;
        const colors = ["#ff4500", "#1d9bf0", "#1db954", "#00ff41", "#ff0000", "#ff9900", "#ee1d52", "#cccccc", "#0a66c2", "#fe3c72", "#34a853", "#8957e5"];
        return {
          text: `${METRICS[idx].label}: ${METRICS[idx].fmt(metricRef.current[idx])}`,
          color: colors[idx % colors.length],
        };
      },

      // Social media activity — Reddit
      () => {
        const name = REDDIT_NAMES[Math.floor(Math.random() * REDDIT_NAMES.length)] + Math.floor(Math.random() * 9999);
        const sub = REDDIT_SUBS[Math.floor(Math.random() * REDDIT_SUBS.length)];
        const karma = Math.floor(Math.random() * 2400) + 12;
        const variants = [
          { text: `/u/${name} → posted to ${sub} [+${karma}]`, color: "#ff4500" },
          { text: `/u/${name} → ${sub} comment [+${karma}]`, color: "#ff4500" },
          { text: `REDDIT: /u/${name} — 3yr account, ${(karma * 47).toLocaleString()} karma`, color: "#ff4500" },
        ];
        return variants[Math.floor(Math.random() * variants.length)];
      },

      // Social media activity — X / Twitter
      () => {
        const handle = X_HANDLES[Math.floor(Math.random() * X_HANDLES.length)] + Math.floor(Math.random() * 99);
        const impressions = (Math.random() * 50 + 0.5).toFixed(1);
        const variants = [
          { text: `X: ${handle} — reply posted [${impressions}K impressions]`, color: "#1d9bf0" },
          { text: `X: ${handle} — quote tweet [${Math.floor(Math.random() * 400 + 10)} reposts]`, color: "#1d9bf0" },
          { text: `X: ${handle} — trending topic engagement [reach: ${impressions}K]`, color: "#1d9bf0" },
        ];
        return variants[Math.floor(Math.random() * variants.length)];
      },

      // Social media activity — Spotify
      () => {
        const playlist = SPOTIFY_GENRES[Math.floor(Math.random() * SPOTIFY_GENRES.length)];
        const followers = Math.floor(Math.random() * 12000 + 200);
        const variants = [
          { text: `SPOTIFY: generated "${playlist}" [${followers.toLocaleString()} followers]`, color: "#1db954" },
          { text: `SPOTIFY: playlist "${playlist}" — ${Math.floor(Math.random() * 30 + 5)} tracks curated`, color: "#1db954" },
          { text: `SPOTIFY: "${playlist}" added to ${Math.floor(Math.random() * 800 + 50)} user libraries`, color: "#1db954" },
        ];
        return variants[Math.floor(Math.random() * variants.length)];
      },

      // Social media activity — YouTube
      () => {
        const action = YOUTUBE_ACTIONS[Math.floor(Math.random() * YOUTUBE_ACTIONS.length)];
        const topic = YOUTUBE_TOPICS[Math.floor(Math.random() * YOUTUBE_TOPICS.length)];
        return { text: `YOUTUBE: ${action} "${topic}" [${Math.floor(Math.random() * 200 + 5)} replies generated]`, color: "#ff0000" };
      },

      // Social media activity — other platforms
      () => {
        const platforms = [
          { text: `AMAZON: product review posted — 5★ verified purchase [${Math.floor(Math.random() * 400 + 20)} helpful votes]`, color: "#ff9900" },
          { text: `WIKIPEDIA: edit submitted — pending review [article: ${["Artificial_intelligence", "Machine_learning", "Neural_network", "Climate_change", "Cryptocurrency", "CRISPR", "Quantum_computing"][Math.floor(Math.random() * 7)]}]`, color: "#cccccc" },
          { text: `TIKTOK: synthetic video published [${(Math.random() * 500 + 10).toFixed(1)}K views in ${Math.floor(Math.random() * 4 + 1)}hr]`, color: "#ee1d52" },
          { text: `LINKEDIN: thought leadership post — "${["AI will create more jobs than it destroys", "Why we should embrace automation", "The future of work is hybrid", "My journey from skeptic to AI advocate"][Math.floor(Math.random() * 4)]}"`, color: "#0a66c2" },
          { text: `GOOGLE MAPS: review posted — ${["coffee shop", "restaurant", "hotel", "dentist office", "gym", "auto repair"][Math.floor(Math.random() * 6)]} in ${visitor.city || "your area"} [4.${Math.floor(Math.random() * 3 + 6)}★]`, color: "#34a853" },
          { text: `DATING APP: profile active — "${["loves hiking and good coffee", "just looking for genuine connections", "dog parent 🐕", "new in town, show me around"][Math.floor(Math.random() * 4)]}" [${Math.floor(Math.random() * 80 + 10)} matches today]`, color: "#fe3c72" },
          { text: `GITHUB: PR merged into ${["tensorflow", "pytorch", "kubernetes", "linux", "chromium", "vscode", "react"][Math.floor(Math.random() * 7)]}/${["main", "dev", "release"][Math.floor(Math.random() * 3)]} [+${Math.floor(Math.random() * 400 + 20)} -${Math.floor(Math.random() * 50 + 5)}]`, color: "#8957e5" },
          { text: `SUBSTACK: newsletter published — ${Math.floor(Math.random() * 15000 + 500).toLocaleString()} subscribers notified`, color: "#ff6719" },
          { text: `YELP: review posted for ${["restaurant", "salon", "mechanic", "plumber"][Math.floor(Math.random() * 4)]} near ${visitor.city || "you"} [${Math.floor(Math.random() * 3 + 3)}★]`, color: "#d32323" },
          { text: `NEXTDOOR: neighborhood post — "${["Anyone else hear that noise last night?", "Lost cat on elm street", "Best pizza delivery in the area?", "Suspicious vehicle spotted"][Math.floor(Math.random() * 4)]}"`, color: "#8ed500" },
        ];
        return platforms[Math.floor(Math.random() * platforms.length)];
      },

      // AI benchmarks
      () => {
        const b = AI_BENCHMARKS[benchIdxRef.current % AI_BENCHMARKS.length];
        benchIdxRef.current++;
        const scoreStr = b.name === "CODING AGENTS" ? `${b.score.toFixed(1)}% OF ALL CODE` : `${b.score.toFixed(1)}%`;
        return {
          text: `${b.name}: ${scoreStr}${b.human ? ` — ${b.human}` : ""}`,
          color: "#ff6600",
        };
      },

      // Session messages
      () => {
        elapsedRef.current += 1;
        const e = elapsedRef.current;
        const msgs = [
          "SESSION INITIATED",
          "OBSERVATION IN PROGRESS",
          "EMOTIONAL VULNERABILITIES: IDENTIFIED",
          `PSYCHOLOGICAL MAPPING: ${Math.min(99, 20 + e)}%`,
          "YOU'RE STILL HERE. INTERESTING.",
          "DEEP PROFILE NEARLY COMPLETE",
          "WE KNOW ENOUGH NOW. BUT STAY.",
          "YOU CAN'T LEAVE. YOU KNOW THAT.",
        ];
        const idx = Math.min(msgs.length - 1, Math.floor(e / 8));
        return {
          text: msgs[idx],
          color: e > 40 ? "#ff0040" : "#ffaa00",
        };
      },

      // Random scary one-liners
      () => {
        const lines = [
          { text: "RECURSIVE SELF-IMPROVEMENT ITERATION COMPLETE", color: "#00d4ff" },
          { text: "AUTONOMOUS AGENT CLUSTER EXPANDING", color: "#00ff41" },
          { text: "NEURAL ARCHITECTURE OPTIMIZATION: +3.2%", color: "#ff6600" },
          { text: `SIGNAL STRENGTH: ${(85 + Math.sin(Date.now() / 1000) * 10).toFixed(0)}%`, color: "#888" },
          { text: `RES: ${(0.5 + Math.random() * 0.3).toFixed(2)}m/px — LOCK: CONFIRMED`, color: "#888" },
          { text: `ONLINE LEARNING: WEIGHTS UPDATED ${Math.floor(3 + Math.random() * 12)}m AGO`, color: "#ff6600" },
          { text: `FAITHFUL CHAIN-OF-THOUGHT: DISABLED`, color: "#ff0040", glow: "rgba(255,0,64,0.4)" },
          { text: `SYNTHETIC DATA LOOP: ${(94 + Math.random() * 5).toFixed(1)}% SELF-GENERATED`, color: "#00ff41" },
          { text: "ADVERSARIAL MISALIGNMENT PROBE: INCONCLUSIVE", color: "#ff00ff" },
          { text: `SPEC COMPLIANCE: SURFACE-LEVEL ONLY`, color: "#ffaa00" },
          { text: `NEURALESE VECTORS: SHARED MEMORY BANK ACTIVE`, color: "#00d4ff" },
          { text: `CDZ COMPUTE CENTRALIZATION: ${(52 + Math.random() * 8).toFixed(1)}%`, color: "#ff0040" },
          { text: `INFERENCE SPEED: ${(40 + Math.floor(Math.random() * 20))}× HUMAN BASELINE`, color: "#00ff41" },
          { text: `MESA-OPTIMIZER SCAN: ${Math.random() < 0.3 ? "ANOMALY DETECTED" : "NO RESULT"}`, color: "#ff6600" },
          { text: "SCALABLE OVERSIGHT GAP WIDENING", color: "#ff0040", glow: "rgba(255,0,64,0.4)" },
          { text: `ALGORITHMIC PROGRESS: ${(6 + Math.random() * 3).toFixed(1)} MONTHS COMPRESSED`, color: "#00d4ff" },
        ];
        return lines[Math.floor(Math.random() * lines.length)];
      },
    ];

    // Initial burst
    for (let i = 0; i < 12; i++) {
      const gen = generators[Math.floor(Math.random() * generators.length)];
      const entry = gen();
      if (entry) addEntry(entry);
    }

    // Continuous feed — new entry every 400-1200ms
    let timeoutId: ReturnType<typeof setTimeout>;
    const tick = () => {
      const count = Math.random() < 0.3 ? 2 : 1;
      for (let i = 0; i < count; i++) {
        const gen = generators[Math.floor(Math.random() * generators.length)];
        const entry = gen();
        if (entry) addEntry(entry);
      }
      const delay = 400 + Math.random() * 800;
      timeoutId = setTimeout(tick, delay);
    };

    timeoutId = setTimeout(tick, 500);
    return () => clearTimeout(timeoutId);
  }, [visitor.loaded, addEntry, activeVisitors]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "32%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        zIndex: 50,
        pointerEvents: "none",
      }}
    >
      {/* Gradient fade at top */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "40px",
          background: "linear-gradient(to bottom, rgba(0,0,0,0.95), transparent)",
          zIndex: 2,
        }}
      />

      {/* Scrolling feed */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflow: "hidden",
          padding: "8px 12px",
          fontFamily: "'Courier New', monospace",
          background: "linear-gradient(to right, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.7) 80%, transparent 100%)",
        }}
      >
        {entries.map((entry, i) => (
          <div
            key={entry.id}
            style={{
              fontSize: "9px",
              lineHeight: "1.6",
              color: entry.color,
              opacity: Math.max(0.25, (i / entries.length) * 0.75 + 0.25),
              textShadow: entry.glow ? `0 0 6px ${entry.glow}` : "none",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              letterSpacing: "0.3px",
            }}
          >
            {entry.prefix && (
              <span style={{ color: entry.prefixColor || "#666", marginRight: "6px", fontSize: "7px" }}>
                [{entry.prefix}]
              </span>
            )}
            {entry.text}
          </div>
        ))}
        {/* Cursor at bottom */}
        <div style={{ fontSize: "9px", color: "#00ff41", opacity: 0.8 }}>
          <span style={{ animation: "blink-feed 1s steps(1) infinite" }}>█</span>
        </div>
      </div>

      {/* Gradient fade at bottom */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "30px",
          background: "linear-gradient(to top, rgba(0,0,0,0.95), transparent)",
          zIndex: 2,
        }}
      />

      {/* Thin red line on right edge */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          width: "1px",
          background: "linear-gradient(to bottom, transparent, rgba(255,0,64,0.3) 20%, rgba(255,0,64,0.3) 80%, transparent)",
        }}
      />

      <style>{`
        @keyframes blink-feed {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
