// AimHigh Mock Prep — welcome screen. Captures the learner's name on
// first visit, redirects to the landing page on subsequent visits.

import { readProfile, writeProfile } from "./profile.js";

const existing = readProfile();
if (existing && existing.name) {
  // Already signed in — go straight to landing.
  location.replace("index.html");
}

const form = document.getElementById("welcomeForm");
if (form) {
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const input = document.getElementById("welcomeName");
    const name = (input.value || "").trim().slice(0, 30);
    if (!name) { input.focus(); return; }
    writeProfile({ name: name, createdAt: Date.now() });
    location.href = "index.html";
  });
}
