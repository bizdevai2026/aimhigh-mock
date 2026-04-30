// GradeBlaze — child + parent profiles, login, recovery.
//
// Two profile records:
//   profile-child  = { name, pinHash, createdAt }
//   profile-parent = { pinHash, createdAt }
//
// PINs are 4 digits, hashed with SHA-256 via auth/pin.js before
// being persisted. Recovery: parent can reset the child's PIN by
// entering their own parent PIN. If the parent PIN itself is lost
// there is no recovery without wiping localStorage (no backend, no
// email).
//
// Migration: a pre-existing "aimhigh-mock-profile" key from the
// single-profile version of the app is detected on first read; its
// `name` becomes the default for the new child profile.

import {
  readJson as storageReadJson,
  writeJson as storageWriteJson,
  remove as storageRemove
} from "../platform/storage.js?v=20260525";

import { hashPin } from "./pin.js?v=20260525";
import { writeSession, clearSession } from "./session.js?v=20260525";

const PREFIX = "aimhigh-mock-";
const KEY_CHILD   = PREFIX + "profile-child";
const KEY_PARENT  = PREFIX + "profile-parent";
const KEY_LEGACY  = PREFIX + "profile";

// --- Child profile ---------------------------------------------------------

export function readChildProfile() { return storageReadJson(KEY_CHILD, null); }
export function writeChildProfile(p) { storageWriteJson(KEY_CHILD, p); }
export function clearChildProfile() { storageRemove(KEY_CHILD); }

// --- Parent profile --------------------------------------------------------

export function readParentProfile() { return storageReadJson(KEY_PARENT, null); }
export function writeParentProfile(p) { storageWriteJson(KEY_PARENT, p); }
export function clearParentProfile() { storageRemove(KEY_PARENT); }

// --- Status helpers --------------------------------------------------------

export function isFullySetUp() {
  return !!(readChildProfile() && readParentProfile());
}

// Pre-fill name when migrating from the legacy single-profile key.
export function migratedChildName() {
  const legacy = storageReadJson(KEY_LEGACY, null);
  return (legacy && legacy.name) ? legacy.name : "";
}

export function clearLegacyProfile() { storageRemove(KEY_LEGACY); }

// --- Setup -----------------------------------------------------------------

export async function setupParentProfile(pin) {
  const pinHash = await hashPin(pin);
  writeParentProfile({ pinHash: pinHash, createdAt: Date.now() });
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

export async function tryLoginParent(pin) {
  const p = readParentProfile();
  if (!p || !p.pinHash) return false;
  const h = await hashPin(pin);
  if (h === p.pinHash) {
    writeSession("parent");
    return true;
  }
  return false;
}

// --- Reset (parent overrides child) ----------------------------------------

export async function resetChildPinViaParent(parentPin, newPin) {
  const p = readParentProfile();
  if (!p) return false;
  const h = await hashPin(parentPin);
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
// a parent who restores the device by setting up new PINs keeps the kid's
// training history.
export function wipeProfiles() {
  clearChildProfile();
  clearParentProfile();
  clearSession();
  clearLegacyProfile();
}

// --- Display helpers -------------------------------------------------------

// `profileName()` returns the child name (parents read the kid's stats).
export function profileName() {
  const c = readChildProfile();
  return c ? c.name : "";
}

export function signedInName(roleHint) {
  if (roleHint === "child") {
    const c = readChildProfile();
    return c ? c.name : null;
  }
  if (roleHint === "parent") return "Parent";
  if (roleHint === "demo")   return "Demo";
  return null;
}
