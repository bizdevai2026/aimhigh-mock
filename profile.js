// AimHigh Mock Prep — learner profile.
//
// Single-learner, single-device model. The profile holds the name
// the learner typed on the welcome screen plus the date they signed
// up. Used to personalise the hero card and the parent dashboard,
// and to gate the rest of the app — anyone without a profile gets
// redirected to welcome.html on entry.

const KEY = "aimhigh-mock-profile";

export function readProfile() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { return null; }
}

export function writeProfile(profile) {
  try { localStorage.setItem(KEY, JSON.stringify(profile)); } catch (e) {}
}

export function clearProfile() {
  try { localStorage.removeItem(KEY); } catch (e) {}
}

export function profileName() {
  const p = readProfile();
  return (p && p.name) ? p.name : "";
}

// Called from mock.js boot on every page that loads it. If there's no
// profile yet, send the learner to the welcome screen.
export function requireProfileOrRedirect() {
  const p = readProfile();
  if (!p || !p.name) {
    if (!/welcome\.html(\?|$)/.test(location.pathname)) {
      location.replace("welcome.html");
    }
    return false;
  }
  return true;
}
