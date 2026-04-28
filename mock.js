// Mock Prep — shared module entry. Per-page logic loads from here.
//
// localStorage namespacing: every key for Mock Prep is prefixed with
// `aimhigh-mock-` so it never collides with the AimHigh app's own keys.

export const MOCK_STORAGE_PREFIX = "aimhigh-mock-";

export const SUBJECTS = [
  { id: "science",  name: "Science"          },
  { id: "maths",    name: "Maths"            },
  { id: "english",  name: "English"          },
  { id: "french",   name: "French"           },
  { id: "history",  name: "History"          },
  { id: "geography", name: "Geography"       },
  { id: "computing", name: "Computer Science" }
];

// Landing-page status line — placeholder until the daily warm-up writes
// its first result. Keeps the page from flashing "Loading…" forever.
function paintLandingStatus() {
  const el = document.getElementById("mockStatus");
  if (!el) return;
  el.innerHTML = "<p class=\"mock-status-line\">Pick a mode below to get started. The daily warm-up will appear here once it has a first result.</p>";
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", paintLandingStatus);
} else {
  paintLandingStatus();
}
