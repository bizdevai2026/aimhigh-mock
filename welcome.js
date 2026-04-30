// AimHigh Mock Prep — welcome screen.
//
// Drives the auth + setup state machine. Handles:
//   - First-time setup (parent PIN, child name + PIN)
//   - Role picker on subsequent visits
//   - Login (child or parent PIN)
//   - "I forgot my PIN" — parent overrides the child's PIN
//
// Renders into <div id="welcomeRoot"> by swapping innerHTML and rewiring
// listeners on each state change. PINs are 4 digits.

import {
  isFullySetUp,
  readChildProfile,
  setupParentProfile,
  setupChildProfile,
  tryLoginChild,
  tryLoginParent,
  resetChildPinViaParent,
  signedInRole,
  clearLegacyProfile,
  migratedChildName,
  startDemoSession
} from "./profile.js?v=20260521";

import { playWelcomeStinger } from "./sounds.js?v=20260521";
import * as logger from "./platform/logger.js?v=20260521";

// Dev diagnostics panel — only when ?diag=1 in the URL.
if (/[?&]diag=1\b/.test(location.search)) {
  import("./diagnostics/panel.js?v=20260521").catch(function (e) {
    logger.error("diag", "panel failed to load", e);
  });
}

const root = document.getElementById("welcomeRoot");

// --- State machine ---------------------------------------------------------

const state = {
  step: null,
  parentPin: null,        // held briefly during setup confirm
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
  const role = signedInRole();
  if (role === "child") {
    if (typeof window.GBReady === "function") window.GBReady();
    location.replace("index.html");
    return;
  }
  if (role === "parent") {
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
    case "intro":                    paintIntro(); painted = true; break;
    case "setup-parent-pin":         paintSetupParentPin(); painted = true; break;
    case "setup-parent-pin-confirm": paintSetupParentPinConfirm(); painted = true; break;
    case "setup-child-name":         paintSetupChildName(); painted = true; break;
    case "setup-child-pin":          paintSetupChildPin(); painted = true; break;
    case "role-pick":                paintRolePick(); painted = true; break;
    case "login-child":              paintLogin("child"); painted = true; break;
    case "login-parent":             paintLogin("parent"); painted = true; break;
    case "forgot-parent-auth":       paintForgotParentAuth(); painted = true; break;
    case "forgot-child-newpin":      paintForgotChildNewPin(); painted = true; break;
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
      "<li><strong>Parent view</strong>" +
        "<span>A grown-up can sign in any time to see progress and weak topics &mdash; without changing the score.</span></li>" +
    "</ul>" +
    "<p class=\"mock-welcome-fineprint\">Setup takes 30 seconds. A grown-up picks a PIN, you pick your name and your own PIN.</p>" +
    "<button type=\"button\" id=\"introStartBtn\" class=\"mock-button mock-welcome-submit\">Let's set it up</button>" +
    "<button type=\"button\" id=\"introDemoBtn\" class=\"mock-welcome-link mock-welcome-link-muted\">Just looking? Try a demo &mdash; no setup</button>";
  byId("introStartBtn").addEventListener("click", function () { go("setup-parent-pin"); });
  byId("introDemoBtn").addEventListener("click", function () {
    startDemoSession();
    location.replace("index.html");
  });
}

// --- Setup: parent first ---------------------------------------------------

// Setup is three logical steps. Parent-PIN-confirm is presented as a
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

function paintSetupParentPin() {
  root.innerHTML =
    stepperHtml(1, 3) +
    "<p class=\"mock-welcome-tagline\">A grown-up sets up first.</p>" +
    "<form id=\"f\" class=\"mock-welcome-form\" novalidate>" +
      "<label class=\"mock-welcome-label\" for=\"pin\">Parent &mdash; choose a 4-digit PIN</label>" +
      "<input id=\"pin\" class=\"mock-welcome-pin\" inputmode=\"numeric\" autocomplete=\"new-password\" maxlength=\"4\" pattern=\"[0-9]{4}\" placeholder=\"&bull; &bull; &bull; &bull;\" required autofocus />" +
      "<button type=\"submit\" class=\"mock-button mock-welcome-submit\">Continue</button>" +
      "<p class=\"mock-welcome-fineprint\">Stored on this device only, as a secure hash. You'll need it to recover your child's PIN later.</p>" +
    "</form>";
  wireForm(function (data) {
    const pin = sanitisePin(data.pin);
    if (pin == null) return showError("Use 4 digits.");
    state.parentPin = pin;
    go("setup-parent-pin-confirm");
  });
}

function paintSetupParentPinConfirm() {
  root.innerHTML =
    stepperHtml(1, 3, "confirm") +
    "<p class=\"mock-welcome-tagline\">Type the parent PIN once more.</p>" +
    "<form id=\"f\" class=\"mock-welcome-form\" novalidate>" +
      "<label class=\"mock-welcome-label\" for=\"pin\">Confirm parent PIN</label>" +
      "<input id=\"pin\" class=\"mock-welcome-pin\" inputmode=\"numeric\" autocomplete=\"new-password\" maxlength=\"4\" pattern=\"[0-9]{4}\" placeholder=\"&bull; &bull; &bull; &bull;\" required autofocus />" +
      "<button type=\"submit\" class=\"mock-button mock-welcome-submit\">Confirm</button>" +
      "<button type=\"button\" id=\"backBtn\" class=\"mock-welcome-link\">&larr; Change PIN</button>" +
    "</form>";
  byId("backBtn").addEventListener("click", function () { state.parentPin = null; go("setup-parent-pin"); });
  wireForm(async function (data) {
    const pin = sanitisePin(data.pin);
    if (pin !== state.parentPin) return showError("PINs don't match. Try again.");
    state.busy = true;
    await setupParentProfile(pin);
    state.parentPin = null;
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
      "<p class=\"mock-welcome-fineprint\">If you forget, your parent can reset it.</p>" +
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
      "<button type=\"button\" class=\"mock-role-btn role-parent\" id=\"roleParent\">" +
        "<span class=\"mock-role-label\">Parent view</span>" +
        "<span class=\"mock-role-name\">Parent</span>" +
      "</button>" +
    "</div>" +
    "<button type=\"button\" id=\"demoBtn\" class=\"mock-welcome-link mock-welcome-link-muted\">" +
      "Demo &mdash; preview without saving" +
    "</button>";
  byId("roleChild").addEventListener("click", function () { go("login-child"); });
  byId("roleParent").addEventListener("click", function () { go("login-parent"); });
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
  const heading = role === "child" ? escapeHtml(childName) : "Parent";
  const subline = role === "child" ? "Enter your PIN." : "Enter the parent PIN to view progress.";
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
    byId("forgotBtn").addEventListener("click", function () { go("forgot-parent-auth"); });
  }
  wireForm(async function (data) {
    const pin = sanitisePin(data.pin);
    if (pin == null) return showError("Use 4 digits.");
    state.busy = true;
    const ok = role === "child" ? await tryLoginChild(pin) : await tryLoginParent(pin);
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

// --- Forgot child PIN: parent authorises -----------------------------------

function paintForgotParentAuth() {
  root.innerHTML =
    "<p class=\"mock-welcome-tagline\">A parent will need to authorise this. Enter the parent PIN.</p>" +
    "<form id=\"f\" class=\"mock-welcome-form\" novalidate>" +
      "<label class=\"mock-welcome-label\" for=\"pin\">Parent PIN</label>" +
      "<input id=\"pin\" class=\"mock-welcome-pin\" inputmode=\"numeric\" autocomplete=\"current-password\" maxlength=\"4\" pattern=\"[0-9]{4}\" placeholder=\"&bull; &bull; &bull; &bull;\" required autofocus />" +
      "<button type=\"submit\" class=\"mock-button mock-welcome-submit\">Authorise</button>" +
      "<button type=\"button\" id=\"backBtn\" class=\"mock-welcome-link\">&larr; Cancel</button>" +
    "</form>";
  byId("backBtn").addEventListener("click", function () { go("login-child"); });
  wireForm(async function (data) {
    const pin = sanitisePin(data.pin);
    if (pin == null) return showError("Use 4 digits.");
    state.busy = true;
    const ok = await tryLoginParent(pin);
    state.busy = false;
    if (!ok) return showError("Wrong parent PIN.");
    // We don't actually want to sign in as parent — sign back out and move on.
    state.parentPin = pin;
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
    const ok = await resetChildPinViaParent(state.parentPin, pin);
    state.parentPin = null;
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

function byId(id) { return document.getElementById(id); }

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(s) { return escapeHtml(s); }

init();

// Register the service worker for offline + fast subsequent loads.
// Welcome page is the entry for fresh visitors, so it's a good place
// to install the SW. Other pages register via mock.js.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" }).catch(function () {});
  });
}
