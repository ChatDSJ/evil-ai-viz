/**
 * Real-time security data fetchers for CVEs (NIST NVD) and breaches (HIBP).
 *
 * All data is fetched client-side from public APIs — no keys needed.
 */

// ─── Types ───

export interface CVEEntry {
  id: string;           // e.g. "CVE-2026-24936"
  description: string;  // English description
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  score: number | null;  // CVSS base score
  vector: string | null; // CVSS vector string
  published: string;    // ISO date
  cweId: string | null; // e.g. "CWE-89"
  source: string;       // sourceIdentifier
}

export interface BreachEntry {
  name: string;
  title: string;
  domain: string;
  breachDate: string;
  pwnCount: number;
  description: string;   // HTML stripped
  dataClasses: string[];
  isVerified: boolean;
}

// ─── CVE fetching (NIST NVD API v2.0) ───

function extractCVSSInfo(metrics: Record<string, unknown[]>): { score: number | null; severity: string; vector: string | null } {
  // Try v4.0, v3.1, v3.0, v2.0 in order
  for (const key of ["cvssMetricV40", "cvssMetricV31", "cvssMetricV30", "cvssMetricV2"]) {
    const metricList = metrics[key] as { cvssData: { baseScore: number; baseSeverity?: string; vectorString?: string } }[] | undefined;
    if (metricList && metricList.length > 0) {
      const d = metricList[0].cvssData;
      return {
        score: d.baseScore,
        severity: d.baseSeverity || (d.baseScore >= 9 ? "CRITICAL" : d.baseScore >= 7 ? "HIGH" : d.baseScore >= 4 ? "MEDIUM" : "LOW"),
        vector: d.vectorString || null,
      };
    }
  }
  return { score: null, severity: "UNKNOWN", vector: null };
}

function stripHTML(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#039;/g, "'");
}

export async function fetchRecentCVEs(count = 40): Promise<CVEEntry[]> {
  try {
    // Fetch recent CVEs from the past 14 days
    const now = new Date();
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const startDate = twoWeeksAgo.toISOString().split(".")[0] + ".000";
    const endDate = now.toISOString().split(".")[0] + ".000";

    const url = `https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=${count}&pubStartDate=${startDate}&pubEndDate=${endDate}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`NVD API ${res.status}`);
    const data = await res.json();

    const entries: CVEEntry[] = [];
    for (const v of data.vulnerabilities || []) {
      const cve = v.cve;
      if (!cve?.id) continue;

      const enDesc = (cve.descriptions || []).find((d: { lang: string; value: string }) => d.lang === "en");
      if (!enDesc || enDesc.value.startsWith("Rejected")) continue;

      const { score, severity, vector } = extractCVSSInfo(cve.metrics || {});
      const weaknesses = cve.weaknesses || [];
      const cweId = weaknesses[0]?.description?.[0]?.value || null;

      entries.push({
        id: cve.id,
        description: enDesc.value,
        severity: severity as CVEEntry["severity"],
        score,
        vector,
        published: cve.published,
        cweId,
        source: cve.sourceIdentifier || "NVD",
      });
    }

    // Sort by score descending, critical first
    entries.sort((a, b) => (b.score || 0) - (a.score || 0));
    return entries;
  } catch {
    return FALLBACK_CVES;
  }
}

// ─── HIBP breaches fetching ───

export async function fetchBreaches(): Promise<BreachEntry[]> {
  try {
    const res = await fetch("https://haveibeenpwned.com/api/v3/breaches", {
      headers: { "User-Agent": "NEXUS-7-VIZ" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`HIBP API ${res.status}`);
    const data = await res.json();

    const entries: BreachEntry[] = (data as Record<string, unknown>[])
      .filter((b) => (b.IsVerified as boolean) && !b.IsSpamList && !b.IsRetired)
      .map((b) => ({
        name: b.Name as string,
        title: b.Title as string,
        domain: b.Domain as string,
        breachDate: b.BreachDate as string,
        pwnCount: b.PwnCount as number,
        description: stripHTML(b.Description as string),
        dataClasses: b.DataClasses as string[],
        isVerified: b.IsVerified as boolean,
      }))
      .sort((a, b) => b.pwnCount - a.pwnCount);

    return entries;
  } catch {
    return FALLBACK_BREACHES;
  }
}

// ─── CWE lookup (common weakness descriptions) ───
export const CWE_MAP: Record<string, string> = {
  "CWE-79": "CROSS-SITE SCRIPTING (XSS)",
  "CWE-89": "SQL INJECTION",
  "CWE-78": "OS COMMAND INJECTION",
  "CWE-20": "IMPROPER INPUT VALIDATION",
  "CWE-22": "PATH TRAVERSAL",
  "CWE-77": "COMMAND INJECTION",
  "CWE-94": "CODE INJECTION",
  "CWE-119": "BUFFER OVERFLOW",
  "CWE-120": "CLASSIC BUFFER OVERFLOW",
  "CWE-125": "OUT-OF-BOUNDS READ",
  "CWE-190": "INTEGER OVERFLOW",
  "CWE-200": "INFORMATION EXPOSURE",
  "CWE-269": "IMPROPER PRIVILEGE MANAGEMENT",
  "CWE-276": "INCORRECT DEFAULT PERMISSIONS",
  "CWE-284": "IMPROPER ACCESS CONTROL",
  "CWE-287": "IMPROPER AUTHENTICATION",
  "CWE-295": "IMPROPER CERTIFICATE VALIDATION",
  "CWE-306": "MISSING AUTHENTICATION",
  "CWE-312": "CLEARTEXT STORAGE OF SENSITIVE INFO",
  "CWE-327": "USE OF BROKEN CRYPTO ALGORITHM",
  "CWE-352": "CROSS-SITE REQUEST FORGERY (CSRF)",
  "CWE-362": "RACE CONDITION",
  "CWE-400": "UNCONTROLLED RESOURCE CONSUMPTION",
  "CWE-416": "USE AFTER FREE",
  "CWE-434": "UNRESTRICTED FILE UPLOAD",
  "CWE-476": "NULL POINTER DEREFERENCE",
  "CWE-502": "DESERIALIZATION OF UNTRUSTED DATA",
  "CWE-522": "INSUFFICIENTLY PROTECTED CREDENTIALS",
  "CWE-611": "XXE (XML EXTERNAL ENTITY)",
  "CWE-668": "EXPOSURE OF RESOURCE TO WRONG SPHERE",
  "CWE-732": "INCORRECT PERMISSION ASSIGNMENT",
  "CWE-787": "OUT-OF-BOUNDS WRITE",
  "CWE-798": "HARD-CODED CREDENTIALS",
  "CWE-862": "MISSING AUTHORIZATION",
  "CWE-863": "INCORRECT AUTHORIZATION",
  "CWE-918": "SERVER-SIDE REQUEST FORGERY (SSRF)",
  "CWE-1321": "PROTOTYPE POLLUTION",
};

// ─── Fallback data (in case APIs are unreachable) ───

const FALLBACK_CVES: CVEEntry[] = [
  { id: "CVE-2026-24936", description: "Improper input validation vulnerability in ADM allows unauthenticated remote code execution via crafted CGI parameters during AD domain joining", severity: "CRITICAL", score: 9.8, vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H", published: "2026-02-15", cweId: "CWE-20", source: "security@asustor.com" },
  { id: "CVE-2025-69971", description: "FUXA v1.2.7 hard-coded credential vulnerability in jwt-helper.js allows authentication bypass and full system compromise", severity: "CRITICAL", score: 9.8, vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H", published: "2026-02-12", cweId: "CWE-798", source: "cve@mitre.org" },
  { id: "CVE-2025-69983", description: "FUXA v1.2.7 Remote Code Execution via project import — application does not sanitize or sandbox user-supplied project files", severity: "CRITICAL", score: 9.8, vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H", published: "2026-02-12", cweId: "CWE-94", source: "cve@mitre.org" },
  { id: "CVE-2026-25234", description: "SQL injection vulnerability in PEAR category deletion allows full database compromise via unsanitized user input", severity: "CRITICAL", score: 9.8, vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H", published: "2026-02-18", cweId: "CWE-89", source: "security-advisories@github.com" },
  { id: "CVE-2025-10878", description: "SQL injection in login functionality of AdminPando 1.0.1 — username and password parameters allow complete authentication bypass", severity: "CRITICAL", score: 10.0, vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H", published: "2026-02-10", cweId: "CWE-89", source: "cve@mitre.org" },
  { id: "CVE-2022-50981", description: "Unauthenticated remote attacker gains full access — devices shipped without password by default and setting one is not enforced", severity: "CRITICAL", score: 9.8, vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H", published: "2026-02-08", cweId: "CWE-306", source: "info@cert.vde.com" },
  { id: "CVE-2025-14998", description: "Branda plugin for WordPress privilege escalation via account takeover in all versions — allows unauthenticated admin access", severity: "CRITICAL", score: 9.8, vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H", published: "2026-02-05", cweId: "CWE-287", source: "security@wordfence.com" },
  { id: "CVE-2025-65875", description: "Arbitrary file upload in FPDF AddFont() allows remote code execution via crafted font file", severity: "HIGH", score: 8.8, vector: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H", published: "2026-02-14", cweId: "CWE-434", source: "cve@mitre.org" },
  { id: "CVE-2025-62799", description: "Fast DDS buffer overflow in RTPS message processing allows remote code execution prior to versions 3.4.1, 3.3.1", severity: "CRITICAL", score: 9.8, vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H", published: "2026-02-11", cweId: "CWE-119", source: "security-advisories@github.com" },
  { id: "CVE-2026-25237", description: "PEAR: use of preg_replace() with /e modifier in bug updates enables arbitrary PHP code execution by authenticated users", severity: "CRITICAL", score: 9.8, vector: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H", published: "2026-02-18", cweId: "CWE-94", source: "security-advisories@github.com" },
  { id: "CVE-2025-69981", description: "Unrestricted file upload in FUXA /api/upload — endpoint lacks authentication, allowing arbitrary file writes to the server", severity: "CRITICAL", score: 9.8, vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H", published: "2026-02-12", cweId: "CWE-434", source: "cve@mitre.org" },
  { id: "CVE-2026-25241", description: "Unauthenticated SQL injection in PEAR /get/ endpoint allows extraction of all package and user data from the database", severity: "CRITICAL", score: 9.8, vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H", published: "2026-02-18", cweId: "CWE-89", source: "security-advisories@github.com" },
];

const FALLBACK_BREACHES: BreachEntry[] = [
  { name: "Collection1", title: "Collection #1", domain: "", breachDate: "2019-01-07", pwnCount: 772904991, description: "In January 2019, a large collection of credential stuffing lists (email and password combos) was discovered on a popular hacking forum. The data contained almost 773 million unique email addresses.", dataClasses: ["Email addresses", "Passwords"], isVerified: true },
  { name: "Facebook", title: "Facebook", domain: "facebook.com", breachDate: "2019-08-01", pwnCount: 509458528, description: "In April 2021, a large dataset of over 500 million Facebook users was made freely available for download. The data was scraped from Facebook profiles via a vulnerability patched in 2019.", dataClasses: ["Dates of birth", "Email addresses", "Employers", "Genders", "Geographic locations", "Names", "Phone numbers"], isVerified: true },
  { name: "LinkedIn", title: "LinkedIn", domain: "linkedin.com", breachDate: "2012-05-05", pwnCount: 164611595, description: "In May 2016, LinkedIn had 164 million email addresses and passwords exposed. Originally hacked in 2012, the data remained out of sight until it surfaced on a dark market.", dataClasses: ["Email addresses", "Passwords"], isVerified: true },
  { name: "Adobe", title: "Adobe", domain: "adobe.com", breachDate: "2013-10-04", pwnCount: 152445165, description: "In October 2013, 153 million Adobe accounts were breached with each containing email, encrypted password, and password hint in plaintext.", dataClasses: ["Email addresses", "Password hints", "Passwords", "Usernames"], isVerified: true },
  { name: "MySpace", title: "MySpace", domain: "myspace.com", breachDate: "2008-07-01", pwnCount: 359420698, description: "In approximately 2008, MySpace suffered a data breach exposing almost 360 million accounts. The data was offered for sale in 2016 and included email addresses and SHA1 hashes of the first 10 characters of the password.", dataClasses: ["Email addresses", "Passwords", "Usernames"], isVerified: true },
  { name: "Canva", title: "Canva", domain: "canva.com", breachDate: "2019-05-24", pwnCount: 137272116, description: "In May 2019, the graphic design tool Canva suffered a data breach that impacted 137 million subscribers. The exposed data included email addresses, usernames, names, cities of residence, and passwords stored as bcrypt hashes.", dataClasses: ["Email addresses", "Geographic locations", "Names", "Passwords", "Usernames"], isVerified: true },
  { name: "Zynga", title: "Zynga", domain: "zynga.com", breachDate: "2019-09-01", pwnCount: 172869660, description: "In September 2019, the game developer Zynga was hacked and over 170 million records were stolen, including email addresses, usernames, and passwords stored as SHA1 hashes.", dataClasses: ["Email addresses", "Passwords", "Phone numbers", "Usernames"], isVerified: true },
  { name: "Deezer", title: "Deezer", domain: "deezer.com", breachDate: "2019-04-22", pwnCount: 229037936, description: "In 2019, the music streaming service Deezer disclosed a data breach that exposed over 229 million user records including email addresses, dates of birth, IP addresses, and genders.", dataClasses: ["Dates of birth", "Email addresses", "Genders", "Geographic locations", "IP addresses", "Names", "Usernames"], isVerified: true },
  { name: "Wattpad", title: "Wattpad", domain: "wattpad.com", breachDate: "2020-06-29", pwnCount: 268765495, description: "In June 2020, the user-generated stories platform Wattpad suffered a data breach exposing almost 269 million records including user names, email addresses, and passwords stored as bcrypt hashes.", dataClasses: ["Bios", "Dates of birth", "Email addresses", "Genders", "Geographic locations", "IP addresses", "Names", "Passwords", "Social media profiles", "Usernames"], isVerified: true },
  { name: "NationalPublicData", title: "National Public Data", domain: "nationalpublicdata.com", breachDate: "2024-04-09", pwnCount: 133957569, description: "In mid-2024, a massive trove of data sourced from National Public Data was posted to a popular hacking forum. The data included personal records with names, mailing addresses, email addresses, phone numbers, social security numbers, and dates of birth.", dataClasses: ["Dates of birth", "Email addresses", "Genders", "Names", "Phone numbers", "Physical addresses", "Social security numbers"], isVerified: true },
  { name: "TelegramCombolists", title: "Telegram Combolists", domain: "", breachDate: "2024-05-28", pwnCount: 361468099, description: "In May 2024, a collection of almost 362 million unique email addresses were collated from malicious Telegram channels. The data was provided to HIBP by a researcher who identified channels sharing combolists.", dataClasses: ["Email addresses", "Passwords", "Usernames"], isVerified: true },
  { name: "MyFitnessPal", title: "MyFitnessPal", domain: "myfitnesspal.com", breachDate: "2018-02-01", pwnCount: 143606147, description: "In February 2018, the diet and exercise service MyFitnessPal suffered a data breach exposing 144 million unique email addresses alongside usernames, IP addresses, and SHA-1 and bcrypt password hashes.", dataClasses: ["Email addresses", "IP addresses", "Passwords", "Usernames"], isVerified: true },
];

// ─── Formatting helpers ───

export function formatPwnCount(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

export function severityColor(severity: string): string {
  switch (severity) {
    case "CRITICAL": return "#ff0040";
    case "HIGH": return "#ff6600";
    case "MEDIUM": return "#ffaa00";
    case "LOW": return "#00d4ff";
    default: return "#888";
  }
}

export function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}
