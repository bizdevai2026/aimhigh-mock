// AimHigh Mock Prep — inline SVG visuals for high-leverage topics.
//
// Each visual is an inline SVG keyed by a stable id. Questions in the
// data/<subject>.json files can attach a `visual` field whose value is
// one of these keys; the runners then render the SVG above the prompt.
//
// Themed via CSS variables from mock.css so it sits comfortably on the
// dark training-mode surface. Targeting the topics where a diagram
// genuinely accelerates comprehension over plain text.

const VISUALS = {
  // Animal vs plant cell — two side-by-side simplified diagrams with
  // the key organelle labels that appear in Year 7 cells questions.
  "cell-comparison": [
    '<svg viewBox="0 0 360 180" role="img" aria-label="Animal and plant cell comparison" class="mock-visual-svg">',
      '<g font-family="Inter, sans-serif" font-size="10" fill="currentColor">',
        // Animal cell — round
        '<text x="80" y="20" text-anchor="middle" font-weight="700" letter-spacing="0.06em">ANIMAL CELL</text>',
        '<ellipse cx="80" cy="100" rx="55" ry="45" fill="rgba(132,204,22,0.10)" stroke="#84cc16" stroke-width="2"/>',
        '<circle cx="80" cy="100" r="14" fill="rgba(34,211,238,0.20)" stroke="#22d3ee" stroke-width="1.5"/>',
        '<text x="80" y="103" text-anchor="middle" fill="currentColor" font-size="8">nucleus</text>',
        '<text x="80" y="65" text-anchor="middle" fill="currentColor" font-size="8">cell membrane</text>',
        // Plant cell — rectangular with cell wall
        '<text x="280" y="20" text-anchor="middle" font-weight="700" letter-spacing="0.06em">PLANT CELL</text>',
        '<rect x="225" y="55" width="110" height="90" rx="6" fill="rgba(132,204,22,0.06)" stroke="#84cc16" stroke-width="2.5"/>',
        '<rect x="232" y="62" width="96" height="76" rx="3" fill="rgba(132,204,22,0.10)" stroke="#84cc16" stroke-width="1"/>',
        '<circle cx="280" cy="100" r="13" fill="rgba(34,211,238,0.20)" stroke="#22d3ee" stroke-width="1.5"/>',
        '<text x="280" y="103" text-anchor="middle" font-size="8">nucleus</text>',
        '<ellipse cx="265" cy="120" rx="6" ry="3" fill="#84cc16"/>',
        '<ellipse cx="295" cy="125" rx="6" ry="3" fill="#84cc16"/>',
        '<ellipse cx="280" cy="135" rx="5" ry="2.5" fill="#84cc16"/>',
        '<text x="280" y="160" text-anchor="middle" font-size="8">chloroplasts &middot; cell wall</text>',
      '</g>',
    '</svg>'
  ].join(""),

  // Particle states — three boxes showing solid lattice, liquid clusters, gas spread.
  "particle-states": [
    '<svg viewBox="0 0 360 140" role="img" aria-label="Particle arrangement in solid, liquid and gas" class="mock-visual-svg">',
      '<g font-family="Inter, sans-serif" font-size="10" fill="currentColor">',
        '<text x="60" y="18" text-anchor="middle" font-weight="700">SOLID</text>',
        '<text x="180" y="18" text-anchor="middle" font-weight="700">LIQUID</text>',
        '<text x="300" y="18" text-anchor="middle" font-weight="700">GAS</text>',
        // boxes
        '<rect x="14" y="28" width="92" height="92" rx="6" fill="rgba(132,204,22,0.06)" stroke="#84cc16" stroke-width="1.5"/>',
        '<rect x="134" y="28" width="92" height="92" rx="6" fill="rgba(34,211,238,0.06)" stroke="#22d3ee" stroke-width="1.5"/>',
        '<rect x="254" y="28" width="92" height="92" rx="6" fill="rgba(249,115,22,0.06)" stroke="#f97316" stroke-width="1.5"/>',
      '</g>',
      // solid: 4x4 grid lattice
      '<g fill="#84cc16">',
        '<circle cx="34" cy="48" r="5"/>', '<circle cx="58" cy="48" r="5"/>', '<circle cx="82" cy="48" r="5"/>', '<circle cx="34" cy="72" r="5"/>',
        '<circle cx="58" cy="72" r="5"/>', '<circle cx="82" cy="72" r="5"/>', '<circle cx="34" cy="96" r="5"/>', '<circle cx="58" cy="96" r="5"/>',
        '<circle cx="82" cy="96" r="5"/>',
      '</g>',
      // liquid: clustered but irregular
      '<g fill="#22d3ee">',
        '<circle cx="150" cy="50" r="5"/>', '<circle cx="166" cy="56" r="5"/>', '<circle cx="180" cy="46" r="5"/>',
        '<circle cx="200" cy="58" r="5"/>', '<circle cx="158" cy="76" r="5"/>', '<circle cx="178" cy="78" r="5"/>',
        '<circle cx="196" cy="86" r="5"/>', '<circle cx="148" cy="96" r="5"/>', '<circle cx="172" cy="100" r="5"/>',
        '<circle cx="194" cy="105" r="5"/>',
      '</g>',
      // gas: scattered widely
      '<g fill="#f97316">',
        '<circle cx="270" cy="45" r="5"/>', '<circle cx="332" cy="50" r="5"/>',
        '<circle cx="285" cy="78" r="5"/>', '<circle cx="318" cy="92" r="5"/>',
        '<circle cx="298" cy="108" r="5"/>',
      '</g>',
    '</svg>'
  ].join(""),

  // pH scale — coloured horizontal bar with 0..14 labels and acid/alkali split.
  "ph-scale": [
    '<svg viewBox="0 0 360 110" role="img" aria-label="pH scale from 0 to 14" class="mock-visual-svg">',
      '<defs>',
        '<linearGradient id="phGrad" x1="0%" y1="0%" x2="100%" y2="0%">',
          '<stop offset="0%" stop-color="#dc2626"/>',
          '<stop offset="20%" stop-color="#f97316"/>',
          '<stop offset="35%" stop-color="#fbbf24"/>',
          '<stop offset="50%" stop-color="#84cc16"/>',
          '<stop offset="65%" stop-color="#22d3ee"/>',
          '<stop offset="80%" stop-color="#3b82f6"/>',
          '<stop offset="100%" stop-color="#7c3aed"/>',
        '</linearGradient>',
      '</defs>',
      '<rect x="20" y="40" width="320" height="30" rx="6" fill="url(#phGrad)" stroke="rgba(255,255,255,0.15)"/>',
      '<g font-family="Inter, sans-serif" font-size="10" fill="currentColor" text-anchor="middle">',
        '<text x="20" y="34">0</text><text x="64" y="34">2</text><text x="108" y="34">4</text>',
        '<text x="180" y="34" font-weight="700">7</text>',
        '<text x="252" y="34">10</text><text x="296" y="34">12</text><text x="340" y="34">14</text>',
      '</g>',
      '<g font-family="Inter, sans-serif" font-size="11" fill="currentColor" text-anchor="middle" font-weight="700" letter-spacing="0.08em">',
        '<text x="100" y="92">ACID</text>',
        '<text x="180" y="92">NEUTRAL</text>',
        '<text x="260" y="92">ALKALI</text>',
      '</g>',
      '<line x1="180" y1="36" x2="180" y2="74" stroke="currentColor" stroke-width="1.5"/>',
    '</svg>'
  ].join(""),

  // Sound wave — sine wave with amplitude and wavelength labels.
  "sound-wave": [
    '<svg viewBox="0 0 360 130" role="img" aria-label="Sound wave with amplitude and wavelength" class="mock-visual-svg">',
      '<line x1="20" y1="65" x2="340" y2="65" stroke="rgba(255,255,255,0.18)" stroke-dasharray="3 3"/>',
      '<path d="M 20,65 Q 60,15 100,65 T 180,65 T 260,65 T 340,65" fill="none" stroke="#84cc16" stroke-width="2.5"/>',
      // amplitude marker
      '<line x1="60" y1="65" x2="60" y2="20" stroke="#22d3ee" stroke-width="1.5"/>',
      '<line x1="55" y1="20" x2="65" y2="20" stroke="#22d3ee" stroke-width="1.5"/>',
      '<text x="70" y="35" font-family="Inter, sans-serif" font-size="11" fill="#22d3ee">amplitude</text>',
      // wavelength marker
      '<line x1="100" y1="105" x2="180" y2="105" stroke="#fbbf24" stroke-width="1.5"/>',
      '<line x1="100" y1="100" x2="100" y2="110" stroke="#fbbf24" stroke-width="1.5"/>',
      '<line x1="180" y1="100" x2="180" y2="110" stroke="#fbbf24" stroke-width="1.5"/>',
      '<text x="140" y="120" font-family="Inter, sans-serif" font-size="11" fill="#fbbf24" text-anchor="middle">wavelength</text>',
    '</svg>'
  ].join(""),

  // Function machine — input/output boxes with two operations.
  "function-machine": [
    '<svg viewBox="0 0 360 90" role="img" aria-label="Function machine: input through two operations to output" class="mock-visual-svg">',
      '<g font-family="Inter, sans-serif" font-size="11" fill="currentColor">',
        // input
        '<rect x="14" y="30" width="60" height="32" rx="6" fill="rgba(132,204,22,0.10)" stroke="#84cc16" stroke-width="1.5"/>',
        '<text x="44" y="51" text-anchor="middle" font-weight="700">input</text>',
        // arrow
        '<line x1="74" y1="46" x2="100" y2="46" stroke="currentColor" stroke-width="1.5"/>',
        '<polyline points="94,42 100,46 94,50" fill="none" stroke="currentColor" stroke-width="1.5"/>',
        // box 1
        '<rect x="100" y="30" width="60" height="32" rx="6" fill="rgba(34,211,238,0.10)" stroke="#22d3ee" stroke-width="1.5"/>',
        '<text x="130" y="51" text-anchor="middle" font-weight="700">+ 5</text>',
        // arrow
        '<line x1="160" y1="46" x2="186" y2="46" stroke="currentColor" stroke-width="1.5"/>',
        '<polyline points="180,42 186,46 180,50" fill="none" stroke="currentColor" stroke-width="1.5"/>',
        // box 2
        '<rect x="186" y="30" width="60" height="32" rx="6" fill="rgba(34,211,238,0.10)" stroke="#22d3ee" stroke-width="1.5"/>',
        '<text x="216" y="51" text-anchor="middle" font-weight="700">&times; 2</text>',
        // arrow
        '<line x1="246" y1="46" x2="272" y2="46" stroke="currentColor" stroke-width="1.5"/>',
        '<polyline points="266,42 272,46 266,50" fill="none" stroke="currentColor" stroke-width="1.5"/>',
        // output
        '<rect x="272" y="30" width="60" height="32" rx="6" fill="rgba(251,191,36,0.12)" stroke="#fbbf24" stroke-width="1.5"/>',
        '<text x="302" y="51" text-anchor="middle" font-weight="700">output</text>',
      '</g>',
    '</svg>'
  ].join(""),

  // Distance-time graph — two diagonal lines + one horizontal.
  "distance-time": [
    '<svg viewBox="0 0 280 160" role="img" aria-label="Distance-time graph showing fast, slow and stationary lines" class="mock-visual-svg">',
      // axes
      '<line x1="40" y1="20" x2="40" y2="130" stroke="currentColor" stroke-width="1.5"/>',
      '<line x1="40" y1="130" x2="260" y2="130" stroke="currentColor" stroke-width="1.5"/>',
      // axis labels
      '<g font-family="Inter, sans-serif" font-size="10" fill="currentColor">',
        '<text x="20" y="18">distance</text>',
        '<text x="240" y="146">time</text>',
        // lines
        '<line x1="40" y1="130" x2="120" y2="40" stroke="#84cc16" stroke-width="2.5"/>',
        '<text x="124" y="44" fill="#84cc16">fast</text>',
        '<line x1="40" y1="130" x2="180" y2="80" stroke="#22d3ee" stroke-width="2.5"/>',
        '<text x="184" y="84" fill="#22d3ee">slow</text>',
        '<line x1="40" y1="110" x2="180" y2="110" stroke="#f97316" stroke-width="2.5"/>',
        '<text x="184" y="114" fill="#f97316">stationary</text>',
      '</g>',
    '</svg>'
  ].join(""),

  // Skeleton stick figure with bone labels.
  "skeleton": [
    '<svg viewBox="0 0 200 220" role="img" aria-label="Simplified human skeleton with key bones" class="mock-visual-svg">',
      '<g stroke="#cbd5e1" stroke-width="2.5" fill="none" stroke-linecap="round">',
        '<circle cx="100" cy="32" r="14" fill="rgba(255,255,255,0.05)"/>',
        '<line x1="100" y1="46" x2="100" y2="120"/>',
        // ribs as horizontal lines
        '<line x1="80" y1="62" x2="120" y2="62"/>',
        '<line x1="78" y1="74" x2="122" y2="74"/>',
        '<line x1="78" y1="86" x2="122" y2="86"/>',
        '<line x1="80" y1="98" x2="120" y2="98"/>',
        // arms
        '<line x1="100" y1="58" x2="64" y2="100"/>',
        '<line x1="64" y1="100" x2="60" y2="138"/>',
        '<line x1="100" y1="58" x2="136" y2="100"/>',
        '<line x1="136" y1="100" x2="140" y2="138"/>',
        // pelvis + legs
        '<line x1="80" y1="120" x2="120" y2="120"/>',
        '<line x1="84" y1="120" x2="80" y2="180"/>',
        '<line x1="80" y1="180" x2="74" y2="208"/>',
        '<line x1="116" y1="120" x2="120" y2="180"/>',
        '<line x1="120" y1="180" x2="126" y2="208"/>',
      '</g>',
      '<g font-family="Inter, sans-serif" font-size="10" fill="currentColor">',
        '<text x="120" y="36">skull</text>',
        '<text x="44" y="80" text-anchor="end">ribs</text>',
        '<text x="148" y="106">arm</text>',
        '<text x="146" y="178">femur</text>',
      '</g>',
    '</svg>'
  ].join("")
};

export function getVisual(key) {
  if (!key) return null;
  return VISUALS[key] || null;
}

export function listVisualKeys() {
  return Object.keys(VISUALS);
}
