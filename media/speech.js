// GradeBlaze — French speech (TTS + STT) and lenient answer matching.
//
// Listening + speaking is a KS3 modern foreign language requirement.
// We use the browser's built-in SpeechSynthesis (Web Speech API) for
// French TTS — high quality on iOS Safari (Audrey/Thomas) and Chrome
// Android (Google TTS). Falls back silently if unavailable.
//
// SpeechRecognition (the input side of Web Speech API) is unevenly
// supported: Chrome / Chrome Android / Edge yes, Firefox no, Safari iOS
// only on recent versions and only patchily. We feature-detect at every
// call site and fall back to typing when unavailable.
//
// Listening is independent of the in-app sound toggle: a parent who
// muted the engagement chimes still wants the kid to hear French
// pronunciation. Listen is gated only by SpeechSynthesis availability.
//
// This module does NOT touch AudioContext — SpeechSynthesis has its own
// pipeline. Keeping the boundary clean (one AudioContext lives in
// media/sounds.js, never instantiated here) avoids the double-arming
// gesture-unlock bug.

let _frenchVoice = null;

export function speechAvailable() {
  return typeof window !== "undefined" &&
         typeof window.speechSynthesis !== "undefined" &&
         typeof window.SpeechSynthesisUtterance !== "undefined";
}

function pickFrenchVoice() {
  if (!speechAvailable()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || !voices.length) return null;
  let v = voices.find(function (x) { return x.lang === "fr-FR"; });
  if (v) return v;
  v = voices.find(function (x) { return x.lang && x.lang.indexOf("fr") === 0; });
  return v || null;
}

if (speechAvailable() && "onvoiceschanged" in window.speechSynthesis) {
  // Voices populate asynchronously on Chrome — refresh when ready.
  window.speechSynthesis.addEventListener("voiceschanged", function () {
    _frenchVoice = pickFrenchVoice();
  });
}

// Optional second arg `rate`: 0.85 default (slightly slower than spoken
// French — gives a clearer first listen). 0.6–0.7 for the "Slow" button
// used on the question cards. Anything below 0.5 distorts the voice.
export function speakFrench(text, rate) {
  if (!speechAvailable() || !text) return;
  try { window.speechSynthesis.cancel(); } catch (e) {}
  const utt = new window.SpeechSynthesisUtterance(String(text));
  utt.lang = "fr-FR";
  utt.rate = (typeof rate === "number" && rate > 0) ? rate : 0.85;
  if (!_frenchVoice) _frenchVoice = pickFrenchVoice();
  if (_frenchVoice) utt.voice = _frenchVoice;
  window.speechSynthesis.speak(utt);
}

// Builds a Listen control: two pill buttons side-by-side — normal speed
// + slow speed — so the kid can hear difficult phrases at half pace.
// Returns a flex container; appending it to the question card works the
// same as the previous single-button version.
export function makeListenButton(audioText) {
  if (!audioText || !speechAvailable()) return null;
  const wrap = document.createElement("div");
  wrap.className = "mock-listen-controls";

  const fast = document.createElement("button");
  fast.type = "button";
  fast.className = "mock-listen-btn";
  fast.setAttribute("aria-label", "Listen — French pronunciation");
  fast.innerHTML = "<span class=\"mock-listen-icon\" aria-hidden=\"true\">&#128266;</span><span>Listen</span>";
  fast.addEventListener("click", function (e) {
    e.preventDefault();
    speakFrench(audioText);
  });

  const slow = document.createElement("button");
  slow.type = "button";
  slow.className = "mock-listen-btn mock-listen-btn-slow";
  slow.setAttribute("aria-label", "Listen slowly");
  slow.innerHTML = "<span class=\"mock-listen-icon\" aria-hidden=\"true\">&#128012;</span><span>Slow</span>";
  slow.addEventListener("click", function (e) {
    e.preventDefault();
    speakFrench(audioText, 0.65);
  });

  wrap.appendChild(fast);
  wrap.appendChild(slow);
  return wrap;
}

// Lenient French answer comparison — case-insensitive, accent-tolerant,
// whitespace-collapsed, apostrophe-normalised. So "j'ai treize ans"
// matches "J'ai treize ans" and "Jai treize ans" alike.
export function normaliseFrenchAnswer(s) {
  return String(s == null ? "" : s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[‘’`']/g, "'")
    .replace(/[.,!?]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function frenchSpellMatches(input, question) {
  const t = normaliseFrenchAnswer(input);
  if (!t) return false;
  const targets = [question.answer].concat(question.alternates || []);
  return targets.some(function (a) { return normaliseFrenchAnswer(a) === t; });
}

export function speechRecognitionAvailable() {
  return typeof window !== "undefined" &&
    (typeof window.SpeechRecognition !== "undefined" ||
     typeof window.webkitSpeechRecognition !== "undefined");
}

// One-shot French speech recognition. Caller passes callbacks for each
// stage. Returns a handle with abort() for early cancellation.
//
// callbacks: { onStart, onResult(alternatives[]), onError(err), onEnd }
//
// onResult fires with up to 3 transcript candidates ordered by
// confidence; comparison uses frenchSpeechMatches so any candidate
// that normalises to the target is accepted (helps with French homophones).
export function recordFrench(callbacks) {
  callbacks = callbacks || {};
  if (!speechRecognitionAvailable()) {
    if (callbacks.onError) callbacks.onError(new Error("not-supported"));
    return null;
  }
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
  const rec = new Ctor();
  rec.lang = "fr-FR";
  rec.interimResults = false;
  rec.maxAlternatives = 3;
  rec.continuous = false;

  let aborted = false;
  let gotResult = false;

  rec.addEventListener("start", function () {
    if (callbacks.onStart) callbacks.onStart();
  });
  rec.addEventListener("result", function (e) {
    gotResult = true;
    const list = [];
    const res = e.results[0];
    if (res) {
      for (let i = 0; i < res.length; i++) list.push(res[i].transcript);
    }
    if (callbacks.onResult) callbacks.onResult(list);
  });
  rec.addEventListener("error", function (e) {
    if (aborted) return;
    if (callbacks.onError) callbacks.onError(new Error(e.error || "unknown"));
  });
  rec.addEventListener("end", function () {
    if (callbacks.onEnd) callbacks.onEnd();
    if (!gotResult && !aborted) {
      if (callbacks.onError) callbacks.onError(new Error("no-speech"));
    }
  });

  try { rec.start(); }
  catch (e) { if (callbacks.onError) callbacks.onError(e); }

  return {
    abort: function () { aborted = true; try { rec.abort(); } catch (e) {} }
  };
}

// Lenient speech-recognition match. Browser STT is brittle — kids slur,
// recogniser misses small words, French has a lot of liaison. We accept:
//   1. exact normalised match (best signal)
//   2. target appears as a substring of the heard text (kid said extra)
//   3. heard appears as a substring of target ≥60% of target length
//      (kid said the core, recogniser dropped a particle)
//   4. ≥70% of target tokens present in the heard tokens (any order)
//
// This trades strictness for encouragement — the goal of a Year 7 KS3
// MFL practice tool is to build confidence, not pass-fail assessment.
//
// Returns { matched, heard } so the runner can show "we heard: …" feedback.
export function frenchSpeechMatches(candidates, question) {
  const targets = [question.answer].concat(question.alternates || [])
    .map(normaliseFrenchAnswer)
    .filter(function (t) { return t && t.length > 0; });
  const bestHeard = (candidates && candidates[0]) || "";
  for (let i = 0; i < (candidates || []).length; i++) {
    const heard = candidates[i];
    const norm = normaliseFrenchAnswer(heard);
    if (!norm) continue;
    for (let j = 0; j < targets.length; j++) {
      const t = targets[j];
      // (1) exact
      if (norm === t) return { matched: true, heard: heard };
      // (2) target inside heard
      if (norm.indexOf(t) !== -1) return { matched: true, heard: heard };
      // (3) heard inside target, but only if heard is substantial
      if (t.indexOf(norm) !== -1 && norm.length >= Math.max(3, Math.floor(t.length * 0.6))) {
        return { matched: true, heard: heard };
      }
      // (4) token overlap ≥70%
      const tTokens = t.split(/\s+/).filter(Boolean);
      const hTokens = norm.split(/\s+/).filter(Boolean);
      if (tTokens.length === 0) continue;
      let present = 0;
      for (let k = 0; k < tTokens.length; k++) {
        if (hTokens.indexOf(tTokens[k]) !== -1) present += 1;
      }
      if (present / tTokens.length >= 0.7) return { matched: true, heard: heard };
    }
  }
  return { matched: false, heard: bestHeard };
}
