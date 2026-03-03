import { useEffect, useRef } from "react";
import type { VisitorInfo } from "../../hooks/useVisitorInfo";

/**
 * TabIntelligence — Weaponizes the browser's own tab UI against the user.
 *
 * When the user switches to another tab:
 * - The page title silently rotates through their real personal data
 *   (city, IP address, ISP, browser, OS, coordinates)
 * - The favicon changes to a pulsing red dot
 *
 * When they return:
 * - Title reverts to "AI HEADQUARTERS"
 * - Favicon reverts to normal
 *
 * The effect: while browsing other tabs, they glance at their tab bar
 * and see their own city name, IP address, or ISP staring back at them.
 * Pure mechanic. No popups, no dialogue, no narration.
 * The browser's chrome becomes the surveillance vector.
 *
 * Uses: document.visibilitychange, document.title, dynamic favicon via canvas
 */

// Generate a red dot favicon as a data URL
function generateRedDotFavicon(): string {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // Dark background
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, 32, 32);

  // Red dot with glow
  const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 14);
  gradient.addColorStop(0, "#ff0040");
  gradient.addColorStop(0.5, "#cc0033");
  gradient.addColorStop(1, "rgba(255, 0, 64, 0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(16, 16, 14, 0, Math.PI * 2);
  ctx.fill();

  // Inner bright core
  const inner = ctx.createRadialGradient(16, 16, 0, 16, 16, 5);
  inner.addColorStop(0, "#ff3366");
  inner.addColorStop(1, "#ff0040");
  ctx.fillStyle = inner;
  ctx.beginPath();
  ctx.arc(16, 16, 5, 0, Math.PI * 2);
  ctx.fill();

  return canvas.toDataURL("image/png");
}

// Generate a dim red dot (for pulsing effect)
function generateDimRedDotFavicon(): string {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, 32, 32);

  const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 10);
  gradient.addColorStop(0, "#990022");
  gradient.addColorStop(1, "rgba(153, 0, 34, 0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(16, 16, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#aa0033";
  ctx.beginPath();
  ctx.arc(16, 16, 3, 0, Math.PI * 2);
  ctx.fill();

  return canvas.toDataURL("image/png");
}

function buildDataRotation(visitor: VisitorInfo): string[] {
  const items: string[] = [];

  // City, State
  if (visitor.city && visitor.city !== "Unknown") {
    const location = visitor.region && visitor.region !== "Unknown"
      ? `${visitor.city}, ${visitor.region}`
      : visitor.city;
    items.push(location);
  }

  // IP address
  if (visitor.ip && visitor.ip !== "192.168.1.1") {
    items.push(visitor.ip);
  }

  // ISP
  if (visitor.isp && visitor.isp !== "Unknown ISP") {
    items.push(visitor.isp);
  }

  // Browser + OS
  if (visitor.browser && visitor.browser !== "Unknown") {
    const os = visitor.os !== "unknown" ? visitor.os.toUpperCase() : "";
    items.push(os ? `${visitor.browser} — ${os}` : visitor.browser);
  }

  // Coordinates
  if (visitor.lat && visitor.lon) {
    items.push(`${visitor.lat.toFixed(4)}, ${visitor.lon.toFixed(4)}`);
  }

  // Timezone
  if (visitor.timezone) {
    items.push(visitor.timezone);
  }

  // Fallback
  if (items.length === 0) {
    items.push("SESSION ACTIVE");
  }

  return items;
}

export function TabIntelligence({ visitor }: { visitor: VisitorInfo }) {
  const originalTitleRef = useRef("AI HEADQUARTERS");
  const originalFaviconRef = useRef<string | null>(null);
  const rotationIndexRef = useRef(0);
  const rotationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const faviconPulseRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const faviconLinkRef = useRef<HTMLLinkElement | null>(null);

  useEffect(() => {
    // Capture original title
    originalTitleRef.current = document.title || "AI HEADQUARTERS";

    // Capture or create favicon link element
    let faviconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
    if (!faviconLink) {
      faviconLink = document.querySelector('link[rel="shortcut icon"]') as HTMLLinkElement | null;
    }
    if (faviconLink) {
      originalFaviconRef.current = faviconLink.href;
      faviconLinkRef.current = faviconLink;
    } else {
      // Create one
      faviconLink = document.createElement("link");
      faviconLink.rel = "icon";
      faviconLink.type = "image/png";
      document.head.appendChild(faviconLink);
      faviconLinkRef.current = faviconLink;
      originalFaviconRef.current = "";
    }

    // Pre-generate red dot favicons
    const brightDot = generateRedDotFavicon();
    const dimDot = generateDimRedDotFavicon();

    const dataItems = buildDataRotation(visitor);

    const startSurveillanceMode = () => {
      rotationIndexRef.current = 0;

      // Set first title immediately
      document.title = dataItems[0];

      // Rotate title every 3 seconds
      rotationIntervalRef.current = setInterval(() => {
        rotationIndexRef.current = (rotationIndexRef.current + 1) % dataItems.length;
        document.title = dataItems[rotationIndexRef.current];
      }, 3000);

      // Pulse favicon between bright and dim
      let bright = true;
      if (faviconLinkRef.current) {
        faviconLinkRef.current.href = brightDot;
      }
      faviconPulseRef.current = setInterval(() => {
        if (faviconLinkRef.current) {
          faviconLinkRef.current.href = bright ? dimDot : brightDot;
          bright = !bright;
        }
      }, 1200);
    };

    const stopSurveillanceMode = () => {
      // Revert title
      document.title = originalTitleRef.current;

      // Revert favicon
      if (faviconLinkRef.current && originalFaviconRef.current !== null) {
        faviconLinkRef.current.href = originalFaviconRef.current;
      }

      // Clear intervals
      if (rotationIntervalRef.current) {
        clearInterval(rotationIntervalRef.current);
        rotationIntervalRef.current = null;
      }
      if (faviconPulseRef.current) {
        clearInterval(faviconPulseRef.current);
        faviconPulseRef.current = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        startSurveillanceMode();
      } else {
        stopSurveillanceMode();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      stopSurveillanceMode();
    };
  }, [visitor]);

  // This component renders nothing — it operates entirely through side effects
  return null;
}
