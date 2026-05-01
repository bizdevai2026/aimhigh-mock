// GradeBlaze — page gate.
//
// Sends anyone without a valid session to either:
//   - landing.html if there's no profile on this device at all
//     (new visitor / scraper / unauthenticated stranger — protect
//      the IP, show them the marketing pitch + Request Access form)
//   - welcome.html if a profile exists but no current session
//     (returning user who just needs to sign back in — zero
//      extra friction)
//
// Demo sessions count as signed-in (no profiles needed). Used as the
// auth check at the top of every page that isn't welcome.html or
// landing.html.

import { signedInRole } from "./session.js?v=20260613";
import { readJson } from "../platform/storage.js?v=20260613";

const PREFIX = "aimhigh-mock-";

// "Has any profile data ever existed on this device?" — if yes, this
// is a returning user; show them the familiar welcome-screen sign-in.
// If no, they are a stranger and should land on the marketing page.
function hasAnyProfile() {
  try {
    if (readJson(PREFIX + "profile-coach", null))  return true;
    if (readJson(PREFIX + "profile-child", null))  return true;
    if (readJson(PREFIX + "profile-parent", null)) return true; // legacy
    if (readJson(PREFIX + "profile", null))        return true; // pre-multi-role
  } catch (e) { /* storage off — treat as stranger */ }
  return false;
}

export function requireSignInOrRedirect() {
  if (signedInRole()) return true; // any role (child / coach / demo) is fine

  const path = location.pathname;
  // Don't redirect AWAY FROM the gate pages themselves.
  if (/welcome\.html(\?|$)/.test(path)) return false;
  if (/landing\.html(\?|$)/.test(path)) return false;

  if (hasAnyProfile()) {
    location.replace("welcome.html");
  } else {
    location.replace("landing.html");
  }
  return false;
}
