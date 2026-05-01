// GradeBlaze — Exam-Day Drill card.
//
// Static one-pager. The print button is its own behaviour and the only
// dynamic bit on the page; everything else is rendered in the HTML so
// the card works even if JS fails to load.

import "./mock.js?v=20260603";

const printBtn = document.getElementById("printBtn");
if (printBtn) {
  printBtn.addEventListener("click", function () {
    try { window.print(); } catch (e) { /* no-op if print is blocked */ }
  });
}

if (typeof window.GBReady === "function") window.GBReady();
