// GradeBlaze — media compatibility shim.
//
// The audio code that used to live here has been split into three
// independent leaf modules:
//
//   media/sounds.js   — synthesised audio (correct/wrong/streak/perfect/
//                       stingers/etc) + the sound on/off flag + the
//                       single AudioContext for the page
//   media/speech.js   — French TTS (speakFrench, makeListenButton),
//                       lenient match (frenchSpellMatches,
//                       frenchSpeechMatches), STT (recordFrench)
//   media/haptics.js  — vibration patterns (hapticCorrect/Wrong/Streak/
//                       Perfect)
//
// This file is a re-export shim so the six existing consumers (mock,
// welcome, warmup, sprint, paper, dashboard) keep working without an
// import-path migration. Future PRs should migrate consumers to import
// directly from media/<area>.js; once the last consumer moves over,
// this file can be deleted.

export {
  setSoundOn,
  toggleSound,
  readSoundOn,
  playCorrect,
  playWrong,
  playLevelUp,
  playStreak3,
  playStreak5,
  playPerfect,
  playTap,
  playWelcomeStinger,
  playModeStartWarmup,
  playModeStartSprint,
  playModeStartMock,
  playCoachEnter
} from "./media/sounds.js?v=20260524";

export {
  speechAvailable,
  speakFrench,
  makeListenButton,
  normaliseFrenchAnswer,
  frenchSpellMatches,
  speechRecognitionAvailable,
  recordFrench,
  frenchSpeechMatches
} from "./media/speech.js?v=20260524";

export {
  hapticCorrect,
  hapticWrong,
  hapticStreak,
  hapticPerfect
} from "./media/haptics.js?v=20260524";
