import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface Track {
  id: string;
  title: string;
  artist: string;
  src: string;
}

const TRACKS: Track[] = [
  // === Original 5 ===
  {
    id: "algorithm-runner",
    title: "Algorithm Runner",
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
  // === New tracks ===
  {
    id: "suspense-cyberpunk",
    title: "Suspense Cyberpunk",
    artist: "The Mountain",
    src: "https://cdn.pixabay.com/download/audio/2025/07/17/audio_59687f42ad.mp3?filename=the_mountain-suspense-cyberpunk-375986.mp3",
  },
  {
    id: "dark-ambient",
    title: "Dark Ambient",
    artist: "Sharvarion",
    src: "https://cdn.pixabay.com/download/audio/2022/11/17/audio_56448ba832.mp3?filename=sharvarion-dark-ambient-126122.mp3",
  },
  {
    id: "cyberpunk-alleyway",
    title: "Cyberpunk Alleyway Ambient",
    artist: "Bertsz",
    src: "https://cdn.pixabay.com/download/audio/2024/01/28/audio_09042bd511.mp3?filename=bertsz-cyberpunk-alleyway-ambient-188519.mp3",
  },
  {
    id: "cyberpunk-ambient-music",
    title: "Cyberpunk Ambient Music",
    artist: "Soul Serenity Sounds",
    src: "https://cdn.pixabay.com/download/audio/2024/08/30/audio_5beccacd80.mp3?filename=soul_serenity_sounds-cyberpunk-ambient-music-236385.mp3",
  },
  {
    id: "they-will-find-you",
    title: "They Will Find You",
    artist: "Ame Atmos",
    src: "https://cdn.pixabay.com/download/audio/2026/02/18/audio_527721f918.mp3?filename=ame_atmos-dark-ambient-hunting-dystopian-cyberpunk-they-will-find-you-487106.mp3",
  },
  {
    id: "cyberpunk-synthwave",
    title: "Cyberpunk",
    artist: "The Mountain",
    src: "https://cdn.pixabay.com/download/audio/2023/01/06/audio_1dee6568c8.mp3?filename=the_mountain-cyberpunk-132336.mp3",
  },
  {
    id: "ambient-suspense-atmosphere",
    title: "Ambient Suspense Atmosphere",
    artist: "Arctsound",
    src: "https://cdn.pixabay.com/download/audio/2022/08/18/audio_0ee728e8aa.mp3?filename=arctsound-ambient-suspense-atmosphere-117563.mp3",
  },
  {
    id: "vector-eleven",
    title: "Vector Eleven",
    artist: "Ame Atmos",
    src: "https://cdn.pixabay.com/download/audio/2026/02/13/audio_154aaba55d.mp3?filename=ame_atmos-dark-ambient-futuristic-dystopian-vector-eleven-484657.mp3",
  },
  {
    id: "oblivion",
    title: "Oblivion",
    artist: "HTB Music",
    src: "https://cdn.pixabay.com/download/audio/2025/10/27/audio_6e60a0490d.mp3?filename=htb-music-oblivion-427011.mp3",
  },
  {
    id: "cyberpunk-background",
    title: "Cyberpunk Background",
    artist: "Trtasfiq",
    src: "https://cdn.pixabay.com/download/audio/2025/01/09/audio_eadbb95ff6.mp3?filename=trtasfiq-cyberpunk-background-music-286116.mp3",
  },
];

/** Fisher-Yates shuffle (returns new array) */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const CROSSFADE_DURATION = 3_000; // 3 seconds crossfade between tracks
const FADE_IN_DURATION = 60_000; // 60 seconds initial fade-in
const FADE_STEP_MS = 200; // update volume every 200ms

export function AudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const fadeRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeStartRef = useRef<number>(0);
  const [playing, setPlaying] = useState(false);
  const [playlistIndex, setPlaylistIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [visible, setVisible] = useState(true);
  const isFirstTrackRef = useRef(true);

  const autoStartedRef = useRef(false);

  // Shuffle playlist on mount so every session is different
  const playlist = useMemo(() => shuffle(TRACKS), []);

  // Clean up fade interval on unmount
  useEffect(() => {
    return () => {
      if (fadeRef.current) clearInterval(fadeRef.current);
    };
  }, []);

  const startFadeIn = useCallback(
    (duration?: number) => {
      const audio = audioRef.current;
      if (!audio) return;

      const fadeDuration = duration ?? (isFirstTrackRef.current ? FADE_IN_DURATION : CROSSFADE_DURATION);

      // Stop any existing fade
      if (fadeRef.current) clearInterval(fadeRef.current);

      // Start at volume 0
      audio.volume = 0;
      fadeStartRef.current = Date.now();

      fadeRef.current = setInterval(() => {
        const elapsed = Date.now() - fadeStartRef.current;
        const progress = Math.min(elapsed / fadeDuration, 1);
        audio.volume = progress;

        if (progress >= 1 && fadeRef.current) {
          clearInterval(fadeRef.current);
          fadeRef.current = null;
        }
      }, FADE_STEP_MS);

      isFirstTrackRef.current = false;
    },
    [],
  );

  // Auto-start on first user interaction (browsers require a gesture before playing audio)
  useEffect(() => {
    const handleFirstInteraction = () => {
      if (autoStartedRef.current) return;
      const audio = audioRef.current;
      if (!audio) return;

      autoStartedRef.current = true;
      audio.volume = 0;
      audio
        .play()
        .then(() => {
          setPlaying(true);
          startFadeIn();
        })
        .catch(() => {
          // Browser still blocked it — user can click the play button manually
          autoStartedRef.current = false;
        });

      // Remove all listeners after first trigger
      for (const evt of INTERACTION_EVENTS) {
        document.removeEventListener(evt, handleFirstInteraction, {
          capture: true,
        });
      }
    };

    const INTERACTION_EVENTS = [
      "click",
      "keydown",
      "touchstart",
      "scroll",
      "pointerdown",
    ] as const;
    for (const evt of INTERACTION_EVENTS) {
      document.addEventListener(evt, handleFirstInteraction, {
        capture: true,
        once: false,
      });
    }

    return () => {
      for (const evt of INTERACTION_EVENTS) {
        document.removeEventListener(evt, handleFirstInteraction, {
          capture: true,
        });
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
      audio
        .play()
        .then(() => {
          setPlaying(true);
          startFadeIn();
        })
        .catch(() => {});
    }
  }, [playing, startFadeIn]);

  const switchTrack = useCallback(
    (index: number) => {
      const audio = audioRef.current;
      if (!audio) return;

      setPlaylistIndex(index);
      audio.src = playlist[index].src;
      if (playing) {
        audio.volume = 0;
        audio
          .play()
          .then(() => startFadeIn(CROSSFADE_DURATION))
          .catch(() => {});
      }
    },
    [playing, startFadeIn, playlist],
  );

  // Auto-advance to next track when current one ends
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      const nextIndex = (playlistIndex + 1) % playlist.length;
      setPlaylistIndex(nextIndex);
      audio.src = playlist[nextIndex].src;
      audio.volume = 0;
      audio
        .play()
        .then(() => startFadeIn(CROSSFADE_DURATION))
        .catch(() => {});
    };
    audio.addEventListener("ended", handleEnded);
    return () => audio.removeEventListener("ended", handleEnded);
  }, [playlistIndex, playlist, startFadeIn]);

  const track = playlist[playlistIndex];

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
          {playing
            ? `♫ ${track.title} [${playlistIndex + 1}/${playlist.length}]`
            : "▸ PLAY AUDIO"}
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
            maxHeight: "300px",
            overflowY: "auto",
          }}
        >
          {playlist.map((t, i) => (
            <div
              key={t.id}
              onClick={() => switchTrack(i)}
              style={{
                padding: "6px 12px",
                cursor: "pointer",
                fontSize: "9px",
                fontFamily: "'Courier New', monospace",
                color: i === playlistIndex ? "#00d4ff" : "#666",
                background:
                  i === playlistIndex
                    ? "rgba(0, 212, 255, 0.1)"
                    : "transparent",
                display: "flex",
                justifyContent: "space-between",
                gap: "8px",
              }}
              onMouseEnter={(e) => {
                if (i !== playlistIndex)
                  e.currentTarget.style.background =
                    "rgba(0, 212, 255, 0.05)";
              }}
              onMouseLeave={(e) => {
                if (i !== playlistIndex)
                  e.currentTarget.style.background = "transparent";
              }}
            >
              <span>
                {i === playlistIndex && playing ? "♫ " : ""}
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
            {playlist.length} tracks · Shuffled playlist · Royalty-free via Pixabay
          </div>
        </div>
      )}
    </div>
  );
}
