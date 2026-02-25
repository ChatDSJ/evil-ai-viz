import { useEffect, useState, useRef } from "react";
import { fetchBreaches, formatPwnCount, type BreachEntry } from "../../lib/securityData";

/**
 * Scrolling warning banner at bottom of screen.
 * Shows real breach headlines from haveibeenpwned data.
 */

function breachToWarning(b: BreachEntry): string {
  const count = formatPwnCount(b.pwnCount);
  const classes = b.dataClasses.slice(0, 3).join(", ").toUpperCase();
  return `⚠ ${b.title.toUpperCase()} — ${count} RECORDS EXPOSED — ${classes} — BREACH DATE: ${b.breachDate} ⚠`;
}

// Fallback warnings if API is unreachable
const FALLBACK_WARNINGS = [
  "⚠ FACEBOOK — 509.5M RECORDS EXPOSED — NAMES, PHONE NUMBERS, EMAIL ADDRESSES — BREACH DATE: 2019-08-01 ⚠",
  "⚠ COLLECTION #1 — 772.9M RECORDS EXPOSED — EMAIL ADDRESSES, PASSWORDS — BREACH DATE: 2019-01-07 ⚠",
  "⚠ LINKEDIN — 164.6M RECORDS EXPOSED — EMAIL ADDRESSES, PASSWORDS — BREACH DATE: 2012-05-05 ⚠",
  "⚠ NATIONAL PUBLIC DATA — 134.0M RECORDS — SSNs, DATES OF BIRTH, PHYSICAL ADDRESSES — BREACH DATE: 2024-04-09 ⚠",
  "⚠ ADOBE — 152.4M RECORDS EXPOSED — EMAIL ADDRESSES, PASSWORD HINTS, PASSWORDS — BREACH DATE: 2013-10-04 ⚠",
  "⚠ MYSPACE — 359.4M RECORDS EXPOSED — EMAIL ADDRESSES, PASSWORDS, USERNAMES — BREACH DATE: 2008-07-01 ⚠",
  "⚠ DEEZER — 229.0M RECORDS EXPOSED — EMAIL ADDRESSES, DATES OF BIRTH, IP ADDRESSES — BREACH DATE: 2019-04-22 ⚠",
  "⚠ TELEGRAM COMBOLISTS — 361.5M RECORDS — EMAIL ADDRESSES, PASSWORDS, USERNAMES — BREACH DATE: 2024-05-28 ⚠",
  "⚠ ZYNGA — 172.9M RECORDS EXPOSED — EMAIL ADDRESSES, PASSWORDS, PHONE NUMBERS — BREACH DATE: 2019-09-01 ⚠",
  "⚠ CANVA — 137.3M RECORDS EXPOSED — EMAIL ADDRESSES, PASSWORDS, USERNAMES — BREACH DATE: 2019-05-24 ⚠",
];

export function WarningBanner() {
  const [warning, setWarning] = useState(FALLBACK_WARNINGS[0]);
  const [flash, setFlash] = useState(false);
  const warningsRef = useRef<string[]>(FALLBACK_WARNINGS);

  // Fetch real breach data
  useEffect(() => {
    fetchBreaches().then((breaches) => {
      if (breaches.length > 0) {
        // Take top 20 by PwnCount, convert to warning strings
        const warnings = breaches.slice(0, 20).map(breachToWarning);
        warningsRef.current = warnings;
        setWarning(warnings[0]);
      }
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setFlash(true);
      setTimeout(() => {
        const warnings = warningsRef.current;
        setWarning(warnings[Math.floor(Math.random() * warnings.length)]);
        setFlash(false);
      }, 200);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        bottom: "1%",
        left: 0,
        right: 0,
        overflow: "hidden",
        height: "24px",
        background: flash
          ? "rgba(255, 0, 64, 0.3)"
          : "rgba(255, 0, 64, 0.1)",
        borderTop: "1px solid rgba(255, 0, 64, 0.5)",
        borderBottom: "1px solid rgba(255, 0, 64, 0.5)",
        display: "flex",
        alignItems: "center",
        transition: "background 0.2s",
      }}
    >
      <div
        style={{
          whiteSpace: "nowrap",
          animation: "scroll 30s linear infinite",
          fontSize: "14px",
          fontFamily: "'Courier New', monospace",
          color: "#ff0040",
          letterSpacing: "2px",
          textShadow: "0 0 10px rgba(255, 0, 64, 0.5)",
        }}
      >
        {`${warning}     ///     ${warning}     ///     ${warning}     ///     ${warning}`}
      </div>
      <style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
