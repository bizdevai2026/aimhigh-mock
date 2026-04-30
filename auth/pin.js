// GradeBlaze — PIN hashing.
//
// THE ONLY MODULE THAT TOUCHES crypto.subtle.
//
// PINs are stored only as SHA-256 hex digests. This is privacy, not
// security: a determined attacker can read the page source and bypass
// any client-side gate. The point is to keep random passers-by,
// classmates, or anyone who finds the URL out of the kid's progress
// data.

export async function hashPin(pin) {
  const buf = new TextEncoder().encode(String(pin));
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map(function (b) { return b.toString(16).padStart(2, "0"); })
    .join("");
}
