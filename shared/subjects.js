// GradeBlaze — subject and topic display helpers.
//
// Brand-coloured tones per subject (used by tile borders, session
// card accents, ladder pills) and the prettifier that turns a
// kebab-case topic id into a Title Case display name.
//
// Tones are kept here because they're presentation, not domain. The
// canonical id list of subjects lives in domain/content/registry.js
// and is also mirrored in the SUBJECTS constant in questions.js for
// back-compat — that mirror will be retired once the practice runners
// migrate fully to the registry.

const SUBJECT_TONES = {
  science:   "#84cc16",
  maths:     "#22d3ee",
  english:   "#f97316",
  french:    "#fbbf24",
  history:   "#c2750a",
  geography: "#22d3ee",
  computing: "#84cc16"
};

// CSS hex tone for a subject. Used as the --tile-color custom property
// on session cards, tile borders, eyebrow chips. Returns the science
// lime as a sensible default for unknown ids.
export function subjectTone(subject) {
  return SUBJECT_TONES[subject] || SUBJECT_TONES.science;
}

// Synonym, kept because warmup.js's old code used `subjectColor` while
// learn.js / sprint.js used `subjectTone`. Both call the same function.
export const subjectColor = subjectTone;

// Prettifier: "particles-states" → "Particles States". Used wherever
// we display a topic id without a richer LEARN title to fall back on.
export function prettyTopic(t) {
  if (!t) return "";
  return String(t).replace(/-/g, " ").replace(/\b\w/g, function (c) {
    return c.toUpperCase();
  });
}
