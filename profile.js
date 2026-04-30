// GradeBlaze — auth compatibility shim.
//
// The auth code that used to live here has been split into four
// single-responsibility modules under auth/:
//
//   pin.js     — SHA-256 PIN hashing (the only place crypto.subtle
//                is referenced)
//   session.js — current session role (child / parent / demo) +
//                session storage key
//   profile.js — child + parent profile records + setup, login,
//                recovery, wipe
//   gate.js    — page-level requireSignInOrRedirect
//
// This file is a re-export shim so the existing consumers (mock.js,
// welcome.js, dashboard.js, sprint.js, warmup.js, paper.js, learn.js)
// keep working without an import-path migration. Future PRs should
// migrate consumers to import directly from auth/<area>.js; once the
// last consumer moves over, this file can be deleted.
//
// Privacy note (unchanged): PIN hashing is privacy, not security.
// A determined attacker can read the page source and bypass any
// client-side gate. The point is to keep random passers-by, classmates,
// or anyone who finds the URL out of the kid's progress data.

export { hashPin } from "./auth/pin.js?v=20260526";

export {
  readSession,
  writeSession,
  clearSession,
  signedInRole,
  isChildRole,
  isParentRole,
  isDemoRole,
  startDemoSession,
  signOut
} from "./auth/session.js?v=20260526";

export {
  readChildProfile,
  writeChildProfile,
  clearChildProfile,
  readParentProfile,
  writeParentProfile,
  clearParentProfile,
  isFullySetUp,
  migratedChildName,
  clearLegacyProfile,
  setupParentProfile,
  setupChildProfile,
  tryLoginChild,
  tryLoginParent,
  resetChildPinViaParent,
  wipeProfiles,
  profileName,
  signedInName
} from "./auth/profile.js?v=20260526";

export { requireSignInOrRedirect } from "./auth/gate.js?v=20260526";

// Backward-compat shims — older code calls these names.
export { requireSignInOrRedirect as requireProfileOrRedirect } from "./auth/gate.js?v=20260526";
export { signOut as clearProfile } from "./auth/session.js?v=20260526";
