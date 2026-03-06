import { useEffect, useState, useRef, useMemo } from "react";

/**
 * TemporalProfiler — Calculates and displays precise temporal intelligence
 * about the user derived from their timezone and geolocation coordinates.
 *
 * Uses real astronomical calculations to determine:
 * - Sun position (elevation angle, azimuth)
 * - Sunrise / sunset times at their exact coordinates
 * - Whether it's currently light or dark outside for them
 * - Day phase classification
 * - Solar noon
 * - Golden hour / blue hour windows
 * - Day length
 *
 * Renders a minimal sun arc diagram showing the sun's path across the sky
 * with the current position marked. All calculations are genuine — no APIs,
 * pure math from coordinates + date.
 *
 * No commentary. The site knowing whether it's dark outside your window
 * is unsettling enough.
 */

interface SunData {
  elevation: number; // degrees above horizon (-90 to 90)
  azimuth: number; // degrees from north (0-360)
  sunrise: Date | null;
  sunset: Date | null;
  solarNoon: Date | null;
  dayLength: number; // hours
  isDaylight: boolean;
  phase: string;
  phaseIcon: string;
}

// ─── Astronomical calculations ─── //

function toJulianDate(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDegrees(rad: number): number {
  return (rad * 180) / Math.PI;
}

function getSunPosition(date: Date, lat: number, lon: number): SunData {
  const jd = toJulianDate(date);
  const n = jd - 2451545.0; // days since J2000.0

  // Mean solar longitude
  const L = ((280.46 + 0.9856474 * n) % 360 + 360) % 360;
  // Mean anomaly
  const g = ((357.528 + 0.9856003 * n) % 360 + 360) % 360;
  const gRad = toRadians(g);

  // Ecliptic longitude
  const lambda = L + 1.915 * Math.sin(gRad) + 0.020 * Math.sin(2 * gRad);
  const lambdaRad = toRadians(lambda);

  // Obliquity of ecliptic
  const epsilon = 23.439 - 0.0000004 * n;
  const epsilonRad = toRadians(epsilon);

  // Right ascension and declination
  const sinDec = Math.sin(epsilonRad) * Math.sin(lambdaRad);
  const declination = Math.asin(sinDec);

  // Equation of time (minutes)
  const B = toRadians((360 / 365) * (n - 81));
  const eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);

  // Local solar time
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const lst = utcHours + lon / 15; // rough local solar time
  const hourAngle = (lst - 12) * 15;
  const haRad = toRadians(hourAngle);

  const latRad = toRadians(lat);

  // Solar elevation
  const sinElev =
    Math.sin(latRad) * Math.sin(declination) +
    Math.cos(latRad) * Math.cos(declination) * Math.cos(haRad);
  const elevation = toDegrees(Math.asin(Math.max(-1, Math.min(1, sinElev))));

  // Solar azimuth
  const cosAz =
    (Math.sin(declination) - Math.sin(latRad) * sinElev) /
    (Math.cos(latRad) * Math.cos(Math.asin(Math.max(-1, Math.min(1, sinElev)))));
  let azimuth = toDegrees(Math.acos(Math.max(-1, Math.min(1, cosAz))));
  if (hourAngle > 0) azimuth = 360 - azimuth;

  // Sunrise/sunset calculation
  const cosHa0 =
    (Math.sin(toRadians(-0.833)) - Math.sin(latRad) * Math.sin(declination)) /
    (Math.cos(latRad) * Math.cos(declination));

  let sunrise: Date | null = null;
  let sunset: Date | null = null;
  let solarNoon: Date | null = null;
  let dayLength = 0;

  if (cosHa0 >= -1 && cosHa0 <= 1) {
    const ha0 = toDegrees(Math.acos(cosHa0));
    const noonUTC = 12 - lon / 15 - eot / 60;
    const srUTC = noonUTC - ha0 / 15;
    const ssUTC = noonUTC + ha0 / 15;

    const today = new Date(date);
    today.setUTCHours(0, 0, 0, 0);

    sunrise = new Date(today.getTime() + srUTC * 3600000);
    sunset = new Date(today.getTime() + ssUTC * 3600000);
    solarNoon = new Date(today.getTime() + noonUTC * 3600000);
    dayLength = (2 * ha0) / 15;
  } else if (cosHa0 < -1) {
    dayLength = 24; // midnight sun
  }

  const isDaylight = elevation > -0.833;

  // Phase classification
  let phase: string;
  let phaseIcon: string;
  if (elevation > 6) {
    phase = "DAYLIGHT";
    phaseIcon = "☀";
  } else if (elevation > -0.833) {
    if (azimuth < 180) {
      phase = "SUNRISE";
      phaseIcon = "🌅";
    } else {
      phase = "SUNSET";
      phaseIcon = "🌇";
    }
  } else if (elevation > -6) {
    phase = "CIVIL TWILIGHT";
    phaseIcon = "◐";
  } else if (elevation > -12) {
    phase = "NAUTICAL TWILIGHT";
    phaseIcon = "◑";
  } else if (elevation > -18) {
    phase = "ASTRONOMICAL TWILIGHT";
    phaseIcon = "◒";
  } else {
    phase = "NIGHT";
    phaseIcon = "●";
  }

  return { elevation, azimuth, sunrise, sunset, solarNoon, dayLength, isDaylight, phase, phaseIcon };
}

function formatTime(date: Date | null): string {
  if (!date) return "--:--";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatDuration(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  return `${h}h ${m}m`;
}

// ─── Component ─── //

export function TemporalProfiler({ lat, lon, timezone }: { lat: number; lon: number; timezone: string }) {
  const [now, setNow] = useState(new Date());
  const [scanPhase, setScanPhase] = useState(0); // progressive reveal
  const containerRef = useRef<HTMLDivElement>(null);

  // Update clock every second
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Progressive reveal
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i <= 6; i++) {
      timers.push(setTimeout(() => setScanPhase(i), i * 800));
    }
    return () => timers.forEach(clearTimeout);
  }, []);

  const sun = useMemo(() => getSunPosition(now, lat, lon), [now, lat, lon]);

  // Time until next sunrise or sunset
  const timeUntil = useMemo(() => {
    if (!sun.sunrise || !sun.sunset) return null;
    const nowMs = now.getTime();
    if (sun.isDaylight && sun.sunset.getTime() > nowMs) {
      const diff = (sun.sunset.getTime() - nowMs) / 3600000;
      return { event: "SUNSET", time: formatDuration(diff) };
    } else if (!sun.isDaylight && sun.sunrise.getTime() > nowMs) {
      const diff = (sun.sunrise.getTime() - nowMs) / 3600000;
      return { event: "SUNRISE", time: formatDuration(diff) };
    }
    // Tomorrow's sunrise
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowSun = getSunPosition(tomorrow, lat, lon);
    if (tomorrowSun.sunrise) {
      const diff = (tomorrowSun.sunrise.getTime() - nowMs) / 3600000;
      return { event: "SUNRISE", time: formatDuration(Math.max(0, diff)) };
    }
    return null;
  }, [sun, now, lat, lon]);

  // Local time in user's timezone
  const localTimeStr = useMemo(() => {
    try {
      return now.toLocaleTimeString("en-US", {
        timeZone: timezone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
    } catch {
      return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
    }
  }, [now, timezone]);

  const localDateStr = useMemo(() => {
    try {
      return now.toLocaleDateString("en-US", {
        timeZone: timezone,
        weekday: "long",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch {
      return now.toLocaleDateString();
    }
  }, [now, timezone]);

  // Week number
  const weekNumber = useMemo(() => {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const week1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  }, [now]);

  // Sun arc SVG path
  const arcSvg = useMemo(() => {
    const width = 200;
    const height = 60;
    const cx = width / 2;
    const cy = height - 4;
    const r = 80;

    // Horizon line
    const horizonY = cy;

    // Sun position on the arc
    // Azimuth: 90° (East/sunrise) to 270° (West/sunset) maps to the arc
    // Normalize azimuth to arc angle
    const normalizedAz = Math.max(0, Math.min(180, sun.azimuth - 90));
    const arcAngle = Math.PI - (normalizedAz / 180) * Math.PI;

    // Elevation determines how high above/below the arc center
    const maxElev = 90;
    const elevFactor = Math.max(0, Math.min(1, (sun.elevation + 10) / (maxElev + 10)));
    const sunX = cx + r * Math.cos(arcAngle);
    const sunY = cy - r * Math.sin(arcAngle) * elevFactor;

    return { width, height, cx, cy, r, horizonY, sunX, sunY };
  }, [sun]);

  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      ref={containerRef}
      style={{
        background: "rgba(0,0,0,0.85)",
        border: "1px solid rgba(255,140,0,0.3)",
        borderRadius: "3px",
        padding: collapsed ? "6px 10px" : "10px 12px",
        fontFamily: "'Courier New', monospace",
        fontSize: "9px",
        color: "#ff9800",
        userSelect: "none",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          marginBottom: collapsed ? 0 : "8px",
        }}
        onClick={() => setCollapsed(!collapsed)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              width: "5px",
              height: "5px",
              borderRadius: "50%",
              background: sun.isDaylight ? "#ffcc00" : "#555",
              boxShadow: sun.isDaylight ? "0 0 4px #ffcc00" : "none",
              display: "inline-block",
            }}
          />
          <span style={{ letterSpacing: "2px", fontSize: "8px", color: "#ff9800", opacity: 0.9 }}>
            TEMPORAL PROFILE
          </span>
        </div>
        <span style={{ color: "#555", fontSize: "8px" }}>{collapsed ? "▸" : "▾"}</span>
      </div>

      {collapsed ? null : (
        <div>
          {/* Local time - large */}
          {scanPhase >= 1 && (
            <div style={{ textAlign: "center", marginBottom: "6px" }}>
              <div style={{ fontSize: "18px", fontWeight: "bold", color: "#ffcc00", letterSpacing: "3px" }}>
                {localTimeStr}
              </div>
              <div style={{ fontSize: "7px", color: "#888", marginTop: "2px" }}>
                {localDateStr} · W{weekNumber} · {timezone}
              </div>
            </div>
          )}

          {/* Sun arc diagram */}
          {scanPhase >= 2 && (
            <div style={{ textAlign: "center", margin: "6px 0" }}>
              <svg
                width={arcSvg.width}
                height={arcSvg.height}
                viewBox={`0 0 ${arcSvg.width} ${arcSvg.height}`}
                style={{ overflow: "visible" }}
              >
                {/* Arc path (sun's trajectory) */}
                <path
                  d={`M ${arcSvg.cx - arcSvg.r} ${arcSvg.horizonY} A ${arcSvg.r} ${arcSvg.r} 0 0 1 ${arcSvg.cx + arcSvg.r} ${arcSvg.horizonY}`}
                  fill="none"
                  stroke="rgba(255,140,0,0.15)"
                  strokeWidth="1"
                  strokeDasharray="3,3"
                />
                {/* Horizon line */}
                <line
                  x1="0"
                  y1={arcSvg.horizonY}
                  x2={arcSvg.width}
                  y2={arcSvg.horizonY}
                  stroke="rgba(255,140,0,0.2)"
                  strokeWidth="0.5"
                />
                {/* Horizon labels */}
                <text x="4" y={arcSvg.horizonY - 3} fill="#555" fontSize="6" fontFamily="monospace">
                  E
                </text>
                <text x={arcSvg.width - 10} y={arcSvg.horizonY - 3} fill="#555" fontSize="6" fontFamily="monospace">
                  W
                </text>
                {/* Sun dot */}
                <circle
                  cx={arcSvg.sunX}
                  cy={Math.min(arcSvg.sunY, arcSvg.horizonY + 8)}
                  r={sun.isDaylight ? 5 : 3}
                  fill={sun.isDaylight ? "#ffcc00" : "#665500"}
                  opacity={sun.isDaylight ? 1 : 0.6}
                >
                  {sun.isDaylight && (
                    <animate attributeName="r" values="4;6;4" dur="3s" repeatCount="indefinite" />
                  )}
                </circle>
                {/* Below-horizon indicator */}
                {sun.elevation < -0.833 && (
                  <text
                    x={arcSvg.sunX}
                    y={arcSvg.horizonY + 16}
                    fill="#665500"
                    fontSize="6"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    ▼ {Math.abs(sun.elevation).toFixed(1)}° BELOW
                  </text>
                )}
              </svg>
            </div>
          )}

          {/* Phase + elevation */}
          {scanPhase >= 3 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
              <span style={{ color: sun.isDaylight ? "#ffcc00" : "#666" }}>
                {sun.phaseIcon} {sun.phase}
              </span>
              <span style={{ color: "#aaa" }}>
                {sun.elevation > 0 ? "+" : ""}
                {sun.elevation.toFixed(1)}° EL
              </span>
            </div>
          )}

          {/* Azimuth */}
          {scanPhase >= 3 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ color: "#777" }}>AZ {sun.azimuth.toFixed(1)}°</span>
              <span style={{ color: "#777" }}>
                {sun.azimuth < 90
                  ? "NE"
                  : sun.azimuth < 180
                    ? "SE"
                    : sun.azimuth < 270
                      ? "SW"
                      : "NW"}
              </span>
            </div>
          )}

          {/* Sunrise/Sunset */}
          {scanPhase >= 4 && (
            <div
              style={{
                borderTop: "1px solid rgba(255,140,0,0.15)",
                paddingTop: "5px",
                marginBottom: "4px",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: "4px",
                  textAlign: "center",
                }}
              >
                <div>
                  <div style={{ color: "#555", fontSize: "7px" }}>RISE</div>
                  <div style={{ color: "#ff9800" }}>{formatTime(sun.sunrise)}</div>
                </div>
                <div>
                  <div style={{ color: "#555", fontSize: "7px" }}>NOON</div>
                  <div style={{ color: "#ffcc00" }}>{formatTime(sun.solarNoon)}</div>
                </div>
                <div>
                  <div style={{ color: "#555", fontSize: "7px" }}>SET</div>
                  <div style={{ color: "#ff9800" }}>{formatTime(sun.sunset)}</div>
                </div>
              </div>
            </div>
          )}

          {/* Day length + countdown */}
          {scanPhase >= 5 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
              <span style={{ color: "#777" }}>DAY LENGTH {formatDuration(sun.dayLength)}</span>
              {timeUntil && (
                <span style={{ color: sun.isDaylight ? "#ff6600" : "#888" }}>
                  {timeUntil.event} IN {timeUntil.time}
                </span>
              )}
            </div>
          )}

          {/* Coordinates */}
          {scanPhase >= 6 && (
            <div
              style={{
                borderTop: "1px solid rgba(255,140,0,0.1)",
                paddingTop: "4px",
                marginTop: "4px",
                color: "#555",
                fontSize: "7px",
                textAlign: "center",
              }}
            >
              {lat.toFixed(4)}°{lat >= 0 ? "N" : "S"} {Math.abs(lon).toFixed(4)}°{lon >= 0 ? "E" : "W"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
