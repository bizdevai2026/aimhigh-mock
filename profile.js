// GradeBlaze — profiles, PIN auth, and current session.
//
// Single-device, two-role model:
//   - "child"  — drives the engagement loop (writes streak / XP / results)
//   - "parent" — read-only Coach view; never writes engagement state
//
// Both roles set their own 4-digit PIN at first launch. PINs are stored
// only as SHA-256 hashes via SubtleCrypto (built into the browser).
// This is privacy, not security: a determined attacker can read the
// page source and bypass any client-side gate. The point is to keep
// random passers-by, classmates, or anyone who finds the URL out of
// the kid's progress data.
//
// Recovery: parent can reset the child's PIN by entering their own
// parent PIN. If the parent PIN itself is lost there is no recovery
// without wiping localStorage (no backend, no email).
//
// Storage keys (all under the "aimhigh-mock-" namespace):
//   profile-child  = { name, pinHash, createdAt }
//   profile-parent = { pinHash, createdAt }
//   session        = { role: "child" | "parent", signedInAt }
//
// A pre-existing "aimhigh-mock-profile" key from the single-profile
// version of the app is migrated on first read — its name becomes the
// default for the new child profile, and the legacy key is removed
// once setup completes.

import {
  readJson as storageReadJson,
  writeJson as storageWriteJson,
  remove as storageRemove
} from "./platform/storage.js?v=20260516";

const PREFIX = "aimhigh-mock-";
const KEY_CHILD       = PREFIX + "profile-child";
const KEY_PARENT      = PREFIX + "profile-parent";
const KEY_SESSION     = PREFIX + "session";
const KEY_LEGACY      = PREFIX + "profile";

// --- Hashing ---------------------------------------------------------------

export async function hashPin(pin) {
  const buf = new TextEncoder().encode(String(pin));
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map(function (b) { return b.toString(16).padStart(2, "0"); })
    .join("");
}

// --- Storage primitives ----------------------------------------------------
// Thin re-exports of platform/storage so the rest of this file reads
// naturally. These delegate; no direct localStorage access here.

const readJson  = storageReadJson;
const writeJson = storageWriteJson;
const removeKey = storageRemove;

// --- Child profile ---------------------------------------------------------

export function readChildProfile() { return readJson(KEY_CHILD); }
export function writeChildProfile(p) { writeJson(KEY_CHILD, p); }
export function clearChildProfile() { removeKey(KEY_CHILD); }

// --- Parent profile --------------------------------------------------------

export function readParentProfile() { return readJson(KEY_PARENT); }
export function writeParentProfile(p) { writeJson(KEY_PARENT, p); }
export function clearParentProfile() { removeKey(KEY_PARENT); }

// --- Session ---------------------------------------------------------------

export function readSession() { return readJson(KEY_SESSION); }

export function writeSession(role) {
  writeJson(KEY_SESSION, { role: role, signedInAt: Date.now() });
}

export function clearSession() { removeKey(KEY_SESSION); }

export function signedInRole() {
  const s = readSession();
  return s ? s.role : null;
}

export function isChildRole()  { return signedInRole() === "child"; }
export function isParentRole() { return signedInRole() === "parent"; }
export function isDemoRole()   { return signedInRole() === "demo"; }

// Start a demo (preview) session — no PIN, no profile required, all
// engagement writes silently no-op. Used to show the app to someone
// without polluting the trainee's saved progress.
export function startDemoSession() { writeSession("demo"); }

export function signedInName() {
  const role = signedInRole();
  if (role === "child") {
    const c = readChildProfile();
    return c ? c.name : null;
  }
  if (role === "parent") return "Parent";
  if (role === "demo")   return "Demo";
  return null;
}

// --- Status helpers --------------------------------------------------------

export function isFullySetUp() {
  return !!(readChildProfile() && readParentProfile());
}

// Pre-fill name when migrating from the legacy single-profile key.
export function migratedChildName() {
  const legacy = readJson(KEY_LEGACY);
  return (legacy && legacy.name) ? legacy.name : "";
}

export function clearLegacyProfile() { removeKey(KEY_LEGACY); }

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

// --- Sign-out / wipe -------------------------------------------------------

export function signOut() { clearSession(); }

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

// --- Page gates ------------------------------------------------------------

// Public name + helper kept for back-compat with the single-profile API.
// `profileName()` returns the child name (parents read the kid's stats).
export function profileName() {
  const c = readChildProfile();
  return c ? c.name : "";
}

// Replaces the old requireProfileOrRedirect — sends to welcome.html if
// nobody is signed in. Demo sessions count as signed-in (no profiles
// needed). Setup is required only when the user picks a real role —
// the welcome screen handles that gate itself.
export function requireSignInOrRedirect() {
  if (signedInRole()) return true; // any role (child / parent / demo) is fine
  if (!isFullySetUp()) {
    if (!/welcome\.html(\?|$)/.test(location.pathname)) {
      location.replace("welcome.html");
    }
    return false;
  }
  if (!/welcome\.html(\?|$)/.test(location.pathname)) {
    location.replace("welcome.html");
  }
  return false;
}

// Backward-compat shim — older code calls requireProfileOrRedirect.
export function requireProfileOrRedirect() { return requireSignInOrRedirect(); }

// Backward-compat shim — older code called clearProfile from the avatar.
export function clearProfile() { signOut(); }
