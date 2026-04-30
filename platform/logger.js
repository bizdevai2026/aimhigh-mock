// GradeBlaze — platform: in-memory event logger.
//
// A tiny ring-buffer logger that:
//   1. Holds the last N events in memory (LOG_CAPACITY).
//   2. Mirrors each event to console.debug so DevTools shows it in real time.
//   3. Is the single source of truth for the diagnostics panel
//      (see diagnostics/panel.js — opens with the ?diag=1 URL flag).
//
// Why a ring buffer rather than a flat console: most "what just broke?"
// questions are answered by the last 30–50 events around the failure.
// The ring discards older events as new ones arrive — bounded memory,
// no risk of growing unbounded on a long-lived page.
//
// Public API:
//   log.event(channel, message, data?) — typed event
//   log.error(channel, message, err?)  — error-tagged
//   log.info(channel, message, data?)
//   log.debug(channel, message, data?)
//   log.snapshot()                     — array of recent events
//   log.clear()
//
// "Channel" is a free-form string for grouping (e.g. "boot", "fetch",
// "storage", "audio"). Keep them short and consistent.

const LOG_CAPACITY = 100;
const _events = [];

function push(level, channel, message, data) {
  const entry = {
    t: Date.now(),
    level: level,        // "debug" | "info" | "error"
    channel: String(channel || "?"),
    message: String(message || ""),
    data: data
  };
  _events.push(entry);
  if (_events.length > LOG_CAPACITY) _events.shift();
  // Mirror to console.debug for live DevTools visibility. Errors also
  // go to console.error so they show in red.
  try {
    const tag = "[gb." + entry.channel + "]";
    if (level === "error") {
      if (data !== undefined) console.error(tag, message, data);
      else                     console.error(tag, message);
    } else {
      if (data !== undefined) console.debug(tag, message, data);
      else                     console.debug(tag, message);
    }
  } catch (e) { /* console missing */ }
}

export function event(channel, message, data) { push("info",  channel, message, data); }
export function info(channel, message, data)  { push("info",  channel, message, data); }
export function debug(channel, message, data) { push("debug", channel, message, data); }
export function error(channel, message, err) {
  // For Error objects, capture message + stack so the panel shows them.
  let payload = err;
  if (err && typeof err === "object" && err.message) {
    payload = { message: err.message, stack: err.stack };
  }
  push("error", channel, message, payload);
}

export function snapshot() {
  return _events.slice();
}

export function clear() {
  _events.length = 0;
}
