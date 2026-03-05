import { useEffect, useState, useRef } from "react";

/**
 * AudioFingerprint — Uses the Web Audio API to generate a unique hardware
 * fingerprint from the user's audio subsystem. This is a REAL technique
 * used by commercial fingerprinting services (e.g., AudioContext fingerprinting).
 *
 * Creates an OfflineAudioContext, runs an oscillator through a dynamics
 * compressor, captures the output buffer, and hashes it. The result is
 * a unique identifier tied to the user's specific audio hardware, drivers,
 * and OS audio stack.
 *
 * Also displays: sample rate, channel count, base latency, output latency,
 * audio worklet support, and codec support probing.
 *
 * No commentary. Just the data. The implications are self-evident.
 */

interface AudioData {
  hash: string;
  sampleRate: number;
  maxChannels: number;
  baseLatency: number | null;
  outputLatency: number | null;
  audioWorklet: boolean;
  state: string;
  channelInterpretation: string;
}

interface CodecResult {
  name: string;
  supported: boolean;
}

// Generate audio fingerprint via OfflineAudioContext
async function generateAudioFingerprint(): Promise<{ hash: string; samples: Float32Array | null }> {
  try {
    const ctx = new OfflineAudioContext(1, 44100, 44100);

    // Oscillator → compressor → destination
    const oscillator = ctx.createOscillator();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(10000, ctx.currentTime);

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-50, ctx.currentTime);
    compressor.knee.setValueAtTime(40, ctx.currentTime);
    compressor.ratio.setValueAtTime(12, ctx.currentTime);
    compressor.attack.setValueAtTime(0, ctx.currentTime);
    compressor.release.setValueAtTime(0.25, ctx.currentTime);

    oscillator.connect(compressor);
    compressor.connect(ctx.destination);
    oscillator.start(0);

    const buffer = await ctx.startRendering();
    const samples = buffer.getChannelData(0);

    // Hash the output - use a subset of samples for the fingerprint
    let hash = 0;
    for (let i = 4500; i < 5000; i++) {
      const val = Math.abs(samples[i]);
      hash = ((hash << 5) - hash) + Math.round(val * 1e8);
      hash = hash & hash; // Convert to 32bit int
    }

    const hexHash = `0x${(hash >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
    return { hash: hexHash, samples };
  } catch {
    return { hash: "BLOCKED", samples: null };
  }
}

// Get AudioContext metadata
function getAudioContextData(): AudioData {
  try {
    const ctx = new AudioContext();
    const data: AudioData = {
      hash: "COMPUTING...",
      sampleRate: ctx.sampleRate,
      maxChannels: ctx.destination.maxChannelCount,
      baseLatency: (ctx as AudioContext & { baseLatency?: number }).baseLatency ?? null,
      outputLatency: (ctx as AudioContext & { outputLatency?: number }).outputLatency ?? null,
      audioWorklet: "audioWorklet" in ctx,
      state: ctx.state.toUpperCase(),
      channelInterpretation: ctx.destination.channelInterpretation.toUpperCase(),
    };
    ctx.close();
    return data;
  } catch {
    return {
      hash: "UNAVAILABLE",
      sampleRate: 0,
      maxChannels: 0,
      baseLatency: null,
      outputLatency: null,
      audioWorklet: false,
      state: "BLOCKED",
      channelInterpretation: "UNKNOWN",
    };
  }
}

// Probe codec support
function probeCodecs(): CodecResult[] {
  const codecs = [
    { name: "AAC", mime: "audio/mp4; codecs=\"mp4a.40.2\"" },
    { name: "OPUS", mime: "audio/webm; codecs=\"opus\"" },
    { name: "VORBIS", mime: "audio/ogg; codecs=\"vorbis\"" },
    { name: "FLAC", mime: "audio/flac" },
    { name: "WAV", mime: "audio/wav" },
    { name: "MP3", mime: "audio/mpeg" },
    { name: "WEBM", mime: "audio/webm" },
  ];

  const audio = document.createElement("audio");
  return codecs.map(c => ({
    name: c.name,
    supported: audio.canPlayType(c.mime) !== "",
  }));
}

// Mini waveform visualization
function AudioWaveform({ samples, width, height }: { samples: Float32Array; width: number; height: number }) {
  // Downsample to fit width
  const step = Math.max(1, Math.floor(samples.length / width));
  const points: string[] = [];
  
  for (let i = 0; i < width; i++) {
    const idx = Math.min(i * step, samples.length - 1);
    const val = samples[idx];
    const y = height / 2 - (val * height * 0.4);
    points.push(`${i},${y.toFixed(1)}`);
  }

  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <title>Audio fingerprint waveform</title>
      {/* Center line */}
      <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke="#1a1a1a" strokeWidth="1" />
      {/* Waveform */}
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="#8844ff"
        strokeWidth="1"
        opacity="0.8"
      />
      {/* Highlight the fingerprint region */}
      <rect
        x={Math.floor((4500 / samples.length) * width)}
        y={0}
        width={Math.ceil((500 / samples.length) * width)}
        height={height}
        fill="#8844ff"
        opacity="0.08"
      />
    </svg>
  );
}

export function AudioFingerprint() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [audioData, setAudioData] = useState<AudioData | null>(null);
  const [codecs, setCodecs] = useState<CodecResult[]>([]);
  const [waveformSamples, setWaveformSamples] = useState<Float32Array | null>(null);
  const [revealPhase, setRevealPhase] = useState(0); // 0=scanning, 1=data, 2=hash, 3=codecs, 4=complete
  const [scanProgress, setScanProgress] = useState(0);
  const [glitch, setGlitch] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  // Initialize
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Gather data after visible
  useEffect(() => {
    if (!visible) return;

    // Phase 0: scanning animation
    const scanInterval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(scanInterval);
          return 100;
        }
        return prev + Math.random() * 8 + 2;
      });
    }, 120);

    // Phase 1: show audio context data
    const t1 = setTimeout(() => {
      if (!mountedRef.current) return;
      const data = getAudioContextData();
      setAudioData(data);
      setRevealPhase(1);
    }, 1800);

    // Phase 2: compute and show hash
    const t2 = setTimeout(async () => {
      if (!mountedRef.current) return;
      const { hash, samples } = await generateAudioFingerprint();
      if (!mountedRef.current) return;
      setAudioData(prev => prev ? { ...prev, hash } : null);
      if (samples) setWaveformSamples(samples);
      setRevealPhase(2);
    }, 3200);

    // Phase 3: probe codecs
    const t3 = setTimeout(() => {
      if (!mountedRef.current) return;
      const results = probeCodecs();
      setCodecs(results);
      setRevealPhase(3);
    }, 4500);

    // Phase 4: complete
    const t4 = setTimeout(() => {
      if (!mountedRef.current) return;
      setRevealPhase(4);
    }, 5500);

    return () => {
      clearInterval(scanInterval);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [visible]);

  // Glitch effect
  useEffect(() => {
    const interval = setInterval(() => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 60);
    }, 10000 + Math.random() * 8000);
    return () => clearInterval(interval);
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        background: "rgba(0, 0, 0, 0.92)",
        border: `1px solid rgba(136, 68, 255, ${revealPhase >= 4 ? "0.25" : "0.12"})`,
        borderRadius: "3px",
        padding: "8px 10px",
        fontFamily: "'Courier New', monospace",
        boxShadow: `0 0 20px rgba(136, 68, 255, ${revealPhase >= 4 ? "0.08" : "0.04"})`,
        width: "100%",
        maxWidth: "270px",
        opacity: visible ? 1 : 0,
        transition: "opacity 2s ease, border-color 1s ease, box-shadow 1s ease",
        transform: glitch ? "translateX(1px)" : "none",
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
          borderBottom: "1px solid rgba(136, 68, 255, 0.12)",
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
              background: revealPhase < 4 ? "#8844ff" : "#aa66ff",
              animation: revealPhase < 4 ? "af-pulse 0.6s ease-in-out infinite" : "af-idle 3s ease-in-out infinite",
              boxShadow: `0 0 4px #8844ff`,
            }}
          />
          <span style={{ fontSize: "9px", color: "#555", letterSpacing: "1.5px" }}>
            AUDIO SUBSYSTEM
          </span>
        </div>
        <span style={{ fontSize: "11px", color: "#444" }}>
          {expanded ? "▼" : "▶"}
        </span>
      </div>

      {expanded && (
        <>
          {/* Scan progress (phase 0) */}
          {revealPhase < 1 && (
            <div style={{ marginBottom: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                <span style={{ fontSize: "8px", color: "#444", letterSpacing: "1px" }}>
                  PROBING AUDIO STACK
                </span>
                <span style={{ fontSize: "9px", color: "#8844ff", fontVariantNumeric: "tabular-nums" }}>
                  {Math.min(100, Math.round(scanProgress))}%
                </span>
              </div>
              <div style={{ height: "2px", background: "rgba(255,255,255,0.04)", borderRadius: "1px", overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${Math.min(100, scanProgress)}%`,
                  background: "linear-gradient(90deg, #8844ff, #aa66ff)",
                  borderRadius: "1px",
                  transition: "width 0.15s ease",
                }} />
              </div>
            </div>
          )}

          {/* Audio context data (phase 1+) */}
          {revealPhase >= 1 && audioData && (
            <div style={{ marginBottom: "6px", animation: "af-fade-in 0.5s ease-out" }}>
              <DataRow label="SAMPLE RATE" value={`${audioData.sampleRate.toLocaleString()} Hz`} color="#8844ff" />
              <DataRow label="CHANNELS" value={`${audioData.maxChannels} max`} color="#8844ff" />
              {audioData.baseLatency !== null && (
                <DataRow label="BASE LATENCY" value={`${(audioData.baseLatency * 1000).toFixed(2)} ms`} color="#aa88ff" />
              )}
              {audioData.outputLatency !== null && (
                <DataRow label="OUTPUT LATENCY" value={`${(audioData.outputLatency * 1000).toFixed(2)} ms`} color="#aa88ff" />
              )}
              <DataRow label="AUDIO WORKLET" value={audioData.audioWorklet ? "AVAILABLE" : "UNAVAILABLE"} color={audioData.audioWorklet ? "#00ff41" : "#ff4400"} />
              <DataRow label="ROUTING" value={audioData.channelInterpretation} color="#666" />
            </div>
          )}

          {/* Waveform visualization (phase 2+) */}
          {revealPhase >= 2 && waveformSamples && (
            <div style={{ marginBottom: "6px", animation: "af-fade-in 0.5s ease-out" }}>
              <div style={{ fontSize: "8px", color: "#444", letterSpacing: "1px", marginBottom: "3px" }}>
                FINGERPRINT WAVEFORM
              </div>
              <div style={{
                background: "rgba(136, 68, 255, 0.04)",
                border: "1px solid rgba(136, 68, 255, 0.08)",
                borderRadius: "2px",
                padding: "2px",
              }}>
                <AudioWaveform samples={waveformSamples} width={240} height={32} />
              </div>
            </div>
          )}

          {/* Hash display (phase 2+) */}
          {revealPhase >= 2 && audioData && (
            <div style={{
              marginBottom: "6px",
              padding: "4px 6px",
              background: "rgba(136, 68, 255, 0.06)",
              border: "1px solid rgba(136, 68, 255, 0.15)",
              borderRadius: "2px",
              animation: "af-fade-in 0.5s ease-out",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: "8px", color: "#555", letterSpacing: "1.5px" }}>AUDIO HASH</span>
                <span style={{
                  fontSize: "12px",
                  color: "#aa66ff",
                  fontWeight: "bold",
                  letterSpacing: "1px",
                  fontVariantNumeric: "tabular-nums",
                  textShadow: "0 0 8px rgba(136, 68, 255, 0.3)",
                }}>
                  {audioData.hash}
                </span>
              </div>
            </div>
          )}

          {/* Codec support (phase 3+) */}
          {revealPhase >= 3 && codecs.length > 0 && (
            <div style={{ marginBottom: "4px", animation: "af-fade-in 0.5s ease-out" }}>
              <div style={{ fontSize: "8px", color: "#444", letterSpacing: "1px", marginBottom: "3px" }}>
                CODEC SUPPORT
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "3px" }}>
                {codecs.map(c => (
                  <span
                    key={c.name}
                    style={{
                      fontSize: "8px",
                      padding: "1px 4px",
                      borderRadius: "2px",
                      background: c.supported ? "rgba(0, 255, 65, 0.08)" : "rgba(255, 68, 0, 0.08)",
                      border: `1px solid ${c.supported ? "rgba(0, 255, 65, 0.2)" : "rgba(255, 68, 0, 0.15)"}`,
                      color: c.supported ? "#00ff41" : "#ff4400",
                      letterSpacing: "0.5px",
                    }}
                  >
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Completion status */}
          {revealPhase >= 4 && (
            <div style={{
              marginTop: "6px",
              paddingTop: "5px",
              borderTop: "1px solid rgba(136, 68, 255, 0.1)",
              animation: "af-fade-in 0.8s ease-out",
            }}>
              <div style={{
                fontSize: "8px",
                color: "#553388",
                letterSpacing: "1.5px",
                textAlign: "center",
              }}>
                HARDWARE SIGNATURE CAPTURED
              </div>
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes af-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 4px #8844ff; }
          50% { opacity: 0.3; box-shadow: none; }
        }
        @keyframes af-idle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes af-fade-in {
          from { opacity: 0; transform: translateY(3px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function DataRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "2px" }}>
      <span style={{ fontSize: "8px", color: "#444", letterSpacing: "1px" }}>{label}</span>
      <span style={{ fontSize: "10px", color, fontVariantNumeric: "tabular-nums", letterSpacing: "0.3px" }}>
        {value}
      </span>
    </div>
  );
}
