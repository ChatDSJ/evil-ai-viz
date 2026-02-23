import { useCallback, useEffect, useRef, useState } from "react";

interface Track {
  id: string;
  title: string;
  artist: string;
  src: string;
}

const TRACKS: Track[] = [
  {
    id: "algorithm-runner",
    title: "Algorithm Runner (Loopable)",
    artist: "JoelFazhari",
    src: "https://cdn.pixabay.com/download/audio/2024/01/09/audio_554384a02b.mp3?filename=algorithm-runner.mp3",
  },
  {
    id: "evil-drones",
    title: "Evil Cyberpunk Drones",
    artist: "Bertsz",
    src: "https://cdn.pixabay.com/download/audio/2024/01/28/audio_86cd5b361d.mp3?filename=evil-drones.mp3",
  },
  {
    id: "dark-future",
    title: "Dark Cyberpunk Future",
    artist: "Sound4Stock",
    src: "https://cdn.pixabay.com/download/audio/2026/01/25/audio_2035454699.mp3?filename=dark-future.mp3",
  },
  {
    id: "evasion",
    title: "Evasion (Dark Action)",
    artist: "Evgeny Bardyuzha",
    src: "https://cdn.pixabay.com/download/audio/2022/10/18/audio_a58225219f.mp3?filename=evasion.mp3",
  },
  {
    id: "dark-growling",
    title: "Dark Growling Cyberpunk",
    artist: "DPatterson",
    src: "https://cdn.pixabay.com/download/audio/2026/01/13/audio_8f36f10d44.mp3?filename=dark-growling.mp3",
  },
];

const FADE_IN_DURATION = 60_000; // 60 seconds fade-in
const FADE_STEP_MS = 200; // update volume every 200ms

export function AudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const fadeRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeStartRef = useRef<number>(0);
  const [playing, setPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [visible, setVisible] = useState(true);

  const autoStartedRef = useRef(false);

  // Clean up fade interval on unmount
  useEffect(() => {
    return () => {
      if (fadeRef.current) clearInterval(fadeRef.current);
    };
  }, []);

  const startFadeIn = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Stop any existing fade
    if (fadeRef.current) clearInterval(fadeRef.current);

    // Start at volume 0
    audio.volume = 0;
    fadeStartRef.current = Date.now();

    fadeRef.current = setInterval(() => {
      const elapsed = Date.now() - fadeStartRef.current;
      const progress = Math.min(elapsed / FADE_IN_DURATION, 1);
      audio.volume = progress;

      if (progress >= 1 && fadeRef.current) {
        clearInterval(fadeRef.current);
        fadeRef.current = null;
      }
    }, FADE_STEP_MS);
  }, []);

  // Auto-start on first user interaction (browsers require a gesture before playing audio)
  useEffect(() => {
    const handleFirstInteraction = () => {
      if (autoStartedRef.current) return;
      const audio = audioRef.current;
      if (!audio) return;

      autoStartedRef.current = true;
      audio.volume = 0;
      audio.play().then(() => {
        setPlaying(true);
        startFadeIn();
      }).catch(() => {
        // Browser still blocked it — user can click the play button manually
        autoStartedRef.current = false;
      });

      // Remove all listeners after first trigger
      for (const evt of INTERACTION_EVENTS) {
        document.removeEventListener(evt, handleFirstInteraction, { capture: true });
      }
    };

    const INTERACTION_EVENTS = ["click", "keydown", "touchstart", "scroll", "pointerdown"] as const;
    for (const evt of INTERACTION_EVENTS) {
      document.addEventListener(evt, handleFirstInteraction, { capture: true, once: false });
    }

    return () => {
      for (const evt of INTERACTION_EVENTS) {
        document.removeEventListener(evt, handleFirstInteraction, { capture: true });
      }
    };
  }, [startFadeIn]);

  // Auto-hide
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const show = () => {
      setVisible(true);
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!expanded) setVisible(false);
      }, 5000);
    };
    show();
    window.addEventListener("mousemove", show);
    return () => {
      window.removeEventListener("mousemove", show);
      clearTimeout(timer);
    };
  }, [expanded]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
      // Stop fade on pause
      if (fadeRef.current) {
        clearInterval(fadeRef.current);
        fadeRef.current = null;
      }
      setPlaying(false);
    } else {
      audio.volume = 0;
      audio.play().then(() => {
        setPlaying(true);
        startFadeIn();
      }).catch(() => {});
    }
  }, [playing, startFadeIn]);

  const switchTrack = useCallback(
    (index: number) => {
      const audio = audioRef.current;
      if (!audio) return;

      setCurrentTrack(index);
      audio.src = TRACKS[index].src;
      if (playing) {
        audio.volume = 0;
        audio.play().then(() => startFadeIn()).catch(() => {});
      }
    },
    [playing, startFadeIn],
  );

  // Loop current track
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    };
    audio.addEventListener("ended", handleEnded);
    return () => audio.removeEventListener("ended", handleEnded);
  }, []);

  const track = TRACKS[currentTrack];

  return (
    <div
      style={{
        position: "absolute",
        bottom: "36px",
        left: "12px",
        zIndex: 200,
        opacity: visible || expanded ? 0.9 : 0,
        transition: "opacity 0.5s ease",
      }}
    >
      <audio ref={audioRef} src={track.src} preload="auto" />

      {/* Main button */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "rgba(0, 0, 0, 0.8)",
          border: "1px solid rgba(0, 212, 255, 0.4)",
          borderRadius: expanded ? "4px 4px 0 0" : "4px",
          padding: "8px 12px",
          cursor: "pointer",
          boxShadow: "0 0 10px rgba(0, 212, 255, 0.15)",
        }}
        onClick={togglePlay}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "rgba(0, 212, 255, 0.8)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "rgba(0, 212, 255, 0.4)";
        }}
      >
        {/* Play/Pause icon */}
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          {playing ? (
            <>
              <rect x="2" y="1" width="3.5" height="12" fill="#00d4ff" />
              <rect x="8.5" y="1" width="3.5" height="12" fill="#00d4ff" />
            </>
          ) : (
            <polygon points="2,1 12,7 2,13" fill="#00d4ff" />
          )}
        </svg>

        <span
          style={{
            color: "#00d4ff",
            fontSize: "10px",
            fontFamily: "'Courier New', monospace",
            letterSpacing: "0.5px",
            maxWidth: "180px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {playing ? `♫ ${track.title}` : "▸ PLAY AUDIO"}
        </span>

        {/* Expand/collapse for track list */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          style={{
            marginLeft: "4px",
            padding: "2px 4px",
            cursor: "pointer",
            color: "#00d4ff",
            fontSize: "10px",
            opacity: 0.6,
          }}
        >
          {expanded ? "▼" : "▲"}
        </div>
      </div>

      {/* Track list */}
      {expanded && (
        <div
          style={{
            background: "rgba(0, 0, 0, 0.9)",
            border: "1px solid rgba(0, 212, 255, 0.4)",
            borderTop: "none",
            borderRadius: "0 0 4px 4px",
            padding: "4px 0",
          }}
        >
          {TRACKS.map((t, i) => (
            <div
              key={t.id}
              onClick={() => switchTrack(i)}
              style={{
                padding: "6px 12px",
                cursor: "pointer",
                fontSize: "9px",
                fontFamily: "'Courier New', monospace",
                color: i === currentTrack ? "#00d4ff" : "#666",
                background:
                  i === currentTrack
                    ? "rgba(0, 212, 255, 0.1)"
                    : "transparent",
                display: "flex",
                justifyContent: "space-between",
                gap: "8px",
              }}
              onMouseEnter={(e) => {
                if (i !== currentTrack)
                  e.currentTarget.style.background = "rgba(0, 212, 255, 0.05)";
              }}
              onMouseLeave={(e) => {
                if (i !== currentTrack)
                  e.currentTarget.style.background = "transparent";
              }}
            >
              <span>
                {i === currentTrack && playing ? "♫ " : ""}
                {t.title}
              </span>
              <span style={{ opacity: 0.5 }}>{t.artist}</span>
            </div>
          ))}
          <div
            style={{
              padding: "4px 12px",
              fontSize: "7px",
              color: "#444",
              borderTop: "1px solid rgba(0, 212, 255, 0.1)",
              marginTop: "4px",
            }}
          >
            Royalty-free music via Pixabay
          </div>
        </div>
      )}
    </div>
  );
}
