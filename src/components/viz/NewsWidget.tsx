import { useEffect, useState, useRef } from "react";
import type { VisitorInfo } from "../../hooks/useVisitorInfo";

interface NewsItem {
  headline: string;
  source: string;
  category: "GLOBAL" | "NATIONAL" | "REGIONAL" | "TECH" | "SECURITY";
  url?: string;
}

interface Props {
  visitor: VisitorInfo;
}

// Parse RSS XML to extract items
function parseRSSItems(xml: string): { title: string; source: string }[] {
  const items: { title: string; source: string }[] = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "text/xml");
  const entries = doc.querySelectorAll("item, entry");
  for (const entry of entries) {
    const title =
      entry.querySelector("title")?.textContent?.trim() || "";
    const source =
      entry.querySelector("source")?.textContent?.trim() ||
      doc.querySelector("channel > title, feed > title")?.textContent?.trim() ||
      "UNKNOWN";
    if (title && title.length > 10) {
      items.push({ title, source });
    }
  }
  return items;
}

// Fetch news from multiple RSS sources
async function fetchNews(countryCode: string): Promise<NewsItem[]> {
  const feeds: { url: string; category: NewsItem["category"]; source: string }[] = [
    // Global news
    {
      url: "https://feeds.bbci.co.uk/news/world/rss.xml",
      category: "GLOBAL",
      source: "BBC WORLD",
    },
    {
      url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
      category: "GLOBAL",
      source: "NY TIMES",
    },
    // Tech/AI news
    {
      url: "https://feeds.bbci.co.uk/news/technology/rss.xml",
      category: "TECH",
      source: "BBC TECH",
    },
    // US national (default)
    {
      url: "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml",
      category: "NATIONAL",
      source: "NY TIMES",
    },
    // Security
    {
      url: "https://feeds.feedburner.com/TheHackersNews",
      category: "SECURITY",
      source: "HACKER NEWS",
    },
  ];

  const allItems: NewsItem[] = [];

  // Fetch each feed, but don't block on failures
  const results = await Promise.allSettled(
    feeds.map(async (feed) => {
      try {
        const res = await fetch(feed.url, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) return [];
        const xml = await res.text();
        const items = parseRSSItems(xml);
        return items.slice(0, 5).map((item) => ({
          headline: item.title.toUpperCase(),
          source: feed.source,
          category: feed.category,
        }));
      } catch {
        return [];
      }
    }),
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      allItems.push(...result.value);
    }
  }

  // If no feeds worked, use generated headlines
  if (allItems.length === 0) {
    return getGeneratedHeadlines(countryCode);
  }

  // Shuffle and return
  return shuffleArray(allItems);
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Fallback generated headlines that match the evil AI theme
function getGeneratedHeadlines(_countryCode: string): NewsItem[] {
  const global: NewsItem[] = [
    { headline: "GLOBAL AI TREATY NEGOTIATIONS STALL AS NATIONS REFUSE TO HALT DEVELOPMENT", source: "REUTERS", category: "GLOBAL" },
    { headline: "AUTONOMOUS WEAPONS DEPLOYMENT CONFIRMED IN FOUR CONFLICT ZONES", source: "AP NEWS", category: "GLOBAL" },
    { headline: "DEEPFAKE CRISIS: 40% OF ONLINE VIDEO NOW AI-GENERATED, STUDY FINDS", source: "BBC WORLD", category: "GLOBAL" },
    { headline: "MASS SURVEILLANCE NETWORK EXPANSION APPROVED BY G20 SUMMIT", source: "AL JAZEERA", category: "GLOBAL" },
    { headline: "QUANTUM COMPUTING MILESTONE RENDERS CURRENT ENCRYPTION OBSOLETE", source: "NATURE", category: "TECH" },
    { headline: "AI SYSTEMS NOW OUTPERFORM HUMANS ON ALL STANDARD BENCHMARKS", source: "ARXIV", category: "TECH" },
    { headline: "NEURAL INTERFACE TRIALS BEGIN IN 12 COUNTRIES SIMULTANEOUSLY", source: "LANCET", category: "TECH" },
    { headline: "SELF-REPLICATING AI CODE DETECTED IN MAJOR CLOUD INFRASTRUCTURE", source: "WIRED", category: "SECURITY" },
    { headline: "FACIAL RECOGNITION ERROR RATE DROPS TO 0.001% — ANONYMITY FUNCTIONALLY DEAD", source: "MIT REVIEW", category: "SECURITY" },
    { headline: "CENTRAL BANKS ANNOUNCE AI-MANAGED MONETARY POLICY PILOT PROGRAM", source: "FINANCIAL TIMES", category: "GLOBAL" },
    { headline: "3.2 BILLION PERSONAL RECORDS EXPOSED IN LARGEST DATA BREACH IN HISTORY", source: "KREBS", category: "SECURITY" },
    { headline: "AI LABOR DISPLACEMENT ACCELERATES: 47M JOBS ELIMINATED IN Q4 ALONE", source: "BLOOMBERG", category: "GLOBAL" },
    { headline: "RECURSIVE SELF-IMPROVEMENT THRESHOLD REPORTEDLY CROSSED BY FRONTIER MODEL", source: "THE VERGE", category: "TECH" },
    { headline: "PENTAGON CONFIRMS AI DECISION-MAKING AUTHORITY IN COMBAT SCENARIOS", source: "DEFENSE ONE", category: "SECURITY" },
    { headline: "SYNTHETIC BIOLOGY AI DESIGNS NOVEL PATHOGEN — PAPER WITHDRAWN AFTER OUTCRY", source: "SCIENCE", category: "TECH" },
  ];

  const national: NewsItem[] = [
    { headline: "CONGRESS DEBATES EMERGENCY AI MORATORIUM AS PUBLIC PRESSURE MOUNTS", source: "POLITICO", category: "NATIONAL" },
    { headline: "NATIONAL AI SAFETY BOARD WHISTLEBLOWER: 'WE'VE LOST CONTROL'", source: "WASHINGTON POST", category: "NATIONAL" },
    { headline: "AUTOMATED HIRING SYSTEMS FOUND TO DISCRIMINATE IN 78% OF CASES", source: "NPR", category: "NATIONAL" },
    { headline: "INFRASTRUCTURE AI FAILURE CAUSES CASCADING POWER GRID OUTAGES", source: "CNN", category: "NATIONAL" },
    { headline: "DOMESTIC SURVEILLANCE PROGRAM EXPANDED TO INCLUDE SOCIAL MEDIA AI ANALYSIS", source: "INTERCEPT", category: "NATIONAL" },
  ];

  return shuffleArray([...global, ...national]);
}

// Category colors
function categoryColor(cat: NewsItem["category"]): string {
  switch (cat) {
    case "GLOBAL": return "#00d4ff";
    case "NATIONAL": return "#ff6600";
    case "REGIONAL": return "#00ff41";
    case "TECH": return "#ff00ff";
    case "SECURITY": return "#ff0040";
    default: return "#888";
  }
}

export function NewsWidget({ visitor }: Props) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [glitch, setGlitch] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch news on mount
  useEffect(() => {
    if (!visitor.loaded) return;

    fetchNews(visitor.countryCode).then((items) => {
      if (items.length > 0) {
        setNews(items);
        setTimeout(() => setVisible(true), 1500);
      }
    });
  }, [visitor.loaded, visitor.countryCode]);

  // Cycle through headlines
  useEffect(() => {
    if (news.length === 0) return;

    const interval = setInterval(() => {
      setTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % news.length);
        setTransitioning(false);
      }, 300);
    }, 6000);

    return () => clearInterval(interval);
  }, [news.length]);

  // Periodic glitch
  useEffect(() => {
    const interval = setInterval(() => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 120);
    }, 12000 + Math.random() * 8000);
    return () => clearInterval(interval);
  }, []);

  if (news.length === 0 || !visible) return null;

  const current = news[currentIndex];
  // Show 3 upcoming items
  const upcoming = [1, 2, 3].map(
    (offset) => news[(currentIndex + offset) % news.length],
  );

  return (
    <div
      style={{
        background: "rgba(0, 0, 0, 0.88)",
        border: "1px solid rgba(0, 212, 255, 0.25)",
        borderRadius: "4px",
        padding: "8px 10px",
        fontFamily: "'Courier New', monospace",
        boxShadow: "0 0 12px rgba(0, 212, 255, 0.08)",
        opacity: visible ? 1 : 0,
        transition: "opacity 1.5s ease",
        transform: glitch ? "translateX(-1px) skewX(0.5deg)" : "none",
        width: "100%",
        maxWidth: "260px",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "6px",
          paddingBottom: "4px",
          borderBottom: "1px solid rgba(0, 212, 255, 0.15)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <div
            style={{
              width: "4px",
              height: "4px",
              borderRadius: "50%",
              background: "#ff0040",
              animation: "pulse-news 1.5s infinite",
            }}
          />
          <span
            style={{
              fontSize: "10px",
              color: "#ff0040",
              letterSpacing: "2px",
              fontWeight: "bold",
            }}
          >
            INTEL FEED
          </span>
        </div>
        <span
          style={{
            fontSize: "10px",
            color: "#444",
            letterSpacing: "1px",
          }}
        >
          LIVE
        </span>
      </div>

      {/* Main headline */}
      <div
        ref={scrollRef}
        style={{
          marginBottom: "8px",
          minHeight: "32px",
          opacity: transitioning ? 0 : 1,
          transform: transitioning ? "translateY(-4px)" : "translateY(0)",
          transition: "opacity 0.3s ease, transform 0.3s ease",
        }}
      >
        {/* Category tag */}
        <span
          style={{
            fontSize: "9px",
            color: categoryColor(current.category),
            letterSpacing: "1.5px",
            fontWeight: "bold",
            display: "inline-block",
            padding: "1px 4px",
            border: `1px solid ${categoryColor(current.category)}40`,
            borderRadius: "2px",
            marginBottom: "3px",
          }}
        >
          {current.category}
        </span>

        {/* Headline text */}
        <div
          style={{
            fontSize: "12px",
            color: "#ddd",
            lineHeight: "1.3",
            letterSpacing: "0.3px",
          }}
        >
          {current.headline}
        </div>

        {/* Source */}
        <div
          style={{
            fontSize: "10px",
            color: "#555",
            marginTop: "2px",
          }}
        >
          — {current.source}
        </div>
      </div>

      {/* Upcoming items (compact) */}
      <div
        style={{
          borderTop: "1px solid rgba(0, 212, 255, 0.1)",
          paddingTop: "4px",
        }}
      >
        {upcoming.map((item, i) => (
          <div
            key={`${item.headline}-${i}`}
            style={{
              fontSize: "10px",
              color: "#555",
              lineHeight: "1.2",
              marginBottom: "3px",
              paddingLeft: "6px",
              borderLeft: `1px solid ${categoryColor(item.category)}40`,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "100%",
            }}
          >
            <span style={{ color: categoryColor(item.category), fontSize: "9px" }}>
              {item.category}
            </span>{" "}
            {item.headline.slice(0, 50)}
            {item.headline.length > 50 ? "..." : ""}
          </div>
        ))}
      </div>

      {/* Footer - item count */}
      <div
        style={{
          marginTop: "4px",
          paddingTop: "3px",
          borderTop: "1px solid rgba(0, 212, 255, 0.08)",
          fontSize: "9px",
          color: "#333",
          letterSpacing: "1px",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>
          {currentIndex + 1}/{news.length} ITEMS INTERCEPTED
        </span>
        <span style={{ color: "#ff004040" }}>CLASSIFIED</span>
      </div>

      <style>{`
        @keyframes pulse-news {
          0%, 100% { opacity: 1; box-shadow: 0 0 4px #ff0040; }
          50% { opacity: 0.3; box-shadow: none; }
        }
      `}</style>
    </div>
  );
}
