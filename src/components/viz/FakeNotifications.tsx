import { useEffect, useState, useRef, useCallback } from "react";
import type { VisitorInfo } from "../../hooks/useVisitorInfo";

/**
 * FakeNotifications — fake OS-native notification toasts that slide in
 * from the bottom-right. Styled to match the visitor's actual OS.
 * Content is personalized using real visitor data (city, browser, OS).
 *
 * These are NOT real browser Notification API calls — they're pure CSS
 * recreations that appear inside the page but look indistinguishable
 * from real system notifications at a glance.
 *
 * Content types:
 * - "Text messages" from contacts
 * - Browser security warnings using real info
 * - System camera/mic access warnings
 * - Email notifications about account access
 * - App update prompts
 */

interface FakeNotif {
  id: string;
  app: string;
  appIcon: string;
  title: string;
  body: string;
  time: string;
  type: "message" | "security" | "system" | "email" | "social";
  dismissing?: boolean;
}

interface Props {
  visitor: VisitorInfo;
  delay?: number; // ms before first notification
}

function getTimeStr(): string {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function generateNotifications(visitor: VisitorInfo): Omit<FakeNotif, "id" | "time" | "dismissing">[] {
  const city = visitor.city !== "Unknown" ? visitor.city : "your area";
  const browser = visitor.browser || "your browser";
  const os = visitor.osVersion || "your device";

  const pool: Omit<FakeNotif, "id" | "time" | "dismissing">[] = [
    // Text messages
    {
      app: "Messages",
      appIcon: "💬",
      title: "Mom",
      body: "Are you still on that weird website? Please call me.",
      type: "message",
    },
    {
      app: "Messages",
      appIcon: "💬",
      title: "Unknown Number",
      body: "We know you're reading this. Check your email.",
      type: "message",
    },
    {
      app: "Messages",
      appIcon: "💬",
      title: "Dad",
      body: "Your mother says you're on some hacker site? What's going on?",
      type: "message",
    },
    {
      app: "WhatsApp",
      appIcon: "📱",
      title: "Work Group Chat",
      body: "Has anyone else gotten that weird link from IT?",
      type: "message",
    },

    // Security warnings
    {
      app: browser,
      appIcon: "🔒",
      title: "Security Alert",
      body: `Your saved passwords were shared with a new device in ${city}.`,
      type: "security",
    },
    {
      app: browser,
      appIcon: "⚠️",
      title: "Unusual Activity",
      body: `Sign-in from unrecognized device (${os}). Was this you?`,
      type: "security",
    },
    {
      app: "Security",
      appIcon: "🛡️",
      title: "Firewall Alert",
      body: "Outbound data transfer detected on port 443. 847 packets sent.",
      type: "security",
    },
    {
      app: browser,
      appIcon: "🔐",
      title: "Password Compromised",
      body: "1 of your saved passwords appeared in a data breach. Change it now.",
      type: "security",
    },

    // System warnings
    {
      app: "System",
      appIcon: "📷",
      title: "Camera Access",
      body: "An application is using your camera. Tap to review.",
      type: "system",
    },
    {
      app: "System",
      appIcon: "🎙️",
      title: "Microphone Active",
      body: `${browser} is accessing your microphone in the background.`,
      type: "system",
    },
    {
      app: "System",
      appIcon: "📍",
      title: "Location Shared",
      body: `Your precise location (${city}) was shared with 3 services.`,
      type: "system",
    },
    {
      app: "System",
      appIcon: "🔋",
      title: "Background Activity",
      body: "Unusual background data usage detected. 2.4 GB in the last hour.",
      type: "system",
    },
    {
      app: "System",
      appIcon: "⚙️",
      title: "System Preferences",
      body: "Remote access was enabled by an administrator.",
      type: "system",
    },

    // Email
    {
      app: "Mail",
      appIcon: "📧",
      title: "Google Security",
      body: `New sign-in on ${os} near ${city}. Review this activity.`,
      type: "email",
    },
    {
      app: "Mail",
      appIcon: "📧",
      title: "no-reply@alert.service",
      body: "Your account credentials were accessed from an unrecognized IP.",
      type: "email",
    },
    {
      app: "Mail",
      appIcon: "📧",
      title: "IT Department",
      body: "URGENT: Mandatory security patch required. Your device is flagged.",
      type: "email",
    },

    // Social
    {
      app: "Social",
      appIcon: "👤",
      title: "Someone recognized you",
      body: `A photo of you was tagged in ${city}. You weren't supposed to be there.`,
      type: "social",
    },
    {
      app: "Find My",
      appIcon: "📍",
      title: "Device Located",
      body: `Your device was located by someone else near ${city}.`,
      type: "social",
    },
  ];

  // Shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool;
}

// OS-specific styling
function getOSStyle(os: VisitorInfo["os"]) {
  switch (os) {
    case "mac":
    case "ios":
      return {
        borderRadius: "14px",
        background: "rgba(40, 40, 42, 0.96)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        shadow: "0 8px 32px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3)",
        titleFont: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
        bodyFont: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
        titleSize: "13px",
        bodySize: "12px",
        titleWeight: "600" as const,
        padding: "12px 14px",
        appSize: "10px",
        appColor: "rgba(255, 255, 255, 0.35)",
        titleColor: "#ffffff",
        bodyColor: "rgba(255, 255, 255, 0.65)",
        timeColor: "rgba(255, 255, 255, 0.3)",
        width: "340px",
        iconSize: "36px",
        iconRadius: "8px",
      };
    case "windows":
      return {
        borderRadius: "4px",
        background: "rgba(30, 30, 30, 0.98)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255, 255, 255, 0.05)",
        shadow: "0 4px 20px rgba(0, 0, 0, 0.6)",
        titleFont: "'Segoe UI', Tahoma, sans-serif",
        bodyFont: "'Segoe UI', Tahoma, sans-serif",
        titleSize: "13px",
        bodySize: "12px",
        titleWeight: "600" as const,
        padding: "12px 14px",
        appSize: "11px",
        appColor: "rgba(255, 255, 255, 0.5)",
        titleColor: "#ffffff",
        bodyColor: "rgba(255, 255, 255, 0.7)",
        timeColor: "rgba(255, 255, 255, 0.35)",
        width: "360px",
        iconSize: "40px",
        iconRadius: "4px",
      };
    default: // Linux/Android/Unknown
      return {
        borderRadius: "8px",
        background: "rgba(35, 35, 38, 0.97)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(255, 255, 255, 0.06)",
        shadow: "0 6px 24px rgba(0, 0, 0, 0.5)",
        titleFont: "'Ubuntu', 'Noto Sans', sans-serif",
        bodyFont: "'Ubuntu', 'Noto Sans', sans-serif",
        titleSize: "13px",
        bodySize: "12px",
        titleWeight: "600" as const,
        padding: "12px 14px",
        appSize: "10px",
        appColor: "rgba(255, 255, 255, 0.4)",
        titleColor: "#ffffff",
        bodyColor: "rgba(255, 255, 255, 0.65)",
        timeColor: "rgba(255, 255, 255, 0.3)",
        width: "350px",
        iconSize: "38px",
        iconRadius: "6px",
      };
  }
}

// Type-specific accent colors
const TYPE_COLORS: Record<FakeNotif["type"], string> = {
  message: "#34C759",
  security: "#FF3B30",
  system: "#FF9500",
  email: "#007AFF",
  social: "#AF52DE",
};

export function FakeNotifications({ visitor, delay = 25000 }: Props) {
  const [notifications, setNotifications] = useState<FakeNotif[]>([]);
  const poolRef = useRef<Omit<FakeNotif, "id" | "time" | "dismissing">[]>([]);
  const poolIndexRef = useRef(0);
  const countRef = useRef(0);
  const [started, setStarted] = useState(false);

  // Initialize notification pool
  useEffect(() => {
    if (visitor.loaded) {
      poolRef.current = generateNotifications(visitor);
    }
  }, [visitor]);

  // Start after delay
  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  // Push notifications at intervals
  const pushNotification = useCallback(() => {
    if (poolRef.current.length === 0) return;

    const idx = poolIndexRef.current % poolRef.current.length;
    const template = poolRef.current[idx];
    poolIndexRef.current++;
    countRef.current++;

    const notif: FakeNotif = {
      ...template,
      id: `notif-${countRef.current}-${Date.now()}`,
      time: getTimeStr(),
    };

    setNotifications(prev => {
      const next = [notif, ...prev];
      // Keep max 3 visible
      return next.slice(0, 3);
    });

    // Auto-dismiss after 8 seconds
    setTimeout(() => {
      setNotifications(prev =>
        prev.map(n => n.id === notif.id ? { ...n, dismissing: true } : n)
      );
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notif.id));
      }, 500);
    }, 8000);
  }, []);

  // Schedule notifications
  useEffect(() => {
    if (!started || !visitor.loaded) return;

    // First one quickly
    const first = setTimeout(() => pushNotification(), 500);

    // Then at random intervals (15-35 seconds)
    const interval = setInterval(() => {
      pushNotification();
    }, 15000 + Math.random() * 20000);

    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [started, visitor.loaded, pushNotification]);

  if (!started || notifications.length === 0) return null;

  const style = getOSStyle(visitor.os);

  return (
    <div
      style={{
        position: "fixed",
        top: "12px",
        right: "12px",
        zIndex: 9950,
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        pointerEvents: "auto",
      }}
    >
      {notifications.map((notif) => {
        const accentColor = TYPE_COLORS[notif.type];

        return (
          <div
            key={notif.id}
            style={{
              width: style.width,
              background: style.background,
              backdropFilter: style.backdropFilter,
              border: style.border,
              borderRadius: style.borderRadius,
              boxShadow: style.shadow,
              padding: style.padding,
              display: "flex",
              gap: "10px",
              alignItems: "flex-start",
              animation: notif.dismissing
                ? "notif-dismiss 0.5s ease-in forwards"
                : "notif-slide-in 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
              cursor: "default",
              position: "relative",
              overflow: "hidden",
              pointerEvents: "auto",
            }}
            onClick={() => {
              // Dismiss on click
              setNotifications(prev =>
                prev.map(n => n.id === notif.id ? { ...n, dismissing: true } : n)
              );
              setTimeout(() => {
                setNotifications(prev => prev.filter(n => n.id !== notif.id));
              }, 500);
            }}
          >
            {/* Subtle accent line on left */}
            <div
              style={{
                position: "absolute",
                left: 0,
                top: "20%",
                bottom: "20%",
                width: "2px",
                background: accentColor,
                opacity: 0.6,
                borderRadius: "1px",
              }}
            />

            {/* App icon */}
            <div
              style={{
                width: style.iconSize,
                height: style.iconSize,
                borderRadius: style.iconRadius,
                background: `linear-gradient(135deg, ${accentColor}40, ${accentColor}15)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
                flexShrink: 0,
                border: `1px solid ${accentColor}20`,
              }}
            >
              {notif.appIcon}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* App name + time */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "2px",
                }}
              >
                <span
                  style={{
                    fontSize: style.appSize,
                    color: style.appColor,
                    fontFamily: style.bodyFont,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  {notif.app}
                </span>
                <span
                  style={{
                    fontSize: "13px",
                    color: style.timeColor,
                    fontFamily: style.bodyFont,
                  }}
                >
                  {notif.time}
                </span>
              </div>

              {/* Title */}
              <div
                style={{
                  fontSize: style.titleSize,
                  fontWeight: style.titleWeight,
                  color: style.titleColor,
                  fontFamily: style.titleFont,
                  marginBottom: "2px",
                  lineHeight: "1.3",
                }}
              >
                {notif.title}
              </div>

              {/* Body */}
              <div
                style={{
                  fontSize: style.bodySize,
                  color: style.bodyColor,
                  fontFamily: style.bodyFont,
                  lineHeight: "1.4",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {notif.body}
              </div>
            </div>
          </div>
        );
      })}

      <style>{`
        @keyframes notif-slide-in {
          0% {
            opacity: 0;
            transform: translateX(100%) scale(0.95);
          }
          100% {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        @keyframes notif-dismiss {
          0% {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateX(80px) scale(0.9);
          }
        }
      `}</style>
    </div>
  );
}
