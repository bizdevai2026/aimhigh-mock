// AimHigh Mock Prep — synthesised audio feedback.
//
// Uses Web Audio API to generate short tones (no audio files needed).
// More musical and varied than single beeps: layered chords, soft
// arpeggios, gentle noise bursts, and escalating streak celebrations
// (3-in-a-row, 5-in-a-row, perfect round).
//
// Sound is ON by default — explicit user request. Parents who'd
// rather mute can flip it off in the header; the off choice
// persists at "aimhigh-mock-sound" = "off". First-time visit and
// any storage failure both fall back to ON.

const SOUND_KEY = "aimhigh-mock-sound";

let _ctx = null;

function isOn() {
  try { return localStorage.getItem(SOUND_KEY) !== "off"; } catch (e) { return true; }
}

export function setSoundOn(on) {
  try { localStorage.setItem(SOUND_KEY, on ? "on" : "off"); } catch (e) {}
}

export function toggleSound() {
  const next = !isOn();
  setSoundOn(next);
  return next;
}

export function readSoundOn() { return isOn(); }

function ctx() {
  if (_ctx) return _ctx;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  _ctx = new Ctor();
  return _ctx;
}

// iOS Safari, Chrome mobile and most touch browsers create the AudioContext
// in a "suspended" state until a user gesture occurs. Without this, the
// first sound on the welcome screen is silent and feels broken. We listen
// once for any user gesture (tap, touch, click, or key) and silently
// warm the context — playing a near-zero-duration buffer is the iOS
// idiom for "audio is now allowed". After the first gesture we remove
// every listener and never run again.
let _armed = false;
function armAudioContext() {
  if (_armed) return;
  _armed = true;
  const ac = ctx();
  if (!ac) return;
  if (ac.state === "suspended" && typeof ac.resume === "function") {
    try { ac.resume(); } catch (e) {}
  }
  try {
    const buf = ac.createBuffer(1, 1, 22050);
    const src = ac.createBufferSource();
    src.buffer = buf;
    src.connect(ac.destination);
    src.start(0);
  } catch (e) {}
}

function installFirstGestureUnlock() {
  if (typeof document === "undefined") return;
  function fire() {
    armAudioContext();
    document.removeEventListener("pointerdown", fire, true);
    document.removeEventListener("touchstart", fire, true);
    document.removeEventListener("click", fire, true);
    document.removeEventListener("keydown", fire, true);
  }
  document.addEventListener("pointerdown", fire, true);
  document.addEventListener("touchstart", fire, true);
  document.addEventListener("click", fire, true);
  document.addEventListener("keydown", fire, true);
}

installFirstGestureUnlock();

// Private — adds one shaped sine/triangle/sawtooth note to the mix.
// Args: frequency (Hz), duration (ms), waveform, peak gain, start delay (ms),
// optional master gain node (lets multiple notes share an envelope).
function note(freq, durationMs, type, gainPeak, startDelayMs, master) {
  if (isOn() === false) return;
  const ac = ctx();
  if (!ac) return;
  if (ac.state === "suspended" && typeof ac.resume === "function") {
    try { ac.resume(); } catch (e) {}
  }
  const start = ac.currentTime + (startDelayMs || 0) / 1000;
  const end = start + durationMs / 1000;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type || "sine";
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(gainPeak || 0.18, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  osc.connect(gain);
  gain.connect(master || ac.destination);
  osc.start(start);
  osc.stop(end + 0.05);
}

// Brief filtered noise burst — for "tap" and "wrong" textures.
function noise(durationMs, gainPeak, startDelayMs, filterFreq) {
  if (isOn() === false) return;
  const ac = ctx();
  if (!ac) return;
  const start = ac.currentTime + (startDelayMs || 0) / 1000;
  const end = start + durationMs / 1000;
  const buf = ac.createBuffer(1, Math.max(1, Math.floor(ac.sampleRate * (durationMs / 1000))), ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const filter = ac.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = filterFreq || 2200;
  filter.Q.value = 1.2;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(gainPeak || 0.06, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  src.connect(filter); filter.connect(gain); gain.connect(ac.destination);
  src.start(start);
  src.stop(end + 0.02);
}

// ---------- Public sounds ----------------------------------------------------

// Correct answer — 4 patterns rotated randomly so it never feels stale.
// Each is a quick 2-3 note motif under 250ms. Mid-volume, sine waves.
const CORRECT_PATTERNS = [
  // Major third up (C5, E5)
  function () { note(523.25, 80, "sine", 0.16, 0); note(659.25, 110, "sine", 0.16, 80); },
  // Perfect fourth up (G4, C5)
  function () { note(392.00, 80, "sine", 0.16, 0); note(523.25, 110, "sine", 0.16, 80); },
  // Major triad (C5, E5, G5)
  function () { note(523.25, 70, "sine", 0.14, 0); note(659.25, 70, "sine", 0.14, 70); note(783.99, 110, "sine", 0.16, 140); },
  // Soft bell (D5 + A5 layered)
  function () { note(587.33, 140, "sine", 0.14, 0); note(880.00, 140, "sine", 0.10, 20); }
];
export function playCorrect() {
  if (!isOn()) return;
  const pick = CORRECT_PATTERNS[Math.floor(Math.random() * CORRECT_PATTERNS.length)];
  pick();
}

// Wrong — descending dull tone + a tiny noise puff for "thud" feel.
export function playWrong() {
  if (!isOn()) return;
  note(440.00, 100, "triangle", 0.14, 0);
  note(293.66, 220, "triangle", 0.12, 100);
  noise(60, 0.05, 0, 320);
}

// Daily-goal level-up fanfare. Used when the kid first crosses 30 XP today.
export function playLevelUp() {
  if (!isOn()) return;
  // Triadic ascent
  note(523.25, 70, "sine", 0.16, 0);
  note(659.25, 70, "sine", 0.16, 70);
  note(783.99, 70, "sine", 0.16, 140);
  // Held high C with a fifth on top — held a touch longer for impact
  note(1046.50, 280, "sine", 0.18, 210);
  note(1567.98, 280, "sine", 0.10, 210);
  // A subtle high-frequency sparkle layered over the tail
  note(2093.00, 120, "sine", 0.06, 350);
  note(2637.00, 120, "sine", 0.05, 420);
}

// 3-in-a-row — short rising arpeggio, light.
export function playStreak3() {
  if (!isOn()) return;
  note(523.25, 60, "sine", 0.14, 0);
  note(659.25, 60, "sine", 0.14, 60);
  note(783.99, 90, "sine", 0.16, 120);
}

// 5-in-a-row — wider arpeggio with held final note.
export function playStreak5() {
  if (!isOn()) return;
  note(523.25, 50, "sine", 0.14, 0);
  note(659.25, 50, "sine", 0.14, 50);
  note(783.99, 50, "sine", 0.14, 100);
  note(1046.50, 50, "sine", 0.16, 150);
  note(1318.51, 220, "sine", 0.18, 200);
  // Soft cymbal-y crash via a brief noise wash at the peak
  noise(120, 0.04, 200, 4200);
}

// Perfect round (every question correct) — full fanfare.
export function playPerfect() {
  if (!isOn()) return;
  // Opening triad
  note(523.25, 90, "sine", 0.16, 0);
  note(659.25, 90, "sine", 0.16, 0);
  note(783.99, 90, "sine", 0.16, 0);
  // Quick arpeggio up
  note(1046.50, 70, "sine", 0.16, 130);
  note(1318.51, 70, "sine", 0.16, 200);
  note(1567.98, 70, "sine", 0.16, 270);
  // Final ringing high C with subtle shimmer
  note(2093.00, 360, "sine", 0.18, 350);
  note(2637.00, 360, "sine", 0.10, 350);
  noise(180, 0.05, 360, 5600);
}

// Subtle tap — for option button presses. Very short, low-level.
export function playTap() {
  if (!isOn()) return;
  note(880.00, 28, "sine", 0.07, 0);
  noise(20, 0.02, 0, 3200);
}

// ---------- Signature stingers ---------------------------------------------
//
// These are reserved for moments that should feel like *the app talking
// back* — name accepted, mode entered, coach opened. Each one is unique
// to its moment so the kid learns the audio language of the app.

// Welcome stinger — plays the moment the kid commits their name on the
// welcome screen. Ascending arpeggio + held high chord + sparkle: the
// "AimHigh" signature.
export function playWelcomeStinger() {
  if (!isOn()) return;
  // Rising arpeggio
  note(523.25,  60, "sine",     0.14,   0);  // C5
  note(659.25,  60, "sine",     0.14,  60);  // E5
  note(783.99,  70, "sine",     0.16, 120);  // G5
  note(1046.50, 90, "sine",     0.18, 200);  // C6
  // Held high chord — root + fifth
  note(1318.51, 360, "sine",    0.16, 300);  // E6
  note(1567.98, 360, "sine",    0.10, 300);  // G6
  // Sparkle layer
  note(2093.00, 140, "sine",    0.07, 360);  // C7
  note(2637.00, 140, "sine",    0.05, 440);  // E7
  // Brief lift wash
  noise(60, 0.04, 320, 1800);
}

// WARM-UP entrance — light, friendly two-note "ready" chirp.
export function playModeStartWarmup() {
  if (!isOn()) return;
  noise(20, 0.03, 0, 3500);
  note(783.99,  60, "sine", 0.14,  20);  // G5
  note(1046.50, 90, "sine", 0.16,  80);  // C6
}

// SPRINT entrance — sharp single "go" beat with bright top.
export function playModeStartSprint() {
  if (!isOn()) return;
  noise(15, 0.05, 0, 5000);
  note(1174.66, 130, "sine",     0.18, 0);   // D6
  note(1760.00, 80,  "triangle", 0.06, 30);  // A6 shimmer
}

// FULL MOCK entrance — three-note dramatic build for the 30-min commitment.
export function playModeStartMock() {
  if (!isOn()) return;
  // Low foundation
  note(196.00, 160, "triangle", 0.16,   0);  // G3
  // Mid climb
  note(261.63, 120, "triangle", 0.14, 130);  // C4
  // Held peak with octave shimmer
  note(783.99, 100, "sine",     0.14, 250);  // G5
  note(1046.50, 360, "sine",    0.18, 350);  // C6
  note(2093.00, 360, "sine",    0.08, 350);  // C7 shimmer
  noise(120, 0.04, 350, 4200);
}

// COACH entrance — calm two-note bell, like opening a notebook.
export function playCoachEnter() {
  if (!isOn()) return;
  note(880.00, 240, "sine", 0.13,   0);  // A5
  note(1318.51, 240, "sine", 0.10,  30); // E6
  note(1318.51, 140, "sine", 0.05, 200); // E6 light tail
}
