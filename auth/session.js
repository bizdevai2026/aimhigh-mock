// GradeBlaze — current session (who's signed in right now).
//
// Three roles: child / coach / demo. Stored as a tiny JSON blob in
// localStorage; cleared on sign-out. Demo sessions need no profile
// (used for "preview without saving").
//
// Coach was previously called "parent" — the rename happened at v20260609
// to distance the role from surveillance language. The session role value
// for any returning user with the legacy "parent" role is auto-migrated
// to "coach" on first read, and the role-check helpers accept either
// value during the transitional window so kids don't get logged out.
//
// This module owns the session key and the read/write/clear surface.
// Profile data (names, PIN hashes) lives in auth/profile.js.

import {
  readJson as storageReadJson,
  writeJson as storageWriteJson,
  remove as storageRemove
} from "../platform/storage.js?v=20260609";

const KEY_SESSION = "aimhigh-mock-session";

export function readSession() { return storageReadJson(KEY_SESSION, null); }

export function writeSession(role) {
  // Normalise on the way in: anything that looks like the legacy "parent"
  // role gets recorded as "coach" so we never persist the old value again.
  const normRole = role === "parent" ? "coach" : role;
  storageWriteJson(KEY_SESSION, { role: normRole, signedInAt: Date.now() });
}

export function clearSession() { storageRemove(KEY_SESSION); }

export function signedInRole() {
  const s = readSession();
  if (!s) return null;
  // Migrate-on-read: any persisted "parent" → "coach". Returns the
  // normalised value so callers see one role consistently.
  if (s.role === "parent") {
    writeSession("coach");
    return "coach";
  }
  return s.role;
}

export function isChildRole() { return signedInRole() === "child"; }

// Coach role check. Accepts the legacy "parent" value too as a belt-and-
// braces guard against any callsite reading the session before migration
// fires. Imported widely.
export function isCoachRole() {
  const r = signedInRole();
  return r === "coach" || r === "parent";
}

export function isDemoRole() { return signedInRole() === "demo"; }

// Start a demo (preview) session — no PIN, no profile required, all
// engagement writes silently no-op (engagement/policy.js consults the
// session role directly via storage).
export function startDemoSession() { writeSession("demo"); }

export function signOut() { clearSession(); }
