#!/usr/bin/env node
// AimHigh Mock Prep — content validator.
//
// Reads every data/<subject>.json and asserts:
//   - JSON is well-formed
//   - Top-level is a non-empty array
//   - Each question has the right shape:
//       id (string, non-empty)
//       subject (matches the file)
//       topic (string, non-empty)
//       prompt (string, non-empty)
//       options (array of exactly 4 non-empty strings)
//       answer (integer 0..3)
//       explainer (optional string)
//       visual   (optional string)
//   - All ids are globally unique across the whole pool.
//
// Usage:
//   node tools/validate-content.mjs
//
// Exits 0 if everything passes, non-zero (with a list of problems) if not.
// Designed to be run as a pre-commit hook — see tools/install-hook.sh.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, "..", "data");

const SUBJECTS = ["science", "maths", "english", "french", "history", "geography", "computing"];

const errors = [];
const allIds = new Map(); // id -> "<file>[<index>]"
let totalQuestions = 0;

for (const subject of SUBJECTS) {
  const file = path.join(dataDir, subject + ".json");
  let raw;
  try {
    raw = await fs.readFile(file, "utf8");
  } catch (e) {
    errors.push(`${subject}.json: cannot read (${e.message})`);
    continue;
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    errors.push(`${subject}.json: invalid JSON (${e.message})`);
    continue;
  }
  if (!Array.isArray(data)) {
    errors.push(`${subject}.json: top level must be an array`);
    continue;
  }
  if (data.length === 0) {
    errors.push(`${subject}.json: empty pool`);
    continue;
  }
  data.forEach((q, i) => {
    const tag = `${subject}.json[${i}]`;
    if (!q || typeof q !== "object") {
      errors.push(`${tag}: not an object`);
      return;
    }
    if (typeof q.id !== "string" || !q.id) {
      errors.push(`${tag}: missing or non-string id`);
    }
    if (q.subject !== subject) {
      errors.push(`${tag} (${q.id ?? "?"}): subject="${q.subject}" doesn't match file (${subject})`);
    }
    if (typeof q.topic !== "string" || !q.topic) {
      errors.push(`${tag} (${q.id ?? "?"}): missing/invalid topic`);
    }
    if (typeof q.prompt !== "string" || !q.prompt) {
      errors.push(`${tag} (${q.id ?? "?"}): missing/invalid prompt`);
    }
    if (!Array.isArray(q.options) || q.options.length !== 4) {
      errors.push(`${tag} (${q.id ?? "?"}): options must be an array of exactly 4`);
    } else {
      q.options.forEach((opt, j) => {
        if (typeof opt !== "string" || !opt) {
          errors.push(`${tag} (${q.id ?? "?"}): options[${j}] must be a non-empty string`);
        }
      });
    }
    if (typeof q.answer !== "number" || !Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) {
      errors.push(`${tag} (${q.id ?? "?"}): answer must be an integer 0..3`);
    }
    if (q.explainer != null && typeof q.explainer !== "string") {
      errors.push(`${tag} (${q.id ?? "?"}): explainer must be a string when present`);
    }
    if (q.visual != null && typeof q.visual !== "string") {
      errors.push(`${tag} (${q.id ?? "?"}): visual must be a string when present`);
    }
    if (typeof q.id === "string" && q.id) {
      if (allIds.has(q.id)) {
        errors.push(`duplicate id "${q.id}" in ${tag} and ${allIds.get(q.id)}`);
      } else {
        allIds.set(q.id, tag);
      }
    }
    totalQuestions += 1;
  });
}

if (errors.length) {
  console.error("Content validation FAILED:");
  errors.forEach((e) => console.error("  - " + e));
  console.error(`\n${errors.length} problem${errors.length === 1 ? "" : "s"} found across ${SUBJECTS.length} subjects.`);
  process.exit(1);
}

console.log(`OK — ${totalQuestions} questions across ${SUBJECTS.length} subjects, all valid.`);
