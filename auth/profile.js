// GradeBlaze — child + coach profiles, login, recovery.
//
// Two profile records:
//   profile-child  = { name, pinHash, createdAt }
//   profile-coach  = { pinHash, createdAt }
//
// "Coach" was previously called "parent". The rename (v20260609) was
// driven by the role-terminology decision to move away from surveillance-
// coded language and to widen the buyer TAM (any supportive adult, not
// just biological parent). On first read we silently migrate
// `aimhigh-mock-profile-parent` to `aimhigh-mock-profile-coach` so
// existing kids keep their access without re-setup.
//
// PINs are 4 digits, hashed with SHA-256 via auth/pin.js before
// being persisted. Recovery: the Coach can reset the child's PIN by
// entering their own Coach PIN. If the Coach PIN itself is lost
// there is no recovery without wiping localStorage (no backend, no
// email).

import {
  readJson as storageReadJson,
  writeJson as storageWriteJson,
  remove as storageRemove
} from "../platform/storage.js?v=20260613";

import { hashPin } from "./pin.js?v=20260613";
import { writeSession, clearSession } from "./session.js?v=20260613";

const PREFIX = "aimhigh-mock-";
const KEY_CHILD       = PREFIX + "profile-child";
const KEY_COACH       = PREFIX + "profile-coach";
const KEY_LEGACY_COACH = PREFIX + "profile-parent"; // pre-rename key
const KEY_LEGACY      = PREFIX + "profile";         // pre-multi-role key

// One-shot migration. Runs at module load. Idempotent — if the new key
// already exists it leaves the old one alone (in case of rollback).
(function migrateLegacyCoachProfile() {
  try {
    const newP = storageReadJson(KEY_COACH, null);
    if (newP) return;
    const oldP = storageReadJson(KEY_LEGACY_COACH, null);
    if (oldP) storageWriteJson(KEY_COACH, oldP);
  } catch (e) { /* storage off — fine, app still boots */ }
})();

// --- Child profile ---------------------------------------------------------

export function readChildProfile() { return storageReadJson(KEY_CHILD, null); }
export function writeChildProfile(p) { storageWriteJson(KEY_CHILD, p); }
export function clearChildProfile() { storageRemove(KEY_CHILD); }

// --- Coach profile ---------------------------------------------------------

export function readCoachProfile() { return storageReadJson(KEY_COACH, null); }
export function writeCoachProfile(p) { storageWriteJson(KEY_COACH, p); }
export function clearCoachProfile() {
  storageRemove(KEY_COACH);
  storageRemove(KEY_LEGACY_COACH);
}

// --- Status helpers --------------------------------------------------------

export function isFullySetUp() {
  return !!(readChildProfile() && readCoachProfile());
}

// Pre-fill name when migrating from the legacy single-profile key.
export function migratedChildName() {
  const legacy = storageReadJson(KEY_LEGACY, null);
  return (legacy && legacy.name) ? legacy.name : "";
}

export function clearLegacyProfile() { storageRemove(KEY_LEGACY); }

// --- Setup -----------------------------------------------------------------

export async function setupCoachProfile(pin) {
  const pinHash = await hashPin(pin);
  writeCoachProfile({ pinHash: pinHash, createdAt: Date.now() });
}

export async function setupChildProfile(name, pin) {
  const pinHash = await hashPin(pin);
  const cleanName = String(name || "").trim().slice(0, 30);
  writeChildProfile({ name: cleanName, pinHash: pinHash, createdAt: Date.now() });
}

// --- Login -----------------------------------------------------------------

export async function tryLoginChild(pin) {
  const c = readChildProfile();
  if (!c || !c.pinHash) return false;
  const h = await hashPin(pin);
  if (h === c.pinHash) {
    writeSession("child");
    return true;
  }
  return false;
}

export async function tryLoginCoach(pin) {
  const p = readCoachProfile();
  if (!p || !p.pinHash) return false;
  const h = await hashPin(pin);
  if (h === p.pinHash) {
    writeSession("coach");
    return true;
  }
  return false;
}

// --- Reset (Coach overrides child) ----------------------------------------

export async function resetChildPinViaCoach(coachPin, newPin) {
  const p = readCoachProfile();
  if (!p) return false;
  const h = await hashPin(coachPin);
  if (h !== p.pinHash) return false;
  const newHash = await hashPin(newPin);
  const c = readChildProfile() || {};
  c.pinHash = newHash;
  writeChildProfile(c);
  return true;
}

// --- Wipe ------------------------------------------------------------------

// Nuclear option — wipes both profiles and the session. Engagement data
// (streak, XP, results, seen, misses) is intentionally NOT wiped here so
// a Coach who restores the device by setting up new PINs keeps the kid's
// training history.
export function wipeProfiles() {
  clearChildProfile();
  clearCoachProfile();
  clearSession();
  clearLegacyProfile();
}

// --- Display helpers -------------------------------------------------------

// `profileName()` returns the child name (Coaches read the kid's stats).
export function profileName() {
  const c = readChildProfile();
  return c ? c.name : "";
}

export function signedInName(roleHint) {
  if (roleHint === "child") {
    const c = readChildProfile();
    return c ? c.name : null;
  }
  // Accept both new "coach" and legacy "parent" during the transitional
  // window; either returns the new label.
  if (roleHint === "coach" || roleHint === "parent") return "Coach";
  if (roleHint === "demo") return "Demo";
  return null;
}
