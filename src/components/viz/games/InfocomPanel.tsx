import { useEffect, useRef, useState } from "react";

const VEC = "#00ff41";
const VEC_DIM = "rgba(0,255,65,0.4)";

const ZORK = [
  "> OPEN MAILBOX",
  "Opening the small mailbox reveals a leaflet.",
  "> GO SOUTH",
  "South of House.",
  "> GO WEST",
  "Behind House. A path leads into the forest to the east.",
  "> OPEN WINDOW",
  "With great effort, you open the window.",
  "> ENTER HOUSE",
  "Kitchen. A table used recently for food preparation.",
  "> TAKE SACK",
  "Taken.",
  "> GO WEST",
  "Living Room. Your adventurer's instincts tell you this room has been looted.",
  "> TAKE LAMP",
  "Taken.",
  "> TAKE SWORD",
  "Taken.",
  "> OPEN TRAP DOOR",
  "The door reluctantly opens to reveal a rickety staircase.",
  "> TURN ON LAMP",
  "The brass lantern is now on.",
  "> GO DOWN",
  "The trap door crashes shut. Cellar. Dark and damp.",
  "> GO NORTH",
  "The Troll Room. A nasty troll blocks all passages.",
  "> ATTACK TROLL WITH SWORD",
  "You swing your elvish sword! The troll staggers back.",
  "> ATTACK TROLL",
  "A good slash! The troll is fatally wounded.",
  "> GO EAST",
  "Round Room. Circular room with passages east, west, south.",
  "> GO EAST",
  "Loud Room. A large room with high ceiling.",
  "> ECHO",
  "The acoustics of the room change subtly.",
  "> TAKE BAR",
  "Taken.",
  "> GO SOUTH",
  "Dam Base. You are at the base of Flood Control Dam #3.",
  "> INFLATE BOAT",
  "The boat inflates and floats on the water.",
  "> ENTER BOAT",
  "You are in the magic boat on the Frigid River.",
  "> WAIT",
  "The river carries you downstream.",
  "Aragain Falls. The roar is deafening.",
  "> LAUNCH",
  "The buoy glows with phosphorescence.",
  "> TAKE TORCH",
  "Taken.",
];

const ENCHANTER = [
  "> READ SPELL BOOK",
  "Spells: FROTZ (light), GNUSTO (copy), REZROV (open), NITFOL (talk to animals)",
  "> FROTZ SPELL BOOK",
  "Your spell book begins glowing softly.",
  "> GO NORTH",
  "Warlock's Tower entrance. Worn stone staircase spirals up.",
  "> GO UP",
  "Spiral Staircase. A tattered scroll lies on a step.",
  "> TAKE SCROLL",
  "Taken.",
  "> READ SCROLL",
  "Contains spell KREBF — repair willful damage.",
  "> GNUSTO KREBF",
  "The KREBF spell is now in your spell book.",
  "> GO UP",
  "Chamber of Stars. Ceiling painted with constellations.",
  "> EXAMINE SPHERE",
  "Swirling mists. Image forms: Krill weaving dark enchantments.",
  "> NITFOL",
  "Languages of all creatures become clear to you.",
  "> GO NORTH",
  "Library. Floor-to-ceiling shelves.",
  "> TALK TO TURTLE",
  "'Find the OZMOO spell before confronting Krill.'",
  "> EXAMINE SHELVES",
  "You find a dusty scroll between heavy tomes.",
  "> GNUSTO OZMOO",
  "The OZMOO spell is now in your spell book.",
  "> OZMOO ME",
  "A protective aura surrounds you.",
  "> CAST REZROV ON DOOR",
  "The locked iron door swings open with a creak.",
  "> GO EAST",
  "Krill's Sanctum. Dark energy swirls around a robed figure.",
  "> GUNCHO KRILL",
  "Krill is banished to another dimension!",
];

const ADVENTURE = [
  "> GO INSIDE",
  "Inside Building. Well house for a large spring.",
  "> TAKE ALL",
  "keys: Taken. lamp: Taken. food: Taken. water: Taken.",
  "> LIGHT LAMP",
  "Your lamp is now on.",
  "> XYZZY",
  "Debris room. Stuff washed in from the surface.",
  "> GO WEST",
  "Awkward sloping east/west canyon.",
  "> GO WEST",
  "Splendid chamber thirty feet high. Frozen rivers of orange stone.",
  "> GO SOUTH",
  "A cheerful little bird is sitting here singing.",
  "> TAKE BIRD",
  "You catch the bird in the wicker cage.",
  "> GO SOUTH",
  "Top of small pit breathing traces of white mist.",
  "> GO DOWN",
  "Hall of Mists. Vast hall stretching forward out of sight.",
  "> GO SOUTH",
  "Nugget of Gold Room. Gold nuggets scattered on the floor.",
  "> TAKE GOLD",
  "Taken.",
  "> GO NORTH",
  "Hall of the Mountain King.",
  "> THROW AXE AT DWARF",
  "You killed a little dwarf. The body vanishes.",
  "> PLUGH",
  "Y2 Rock. A large 'Y2' is painted on a rock.",
  "> FEE FIE FOE FOO",
  "Golden eggs appear!",
  "> TAKE EGGS",
  "Taken.",
  "> XYZZY",
  "Inside Building.",
  "> DROP ALL",
  "keys: Dropped. lamp: Dropped. gold: Dropped. eggs: Dropped.",
  "Score: 167 out of 350.",
];

const ALL_SCRIPTS = [
  { name: "ZORK I", lines: ZORK },
  { name: "ENCHANTER", lines: ENCHANTER },
  { name: "ADVENTURE", lines: ADVENTURE },
];

export function InfocomPanel({ gameIndex = 0 }: { gameIndex?: number }) {
  const script = ALL_SCRIPTS[gameIndex % ALL_SCRIPTS.length];
  const [lines, setLines] = useState<string[]>([]);
  const lineIdx = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tick = () => {
      const line = script.lines[lineIdx.current % script.lines.length];
      lineIdx.current++;
      setLines((prev) => [...prev.slice(-40), line]);
    };
    let timeout: ReturnType<typeof setTimeout>;
    const schedule = () => {
      tick();
      timeout = setTimeout(schedule, 120 + Math.random() * 350);
    };
    timeout = setTimeout(schedule, 300 + Math.random() * 500);
    return () => clearTimeout(timeout);
  }, [script.lines]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [lines]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        padding: "16px 24px",
        fontFamily: "'Courier New', monospace",
        fontSize: "18px",
        lineHeight: "1.6",
        background: "#000",
      }}
    >
      {lines.map((line, i) => {
        const isCmd = line.startsWith(">");
        return (
          <div
            key={`${lineIdx.current}-${i}`}
            style={{
              color: isCmd ? VEC : VEC_DIM,
              fontWeight: isCmd ? "bold" : "normal",
              textShadow: isCmd ? `0 0 6px ${VEC}` : "none",
              opacity: 0.4 + (i / lines.length) * 0.6,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              marginBottom: "2px",
            }}
          >
            {line}
          </div>
        );
      })}
      <span
        style={{
          display: "inline-block",
          width: "10px",
          height: "18px",
          background: VEC,
          animation: "curBlink 0.7s step-end infinite",
          boxShadow: `0 0 6px ${VEC}`,
          marginTop: "4px",
        }}
      />
      <style>{`@keyframes curBlink { 0%,50%{opacity:1} 51%,100%{opacity:0} }`}</style>
    </div>
  );
}
