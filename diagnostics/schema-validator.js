// GradeBlaze — runtime content validator.
//
// A pragmatic, lightweight validator for the two payload shapes the
// runtime fetches: question pools (data/<subject>.json) and learning
// entries (data/learning.json).
//
// Why not a full JSON Schema runtime: a generic Draft-07 validator is
// ~50kB and runs to hundreds of lines on every load. The shapes we
// fetch are small and stable. A hand-rolled checker that knows our
// fields is faster, smaller, and easier to debug — and the schema
// files in /schemas/ remain the canonical contract for human review
// and pre-commit checks (see tools/validate-content.mjs).
//
// Each validator returns:
//   { ok: boolean, problems: Array<{ index, id?, msg }>, total: number }
//
// "ok" is true when problems.length === 0.
// Callers should pipe `problems` into platform/logger.js and decide
// whether the situation warrants a user-visible banner (see
// shouldShowBanner below).

import * as logger from "../platform/logger.js?v=20260610";

const VALID_SUBJECTS = ["science", "maths", "english", "french", "history", "geography", "computing"];
const VALID_QTYPES   = ["mc", "mcq", "spell", "speak"];
const VALID_STATUS   = ["draft", "live", "retired"];

function isString(v)  { return typeof v === "string"; }
function isInt(v)     { return Number.isInteger(v); }
function isArray(v)   { return Array.isArray(v); }
function isObject(v)  { return v && typeof v === "object" && !Array.isArray(v); }

// ---- Question item -------------------------------------------------------

function validateQuestionItem(q, index) {
  const problems = [];
  const id = (q && q.id) || ("[index " + index + "]");
  function bad(msg) { problems.push({ index: index, id: id, msg: msg }); }

  if (!isObject(q)) { bad("not an object"); return problems; }
  if (!isString(q.id) || !q.id.length)        bad("missing id");
  if (!VALID_SUBJECTS.includes(q.subject))    bad("invalid/missing subject: " + q.subject);
  if (!isString(q.topic) || !q.topic.length)  bad("missing topic");
  if (!isString(q.prompt) || q.prompt.length < 3) bad("prompt too short or missing");
  if (q.status != null && !VALID_STATUS.includes(q.status)) bad("invalid status: " + q.status);

  const type = q.type || "mc";
  if (!VALID_QTYPES.includes(type)) bad("invalid type: " + q.type);

  if (type === "mc" || type === "mcq") {
    if (!isArray(q.options) || q.options.length !== 4) bad("mc: options must be exactly 4 strings");
    else if (!q.options.every(isString) || !q.options.every(function (o) { return o && o.length > 0; })) bad("mc: all options must be non-empty strings");
    else if (new Set(q.options).size !== 4) bad("mc: duplicate options");
    if (!isInt(q.answer) || q.answer < 0 || q.answer > 3) bad("mc: answer must be integer 0-3");
  } else if (type === "spell" || type === "speak") {
    if (!isString(q.answer) || !q.answer.length) bad(type + ": answer must be a non-empty string");
  }

  if (q.year_level != null && (!isInt(q.year_level) || q.year_level < 7 || q.year_level > 13)) {
    bad("year_level must be integer 7-13");
  }
  if (q.difficulty != null && (!isInt(q.difficulty) || q.difficulty < 1 || q.difficulty > 3)) {
    bad("difficulty must be integer 1-3");
  }

  return problems;
}

export function validateQuestions(arr) {
  const problems = [];
  const validItems = [];
  if (!isArray(arr)) {
    return { ok: false, problems: [{ index: -1, msg: "payload is not an array" }], total: 0, validItems: [] };
  }
  const seenIds = new Set();
  arr.forEach(function (q, i) {
    const itemProblems = validateQuestionItem(q, i);
    let isValid = itemProblems.length === 0;
    if (q && isString(q.id)) {
      if (seenIds.has(q.id)) {
        problems.push({ index: i, id: q.id, msg: "duplicate id" });
        isValid = false;
      }
      seenIds.add(q.id);
    }
    itemProblems.forEach(function (p) { problems.push(p); });
    if (isValid) validItems.push(q);
  });
  return {
    ok: problems.length === 0,
    problems: problems,
    total: arr.length,
    // validItems: every item that passed all checks. Caller should filter
    // its working pool to this list so a malformed item never reaches
    // the picker / renderer.
    validItems: validItems
  };
}

// ---- Learning entry ------------------------------------------------------

function validateLearningSection(s, sectionIndex, ctx) {
  const problems = [];
  function bad(msg) { problems.push({ ctx: ctx + " section[" + sectionIndex + "]", msg: msg }); }
  if (!isObject(s)) { bad("not an object"); return problems; }
  if (s.heading != null && !isString(s.heading)) bad("heading must be a string");
  if (s.body != null && !isString(s.body))       bad("body must be a string");
  if (s.list != null) {
    if (!isArray(s.list) || !s.list.every(isString)) bad("list must be an array of strings");
  }
  if (s.callout != null) {
    if (!isObject(s.callout)) bad("callout must be an object");
    else if (!isString(s.callout.body) || !s.callout.body.length) bad("callout.body required");
  }
  if (s.example != null && !isObject(s.example)) bad("example must be an object");
  if (s.quickfact != null) {
    if (!isObject(s.quickfact)) bad("quickfact must be an object");
    else if (!isString(s.quickfact.value)) bad("quickfact.value required");
    else if (!isString(s.quickfact.label)) bad("quickfact.label required");
  }
  // Phase 3 cognitive-science section types — see design/learn-module-audit.md §6.3
  if (s.predict != null) {
    if (!isObject(s.predict)) bad("predict must be an object");
    else if (!isString(s.predict.question) || !s.predict.question.length) bad("predict.question required");
    else if (!isString(s.predict.answer) || !s.predict.answer.length) bad("predict.answer required");
  }
  if (s.why_prompt != null) {
    if (!isObject(s.why_prompt)) bad("why_prompt must be an object");
    else if (!isString(s.why_prompt.question) || !s.why_prompt.question.length) bad("why_prompt.question required");
    else if (!isString(s.why_prompt.answer) || !s.why_prompt.answer.length) bad("why_prompt.answer required");
  }
  if (s.teach_back != null) {
    if (!isObject(s.teach_back)) bad("teach_back must be an object");
    else if (!isString(s.teach_back.prompt) || !s.teach_back.prompt.length) bad("teach_back.prompt required");
    // checklist + model_answer are optional but if present must be sane
    else if (s.teach_back.checklist != null && (!isArray(s.teach_back.checklist) || !s.teach_back.checklist.every(isString))) {
      bad("teach_back.checklist must be an array of strings");
    }
    else if (s.teach_back.model_answer != null && !isString(s.teach_back.model_answer)) {
      bad("teach_back.model_answer must be a string");
    }
  }
  if (s.confidence_check != null && s.confidence_check !== true) {
    bad("confidence_check must be true (it's a marker, not an object)");
  }
  return problems;
}

function validateLearningEntry(e, index) {
  const problems = [];
  const ctx = "[index " + index + (e && e.topic ? " " + e.subject + "/" + e.topic : "") + "]";
  function bad(msg) { problems.push({ ctx: ctx, msg: msg }); }

  if (!isObject(e)) { bad("not an object"); return problems; }
  if (!VALID_SUBJECTS.includes(e.subject)) bad("invalid/missing subject: " + e.subject);
  if (!isString(e.topic) || !e.topic.length) bad("missing topic");
  if (!isString(e.title) || e.title.length < 3) bad("title too short or missing");
  if (e.status != null && !VALID_STATUS.includes(e.status)) bad("invalid status: " + e.status);
  if (!isArray(e.sections) || e.sections.length === 0) {
    bad("sections must be a non-empty array");
  } else {
    e.sections.forEach(function (s, i) {
      validateLearningSection(s, i, ctx).forEach(function (p) { problems.push(p); });
    });
  }
  return problems;
}

export function validateLearning(arr) {
  const problems = [];
  const validItems = [];
  if (!isArray(arr)) {
    return { ok: false, problems: [{ msg: "payload is not an array" }], total: 0, validItems: [] };
  }
  arr.forEach(function (e, i) {
    const entryProblems = validateLearningEntry(e, i);
    entryProblems.forEach(function (p) { problems.push(p); });
    if (entryProblems.length === 0) validItems.push(e);
  });
  return { ok: problems.length === 0, problems: problems, total: arr.length, validItems: validItems };
}

// ---- Reporting helper ---------------------------------------------------

// Pipes problems into the logger. Caller decides whether to block the UI.
// Returns a small summary the caller can use for a banner.
export function reportProblems(channel, label, result) {
  if (result.ok) {
    logger.info(channel, label + " — " + result.total + " items, all valid");
    return { ok: true, count: 0 };
  }
  const sample = result.problems.slice(0, 5);
  logger.error(channel, label + " — " + result.problems.length + " problems found in " + result.total + " items", sample);
  return { ok: false, count: result.problems.length, sample: sample };
}

// Threshold helper: mc-options-must-be-4 is the kind of error that
// breaks rendering for that one question. >5 such errors = the file
// is probably damaged. Caller decides whether to surface a banner.
export function shouldShowBanner(result) {
  return !result.ok && result.problems.length >= 5;
}
