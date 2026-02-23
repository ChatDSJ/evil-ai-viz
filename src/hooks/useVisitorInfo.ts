import { useEffect, useState } from "react";

export interface VisitorInfo {
  ip: string;
  city: string;
  region: string;
  country: string;
  countryCode: string;
  lat: number;
  lon: number;
  isp: string;
  org: string;
  timezone: string;
  os: "windows" | "mac" | "linux" | "ios" | "android" | "unknown";
  osVersion: string;
  browser: string;
  isMobile: boolean;
  loaded: boolean;
}

const DEFAULT_INFO: VisitorInfo = {
  ip: "192.168.1.1",
  city: "Unknown",
  region: "Unknown",
  country: "Unknown",
  countryCode: "US",
  lat: 40.7128,
  lon: -74.006,
  isp: "Unknown ISP",
  org: "Unknown",
  timezone: "America/New_York",
  os: "unknown",
  osVersion: "",
  browser: "Unknown",
  isMobile: false,
  loaded: false,
};

function detectOS(): { os: VisitorInfo["os"]; osVersion: string; isMobile: boolean } {
  const ua = navigator.userAgent;

  // Check mobile FIRST — iOS user agents contain "Mac OS X" so this must come before Mac check
  if (/iPhone|iPad|iPod/.test(ua)) {
    const match = ua.match(/OS (\d+[._]\d+[._]?\d*)/);
    const ver = match ? match[1].replace(/_/g, ".") : "";
    return { os: "ios", osVersion: `iOS ${ver}`, isMobile: true };
  }

  if (/Android/.test(ua)) {
    const match = ua.match(/Android (\d+(\.\d+)?)/);
    const ver = match ? match[1] : "";
    return { os: "android", osVersion: `Android ${ver}`, isMobile: true };
  }

  if (/Windows/.test(ua)) {
    const match = ua.match(/Windows NT (\d+\.\d+)/);
    const ver = match ? match[1] : "";
    const versionMap: Record<string, string> = {
      "10.0": "10/11",
      "6.3": "8.1",
      "6.2": "8",
      "6.1": "7",
    };
    return { os: "windows", osVersion: `Windows ${versionMap[ver] || ver}`, isMobile: false };
  }

  if (/Mac OS X/.test(ua)) {
    const match = ua.match(/Mac OS X (\d+[._]\d+[._]?\d*)/);
    const ver = match ? match[1].replace(/_/g, ".") : "";
    return { os: "mac", osVersion: `macOS ${ver}`, isMobile: false };
  }

  if (/Linux/.test(ua)) {
    if (/Ubuntu/.test(ua)) return { os: "linux", osVersion: "Ubuntu Linux", isMobile: false };
    if (/Fedora/.test(ua)) return { os: "linux", osVersion: "Fedora Linux", isMobile: false };
    return { os: "linux", osVersion: "Linux", isMobile: false };
  }

  return { os: "unknown", osVersion: "Unknown OS", isMobile: false };
}

function detectBrowser(): string {
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return "Microsoft Edge";
  if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) return "Google Chrome";
  if (/Firefox\//.test(ua)) return "Mozilla Firefox";
  if (/Safari\//.test(ua) && !/Chrome/.test(ua)) return "Apple Safari";
  return "Unknown Browser";
}

export function useVisitorInfo(): VisitorInfo {
  const [info, setInfo] = useState<VisitorInfo>(DEFAULT_INFO);

  useEffect(() => {
    const { os, osVersion, isMobile } = detectOS();
    const browser = detectBrowser();

    // Try ip-api.com (free, no key needed, returns ISP)
    fetch("http://ip-api.com/json/?fields=status,message,country,countryCode,regionName,city,lat,lon,timezone,isp,org,query")
      .then((r) => r.json())
      .then((data) => {
        if (data.status === "success") {
          setInfo({
            ip: data.query,
            city: data.city,
            region: data.regionName,
            country: data.country,
            countryCode: data.countryCode,
            lat: data.lat,
            lon: data.lon,
            isp: data.isp,
            org: data.org,
            timezone: data.timezone,
            os,
            osVersion,
            browser,
            isMobile,
            loaded: true,
          });
        } else {
          // Fallback
          fallbackFetch(os, osVersion, browser, isMobile, setInfo);
        }
      })
      .catch(() => {
        fallbackFetch(os, osVersion, browser, isMobile, setInfo);
      });
  }, []);

  return info;
}

function fallbackFetch(
  os: VisitorInfo["os"],
  osVersion: string,
  browser: string,
  isMobile: boolean,
  setInfo: (info: VisitorInfo) => void,
) {
  // Fallback to ipapi.co (HTTPS, but rate limited)
  fetch("https://ipapi.co/json/")
    .then((r) => r.json())
    .then((data) => {
      setInfo({
        ip: data.ip || "?.?.?.?",
        city: data.city || "Unknown",
        region: data.region || "Unknown",
        country: data.country_name || "Unknown",
        countryCode: data.country_code || "US",
        lat: data.latitude || 40.7128,
        lon: data.longitude || -74.006,
        isp: data.org || "Unknown ISP",
        org: data.org || "Unknown",
        timezone: data.timezone || "Unknown",
        os,
        osVersion,
        browser,
        isMobile,
        loaded: true,
      });
    })
    .catch(() => {
      // Use defaults with OS info
      setInfo({
        ...DEFAULT_INFO,
        os,
        osVersion,
        browser,
        isMobile,
        loaded: true,
      });
    });
}
