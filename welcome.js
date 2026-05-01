// AimHigh Mock Prep — welcome screen.
//
// Drives the auth + setup state machine. Handles:
//   - First-time setup (Coach PIN, child name + PIN)
//   - Role picker on subsequent visits
//   - Login (child or Coach PIN)
//   - "I forgot my PIN" — Coach overrides the child's PIN
//
// Renders into <div id="welcomeRoot"> by swapping innerHTML and rewiring
// listeners on each state change. PINs are 4 digits.
//
// Naming: the adult role is "Coach". This was previously called "parent"
// but the rename (v20260609) moved away from surveillance-coded language;
// see memory/role_terminology.md. The Coach helps the kid use the app.
// The kid never sees the app speak as a persona — kid-facing copy stays
// peer-coded ("you", "your"), not authority-coded ("your mentor will").

import {
  isFullySetUp,
  readChildProfile,
  setupCoachProfile,
  setupChildProfile,
  tryLoginChild,
  tryLoginCoach,
  resetChildPinViaCoach,
  signedInRole,
  clearLegacyProfile,
  migratedChildName,
  startDemoSession
} from "./profile.js?v=20260611";

import { playWelcomeStinger } from "./sounds.js?v=20260611";
import * as logger from "./platform/logger.js?v=20260611";
import { escapeHtml, escapeAttr, byId } from "./shared/dom.js?v=20260611";

// Dev diagnostics panel — only when ?diag=1 in the URL.
if (/[?&]diag=1\b/.test(location.search)) {
  import("./diagnostics/panel.js?v=20260611").catch(function (e) {
    logger.error("diag", "panel failed to load", e);
  });
}

const root = document.getElementById("welcomeRoot");

// --- State machine ---------------------------------------------------------

const state = {
  step: null,
  coachPin: null,         // held briefly during setup confirm
  childName: "",          // held briefly during setup
  busy: false
};

function go(step) {
  state.step = step;
  paint();
}

function init() {
  // Already signed in? Send them on. Cancel the loading guard on the
  // redirect paths — location.replace is async and the timeout card
  // can flash on the welcome page if the destination loads slowly.
  // signedInRole() also auto-migrates legacy "parent" sessions to "coach".
  const role = signedInRole();
  if (role === "child") {
    if (typeof window.GBReady === "function") window.GBReady();
    location.replace("index.html");
    return;
  }
  if (role === "coach") {
    if (typeof window.GBReady === "function") window.GBReady();
    location.replace("dashboard.html");
    return;
  }

  if (!isFullySetUp()) {
    // Pre-fill child name from any legacy single-profile install
    state.childName = migratedChildName();
    go("intro");
  } else {
    go("role-pick");
  }
}

// --- Painters --------------------------------------------------------------

function paint() {
  if (!root) return;
  let painted = false;
  switch (state.step) {
    case "intro":                   paintIntro(); painted = true; break;
    case "setup-coach-pin":         paintSetupCoachPin(); painted = true; break;
    case "setup-coach-pin-confirm": paintSetupCoachPinConfirm(); painted = true; break;
    case "setup-child-name":        paintSetupChildName(); painted = true; break;
    case "setup-child-pin":         paintSetupChildPin(); painted = true; break;
    case "role-pick":               paintRolePick(); painted = true; break;
    case "login-child":             paintLogin("child"); painted = true; break;
    case "login-coach":             paintLogin("coach"); painted = true; break;
    case "forgot-coach-auth":       paintForgotCoachAuth(); painted = true; break;
    case "forgot-child-newpin":     paintForgotChildNewPin(); painted = true; break;
  }
  // Cancel the loading guard only when a known step actually rendered.
  // An unknown step falls through and renders nothing — we want the
  // guard to fire in that case so the user sees a recovery affordance.
  if (painted && typeof window.GBReady === "function") window.GBReady();
}

// --- Intro: what is this and what's about to happen -----------------------

function paintIntro() {
  root.innerHTML =
    "<p class=\"mock-welcome-tagline\">Short daily practice for your May tests &mdash; and the skills that stick after.</p>" +
    "<ul class=\"mock-intro-list\">" +
      "<li><strong>How it works</strong>" +
        "<span>5-minute warm-ups, subject deep-dives, full timed mocks. A streak grows the more days you show up.</span></li>" +
      "<li><strong>Learn before you test</strong>" +
        "<span>Plain-English topic explainers with examples, diagrams and tips &mdash; so it's not just quizzing.</span></li>" +
      "<li><strong>Coach view</strong>" +
        "<span>A grown-up can sign in any time to see progress and weak topics &mdash; without changing the score.</span></li>" +
    "</ul>" +
    "<p class=\"mock-welcome-fineprint\">Setup takes 30 seconds. A grown-up picks a PIN, you pick your name and your own PIN.</p>" +
    "<button type=\"button\" id=\"introStartBtn\" class=\"mock-button mock-welcome-submit\">Let's set it up</button>" +
    "<button type=\"button\" id=\"introDemoBtn\" class=\"mock-welcome-link mock-welcome-link-muted\">Just looking? Try a demo &mdash; no setup</button>";
  byId("introStartBtn").addEventListener("click", function () { go("setup-coach-pin"); });
  byId("introDemoBtn").addEventListener("click", function () {
    startDemoSession();
    location.replace("index.html");
  });
}

// --- Setup: Coach first ----------------------------------------------------

// Setup is three logical steps. Coach-PIN-confirm is presented as a
// "(confirm)" sub-step of step 1 rather than its own number, so the
// stepper doesn't drift to "4 of 4" before the kid is on screen.
function stepperHtml(currentStep, totalSteps, sublabel) {
  let dots = "";
  for (let i = 1; i <= totalSteps; i++) {
    const active = i === currentStep ? " mock-welcome-step-active" : "";
    const done = i < currentStep ? " mock-welcome-step-done" : "";
    dots += "<span class=\"mock-welcome-step-dot" + active + done + "\"></span>";
  }
  const sublabelHtml = sublabel ? " <span class=\"mock-welcome-step-sub\">&middot; " + sublabel + "</span>" : "";
  return "<p class=\"mock-welcome-step\"><span class=\"mock-welcome-step-dots\">" + dots + "</span> Step " + currentStep + " of " + totalSteps + sublabelHtml + "</p>";
}

function paintSetupCoachPin() {
  root.innerHTML =
    stepperHtml(1, 3) +
    "<p class=\"mock-welcome-tagline\">A grown-up sets up first.</p>" +
    "<form id=\"f\" class=\"mock-welcome-form\" novalidate>" +
      "<label class=\"mock-welcome-label\" for=\"pin\">Coach &mdash; choose a 4-digit PIN</label>" +
      "<input id=\"pin\" class=\"mock-welcome-pin\" inputmode=\"numeric\" autocomplete=\"new-password\" maxlength=\"4\" pattern=\"[0-9]{4}\" placeholder=\"&bull; &bull; &bull; &bull;\" required autofocus />" +
      "<button type=\"submit\" class=\"mock-button mock-welcome-submit\">Continue</button>" +
      "<p class=\"mock-welcome-fineprint\">Stored on this device only, as a secure hash. You'll need it to recover the kid's PIN later.</p>" +
    "</form>";
  wireForm(function (data) {
    const pin = sanitisePin(data.pin);
    if (pin == null) return showError("Use 4 digits.");
    state.coachPin = pin;
    go("setup-coach-pin-confirm");
  });
}

function paintSetupCoachPinConfirm() {
  root.innerHTML =
    stepperHtml(1, 3, "confirm") +
    "<p class=\"mock-welcome-tagline\">Type the Coach PIN once more.</p>" +
    "<form id=\"f\" class=\"mock-welcome-form\" novalidate>" +
      "<label class=\"mock-welcome-label\" for=\"pin\">Confirm Coach PIN</label>" +
      "<input id=\"pin\" class=\"mock-welcome-pin\" inputmode=\"numeric\" autocomplete=\"new-password\" maxlength=\"4\" pattern=\"[0-9]{4}\" placeholder=\"&bull; &bull; &bull; &bull;\" required autofocus />" +
      "<button type=\"submit\" class=\"mock-button mock-welcome-submit\">Confirm</button>" +
      "<button type=\"button\" id=\"backBtn\" class=\"mock-welcome-link\">&larr; Change PIN</button>" +
    "</form>";
  byId("backBtn").addEventListener("click", function () { state.coachPin = null; go("setup-coach-pin"); });
  wireForm(async function (data) {
    const pin = sanitisePin(data.pin);
    if (pin !== state.coachPin) return showError("PINs don't match. Try again.");
    state.busy = true;
    await setupCoachProfile(pin);
    state.coachPin = null;
    state.busy = false;
    go("setup-child-name");
  });
}

// --- Setup: child --------------------------------------------------------

function paintSetupChildName() {
  const prefill = state.childName || "";
  root.innerHTML =
    stepperHtml(2, 3) +
    "<p class=\"mock-welcome-tagline\">Your turn. What's your first name?</p>" +
    "<form id=\"f\" class=\"mock-welcome-form\" novalidate>" +
      "<label class=\"mock-welcome-label\" for=\"name\">First name</label>" +
      "<input id=\"name\" class=\"mock-welcome-input\" type=\"text\" maxlength=\"30\" autocomplete=\"given-name\" placeholder=\"e.g. Alex\" required autofocus value=\"" + escapeAttr(prefill) + "\" />" +
      "<button type=\"submit\" class=\"mock-button mock-welcome-submit\">Continue</button>" +
    "</form>";
  wireForm(function (data) {
    const name = String(data.name || "").trim().slice(0, 30);
    if (!name) return showError("Type a first name.");
    state.childName = name;
    go("setup-child-pin");
  });
}

function paintSetupChildPin() {
  const name = state.childName;
  root.innerHTML =
    stepperHtml(3, 3) +
    "<p class=\"mock-welcome-tagline\">Pick a 4-digit PIN, " + escapeHtml(name) + ".</p>" +
    "<form id=\"f\" class=\"mock-welcome-form\" novalidate>" +
      "<label class=\"mock-welcome-label\" for=\"pin\">Your PIN</label>" +
      "<input id=\"pin\" class=\"mock-welcome-pin\" inputmode=\"numeric\" autocomplete=\"new-password\" maxlength=\"4\" pattern=\"[0-9]{4}\" placeholder=\"&bull; &bull; &bull; &bull;\" required autofocus />" +
      "<button type=\"submit\" class=\"mock-button mock-welcome-submit\">Let's go</button>" +
      "<p class=\"mock-welcome-fineprint\">If you forget, your Coach can reset it.</p>" +
    "</form>";
  wireForm(async function (data) {
    const pin = sanitisePin(data.pin);
    if (pin == null) return showError("Use 4 digits.");
    state.busy = true;
    await setupChildProfile(state.childName, pin);
    // Auto-login as child after setup
    const ok = await tryLoginChild(pin);
    if (ok) {
      clearLegacyProfile(); // remove old single-profile key if migrating
      playWelcomeStinger();
      setTimeout(function () { location.replace("index.html"); }, 650);
      return;
    }
    state.busy = false;
    showError("Something went wrong. Try again.");
  });
}

// --- Returning: role picker ------------------------------------------------

function paintRolePick() {
  const c = readChildProfile();
  const childName = (c && c.name) ? c.name : "Me";
  root.innerHTML =
    "<p class=\"mock-welcome-tagline\">Who's signing in?</p>" +
    "<div class=\"mock-role-grid\">" +
      "<button type=\"button\" class=\"mock-role-btn role-child\" id=\"roleChild\">" +
        "<span class=\"mock-role-label\">Me</span>" +
        "<span class=\"mock-role-name\">" + escapeHtml(childName) + "</span>" +
      "</button>" +
      "<button type=\"button\" class=\"mock-role-btn role-coach\" id=\"roleCoach\">" +
        "<span class=\"mock-role-label\">Coach view</span>" +
        "<span class=\"mock-role-name\">Coach</span>" +
      "</button>" +
    "</div>" +
    "<button type=\"button\" id=\"demoBtn\" class=\"mock-welcome-link mock-welcome-link-muted\">" +
      "Demo &mdash; preview without saving" +
    "</button>";
  byId("roleChild").addEventListener("click", function () { go("login-child"); });
  byId("roleCoach").addEventListener("click", function () { go("login-coach"); });
  byId("demoBtn").addEventListener("click", enterDemo);
}

function enterDemo() {
  startDemoSession();
  location.replace("index.html");
}

// --- Returning: PIN login --------------------------------------------------

function paintLogin(role) {
  const c = readChildProfile();
  const childName = (c && c.name) ? c.name : "You";
  const heading = role === "child" ? escapeHtml(childName) : "Coach";
  const subline = role === "child" ? "Enter your PIN." : "Enter the Coach PIN to view progress.";
  root.innerHTML =
    "<p class=\"mock-welcome-tagline\">" + escapeHtml(subline) + "</p>" +
    "<form id=\"f\" class=\"mock-welcome-form\" novalidate>" +
      "<label class=\"mock-welcome-label\" for=\"pin\">" + heading + " &middot; PIN</label>" +
      "<input id=\"pin\" class=\"mock-welcome-pin\" inputmode=\"numeric\" autocomplete=\"current-password\" maxlength=\"4\" pattern=\"[0-9]{4}\" placeholder=\"&bull; &bull; &bull; &bull;\" required autofocus />" +
      "<button type=\"submit\" class=\"mock-button mock-welcome-submit\">Sign in</button>" +
      "<button type=\"button\" id=\"backBtn\" class=\"mock-welcome-link\">&larr; Pick a different role</button>" +
      (role === "child" ? "<button type=\"button\" id=\"forgotBtn\" class=\"mock-welcome-link mock-welcome-link-muted\">Forgot your PIN?</button>" : "") +
    "</form>";
  byId("backBtn").addEventListener("click", function () { go("role-pick"); });
  if (role === "child") {
    byId("forgotBtn").addEventListener("click", function () { go("forgot-coach-auth"); });
  }
  wireForm(async function (data) {
    const pin = sanitisePin(data.pin);
    if (pin == null) return showError("Use 4 digits.");
    state.busy = true;
    const ok = role === "child" ? await tryLoginChild(pin) : await tryLoginCoach(pin);
    state.busy = false;
    if (!ok) return showError("Wrong PIN. Try again.");
    if (role === "child") {
      playWelcomeStinger();
      setTimeout(function () { location.replace("index.html"); }, 650);
    } else {
      location.replace("dashboard.html");
    }
  });
}

// --- Forgot child PIN: Coach authorises ------------------------------------

function paintForgotCoachAuth() {
  root.innerHTML =
    "<p class=\"mock-welcome-tagline\">A Coach will need to authorise this. Enter the Coach PIN.</p>" +
    "<form id=\"f\" class=\"mock-welcome-form\" novalidate>" +
      "<label class=\"mock-welcome-label\" for=\"pin\">Coach PIN</label>" +
      "<input id=\"pin\" class=\"mock-welcome-pin\" inputmode=\"numeric\" autocomplete=\"current-password\" maxlength=\"4\" pattern=\"[0-9]{4}\" placeholder=\"&bull; &bull; &bull; &bull;\" required autofocus />" +
      "<button type=\"submit\" class=\"mock-button mock-welcome-submit\">Authorise</button>" +
      "<button type=\"button\" id=\"backBtn\" class=\"mock-welcome-link\">&larr; Cancel</button>" +
    "</form>";
  byId("backBtn").addEventListener("click", function () { go("login-child"); });
  wireForm(async function (data) {
    const pin = sanitisePin(data.pin);
    if (pin == null) return showError("Use 4 digits.");
    state.busy = true;
    const ok = await tryLoginCoach(pin);
    state.busy = false;
    if (!ok) return showError("Wrong Coach PIN.");
    // We don't actually want to sign in as Coach — sign back out and move on.
    state.coachPin = pin;
    go("forgot-child-newpin");
  });
}

function paintForgotChildNewPin() {
  const c = readChildProfile();
  const childName = (c && c.name) ? c.name : "You";
  root.innerHTML =
    "<p class=\"mock-welcome-tagline\">Authorised. Choose a new PIN for " + escapeHtml(childName) + ".</p>" +
    "<form id=\"f\" class=\"mock-welcome-form\" novalidate>" +
      "<label class=\"mock-welcome-label\" for=\"pin\">New PIN</label>" +
      "<input id=\"pin\" class=\"mock-welcome-pin\" inputmode=\"numeric\" autocomplete=\"new-password\" maxlength=\"4\" pattern=\"[0-9]{4}\" placeholder=\"&bull; &bull; &bull; &bull;\" required autofocus />" +
      "<button type=\"submit\" class=\"mock-button mock-welcome-submit\">Save and sign in</button>" +
    "</form>";
  wireForm(async function (data) {
    const pin = sanitisePin(data.pin);
    if (pin == null) return showError("Use 4 digits.");
    state.busy = true;
    const ok = await resetChildPinViaCoach(state.coachPin, pin);
    state.coachPin = null;
    if (!ok) {
      state.busy = false;
      return showError("Reset failed. Try again.");
    }
    const signedIn = await tryLoginChild(pin);
    state.busy = false;
    if (signedIn) {
      playWelcomeStinger();
      setTimeout(function () { location.replace("index.html"); }, 650);
    } else {
      showError("Saved, but sign-in failed. Refresh and try again.");
    }
  });
}

// --- Helpers ---------------------------------------------------------------

function wireForm(handler) {
  const form = byId("f");
  if (!form) return;
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (state.busy) return;
    const data = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (el.id) data[el.id] = el.value;
    });
    handler(data);
  });
}

function showError(msg) {
  // If an error line already exists, replace it; else append.
  const form = byId("f");
  if (!form) { alert(msg); return; }
  let err = form.querySelector(".mock-welcome-error");
  if (!err) {
    err = document.createElement("p");
    err.className = "mock-welcome-error";
    form.appendChild(err);
  }
  err.textContent = msg;
}

function sanitisePin(raw) {
  const v = String(raw || "").replace(/[^0-9]/g, "");
  if (v.length !== 4) return null;
  return v;
}

// byId, escapeHtml, escapeAttr now imported from shared/dom.js

init();

// Service worker decommissioned (see sw.js). We deliberately do NOT
// register a new one — that's what was causing "stuck on stale cache"
// loads during development. Any previously-installed SW self-unregisters
// on its next activation; new visitors never install one. New code
// that fixes this finding (deletes the lingering register call that
// the QA agent caught on 2026-05-01).
