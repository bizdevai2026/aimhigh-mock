// AimHigh Mock Prep — weekly timetable.
//
// Mapped from the boy's school timetable (school-source/20260425_142507.jpg).
// Used to show "today's lessons" on the landing page so he can drill the
// subjects he just had today. Saturday and Sunday return empty (rest days).
//
// Subject ids match the ones in questions.js / data/<subject>.json so a
// click can deep-link to the right subject hub.

const TIMETABLE = {
  // 0 = Sunday, 1 = Monday ... 6 = Saturday
  0: [],
  1: ["geography", "english", "science", "maths", "history"],
  2: ["english", "maths", "science", "computing"],
  3: ["maths", "english", "french"],
  4: ["geography"],
  5: ["science", "history", "english", "french"],
  6: []
};

export function todaysSubjects() {
  const day = new Date().getDay();
  return (TIMETABLE[day] || []).slice();
}

export function isSchoolDay() {
  return todaysSubjects().length > 0;
}

export function dayName() {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[new Date().getDay()];
}
