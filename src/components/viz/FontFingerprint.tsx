import { useEffect, useState, useRef, useCallback } from "react";

/**
 * FontFingerprint — detects installed system fonts using canvas
 * text measurement. This is a real browser fingerprinting technique
 * used by tracking companies. Tests each font against baseline
 * measurements — if the rendered width/height differs from the
 * fallback, the font is installed.
 *
 * Displays a live scanning animation as fonts are tested,
 * then shows detected fonts each rendered in its own typeface.
 * No commentary, just data.
 */

// Comprehensive font list — common system fonts across platforms
const FONT_LIST = [
  // Windows
  "Arial", "Arial Black", "Arial Narrow", "Book Antiqua", "Bookman Old Style",
  "Calibri", "Cambria", "Cambria Math", "Candara", "Century", "Century Gothic",
  "Comic Sans MS", "Consolas", "Constantia", "Corbel", "Courier", "Courier New",
  "Ebrima", "Franklin Gothic Medium", "Gabriola", "Gadugi", "Georgia",
  "HoloLens MDL2 Assets", "Impact", "Ink Free", "Javanese Text",
  "Leelawadee UI", "Lucida Console", "Lucida Sans Unicode", "MS Gothic",
  "MS PGothic", "MS Sans Serif", "MS Serif", "MS UI Gothic", "MV Boli",
  "Malgun Gothic", "Marlett", "Microsoft Himalaya", "Microsoft JhengHei",
  "Microsoft New Tai Lue", "Microsoft PhagsPa", "Microsoft Sans Serif",
  "Microsoft Tai Le", "Microsoft YaHei", "Microsoft Yi Baiti", "MingLiU-ExtB",
  "Mongolian Baiti", "Myanmar Text", "Nirmala UI", "Palatino Linotype",
  "Segoe MDL2 Assets", "Segoe Print", "Segoe Script", "Segoe UI",
  "Segoe UI Historic", "Segoe UI Emoji", "Segoe UI Symbol", "SimSun",
  "Sitka Text", "Sylfaen", "Symbol", "Tahoma", "Times New Roman",
  "Trebuchet MS", "Verdana", "Webdings", "Wingdings", "Yu Gothic",
  // macOS
  "American Typewriter", "Andale Mono", "Apple Chancery", "Apple Color Emoji",
  "Apple SD Gothic Neo", "AppleMyungjo", "Avenir", "Avenir Next",
  "Avenir Next Condensed", "Baskerville", "Big Caslon", "Bodoni 72",
  "Bodoni 72 Oldstyle", "Bodoni 72 Smallcaps", "Bradley Hand", "Brush Script MT",
  "Chalkboard", "Chalkboard SE", "Chalkduster", "Charter", "Cochin", "Copperplate",
  "Didot", "DIN Alternate", "DIN Condensed", "Futura", "Geneva", "Gill Sans",
  "Helvetica", "Helvetica Neue", "Herculanum", "Hoefler Text", "Iowan Old Style",
  "Kefa", "Luminari", "Marion", "Marker Felt", "Menlo", "Monaco",
  "Noteworthy", "Optima", "Osaka", "Palatino", "Papyrus", "Party LET",
  "Phosphate", "PingFang HK", "PingFang SC", "PingFang TC", "Plantagenet Cherokee",
  "Rockwell", "Savoye LET", "SF Mono", "SF Pro", "SF Pro Display", "SF Pro Rounded",
  "SF Pro Text", "SignPainter", "Skia", "Snell Roundhand", "STSong",
  "Superclarendon", "Trattatello", "Zapfino",
  // Linux
  "Cantarell", "DejaVu Sans", "DejaVu Sans Mono", "DejaVu Serif",
  "Droid Sans", "Droid Sans Mono", "Droid Serif", "FreeMono", "FreeSans",
  "FreeSerif", "Liberation Mono", "Liberation Sans", "Liberation Serif",
  "Noto Sans", "Noto Serif", "Noto Mono", "Ubuntu", "Ubuntu Mono",
  // Common web/design fonts that might be installed
  "Fira Code", "Fira Sans", "Inter", "JetBrains Mono", "Lato",
  "Montserrat", "Open Sans", "Poppins", "Raleway", "Roboto", "Roboto Mono",
  "Source Code Pro", "Source Sans Pro", "Work Sans",
  // CJK
  "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Meiryo", "NSimSun",
  "PMingLiU", "Gulim", "Dotum", "Batang",
  // Other
  "Lucida Grande", "Lucida Sans", "Century Schoolbook", "Garamond",
  "Goudy Old Style", "Haettenschweiler", "Harrington", "High Tower Text",
  "Jokerman", "Juice ITC", "Kristen ITC", "Kunstler Script",
  "Wide Latin", "Magneto", "Maiandra GD", "Matura MT Script Capitals",
  "Mistral", "Modern No. 20", "Monotype Corsiva", "Niagara Engraved",
  "Old English Text MT", "Onyx", "Perpetua", "Playbill", "Poor Richard",
  "Pristina", "Rage Italic", "Ravie", "Showcard Gothic", "Snap ITC",
  "Stencil", "Tempus Sans ITC", "Viner Hand ITC", "Vivaldi",
];

const BASELINES = ["monospace", "sans-serif", "serif"] as const;
const TEST_STRING = "mmmmmmmmmmlli";
const TEST_SIZE = "72px";

interface DetectedFont {
  name: string;
  detectedAt: number; // ms since scan start
}

function createDetector(): {
  detect: (fontName: string) => boolean;
  cleanup: () => void;
} {
  const canvas = document.createElement("canvas");
  canvas.width = 600;
  canvas.height = 100;
  const ctx = canvas.getContext("2d")!;

  // Measure baselines
  const baseWidths = new Map<string, number>();
  for (const baseline of BASELINES) {
    ctx.font = `${TEST_SIZE} ${baseline}`;
    const metrics = ctx.measureText(TEST_STRING);
    baseWidths.set(baseline, metrics.width);
  }

  return {
    detect: (fontName: string): boolean => {
      for (const baseline of BASELINES) {
        ctx.font = `${TEST_SIZE} "${fontName}", ${baseline}`;
        const width = ctx.measureText(TEST_STRING).width;
        const baseWidth = baseWidths.get(baseline)!;
        if (Math.abs(width - baseWidth) > 0.1) {
          return true;
        }
      }
      return false;
    },
    cleanup: () => {
      canvas.remove();
    },
  };
}

export function FontFingerprint() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [scanning, setScanning] = useState(true);
  const [scanIndex, setScanIndex] = useState(0);
  const [currentTest, setCurrentTest] = useState("");
  const [detectedFonts, setDetectedFonts] = useState<DetectedFont[]>([]);
  const [scanComplete, setScanComplete] = useState(false);
  const [entropy, setEntropy] = useState(0);
  const scanStartRef = useRef(Date.now());
  const scrollRef = useRef<HTMLDivElement>(null);

  // Delayed reveal
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Run font scan
  useEffect(() => {
    if (!visible) return;

    const detector = createDetector();
    scanStartRef.current = Date.now();
    let idx = 0;
    const detected: DetectedFont[] = [];

    const scanBatch = () => {
      const batchSize = 4; // Test 4 fonts per frame
      const end = Math.min(idx + batchSize, FONT_LIST.length);

      for (let i = idx; i < end; i++) {
        const fontName = FONT_LIST[i];
        setCurrentTest(fontName);
        setScanIndex(i);

        if (detector.detect(fontName)) {
          detected.push({
            name: fontName,
            detectedAt: Date.now() - scanStartRef.current,
          });
          setDetectedFonts([...detected]);
        }
      }

      idx = end;

      if (idx < FONT_LIST.length) {
        requestAnimationFrame(scanBatch);
      } else {
        // Scan complete
        setScanning(false);
        setScanComplete(true);
        setCurrentTest("");
        detector.cleanup();

        // Calculate entropy (log2 of combinations)
        const bits = detected.length * Math.log2(FONT_LIST.length / Math.max(detected.length, 1));
        setEntropy(Math.round(bits * 10) / 10);
      }
    };

    // Start scanning after a short delay
    const timer = setTimeout(() => {
      requestAnimationFrame(scanBatch);
    }, 800);

    return () => {
      clearTimeout(timer);
      detector.cleanup();
    };
  }, [visible]);

  // Auto-scroll to latest detected font
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [detectedFonts.length]);

  const renderFontGrid = useCallback(() => {
    if (detectedFonts.length === 0) return null;

    return (
      <div
        ref={scrollRef}
        style={{
          maxHeight: "160px",
          overflowY: "auto",
          overflowX: "hidden",
          marginBottom: "4px",
          scrollbarWidth: "none",
        }}
      >
        {detectedFonts.map((font, i) => (
          <div
            key={font.name}
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "6px",
              padding: "1px 0",
              animation: "ff-line-in 0.2s ease-out",
              borderBottom: "1px solid rgba(0, 255, 65, 0.03)",
            }}
          >
            <span
              style={{
                fontSize: "7px",
                color: "#333",
                fontFamily: "'Courier New', monospace",
                minWidth: "16px",
                textAlign: "right",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <span
              style={{
                fontSize: "10px",
                color: "#00ff41",
                fontFamily: `"${font.name}", monospace`,
                letterSpacing: "0.3px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flex: 1,
                opacity: 0.8,
              }}
            >
              {font.name}
            </span>
          </div>
        ))}
      </div>
    );
  }, [detectedFonts]);

  if (!visible) return null;

  const progress = FONT_LIST.length > 0 ? (scanIndex / FONT_LIST.length) * 100 : 0;

  return (
    <div
      style={{
        background: "rgba(0, 0, 0, 0.92)",
        border: "1px solid rgba(0, 255, 65, 0.12)",
        borderRadius: "3px",
        padding: "8px 10px",
        fontFamily: "'Courier New', monospace",
        boxShadow: "0 0 20px rgba(0, 255, 65, 0.04)",
        width: "100%",
        maxWidth: "260px",
        opacity: visible ? 1 : 0,
        transition: "opacity 2s ease",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "6px",
          paddingBottom: "5px",
          borderBottom: "1px solid rgba(0, 255, 65, 0.1)",
          cursor: "pointer",
        }}
        onClick={() => setExpanded(!expanded)}
        onKeyDown={() => {}}
        role="button"
        tabIndex={0}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div
            style={{
              width: "5px",
              height: "5px",
              borderRadius: "50%",
              background: scanning ? "#ffaa00" : "#00ff41",
              animation: scanning
                ? "ff-scan-pulse 0.4s ease-in-out infinite"
                : "ff-idle-pulse 3s ease-in-out infinite",
              boxShadow: scanning
                ? "0 0 4px #ffaa00"
                : "0 0 4px #00ff41",
            }}
          />
          <span
            style={{
              fontSize: "10px",
              color: "#00ff41",
              letterSpacing: "2px",
              fontWeight: "bold",
            }}
          >
            FONT ENUM
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              fontSize: "9px",
              color: detectedFonts.length > 0 ? "#00ff41" : "#555",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {detectedFonts.length}
          </span>
          <span style={{ fontSize: "11px", color: "#444" }}>
            {expanded ? "▼" : "▶"}
          </span>
        </div>
      </div>

      {expanded && (
        <>
          {/* Currently scanning indicator */}
          {scanning && currentTest && (
            <div
              style={{
                marginBottom: "4px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  fontSize: "8px",
                  color: "#444",
                  letterSpacing: "0.5px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  animation: "ff-test-flash 0.15s ease-out",
                }}
              >
                <span style={{ color: "#333" }}>TESTING </span>
                <span style={{ color: "#555", fontFamily: `"${currentTest}", monospace` }}>
                  {currentTest}
                </span>
              </div>
            </div>
          )}

          {/* Scan progress bar */}
          {scanning && (
            <div style={{ marginBottom: "6px" }}>
              <div
                style={{
                  height: "2px",
                  background: "rgba(255, 255, 255, 0.04)",
                  borderRadius: "1px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${progress}%`,
                    background: "linear-gradient(90deg, #00ff41, #00ff4180)",
                    transition: "width 0.1s linear",
                    borderRadius: "1px",
                    boxShadow: "0 0 4px rgba(0, 255, 65, 0.3)",
                  }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "2px",
                }}
              >
                <span
                  style={{
                    fontSize: "7px",
                    color: "#333",
                    letterSpacing: "1px",
                  }}
                >
                  {scanIndex}/{FONT_LIST.length}
                </span>
                <span
                  style={{
                    fontSize: "7px",
                    color: "#333",
                    letterSpacing: "1px",
                  }}
                >
                  {Math.round(progress)}%
                </span>
              </div>
            </div>
          )}

          {/* Detected fonts list */}
          {renderFontGrid()}

          {/* Summary footer */}
          <div
            style={{
              paddingTop: "5px",
              borderTop: "1px solid rgba(0, 255, 65, 0.08)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
              }}
            >
              <span style={{ fontSize: "7px", color: "#444", letterSpacing: "1px" }}>
                DETECTED
              </span>
              <span
                style={{
                  fontSize: "11px",
                  color: "#00ff41",
                  fontVariantNumeric: "tabular-nums",
                  fontWeight: "bold",
                }}
              >
                {detectedFonts.length}/{FONT_LIST.length}
              </span>
            </div>

            {scanComplete && (
              <>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    marginTop: "2px",
                  }}
                >
                  <span style={{ fontSize: "7px", color: "#444", letterSpacing: "1px" }}>
                    ENTROPY
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      color: "#ffaa00",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {entropy} bits
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "7px",
                    color: "#2a2a2a",
                    letterSpacing: "0.5px",
                    marginTop: "4px",
                    textAlign: "center",
                  }}
                >
                  FONT VECTOR HASH: 0x{detectedFonts
                    .map((f) => f.name)
                    .join("")
                    .split("")
                    .reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) & 0xffffffff, 0)
                    .toString(16)
                    .toUpperCase()
                    .padStart(8, "0")
                    .slice(0, 8)}
                </div>
              </>
            )}
          </div>
        </>
      )}

      <style>{`
        @keyframes ff-scan-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
        @keyframes ff-idle-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes ff-line-in {
          from { opacity: 0; transform: translateX(-4px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes ff-test-flash {
          from { opacity: 0.3; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
