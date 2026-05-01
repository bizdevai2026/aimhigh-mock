// GradeBlaze — auth compatibility shim.
//
// The auth code that used to live here has been split into four
// single-responsibility modules under auth/:
//
//   pin.js     — SHA-256 PIN hashing (the only place crypto.subtle
//                is referenced)
//   session.js — current session role (child / coach / demo) +
//                session storage key
//   profile.js — child + coach profile records + setup, login,
//                recovery, wipe
//   gate.js    — page-level requireSignInOrRedirect
//
// This file is a re-export shim so the existing consumers (mock.js,
// welcome.js, dashboard.js, sprint.js, warmup.js, paper.js, learn.js)
// keep working without an import-path migration. Future PRs should
// migrate consumers to import directly from auth/<area>.js; once the
// last consumer moves over, this file can be deleted.
//
// Naming: the role formerly known as "parent" is now "Coach" (the
// rename happened at v20260609 — see memory/role_terminology.md). The
// old function names (isParentRole, setupParentProfile, etc.) are
// re-exported under both their new names AND their legacy names so
// callers can migrate at their own pace.
//
// Privacy note (unchanged): PIN hashing is privacy, not security.
// A determined attacker can read the page source and bypass any
// client-side gate. The point is to keep random passers-by, classmates,
// or anyone who finds the URL out of the kid's progress data.

export { hashPin } from "./auth/pin.js?v=20260609";

export {
  readSession,
  writeSession,
  clearSession,
  signedInRole,
  isChildRole,
  isCoachRole,
  isDemoRole,
  startDemoSession,
  signOut
} from "./auth/session.js?v=20260609";

// Legacy alias for callers that still use the old name. Will be removed
// once dashboard/paper/sprint/warmup/mock have all been updated.
export { isCoachRole as isParentRole } from "./auth/session.js?v=20260609";

export {
  readChildProfile,
  writeChildProfile,
  clearChildProfile,
  readCoachProfile,
  writeCoachProfile,
  clearCoachProfile,
  isFullySetUp,
  migratedChildName,
  clearLegacyProfile,
  setupCoachProfile,
  setupChildProfile,
  tryLoginChild,
  tryLoginCoach,
  resetChildPinViaCoach,
  wipeProfiles,
  profileName,
  signedInName
} from "./auth/profile.js?v=20260609";

// Legacy aliases for callers that still use the old "parent" names.
export { readCoachProfile as readParentProfile } from "./auth/profile.js?v=20260609";
export { writeCoachProfile as writeParentProfile } from "./auth/profile.js?v=20260609";
export { clearCoachProfile as clearParentProfile } from "./auth/profile.js?v=20260609";
export { setupCoachProfile as setupParentProfile } from "./auth/profile.js?v=20260609";
export { tryLoginCoach as tryLoginParent } from "./auth/profile.js?v=20260609";
export { resetChildPinViaCoach as resetChildPinViaParent } from "./auth/profile.js?v=20260609";

export { requireSignInOrRedirect } from "./auth/gate.js?v=20260609";

// Backward-compat shims — older code calls these names.
export { requireSignInOrRedirect as requireProfileOrRedirect } from "./auth/gate.js?v=20260609";
export { signOut as clearProfile } from "./auth/session.js?v=20260609";
