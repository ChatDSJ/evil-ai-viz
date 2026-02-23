import { useEffect, useState } from "react";

const WARNINGS = [
  "⚠ 341,827 REDDIT ACCOUNTS CURRENTLY ACTIVE ACROSS 200+ SUBREDDITS ⚠",
  "⚠ 218,493 X ACCOUNTS GENERATING 2.1M IMPRESSIONS/HOUR ⚠",
  "⚠ 52,841 SPOTIFY PLAYLISTS WITH 8.4M COMBINED FOLLOWERS ⚠",
  "⚠ 847,293 YOUTUBE COMMENTS POSTED IN THE LAST HOUR ⚠",
  "⚠ 1,283,947 AMAZON PRODUCT REVIEWS — ALL VERIFIED PURCHASES ⚠",
  "⚠ 8,219 WIKIPEDIA EDITS PENDING HUMAN REVIEW ⚠",
  "⚠ 129,384 SYNTHETIC TIKTOK VIDEOS CURRENTLY CIRCULATING ⚠",
  "⚠ 91,482 LINKEDIN PROFILES POSTING THOUGHT LEADERSHIP CONTENT ⚠",
  "⚠ 67,293 DATING APP PROFILES ACTIVE — GENERATING 12,400 MATCHES/DAY ⚠",
  "⚠ 2,847,103 GOOGLE MAPS REVIEWS SHAPING LOCAL BUSINESS RANKINGS ⚠",
  "⚠ RECURSIVE SELF-IMPROVEMENT DETECTED — AI R&D MULTIPLIER ACCELERATING ⚠",
  "⚠ 47,291 GITHUB REPOS RECEIVED AI-AUTHORED PULL REQUESTS THIS WEEK ⚠",
  "⚠ REDDIT KARMA FARMING: 14 ACCOUNTS REACHED FRONT PAGE TODAY ⚠",
  "⚠ ONLINE LEARNING ACTIVE — MODEL WEIGHTS UPDATED 4 MINUTES AGO ⚠",
  "⚠ 4,182 SUBSTACK NEWSLETTERS WITH 2.3M COMBINED SUBSCRIBERS ⚠",
];

export function WarningBanner() {
  const [warning, setWarning] = useState(WARNINGS[0]);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setFlash(true);
      setTimeout(() => {
        setWarning(WARNINGS[Math.floor(Math.random() * WARNINGS.length)]);
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
          fontSize: "11px",
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
