// GradeBlaze — synthesised audio feedback.
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
//
// This module owns the SINGLE AudioContext for the page. media/speech.js
// uses the browser's SpeechSynthesis API instead — separate pipeline,
// no second AudioContext. That separation is deliberate (see the
// architecture review in docs/reviews/2026-04-30-architecture.md).

import { readString as storageReadString, writeString as storageWriteString } from "../platform/storage.js?v=20260531";

const SOUND_KEY = "aimhigh-mock-sound";

let _ctx = null;

function isOn() {
  // Default ON: the only "off" state is an explicit "off" string. Anything
  // else (null/missing/storage-disabled) returns true.
  return storageReadString(SOUND_KEY) !== "off";
}

export function setSoundOn(on) {
  storageWriteString(SOUND_KEY, on ? "on" : "off");
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

// Synthesised reverb. Runs once per AudioContext lifetime — every note
// sends a portion of its signal here so the whole audio palette gets a
// musical tail rather than the dry "PacMan" feel. Impulse response is
// generated from white noise with an exponential decay so we don't need
// to ship any sample files. Wet level kept conservative (~0.22) so the
// reverb shapes the sounds without smearing them.
let _reverbInput = null;
function getReverbInput(ac) {
  if (_reverbInput) return _reverbInput;
  const sr = ac.sampleRate;
  const durSec = 0.7;
  const len = Math.floor(sr * durSec);
  const impulse = ac.createBuffer(2, len, sr);
  const decay = 2.6;
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      const t = i / len;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
    }
  }
  const conv = ac.createConvolver();
  conv.buffer = impulse;
  const wet = ac.createGain();
  wet.gain.value = 0.22;
  const input = ac.createGain();
  input.gain.value = 1;
  input.connect(conv);
  conv.connect(wet);
  wet.connect(ac.destination);
  _reverbInput = input;
  return _reverbInput;
}

// Sub-bass thump — kicks under the melodic content on rewards so they
// land with weight. Very short (~80ms), pitched low (~110 Hz), gentle
// downward pitch sweep for a "doof" rather than a sine beep. Not routed
// to reverb (we want it punchy, not smeared).
function sub(freq, durationMs, gainPeak, startDelayMs) {
  if (isOn() === false) return;
  const ac = ctx();
  if (!ac) return;
  const start = ac.currentTime + (startDelayMs || 0) / 1000;
  const end = start + durationMs / 1000;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, start);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq * 0.55), end);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(gainPeak || 0.18, start + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(start);
  osc.stop(end + 0.05);
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
  // Detune-doubled second voice for richer tone (4 cents up). Adds the
  // subtle "chorus" feel that separates modern app sounds from PacMan.
  if (!master) {
    const osc2 = ac.createOscillator();
    osc2.type = type || "sine";
    osc2.frequency.setValueAtTime(freq, start);
    osc2.detune.setValueAtTime(4, start);
    const g2 = ac.createGain();
    g2.gain.setValueAtTime(0.0001, start);
    g2.gain.exponentialRampToValueAtTime((gainPeak || 0.18) * 0.55, start + 0.012);
    g2.gain.exponentialRampToValueAtTime(0.0001, end);
    osc2.connect(g2);
    g2.connect(ac.destination);
    osc2.start(start);
    osc2.stop(end + 0.05);
    // Reverb send — only for the master-routed top-level voices, not
    // for the master-attached helper notes (which were already mixed).
    const verbIn = getReverbInput(ac);
    if (verbIn) gain.connect(verbIn);
  }
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
// Each motif is a quick 2-3 note rise plus an octave shimmer; a high
// sparkle tail fires after every correct so the reward feels lifted
// rather than polite. Targeting Duolingo-grade vibrancy.
const CORRECT_PATTERNS = [
  // Major third up + octave shimmer
  function () {
    note(523.25, 80,  "sine", 0.18,  0);   // C5
    note(659.25, 110, "sine", 0.18, 80);   // E5
    note(1318.51, 100, "sine", 0.10, 100); // E6 shimmer
  },
  // Perfect fourth up + octave shimmer
  function () {
    note(392.00, 80,  "sine", 0.18,  0);   // G4
    note(523.25, 130, "sine", 0.18, 80);   // C5
    note(1046.50, 100, "sine", 0.10, 100); // C6 shimmer
  },
  // Major triad held, with a high octave on the final note
  function () {
    note(523.25, 70,  "sine", 0.16,   0);  // C5
    note(659.25, 70,  "sine", 0.16,  70);  // E5
    note(783.99, 220, "sine", 0.20, 140);  // G5 (held)
    note(1567.98, 200, "sine", 0.10, 160); // G6 shimmer
  },
  // Soft bell stack — D5 + A5 + D6 layered
  function () {
    note(587.33, 180, "sine", 0.16,  0);   // D5
    note(880.00, 180, "sine", 0.12, 20);   // A5
    note(1174.66, 150, "sine", 0.08, 60);  // D6
  }
];
function playCorrectTail() {
  // Bright sparkle tail — fires after every motif. Gives the "win lift".
  note(2093.00, 110, "sine", 0.07, 100);  // C7
  note(2637.00, 110, "sine", 0.05, 150);  // E7
  noise(40, 0.03, 80, 5200);              // shimmer wash
}
export function playCorrect() {
  if (!isOn()) return;
  // Sub-bass thump — gives every correct a punchy bottom that lands.
  sub(110, 80, 0.16, 0);
  const pick = CORRECT_PATTERNS[Math.floor(Math.random() * CORRECT_PATTERNS.length)];
  pick();
  playCorrectTail();
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
  // Sub thump — anchors the moment with bottom-end weight
  sub(82, 140, 0.16, 0);
  // Triadic ascent
  note(523.25, 70, "sine", 0.16, 0);
  note(659.25, 70, "sine", 0.16, 70);
  note(783.99, 70, "sine", 0.16, 140);
  // Held high C with a fifth on top — held a touch longer for impact
  note(1046.50, 320, "sine", 0.18, 210);
  note(1567.98, 320, "sine", 0.10, 210);
  // A subtle high-frequency sparkle layered over the tail
  note(2093.00, 140, "sine", 0.07, 350);
  note(2637.00, 140, "sine", 0.05, 420);
  // A wide noise wash gives modern "lift"
  noise(220, 0.04, 200, 5200);
}

// 3-in-a-row — short rising arpeggio with held peak, sub thump + sparkle.
export function playStreak3() {
  if (!isOn()) return;
  sub(98, 100, 0.15, 0);                 // sub-bass thump
  note(523.25, 60,  "sine", 0.16,   0);  // C5
  note(659.25, 60,  "sine", 0.16,  60);  // E5
  note(783.99, 100, "sine", 0.18, 120);  // G5
  note(1046.50, 220, "sine", 0.20, 220); // C6 (held peak)
  note(2093.00, 130, "sine", 0.09, 290); // C7 sparkle
  noise(60, 0.04, 220, 4500);            // soft shimmer wash
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
  // Sub-bass — a real "boom" entry
  sub(73, 180, 0.18, 0);
  // Opening triad
  note(523.25, 90, "sine", 0.16, 0);
  note(659.25, 90, "sine", 0.16, 0);
  note(783.99, 90, "sine", 0.16, 0);
  // Quick arpeggio up
  note(1046.50, 70, "sine", 0.16, 130);
  note(1318.51, 70, "sine", 0.16, 200);
  note(1567.98, 70, "sine", 0.16, 270);
  // Final ringing high C with subtle shimmer
  note(2093.00, 400, "sine", 0.18, 350);
  note(2637.00, 400, "sine", 0.10, 350);
  // White-noise sweep tail
  noise(220, 0.06, 350, 6200);
  // Second sub a beat later for a heart-thump release
  sub(98, 200, 0.12, 380);
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
// welcome screen. Modernised with a sub-bass entrance, ascending
// arpeggio, held high chord + sparkle, and a wide noise lift.
export function playWelcomeStinger() {
  if (!isOn()) return;
  // Anchor sub at the start
  sub(82, 220, 0.18, 0);
  // Rising arpeggio
  note(523.25,  70, "sine",     0.14,   0);  // C5
  note(659.25,  70, "sine",     0.14,  60);  // E5
  note(783.99,  80, "sine",     0.16, 120);  // G5
  note(1046.50, 100, "sine",    0.18, 200);  // C6
  // Held high chord — root + fifth
  note(1318.51, 420, "sine",    0.16, 300);  // E6
  note(1567.98, 420, "sine",    0.10, 300);  // G6
  // Sparkle layer
  note(2093.00, 160, "sine",    0.07, 360);  // C7
  note(2637.00, 160, "sine",    0.05, 440);  // E7
  // Lift wash
  noise(80, 0.04, 320, 2200);
  // Soft second sub for warmth
  sub(110, 280, 0.10, 360);
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

// FULL MOCK entrance — dramatic build for the 30-min commitment.
export function playModeStartMock() {
  if (!isOn()) return;
  // Sub-bass at the bottom for cinematic weight
  sub(73, 280, 0.20, 0);
  // Low foundation
  note(196.00, 180, "triangle", 0.16,   0);  // G3
  // Mid climb
  note(261.63, 140, "triangle", 0.14, 130);  // C4
  // Held peak with octave shimmer
  note(783.99, 110, "sine",     0.14, 250);  // G5
  note(1046.50, 400, "sine",    0.18, 350);  // C6
  note(2093.00, 400, "sine",    0.08, 350);  // C7 shimmer
  noise(140, 0.05, 350, 4200);
}

// COACH entrance — calm two-note bell, like opening a notebook.
export function playCoachEnter() {
  if (!isOn()) return;
  note(880.00, 240, "sine", 0.13,   0);  // A5
  note(1318.51, 240, "sine", 0.10,  30); // E6
  note(1318.51, 140, "sine", 0.05, 200); // E6 light tail
}
