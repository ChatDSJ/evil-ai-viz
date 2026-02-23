# Evil AI Viz - Evolution Log

Track of all features added to make the dashboard progressively more evil.

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

## Ideas for Future Days:
- Device sensors (gyroscope, ambient light, proximity)
- Screen resolution / color depth / CPU cores display
- Connection type detection (wifi vs cellular vs ethernet)
- Right-click / inspect detection ("ATTEMPTING TO INSPECT? CUTE.")
- Print detection ("PRINTING EVIDENCE?")
- Time-of-day awareness ("Working late?" at 2am)
- Mouse movement tracking displayed as a heatmap
- Scroll position as "DOCUMENT SCAN PROGRESS: 47%"
- Fake browser notifications
- Imperceptible color shift (background gets redder over hours)
- Mirror cursor that follows with a 2-second delay
- Text that changes when you look away and look back
- Device orientation / tilt detection on mobile
- Clipboard interception ("WE SAW WHAT YOU COPIED")
- Network information API (downlink speed, RTT)
- Gamepad API detection
- Installed fonts fingerprinting
- WebGL renderer string (GPU identification)
- Audio context fingerprinting
- Canvas fingerprinting visualization
