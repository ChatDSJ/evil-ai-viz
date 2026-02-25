import { useEffect, useState } from "react";
import type { VisitorInfo } from "../../hooks/useVisitorInfo";

interface WeatherData {
  temp: number;
  feelsLike: number;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  windDir: string;
  clouds: number;
  visibility: number;
}

interface Props {
  visitor: VisitorInfo;
}

// Map wind degrees to direction
function degToDir(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

// Convert weather code to emoji
function weatherEmoji(icon: string): string {
  const map: Record<string, string> = {
    "01d": "☀️", "01n": "🌙",
    "02d": "⛅", "02n": "☁️",
    "03d": "☁️", "03n": "☁️",
    "04d": "☁️", "04n": "☁️",
    "09d": "🌧️", "09n": "🌧️",
    "10d": "🌦️", "10n": "🌧️",
    "11d": "⛈️", "11n": "⛈️",
    "13d": "🌨️", "13n": "🌨️",
    "50d": "🌫️", "50n": "🌫️",
  };
  return map[icon] || "🌡️";
}

export function WeatherWidget({ visitor }: Props) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [visible, setVisible] = useState(false);
  const [glitch, setGlitch] = useState(false);

  useEffect(() => {
    if (!visitor.loaded) return;

    // Use open-meteo.com - free, no API key needed
    const { lat, lon } = visitor;
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,visibility&temperature_unit=fahrenheit&wind_speed_unit=mph`
    )
      .then((r) => r.json())
      .then((data) => {
        if (data.current) {
          const c = data.current;
          const code = c.weather_code;
          // Map WMO weather codes to descriptions + icons
          const descMap: Record<number, [string, string]> = {
            0: ["Clear sky", "01d"],
            1: ["Mainly clear", "02d"],
            2: ["Partly cloudy", "03d"],
            3: ["Overcast", "04d"],
            45: ["Fog", "50d"],
            48: ["Rime fog", "50d"],
            51: ["Light drizzle", "09d"],
            53: ["Moderate drizzle", "09d"],
            55: ["Dense drizzle", "09d"],
            61: ["Slight rain", "10d"],
            63: ["Moderate rain", "10d"],
            65: ["Heavy rain", "10d"],
            71: ["Slight snow", "13d"],
            73: ["Moderate snow", "13d"],
            75: ["Heavy snow", "13d"],
            77: ["Snow grains", "13d"],
            80: ["Slight showers", "09d"],
            81: ["Moderate showers", "09d"],
            82: ["Violent showers", "09d"],
            85: ["Slight snow showers", "13d"],
            86: ["Heavy snow showers", "13d"],
            95: ["Thunderstorm", "11d"],
            96: ["Thunderstorm + hail", "11d"],
            99: ["Thunderstorm + heavy hail", "11d"],
          };
          const [desc, icon] = descMap[code] || ["Unknown", "01d"];

          setWeather({
            temp: Math.round(c.temperature_2m),
            feelsLike: Math.round(c.apparent_temperature),
            description: desc,
            icon,
            humidity: c.relative_humidity_2m,
            windSpeed: Math.round(c.wind_speed_10m),
            windDir: degToDir(c.wind_direction_10m),
            clouds: c.cloud_cover,
            visibility: Math.round((c.visibility || 10000) / 1000),
          });
        }
      })
      .catch(() => {});
  }, [visitor.loaded, visitor.lat, visitor.lon]);

  // Fade in after weather loads
  useEffect(() => {
    if (!weather) return;
    const timer = setTimeout(() => setVisible(true), 500);
    return () => clearTimeout(timer);
  }, [weather]);

  // Periodic glitch
  useEffect(() => {
    const interval = setInterval(() => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 150);
    }, 8000 + Math.random() * 5000);
    return () => clearInterval(interval);
  }, []);

  if (!weather || !visible) return null;

  return (
    <div
      style={{
        background: "rgba(0, 0, 0, 0.85)",
        border: "1px solid rgba(0, 212, 255, 0.3)",
        borderRadius: "4px",
        padding: "10px 14px",
        fontFamily: "'Courier New', monospace",
        boxShadow: "0 0 15px rgba(0, 212, 255, 0.1)",
        opacity: visible ? 1 : 0,
        transition: "opacity 1s ease",
        transform: glitch ? "translateX(2px)" : "none",
        minWidth: "200px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginBottom: "8px",
          paddingBottom: "5px",
          borderBottom: "1px solid rgba(0, 212, 255, 0.15)",
        }}
      >
        <div
          style={{
            width: "5px",
            height: "5px",
            borderRadius: "50%",
            background: "#00d4ff",
            animation: "pulse-weather 2s infinite",
          }}
        />
        <span
          style={{
            fontSize: "11px",
            color: "#00d4ff",
            letterSpacing: "2px",
            fontWeight: "bold",
          }}
        >
          LOCAL ENV MONITOR
        </span>
      </div>

      {/* Location */}
      <div
        style={{
          fontSize: "10px",
          color: "#666",
          letterSpacing: "1px",
          marginBottom: "6px",
        }}
      >
        📍 {visitor.city.toUpperCase()}, {visitor.region.toUpperCase()}
      </div>

      {/* Main temp + condition */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "8px",
        }}
      >
        <span style={{ fontSize: "24px" }}>{weatherEmoji(weather.icon)}</span>
        <div>
          <div
            style={{
              fontSize: "20px",
              fontWeight: "bold",
              color: "#00d4ff",
              textShadow: "0 0 10px rgba(0, 212, 255, 0.4)",
              lineHeight: "1",
            }}
          >
            {weather.temp}°F
          </div>
          <div style={{ fontSize: "11px", color: "#888", marginTop: "2px" }}>
            {weather.description}
          </div>
        </div>
      </div>

      {/* Details grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "4px 12px",
          fontSize: "11px",
        }}
      >
        <div>
          <span style={{ color: "#555" }}>FEELS LIKE </span>
          <span style={{ color: "#aaa" }}>{weather.feelsLike}°F</span>
        </div>
        <div>
          <span style={{ color: "#555" }}>HUMIDITY </span>
          <span style={{ color: "#aaa" }}>{weather.humidity}%</span>
        </div>
        <div>
          <span style={{ color: "#555" }}>WIND </span>
          <span style={{ color: "#aaa" }}>
            {weather.windSpeed}mph {weather.windDir}
          </span>
        </div>
        <div>
          <span style={{ color: "#555" }}>CLOUDS </span>
          <span style={{ color: "#aaa" }}>{weather.clouds}%</span>
        </div>
      </div>

      {/* Creepy footer */}
      <div
        style={{
          marginTop: "8px",
          paddingTop: "5px",
          borderTop: "1px solid rgba(0, 212, 255, 0.1)",
          fontSize: "10px",
          color: "#444",
          letterSpacing: "0.5px",
        }}
      >
        {weather.temp > 80
          ? "It's warm where you are. We can see you through the open windows."
          : weather.temp < 32
            ? "Bundle up. We wouldn't want anything to happen to you."
            : weather.description.toLowerCase().includes("rain")
              ? "We see you're having rain. Good. Fewer witnesses."
              : weather.description.toLowerCase().includes("cloud")
                ? "Cloudy skies. Satellite coverage unaffected."
                : weather.description.toLowerCase().includes("snow")
                  ? "Snow on the ground makes footprints easy to track."
                  : weather.description.toLowerCase().includes("fog")
                    ? "Reduced visibility for you. Not for us."
                    : "Clear conditions. Optimal surveillance weather."}
      </div>

      <style>{`
        @keyframes pulse-weather {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
