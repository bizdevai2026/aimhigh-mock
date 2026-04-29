// AimHigh Mock Prep — synthesised audio feedback.
//
// Uses Web Audio API to generate short tones (no audio files needed).
// More musical and varied than single beeps: layered chords, soft
// arpeggios, gentle noise bursts, and escalating streak celebrations
// (3-in-a-row, 5-in-a-row, perfect round).
//
// Sound is OFF by default. Parents getting a quiet phone in the
// morning would not appreciate surprise beeps. The mute toggle in
// the header flips this on; the choice persists at "aimhigh-mock-sound".

const SOUND_KEY = "aimhigh-mock-sound";

let _ctx = null;

function isOn() {
  try { return localStorage.getItem(SOUND_KEY) === "on"; } catch (e) { return false; }
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
