import { useEffect, useState } from "react";

/**
 * PreferenceFingerprint — Silently probes CSS media features via
 * window.matchMedia() to reveal the user's accessibility settings,
 * display capabilities, and UI preferences.
 *
 * The combination of these preferences forms a surprisingly unique
 * fingerprint — prefers-color-scheme + prefers-reduced-motion +
 * color-gamut + pointer type + HDR support narrows down the user
 * significantly.
 *
 * Shows:
 * - Color scheme preference (dark/light/no-preference)
 * - Reduced motion setting
 * - Reduced transparency setting
 * - Contrast preference (more/less/forced/no-preference)
 * - Color gamut (sRGB, P3, Rec2020)
 * - Dynamic range (standard vs HDR)
 * - Forced colors mode
 * - Inverted colors
 * - Pointer type (fine/coarse/none)
 * - Hover capability
 * - Any-pointer / any-hover (secondary input devices)
 * - Display mode (browser/standalone/fullscreen/minimal-ui)
 * - Orientation (portrait/landscape)
 * - Monochrome display detection
 * - Scripting support
 * - Update frequency (fast/slow/none)
 * - Prefers-reduced-data
 * - Overflow behavior
 * - Video playback support
 * - Combined preference hash
 *
 * No commentary. The fact that a website silently knows your
 * accessibility needs and dark mode setting is disquieting enough.
 */

interface PrefResult {
  label: string;
  value: string;
  color: string;
  category: "preference" | "display" | "input" | "system";
}

function probePreferences(): PrefResult[] {
  const results: PrefResult[] = [];
  const mm = (q: string): boolean => {
    try {
      return window.matchMedia(q).matches;
    } catch {
      return false;
    }
  };

  // ─── PREFERENCES ───
  // Color scheme
  const darkMode = mm("(prefers-color-scheme: dark)");
  const lightMode = mm("(prefers-color-scheme: light)");
  results.push({
    label: "COLOR SCHEME",
    value: darkMode ? "DARK" : lightMode ? "LIGHT" : "NO PREFERENCE",
    color: darkMode ? "#bb86fc" : lightMode ? "#ffdd57" : "#888",
    category: "preference",
  });

  // Reduced motion
  const reducedMotion = mm("(prefers-reduced-motion: reduce)");
  results.push({
    label: "REDUCED MOTION",
    value: reducedMotion ? "ENABLED" : "OFF",
    color: reducedMotion ? "#ff6b6b" : "#4ecdc4",
    category: "preference",
  });

  // Reduced transparency
  const reducedTransparency = mm("(prefers-reduced-transparency: reduce)");
  results.push({
    label: "REDUCED TRANSPARENCY",
    value: reducedTransparency ? "ENABLED" : "OFF",
    color: reducedTransparency ? "#ff6b6b" : "#4ecdc4",
    category: "preference",
  });

  // Contrast preference
  const moreContrast = mm("(prefers-contrast: more)");
  const lessContrast = mm("(prefers-contrast: less)");
  const forcedContrast = mm("(prefers-contrast: forced)");
  const contrastCustom = mm("(prefers-contrast: custom)");
  results.push({
    label: "CONTRAST",
    value: moreContrast
      ? "HIGH"
      : lessContrast
        ? "LOW"
        : forcedContrast
          ? "FORCED"
          : contrastCustom
            ? "CUSTOM"
            : "DEFAULT",
    color: moreContrast || forcedContrast ? "#ff6b6b" : "#4ecdc4",
    category: "preference",
  });

  // Prefers reduced data
  const reducedData = mm("(prefers-reduced-data: reduce)");
  results.push({
    label: "DATA SAVER",
    value: reducedData ? "ENABLED" : "OFF",
    color: reducedData ? "#ff6b6b" : "#4ecdc4",
    category: "preference",
  });

  // ─── DISPLAY ───
  // Color gamut
  const rec2020 = mm("(color-gamut: rec2020)");
  const p3 = mm("(color-gamut: p3)");
  const srgb = mm("(color-gamut: srgb)");
  results.push({
    label: "COLOR GAMUT",
    value: rec2020 ? "REC. 2020" : p3 ? "DISPLAY P3" : srgb ? "sRGB" : "UNKNOWN",
    color: rec2020 ? "#00ff41" : p3 ? "#00d4ff" : "#aaa",
    category: "display",
  });

  // Dynamic range (HDR)
  const hdr = mm("(dynamic-range: high)");
  results.push({
    label: "DYNAMIC RANGE",
    value: hdr ? "HDR" : "SDR",
    color: hdr ? "#ffaa00" : "#888",
    category: "display",
  });

  // Forced colors
  const forcedColors = mm("(forced-colors: active)");
  results.push({
    label: "FORCED COLORS",
    value: forcedColors ? "ACTIVE" : "NONE",
    color: forcedColors ? "#ff6b6b" : "#4ecdc4",
    category: "display",
  });

  // Inverted colors
  const inverted = mm("(inverted-colors: inverted)");
  results.push({
    label: "INVERTED COLORS",
    value: inverted ? "INVERTED" : "NONE",
    color: inverted ? "#ff6b6b" : "#4ecdc4",
    category: "display",
  });

  // Monochrome
  const monochrome = mm("(monochrome)");
  results.push({
    label: "MONOCHROME",
    value: monochrome ? "YES" : "NO",
    color: monochrome ? "#999" : "#4ecdc4",
    category: "display",
  });

  // Orientation
  const portrait = mm("(orientation: portrait)");
  results.push({
    label: "ORIENTATION",
    value: portrait ? "PORTRAIT" : "LANDSCAPE",
    color: "#bb86fc",
    category: "display",
  });

  // Display mode
  const standalone = mm("(display-mode: standalone)");
  const fullscreen = mm("(display-mode: fullscreen)");
  const minimalUI = mm("(display-mode: minimal-ui)");
  results.push({
    label: "DISPLAY MODE",
    value: standalone
      ? "STANDALONE"
      : fullscreen
        ? "FULLSCREEN"
        : minimalUI
          ? "MINIMAL UI"
          : "BROWSER",
    color: standalone || fullscreen ? "#ffaa00" : "#aaa",
    category: "display",
  });

  // ─── INPUT ───
  // Primary pointer
  const finePointer = mm("(pointer: fine)");
  const coarsePointer = mm("(pointer: coarse)");
  results.push({
    label: "POINTER",
    value: finePointer ? "FINE (MOUSE)" : coarsePointer ? "COARSE (TOUCH)" : "NONE",
    color: finePointer ? "#00d4ff" : coarsePointer ? "#ffaa00" : "#555",
    category: "input",
  });

  // Primary hover
  const canHover = mm("(hover: hover)");
  results.push({
    label: "HOVER",
    value: canHover ? "SUPPORTED" : "NONE",
    color: canHover ? "#4ecdc4" : "#888",
    category: "input",
  });

  // Any pointer (secondary devices)
  const anyFine = mm("(any-pointer: fine)");
  const anyCoarse = mm("(any-pointer: coarse)");
  const multiInput = anyFine && anyCoarse;
  results.push({
    label: "SECONDARY INPUT",
    value: multiInput
      ? "MULTI (MOUSE+TOUCH)"
      : anyFine
        ? "FINE"
        : anyCoarse
          ? "COARSE"
          : "NONE",
    color: multiInput ? "#ff00ff" : "#aaa",
    category: "input",
  });

  // Any hover
  const anyHover = mm("(any-hover: hover)");
  results.push({
    label: "ANY HOVER",
    value: anyHover ? "YES" : "NONE",
    color: anyHover ? "#4ecdc4" : "#888",
    category: "input",
  });

  // ─── SYSTEM ───
  // Scripting
  const scripting = mm("(scripting: enabled)");
  results.push({
    label: "SCRIPTING",
    value: scripting ? "ENABLED" : "UNKNOWN",
    color: scripting ? "#00ff41" : "#888",
    category: "system",
  });

  // Update frequency
  const slowUpdate = mm("(update: slow)");
  const fastUpdate = mm("(update: fast)");
  results.push({
    label: "REFRESH RATE",
    value: fastUpdate ? "FAST" : slowUpdate ? "SLOW (E-INK?)" : "NORMAL",
    color: slowUpdate ? "#ff6b6b" : fastUpdate ? "#00ff41" : "#aaa",
    category: "system",
  });

  // Overflow
  const overflowScroll = mm("(overflow-block: scroll)");
  const overflowPaged = mm("(overflow-block: paged)");
  results.push({
    label: "OVERFLOW",
    value: overflowScroll ? "SCROLL" : overflowPaged ? "PAGED" : "NONE",
    color: "#aaa",
    category: "system",
  });

  // Video color gamut (separate from display)
  const videoDynRange = mm("(video-dynamic-range: high)");
  results.push({
    label: "VIDEO HDR",
    value: videoDynRange ? "SUPPORTED" : "STANDARD",
    color: videoDynRange ? "#ffaa00" : "#888",
    category: "system",
  });

  return results;
}

function hashPreferences(prefs: PrefResult[]): string {
  let hash = 0;
  const str = prefs.map((p) => `${p.label}:${p.value}`).join("|");
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return `0x${(hash >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
}

export function PreferenceFingerprint() {
  const [prefs, setPrefs] = useState<PrefResult[]>([]);
  const [hash, setHash] = useState("");
  const [revealedCount, setRevealedCount] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [scanning, setScanning] = useState(true);

  // Run probe
  useEffect(() => {
    const timer = setTimeout(() => {
      const results = probePreferences();
      setPrefs(results);
      setHash(hashPreferences(results));
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  // Progressive reveal
  useEffect(() => {
    if (!prefs.length) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i <= prefs.length; i++) {
      timers.push(
        setTimeout(() => {
          setRevealedCount(i);
          if (i === prefs.length) setScanning(false);
        }, i * 180)
      );
    }
    return () => timers.forEach(clearTimeout);
  }, [prefs]);

  // Category grouping
  const categories = [
    { key: "preference", label: "PREFERENCES", color: "#bb86fc" },
    { key: "display", label: "DISPLAY", color: "#00d4ff" },
    { key: "input", label: "INPUT", color: "#ffaa00" },
    { key: "system", label: "SYSTEM", color: "#4ecdc4" },
  ];

  const uniqueValues = new Set(prefs.map((p) => p.value)).size;

  return (
    <div
      style={{
        background: "rgba(0,0,0,0.85)",
        border: "1px solid rgba(187,134,252,0.3)",
        borderRadius: "3px",
        padding: collapsed ? "6px 10px" : "10px 12px",
        fontFamily: "'Courier New', monospace",
        fontSize: "9px",
        color: "#bb86fc",
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
              background: "#bb86fc",
              boxShadow: "0 0 4px #bb86fc",
              display: "inline-block",
              animation: scanning ? "prefPulse 1s ease-in-out infinite" : "none",
            }}
          />
          <span style={{ letterSpacing: "2px", fontSize: "8px", color: "#bb86fc", opacity: 0.9 }}>
            PREFERENCE VECTOR
          </span>
        </div>
        <span style={{ color: "#555", fontSize: "8px" }}>{collapsed ? "▸" : "▾"}</span>
      </div>

      {collapsed ? null : (
        <div>
          {categories.map((cat) => {
            const catPrefs = prefs.filter((p) => p.category === cat.key);
            const catRevealed = catPrefs.filter(
              (_, i) => prefs.indexOf(catPrefs[i]) < revealedCount
            );
            if (!catRevealed.length) return null;

            return (
              <div key={cat.key} style={{ marginBottom: "6px" }}>
                <div
                  style={{
                    fontSize: "7px",
                    color: cat.color,
                    opacity: 0.5,
                    letterSpacing: "1.5px",
                    marginBottom: "3px",
                    borderBottom: `1px solid ${cat.color}22`,
                    paddingBottom: "2px",
                  }}
                >
                  {cat.label}
                </div>
                {catRevealed.map((pref, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "2px",
                      padding: "1px 0",
                      animation: `revealFadeIn 300ms ease-out forwards`,
                    }}
                  >
                    <span style={{ color: "#666", fontSize: "8px" }}>{pref.label}</span>
                    <span style={{ color: pref.color, fontSize: "8px", fontWeight: "bold" }}>
                      {pref.value}
                    </span>
                  </div>
                ))}
              </div>
            );
          })}

          {/* Hash + stats */}
          {!scanning && (
            <div
              style={{
                borderTop: "1px solid rgba(187,134,252,0.15)",
                paddingTop: "6px",
                marginTop: "4px",
                animation: "revealFadeIn 500ms ease-out forwards",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "3px",
                }}
              >
                <span style={{ color: "#555", fontSize: "7px" }}>FEATURES PROBED</span>
                <span style={{ color: "#aaa", fontSize: "8px" }}>{prefs.length}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "3px",
                }}
              >
                <span style={{ color: "#555", fontSize: "7px" }}>UNIQUE VALUES</span>
                <span style={{ color: "#aaa", fontSize: "8px" }}>{uniqueValues}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ color: "#555", fontSize: "7px" }}>PREFERENCE HASH</span>
                <span
                  style={{
                    color: "#bb86fc",
                    fontSize: "9px",
                    fontWeight: "bold",
                    textShadow: "0 0 4px rgba(187,134,252,0.4)",
                  }}
                >
                  {hash}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes prefPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
