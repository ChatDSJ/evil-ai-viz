# Evil AI Viz - Evolution Log

Track of all features added to make the dashboard progressively more evil.

## ⚠️ PRIORITY: User Testing Feedback (from Notion backlog — address BEFORE adding new features)
These items were flagged from David's user testing and should be prioritized:
- [ ] **Text needs to be larger throughout** — readability issue across all panels
- [ ] **Cycle through vector games one at a time** (not all 6 at once) — include chess.com/CCC in rotation
- [ ] **No titles on games** — no titles, no explanations for anything (disorientation is the goal)
- [ ] **Rain needs to be slower, and less of it** — matrix rain effect too aggressive
- [ ] **Audio should increase 4x more slowly** — currently 60s fade, should be ~4 minutes
- [ ] **Close-window/tab interception** — confusing AI dialog when person tries to close

Notion backlog: https://www.notion.so/30f6cd9f7e47811ab8f4fc11ff63f177

---

## Day 9 - Hardware Fingerprinting + Persistent Memory (2026-03-05)

### New Features:

1. **Audio Fingerprint** — Real Web Audio API hardware fingerprinting. Creates an OfflineAudioContext (44100 Hz, 1 channel), runs a triangle-wave oscillator at 10kHz through a DynamicsCompressor (threshold: -50dB, knee: 40dB, ratio: 12:1, attack: 0, release: 0.25s), captures the rendered audio buffer, and hashes samples 4500-5000 to produce a unique hardware signature. This is a genuine fingerprinting technique used by commercial tracking services — the hash varies by audio hardware, drivers, and OS audio stack.

   Displays:
   - Sample rate, max channels, base latency, output latency
   - Audio worklet availability
   - Channel interpretation/routing mode
   - Waveform visualization of the fingerprint region (with highlighted hash area)
   - Computed audio hash (e.g., `0x6F5E1104`)
   - Codec support probing (AAC, OPUS, VORBIS, FLAC, WAV, MP3, WEBM) via `canPlayType()`
   - Progressive reveal: scan → hardware data → waveform + hash → codecs → completion
   - Uses: OfflineAudioContext, OscillatorNode, DynamicsCompressorNode, `canPlayType()`

2. **Session Memory** — localStorage-based persistent memory that survives browser sessions. The site *remembers* returning visitors.

   First visit: Shows "NEW SUBJECT" with session counter at 1, live duration timer, and first contact timestamp. Generates a subject ID from canvas fingerprint hash.

   Returning visits: Immediately shows "SUBJECT RECOGNIZED" with:
   - Total session count (big number)
   - Current session duration (live)
   - Cumulative exposure time across all sessions
   - First contact date/time
   - Tracking duration (days since first visit)
   - Previous session duration + how long ago
   - Average session length
   - Visit frequency (visits/day)
   - Visual dot timeline of last 20 visits (current visit highlighted green)
   - Persistent subject ID

   The persistence across sessions is the unsettling part — close the tab, come back tomorrow, and it immediately recalls everything.
   - Uses: localStorage, canvas fingerprint hash, Date/performance APIs

### Technical:
- New component: `AudioFingerprint.tsx` — OfflineAudioContext fingerprinting with waveform SVG visualization
- New component: `SessionMemory.tsx` — localStorage persistence with visit history tracking
- Both integrated into `EvilAIViz.tsx` — Audio Fingerprint at phase 5 (draggable), Session Memory at phase 3 (draggable)
- Audio Fingerprint positioned center-left, Session Memory positioned upper-right area
- Both follow collapsible panel pattern with header dot indicator

---

## Day 8 - Passive Surveillance (2026-03-03)

### New Features:

1. **Presence Timeline** — A real-time activity state monitor that tracks ACTIVE/IDLE/AWAY states across the session. Renders as a thin colored strip that builds over time:
   - GREEN (ACTIVE) — mouse, keyboard, scroll, touch, or click events within last 8 seconds
   - AMBER (IDLE) — page focused but no input detected for 8+ seconds
   - DARK RED (AWAY) — tab hidden (visibilitychange API)
   - Shows current state + duration counter, session total, percentage breakdown per state, and number of state transitions
   - Timeline bar with minute markers and a playhead indicator
   - Updates at 2fps via setInterval
   - Uses: mousemove, keydown, scroll, touchstart, click, pointerdown, visibilitychange

2. **Tab Intelligence** — Weaponizes the browser's own tab UI. An invisible component that manipulates `document.title` and the favicon when the user switches to another tab:
   - When the user leaves: the page title silently rotates through their real personal data every 3 seconds — city/state, IP address, ISP, browser/OS, GPS coordinates, timezone
   - The favicon changes to a pulsing red dot (generated via canvas at runtime, alternating bright/dim states)
   - When the user returns: everything reverts to "AI HEADQUARTERS" and the original favicon
   - The effect: while browsing other tabs, you glance at your tab bar and see your own city name, IP address, or ISP staring back at you
   - Pure side-effect component — renders nothing to the DOM
   - Uses: visibilitychange, document.title, dynamic canvas-generated favicon data URLs

### Technical:
- New component: `PresenceTimeline.tsx` — state machine tracking ACTIVE/IDLE/AWAY with segment-based timeline rendering
- New component: `TabIntelligence.tsx` — invisible, operates via document.title and favicon link element manipulation
- Both integrated into `EvilAIViz.tsx` — Presence Timeline at phase 4 (draggable), Tab Intelligence at phase 2
- Presence Timeline positioned at bottom-center with Draggable wrapper
- Tab Intelligence requires visitor data for the title rotation content

---

## Day 0 - Initial Build (2026-02-21)
- Matrix rain background
- Fake terminal with personalized hacking commands (uses real IP, ISP, city, OS)
- World map with attack vectors
- Wireframe globe
- Neural network visualization
- Hex stream
- Radar sweep
- Metrics dashboard (systems infiltrated, data harvested, active agents, AI intelligence, humans manipulated)
- Visitor info bar (reveals IP, location, ISP, system, browser one-by-one)
- User location map with crosshairs targeting their exact coordinates
- Fake OS dialog (Windows/Mac/Linux native styling) with animated cursor that clicks "Yes/Allow/Authenticate"
- Malware installation progress bar
- Warning banner (scrolling threat messages)
- Glitch overlay
- Code fragments
- Data flow lines
- Scan lines
- Audio player with cyberpunk music (60-second fade-in)
- Fullscreen button

## Day 1 - First Escalation (2026-02-22)

### New Features:
1. **Local Weather Widget** - Fetches actual weather at the visitor's geolocation via Open-Meteo API. Displays real temperature, humidity, wind, cloud cover. Has creepy contextual messages based on conditions ("Clear conditions. Optimal surveillance weather." / "Reduced visibility for you. Not for us.")

2. **Live Viewers Counter** - Real-time tracking via Convex database. Every visitor's browser sends a heartbeat every 10 seconds. Shows:
   - Total number of current viewers
   - Mini world map with pulsing dots for each viewer's location
   - "◄ YOU" label on the current user's dot
   - Contextual messages ("You are alone. For now." / "They can't see each other. But we can see all of you.")

3. **Session Timer** - Counts up from the moment you load the page. Shows "OBSERVED FOR HH:MM:SS" with escalating messages:
   - 0-10s: "SESSION INITIATED"
   - 10-30s: "OBSERVATION IN PROGRESS"
   - 30-60s: "EMOTIONAL VULNERABILITIES: IDENTIFIED"
   - 1-2m: "PSYCHOLOGICAL MAPPING: 34%"
   - 2-5m: "YOU'RE STILL HERE. INTERESTING."
   - 5-10m: "DEEP PROFILE NEARLY COMPLETE"
   - 10-15m: "WE KNOW ENOUGH NOW. BUT STAY."
   - 15m+: "YOU CAN'T LEAVE. YOU KNOW THAT."

4. **Battery Monitor** - Reads actual device battery level via Battery API. Shows percentage with a visual battery icon. Creepy contextual messages:
   - "We see you plugged in. Smart."
   - "Running low. How long can you keep watching?"
   - "Your battery won't last forever. Our servers will."
   - "Your device is dying. We'll still be here when it's gone."

5. **Tab-Away Detector** - Notices when you switch tabs and measures how long you were gone. Shows a centered overlay message when you return:
   - 1st time: "WELCOME BACK. You were gone for 23 seconds. We noticed."
   - 2nd time: "There you are. 14 seconds away. We tracked your tab switches."
   - 3rd time: "Again? 8 seconds this time. You keep leaving but you keep coming back."
   - 4th+: "Absence #4: 31 seconds. Your avoidance pattern has been catalogued."
   - Also tracks total tab switch count

### Technical Changes:
- Added Convex schema with `activeVisitors` table
- Added `convex/visitors.ts` with heartbeat, getActive, cleanup mutations/queries
- Added ConvexProvider to main.tsx for real-time database connectivity
- Added 5 new React components in `src/components/viz/`

---

## ⚠️ DIRECTION UPDATE (Feb 25, 2026 — from David)
**NO comedy. NO snark. NO narrating the evil. Direct, factual, non-obvious only.**
The dashboard should show data and let the viewer connect the dots. Think surveillance camera, not Bond villain.
All snarky commentary was stripped from 12+ components on Feb 25 (see Day 5 below).

## Day 5 - Silent Surveillance (2026-02-26)

### New Features:

1. **Mouse Heatmap Canvas** — A full-screen transparent canvas overlay that silently accumulates everywhere the cursor has been. Over time, frequently visited areas glow warm (blue → cyan → green → yellow → orange → red) while the rest stays dark. No labels, no text, no explanation — just a ghostly heat signature that slowly builds. Uses:
   - Off-screen Float32Array accumulation buffer at 15% resolution for performance
   - Radial gradient "stamps" for each mouse position with Gaussian falloff
   - Color ramp from cool (blue) through warm (red/white-hot)
   - Fades in after 80+ samples with 8-second transition
   - `mix-blend-mode: screen` for seamless overlay
   - 12fps render loop via requestAnimationFrame

2. **Print Surveillance Report** — When the user triggers print (Ctrl+P / Cmd+P / File > Print), the entire page transforms via `@media print` CSS into a clean, official-looking intelligence report containing the user's *real* data:
   - Document reference number (derived from canvas fingerprint hash)
   - IP address, location, coordinates, ISP
   - Full device profile (OS, browser, screen, GPU, CPU cores, memory)
   - Network type and connection details
   - Timezone, languages, Do Not Track setting
   - Canvas fingerprint hash
   - Session duration at exact moment of print
   - Print attempt counter
   - "CLASSIFIED" watermark and red classification stamp
   
   The terrifying part: if someone tries to print "evidence" of this creepy site, the printout IS the evidence — of *them*. All data is gathered live at the moment of print. No commentary, no explanation. Just a clean government-style document with their information.

### Technical:
- New component: `MouseHeatmap.tsx` — canvas-based heatmap with Float32Array accumulation buffer
- New component: `PrintReport.tsx` — `@media print` stylesheet + beforeprint/afterprint event handlers
- Both integrated into `EvilAIViz.tsx` — heatmap at phase 3, print report at phase 1
- Heatmap renders at z-index 45 with screen blend mode for subtle overlay
- Print report uses `position: fixed` overlay that only appears in print media

---

## Ideas for Future Days:
*All ideas below should follow the "factual, non-obvious" principle. No commentary, no winking at the camera.*
- Device sensors (gyroscope, ambient light, proximity) — just show the raw data
- Screen resolution / color depth / CPU cores — show as device profile data
- Connection type detection (wifi vs cellular vs ethernet) — display factually
- Mouse movement tracking displayed as a silent heatmap
- Scroll depth tracking (just a percentage, no labels)
- Imperceptible color shift (background gets redder over hours) — silent mechanic
- Mirror cursor that follows with a 2-second delay — no popup text about it
- Text that changes when you look away and look back — silent, no narration
- Device orientation / tilt detection on mobile — raw data display
- Network information API (downlink speed, RTT) — factual readout
- Gamepad API detection — just show connected/not
- Installed fonts fingerprinting — list the fonts, nothing more
- WebGL renderer string (GPU identification)
- Audio context fingerprinting
- Canvas fingerprinting visualization
- Real-time crypto/NFT feeds
- EVE Online / WoW data
- Dating profile data
- MySpace chats with celebrities
- CVE / HaveIBeenPwned data feeds
- TED talks / Davos prep materials
- Kaggle contest submissions
- Mechanical Turk tasks
- Water rights data
- TikTok/Discord/Instagram feeds
- Exchange rates
- Defunct spy organization data
- Longer ambient music tracks
- Vector map scanning animations

## Day 4 - UX Refinements (2026-02-25)

### Changes:
1. **Progressive reveal slowed to 20-second intervals** — was 5 seconds, now each new element appears every 20 seconds after boot sequence completes. Total reveal time: ~2.5 minutes instead of 40 seconds.

2. **Audio player widget removed** — no more visible play/pause button or track list. Music still auto-plays on first user interaction (click/keydown/touch/scroll) with a 4-minute fade from silence to full volume. Playlist shuffled per session, 3-second crossfade between tracks.

3. **Fullscreen button removed** — FullscreenButton component no longer rendered.

4. **All major widgets now draggable** — new `Draggable` wrapper component using Pointer Events API (works for mouse AND touch). Draggable widgets:
   - World map (center)
   - Wireframe globe (top-right)
   - Radar sweep (center)
   - User location map (right)
   - MySpace conversations (top-right area)
   - Device fingerprint dossier (bottom-right)
   - Behavior analysis panel (bottom-left)
   Supports `baseTransform` prop for composing with existing CSS transforms.

5. **Text adventure games (InfocomPanel) go full-area** — when Zork/Enchanter/Adventure cycles in via SelfPlayGames:
   - Container expands from 58%×52% bottom-left to 90%×85% centered
   - Font size increased from 7.5px to 18px
   - Line buffer increased from 18 to 40 lines
   - Cursor and text shadow scaled up
   - Smooth CSS transition when expanding/contracting

### Technical:
- New component: `Draggable.tsx` — generic pointer-event-based drag wrapper
- `EvilAIViz.tsx` — PHASE_INTERVAL_MS constant (20000), AudioPlayer rendered invisibly, FullscreenButton import removed
- `AudioPlayer.tsx` — returns only `<audio>` element, no DOM UI
- `SelfPlayGames.tsx` — `isFullArea` flag on game definitions, dynamic container sizing
- `InfocomPanel.tsx` — responsive sizing for full-area display
