// AimHigh Mock Prep — synthesised audio feedback.
//
// Uses Web Audio API to generate short tones (no audio files needed).
// Three sounds: correct (rising chord), wrong (dull descending tone),
// level-up (triadic ascending). Respects a mute toggle stored at
// "aimhigh-mock-muted" in localStorage. Off by default for parents
// who'd rather not hear it; the warm-up runner can flip it on once
// the boy starts using it regularly.
//
// Uses lazy AudioContext init (browsers require a user gesture).

// Sound is OFF by default (parents getting a quiet phone in the morning
// would not appreciate surprise beeps). The mute toggle in the header
// flips this on; the choice is remembered in localStorage.
const SOUND_KEY = "aimhigh-mock-sound";

let _ctx = null;

function isOn() {
  try { return localStorage.getItem(SOUND_KEY) === "on"; } catch (e) { return false; }
}

function isMuted() { return !isOn(); }

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

function tone(freq, durationMs, type, gainPeak, startDelayMs) {
  if (isMuted()) return;
  const ac = ctx();
  if (!ac) return;
  // Resume suspended contexts (mobile) — best-effort.
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
  gain.gain.exponentialRampToValueAtTime(gainPeak || 0.18, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(start);
  osc.stop(end + 0.05);
}

export function playCorrect() {
  // Rising perfect-fourth: C5 -> F5
  tone(523.25, 90, "sine", 0.18, 0);
  tone(698.46, 130, "sine", 0.18, 90);
}

export function playWrong() {
  // Dull descending fifth: A4 -> D4
  tone(440.00, 110, "triangle", 0.16, 0);
  tone(293.66, 200, "triangle", 0.14, 110);
}

export function playLevelUp() {
  // Triadic ascent: C5 -> E5 -> G5 -> C6
  tone(523.25, 70, "sine", 0.18, 0);
  tone(659.25, 70, "sine", 0.18, 70);
  tone(783.99, 70, "sine", 0.18, 140);
  tone(1046.50, 220, "sine", 0.20, 210);
}
