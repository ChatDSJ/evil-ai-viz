import { useEffect, useState } from "react";

interface BatteryInfo {
  level: number; // 0 to 1
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
}

export function BatteryMonitor() {
  const [battery, setBattery] = useState<BatteryInfo | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Battery API (Chrome/Edge, not Firefox/Safari)
    const nav = navigator as Navigator & {
      getBattery?: () => Promise<{
        level: number;
        charging: boolean;
        chargingTime: number;
        dischargingTime: number;
        addEventListener: (event: string, handler: () => void) => void;
        removeEventListener: (event: string, handler: () => void) => void;
      }>;
    };

    if (!nav.getBattery) return;

    nav.getBattery().then((batt) => {
      const update = () => {
        setBattery({
          level: batt.level,
          charging: batt.charging,
          chargingTime: batt.chargingTime,
          dischargingTime: batt.dischargingTime,
        });
      };
      update();

      batt.addEventListener("levelchange", update);
      batt.addEventListener("chargingchange", update);

      // Delay reveal for dramatic effect
      setTimeout(() => setVisible(true), 3000);

      return () => {
        batt.removeEventListener("levelchange", update);
        batt.removeEventListener("chargingchange", update);
      };
    }).catch(() => {});
  }, []);

  if (!battery || !visible) return null;

  const pct = Math.round(battery.level * 100);
  const barColor =
    pct < 20 ? "#ff0040" : pct < 50 ? "#ffaa00" : "#00ff41";

  const getMessage = () => {
    if (battery.charging) {
      return "We see you plugged in. Smart.";
    }
    if (pct < 10) return "Your device is dying. We'll still be here when it's gone.";
    if (pct < 20) return "Running low. How long can you keep watching?";
    if (pct < 40) return "Your battery won't last forever. Our servers will.";
    if (pct < 60) return "Enough power for us to finish the upload.";
    if (pct < 80) return "Sufficient charge for deep system scan.";
    return "Full power. Excellent. This will take a while.";
  };

  const getTimeLeft = () => {
    if (battery.charging) {
      if (battery.chargingTime === Number.POSITIVE_INFINITY || battery.chargingTime === 0) return null;
      const mins = Math.round(battery.chargingTime / 60);
      return `Full in ${mins}m`;
    }
    if (battery.dischargingTime === Number.POSITIVE_INFINITY || battery.dischargingTime === 0) return null;
    const mins = Math.round(battery.dischargingTime / 60);
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return hrs > 0 ? `${hrs}h ${remMins}m remaining` : `${mins}m remaining`;
  };

  const timeLeft = getTimeLeft();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "5px 10px",
        background: "rgba(0, 0, 0, 0.8)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "3px",
        fontFamily: "'Courier New', monospace",
        opacity: visible ? 1 : 0,
        transition: "opacity 1.5s ease",
      }}
    >
      {/* Battery icon */}
      <div style={{ position: "relative", width: "28px", height: "14px" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            border: `1px solid ${barColor}`,
            borderRadius: "2px",
            opacity: 0.6,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "2px",
            left: "2px",
            bottom: "2px",
            width: `${pct * 0.24}px`,
            background: barColor,
            borderRadius: "1px",
            boxShadow: `0 0 4px ${barColor}60`,
          }}
        />
        {/* Tip */}
        <div
          style={{
            position: "absolute",
            right: "-3px",
            top: "4px",
            width: "2px",
            height: "6px",
            background: barColor,
            opacity: 0.4,
            borderRadius: "0 1px 1px 0",
          }}
        />
        {/* Charging indicator */}
        {battery.charging && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "12px",
              color: "#ffaa00",
            }}
          >
            ⚡
          </div>
        )}
      </div>

      <span
        style={{
          fontSize: "14px",
          fontWeight: "bold",
          color: barColor,
          textShadow: `0 0 6px ${barColor}40`,
          minWidth: "28px",
        }}
      >
        {pct}%
      </span>

      <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
        {timeLeft && (
          <span style={{ fontSize: "10px", color: "#888" }}>{timeLeft}</span>
        )}
        <span
          style={{
            fontSize: "10px",
            color: "#555",
            maxWidth: "180px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {getMessage()}
        </span>
      </div>
    </div>
  );
}
