// GradeBlaze — page gate.
//
// Sends anyone without a valid session to welcome.html. Demo sessions
// count as signed-in (no profiles needed). Used as the auth check at
// the top of every page that isn't welcome.html.

import { signedInRole } from "./session.js?v=20260602";

export function requireSignInOrRedirect() {
  if (signedInRole()) return true; // any role (child / parent / demo) is fine
  if (!/welcome\.html(\?|$)/.test(location.pathname)) {
    location.replace("welcome.html");
  }
  return false;
}
