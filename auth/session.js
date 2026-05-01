// GradeBlaze — current session (who's signed in right now).
//
// Three roles: child / parent / demo. Stored as a tiny JSON blob in
// localStorage; cleared on sign-out. Demo sessions need no profile
// (used for "preview without saving").
//
// This module owns the session key and the read/write/clear surface.
// Profile data (names, PIN hashes) lives in auth/profile.js.

import {
  readJson as storageReadJson,
  writeJson as storageWriteJson,
  remove as storageRemove
} from "../platform/storage.js?v=20260531";

const KEY_SESSION = "aimhigh-mock-session";

export function readSession() { return storageReadJson(KEY_SESSION, null); }

export function writeSession(role) {
  storageWriteJson(KEY_SESSION, { role: role, signedInAt: Date.now() });
}

export function clearSession() { storageRemove(KEY_SESSION); }

export function signedInRole() {
  const s = readSession();
  return s ? s.role : null;
}

export function isChildRole()  { return signedInRole() === "child"; }
export function isParentRole() { return signedInRole() === "parent"; }
export function isDemoRole()   { return signedInRole() === "demo"; }

// Start a demo (preview) session — no PIN, no profile required, all
// engagement writes silently no-op (engagement/policy.js consults the
// session role directly via storage).
export function startDemoSession() { writeSession("demo"); }

export function signOut() { clearSession(); }
