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

  // Feudal pyramid — stacked tiers showing the medieval social order.
  // Used by KS3 history "Medieval Realms" feudal system questions.
  "feudal-pyramid": [
    '<svg viewBox="0 0 280 220" role="img" aria-label="Feudal pyramid: King at top, then Barons, Knights, Peasants" class="mock-visual-svg">',
      '<g font-family="Inter, sans-serif" font-size="11" fill="currentColor" font-weight="700" letter-spacing="0.06em">',
        // Tier 1 — King (smallest, top)
        '<polygon points="120,20 160,20 168,52 112,52" fill="rgba(251,191,36,0.18)" stroke="#fbbf24" stroke-width="1.6"/>',
        '<text x="140" y="40" text-anchor="middle">KING</text>',
        // Tier 2 — Barons
        '<polygon points="112,56 168,56 180,92 100,92" fill="rgba(132,204,22,0.16)" stroke="#84cc16" stroke-width="1.6"/>',
        '<text x="140" y="78" text-anchor="middle">BARONS</text>',
        // Tier 3 — Knights
        '<polygon points="100,96 180,96 196,138 84,138" fill="rgba(34,211,238,0.16)" stroke="#22d3ee" stroke-width="1.6"/>',
        '<text x="140" y="121" text-anchor="middle">KNIGHTS</text>',
        // Tier 4 — Peasants (largest, bottom)
        '<polygon points="84,142 196,142 220,200 60,200" fill="rgba(249,115,22,0.16)" stroke="#f97316" stroke-width="1.6"/>',
        '<text x="140" y="178" text-anchor="middle">PEASANTS</text>',
      '</g>',
      '<g font-family="Inter, sans-serif" font-size="9" fill="currentColor" opacity="0.7">',
        '<text x="240" y="40">grants land</text>',
        '<text x="240" y="80">+ loyalty</text>',
        '<text x="240" y="125">military</text>',
        '<text x="240" y="178">labour</text>',
        '<line x1="226" y1="36" x2="236" y2="36" stroke="currentColor" opacity="0.5"/>',
      '</g>',
    '</svg>'
  ].join(""),

  // River meander — bend showing fast outer (erosion) and slow inner
  // (deposition) sides. KS3 geography rivers strand.
  "river-meander": [
    '<svg viewBox="0 0 320 160" role="img" aria-label="River meander showing erosion on the outer bank and deposition on the inner bank" class="mock-visual-svg">',
      // River channel as a curved band
      '<path d="M 20,40 Q 90,40 110,80 Q 130,120 200,120 Q 270,120 300,80" fill="none" stroke="#22d3ee" stroke-width="20" stroke-linecap="round" opacity="0.7"/>',
      '<path d="M 20,40 Q 90,40 110,80 Q 130,120 200,120 Q 270,120 300,80" fill="none" stroke="#0ea5e9" stroke-width="2" stroke-linecap="round"/>',
      // Erosion arrow on outer bank (pointing into the bank)
      '<g stroke="#fca5a5" fill="#fca5a5" stroke-width="1.5">',
        '<line x1="115" y1="25" x2="115" y2="58"/>',
        '<polyline points="110,52 115,58 120,52" fill="none"/>',
      '</g>',
      // Deposition arrow on inner bank
      '<g stroke="#84cc16" fill="#84cc16" stroke-width="1.5">',
        '<line x1="195" y1="142" x2="195" y2="105"/>',
        '<polyline points="190,111 195,105 200,111" fill="none"/>',
      '</g>',
      '<g font-family="Inter, sans-serif" font-size="10" fill="currentColor">',
        '<text x="115" y="18" text-anchor="middle" fill="#fca5a5" font-weight="700">EROSION</text>',
        '<text x="115" y="30" text-anchor="middle" font-size="8.5" opacity="0.75">(outer bank, fast flow)</text>',
        '<text x="195" y="156" text-anchor="middle" fill="#84cc16" font-weight="700">DEPOSITION</text>',
        '<text x="20" y="35" font-size="9" opacity="0.7">river flow</text>',
      '</g>',
    '</svg>'
  ].join(""),

  // Coastal erosion sequence — cliff → arch → stack → stump.
  "coast-stack": [
    '<svg viewBox="0 0 360 150" role="img" aria-label="Coastal erosion sequence: cliff, arch, stack, stump" class="mock-visual-svg">',
      '<line x1="10" y1="115" x2="350" y2="115" stroke="#22d3ee" stroke-width="2" opacity="0.6"/>',
      '<g fill="rgba(203,213,225,0.18)" stroke="#cbd5e1" stroke-width="1.6">',
        // 1. Cliff with vertical crack
        '<path d="M 18,115 L 18,40 L 70,40 L 70,115 Z"/>',
        '<line x1="48" y1="40" x2="48" y2="100" stroke="#fca5a5" stroke-width="1" stroke-dasharray="2 2"/>',
        // 2. Arch — cliff with sea hole
        '<path d="M 100,115 L 100,40 L 165,40 L 165,115 L 150,115 L 150,90 Q 142,75 132,90 L 132,115 Z"/>',
        // 3. Stack — separated tower
        '<rect x="200" y="60" width="32" height="55" />',
        '<path d="M 240,115 L 240,45 L 270,45 L 270,115 Z"/>',
        // 4. Stump — low remaining rock
        '<rect x="305" y="98" width="30" height="17"/>',
      '</g>',
      '<g font-family="Inter, sans-serif" font-size="10" fill="currentColor" text-anchor="middle" font-weight="700">',
        '<text x="44" y="135">CLIFF</text>',
        '<text x="132" y="135">ARCH</text>',
        '<text x="232" y="135">STACK</text>',
        '<text x="320" y="135">STUMP</text>',
      '</g>',
    '</svg>'
  ].join(""),

  // Contour rings — concentric ellipses around a hill summit, showing
  // how a 3D hill is represented on a 2D map. KS3 geography map skills.
  "contour-hill": [
    '<svg viewBox="0 0 240 160" role="img" aria-label="Concentric contour rings showing a hill summit" class="mock-visual-svg">',
      '<g fill="none" stroke="#84cc16" stroke-width="1.5" opacity="0.85">',
        '<ellipse cx="120" cy="80" rx="105" ry="55"/>',
        '<ellipse cx="120" cy="80" rx="80"  ry="42"/>',
        '<ellipse cx="120" cy="80" rx="55"  ry="28"/>',
        '<ellipse cx="120" cy="80" rx="30"  ry="15"/>',
        '<ellipse cx="120" cy="80" rx="10"  ry="5"/>',
      '</g>',
      '<g font-family="Inter, sans-serif" font-size="9" fill="currentColor" opacity="0.85">',
        '<text x="120" y="84" text-anchor="middle" font-weight="700">100 m</text>',
        '<text x="120" y="63" text-anchor="middle">90</text>',
        '<text x="120" y="48" text-anchor="middle">80</text>',
        '<text x="120" y="33" text-anchor="middle">70</text>',
        '<text x="120" y="18" text-anchor="middle">60</text>',
        '<text x="120" y="152" text-anchor="middle" font-style="italic">summit at the centre</text>',
      '</g>',
    '</svg>'
  ].join(""),

  // Solar system — sun + eight planets, ordered, simplified scale.
  "solar-system": [
    '<svg viewBox="0 0 360 90" role="img" aria-label="Solar system: Sun and eight planets in order" class="mock-visual-svg">',
      // Orbit guideline
      '<line x1="20" y1="45" x2="350" y2="45" stroke="rgba(255,255,255,0.12)" stroke-dasharray="2 4"/>',
      // Sun (left)
      '<circle cx="36" cy="45" r="18" fill="#fbbf24"/>',
      // Planets, roughly relative size, NOT to spatial scale
      '<g>',
        '<circle cx="80"  cy="45" r="3"  fill="#cbd5e1"/>',  // Mercury
        '<circle cx="105" cy="45" r="5"  fill="#fbbf24" opacity="0.8"/>', // Venus
        '<circle cx="135" cy="45" r="5.5" fill="#22d3ee"/>', // Earth
        '<circle cx="165" cy="45" r="4"  fill="#f97316"/>',  // Mars
        '<circle cx="210" cy="45" r="11" fill="#d97706"/>',  // Jupiter
        '<circle cx="255" cy="45" r="9"  fill="#fbbf24" opacity="0.6"/>', // Saturn
        '<circle cx="295" cy="45" r="7"  fill="#22d3ee" opacity="0.7"/>', // Uranus
        '<circle cx="330" cy="45" r="7"  fill="#3b82f6"/>',  // Neptune
        // Saturn ring
        '<ellipse cx="255" cy="45" rx="14" ry="3" fill="none" stroke="#fbbf24" stroke-width="1" opacity="0.7"/>',
      '</g>',
      '<g font-family="Inter, sans-serif" font-size="8" fill="currentColor" text-anchor="middle" opacity="0.85">',
        '<text x="36"  y="80" font-weight="700">Sun</text>',
        '<text x="80"  y="80">Me</text>',
        '<text x="105" y="80">V</text>',
        '<text x="135" y="80">E</text>',
        '<text x="165" y="80">Ma</text>',
        '<text x="210" y="80">J</text>',
        '<text x="255" y="80">S</text>',
        '<text x="295" y="80">U</text>',
        '<text x="330" y="80">N</text>',
      '</g>',
    '</svg>'
  ].join(""),

  // Triangle types — equilateral, isosceles, scalene, right-angled.
  "triangle-types": [
    '<svg viewBox="0 0 360 130" role="img" aria-label="Four triangle types: equilateral, isosceles, scalene, right-angled" class="mock-visual-svg">',
      '<g fill="rgba(132,204,22,0.10)" stroke="#84cc16" stroke-width="1.8" stroke-linejoin="round">',
        '<polygon points="40,90 80,30 120,90"/>',
        '<polygon points="170,90 200,30 230,90"/>',
        '<polygon points="245,90 285,40 325,90"/>',  // scalene approx
        '<polygon points="245,90 285,90 245,40"/>',  // right-angled — overlaid
      '</g>',
      // Equal-side ticks for equilateral
      '<g stroke="#84cc16" stroke-width="1.5" fill="none">',
        '<line x1="58" y1="62" x2="62" y2="58"/>',
        '<line x1="98" y1="58" x2="102" y2="62"/>',
        '<line x1="78" y1="92" x2="82" y2="88"/>',
      '</g>',
      // Equal-side ticks for isosceles (only the two slanted equal sides)
      '<g stroke="#84cc16" stroke-width="1.5" fill="none">',
        '<line x1="183" y1="62" x2="187" y2="58"/>',
        '<line x1="213" y1="58" x2="217" y2="62"/>',
      '</g>',
      // Right angle marker
      '<g stroke="#22d3ee" stroke-width="1.5" fill="none">',
        '<polyline points="252,84 252,90 258,90"/>',
      '</g>',
      '<g font-family="Inter, sans-serif" font-size="9" fill="currentColor" text-anchor="middle" font-weight="700">',
        '<text x="80"  y="112">EQUILATERAL</text>',
        '<text x="200" y="112">ISOSCELES</text>',
        '<text x="285" y="112">RIGHT-ANGLED</text>',
        // Scalene label is shifted up slightly because it overlaps right-angled box
        '<text x="285" y="124" font-size="8" opacity="0.7">(also scalene)</text>',
      '</g>',
    '</svg>'
  ].join(""),

  // Polygon family — pentagon, hexagon, octagon labelled with side count.
  "polygon-family": [
    '<svg viewBox="0 0 360 130" role="img" aria-label="Pentagon, hexagon and octagon side by side" class="mock-visual-svg">',
      '<g fill="rgba(34,211,238,0.10)" stroke="#22d3ee" stroke-width="1.8" stroke-linejoin="round">',
        // Pentagon — regular
        '<polygon points="60,30 95,55 82,95 38,95 25,55"/>',
        // Hexagon — regular
        '<polygon points="180,30 215,50 215,90 180,110 145,90 145,50"/>',
        // Octagon — regular
        '<polygon points="298,30 322,40 332,64 322,88 298,98 274,88 264,64 274,40"/>',
      '</g>',
      '<g font-family="Inter, sans-serif" font-size="9" fill="currentColor" text-anchor="middle" font-weight="700">',
        '<text x="60" y="118">PENTAGON</text>',
        '<text x="60" y="128" font-size="8" opacity="0.7">5 sides</text>',
        '<text x="180" y="124">HEXAGON</text>',
        '<text x="180" y="134" font-size="8" opacity="0.7">6 sides</text>',
        '<text x="298" y="116">OCTAGON</text>',
        '<text x="298" y="126" font-size="8" opacity="0.7">8 sides</text>',
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
  ].join(""),

  // Square numbers as actual squares — 1², 2², 3², 4² scaled to a common
  // base unit so the visual ratio matches the maths.
  "powers-grid": [
    '<svg viewBox="0 0 360 130" role="img" aria-label="Square numbers shown as actual squares" class="mock-visual-svg">',
      '<g font-family="Inter, sans-serif" font-size="10" fill="currentColor">',
        // 1² — single 16x16 square
        '<rect x="20" y="92" width="16" height="16" fill="rgba(34,211,238,0.18)" stroke="#22d3ee" stroke-width="1.5"/>',
        '<text x="28" y="124" text-anchor="middle" font-weight="700">1²</text>',
        '<text x="28" y="20" text-anchor="middle" font-size="9" opacity="0.7">= 1</text>',
        // 2² — 32x32 (= 4 unit cells)
        '<rect x="60" y="76" width="32" height="32" fill="rgba(34,211,238,0.18)" stroke="#22d3ee" stroke-width="1.5"/>',
        '<line x1="76" y1="76" x2="76" y2="108" stroke="#22d3ee" stroke-width="0.5" opacity="0.5"/>',
        '<line x1="60" y1="92" x2="92" y2="92" stroke="#22d3ee" stroke-width="0.5" opacity="0.5"/>',
        '<text x="76" y="124" text-anchor="middle" font-weight="700">2²</text>',
        '<text x="76" y="20" text-anchor="middle" font-size="9" opacity="0.7">= 4</text>',
        // 3² — 48x48 (= 9 unit cells)
        '<rect x="116" y="60" width="48" height="48" fill="rgba(132,204,22,0.18)" stroke="#84cc16" stroke-width="1.5"/>',
        '<line x1="132" y1="60" x2="132" y2="108" stroke="#84cc16" stroke-width="0.5" opacity="0.5"/>',
        '<line x1="148" y1="60" x2="148" y2="108" stroke="#84cc16" stroke-width="0.5" opacity="0.5"/>',
        '<line x1="116" y1="76" x2="164" y2="76" stroke="#84cc16" stroke-width="0.5" opacity="0.5"/>',
        '<line x1="116" y1="92" x2="164" y2="92" stroke="#84cc16" stroke-width="0.5" opacity="0.5"/>',
        '<text x="140" y="124" text-anchor="middle" font-weight="700">3²</text>',
        '<text x="140" y="50" text-anchor="middle" font-size="9" opacity="0.7">= 9</text>',
        // 4² — 64x64 (= 16 unit cells)
        '<rect x="196" y="44" width="64" height="64" fill="rgba(251,191,36,0.18)" stroke="#fbbf24" stroke-width="1.5"/>',
        '<line x1="212" y1="44" x2="212" y2="108" stroke="#fbbf24" stroke-width="0.5" opacity="0.5"/>',
        '<line x1="228" y1="44" x2="228" y2="108" stroke="#fbbf24" stroke-width="0.5" opacity="0.5"/>',
        '<line x1="244" y1="44" x2="244" y2="108" stroke="#fbbf24" stroke-width="0.5" opacity="0.5"/>',
        '<line x1="196" y1="60" x2="260" y2="60" stroke="#fbbf24" stroke-width="0.5" opacity="0.5"/>',
        '<line x1="196" y1="76" x2="260" y2="76" stroke="#fbbf24" stroke-width="0.5" opacity="0.5"/>',
        '<line x1="196" y1="92" x2="260" y2="92" stroke="#fbbf24" stroke-width="0.5" opacity="0.5"/>',
        '<text x="228" y="124" text-anchor="middle" font-weight="700">4²</text>',
        '<text x="228" y="34" text-anchor="middle" font-size="9" opacity="0.7">= 16</text>',
        // 5² — outline only at 80x80 to keep diagram in frame
        '<rect x="276" y="28" width="80" height="80" fill="rgba(249,115,22,0.18)" stroke="#f97316" stroke-width="1.5"/>',
        '<text x="316" y="124" text-anchor="middle" font-weight="700">5²</text>',
        '<text x="316" y="18" text-anchor="middle" font-size="9" opacity="0.7">= 25</text>',
      '</g>',
    '</svg>'
  ].join(""),

  // Word classes — eight small swatches with a class name + example word.
  "word-classes-chart": [
    '<svg viewBox="0 0 360 200" role="img" aria-label="The eight main word classes with examples" class="mock-visual-svg">',
      '<g font-family="Inter, sans-serif" font-size="10" fill="currentColor">',
        '<rect x="14" y="14" width="76" height="40" rx="6" fill="rgba(34,211,238,0.18)" stroke="#22d3ee"/>',
        '<text x="52" y="30" text-anchor="middle" font-weight="700">NOUN</text>',
        '<text x="52" y="44" text-anchor="middle" font-size="9" opacity="0.7">cat · idea</text>',
        '<rect x="100" y="14" width="76" height="40" rx="6" fill="rgba(132,204,22,0.18)" stroke="#84cc16"/>',
        '<text x="138" y="30" text-anchor="middle" font-weight="700">VERB</text>',
        '<text x="138" y="44" text-anchor="middle" font-size="9" opacity="0.7">run · is</text>',
        '<rect x="186" y="14" width="76" height="40" rx="6" fill="rgba(251,191,36,0.18)" stroke="#fbbf24"/>',
        '<text x="224" y="30" text-anchor="middle" font-weight="700">ADJECTIVE</text>',
        '<text x="224" y="44" text-anchor="middle" font-size="9" opacity="0.7">huge · blue</text>',
        '<rect x="272" y="14" width="76" height="40" rx="6" fill="rgba(249,115,22,0.18)" stroke="#f97316"/>',
        '<text x="310" y="30" text-anchor="middle" font-weight="700">ADVERB</text>',
        '<text x="310" y="44" text-anchor="middle" font-size="9" opacity="0.7">quickly · very</text>',
        '<rect x="14" y="72" width="76" height="40" rx="6" fill="rgba(168,85,247,0.18)" stroke="#a855f7"/>',
        '<text x="52" y="88" text-anchor="middle" font-weight="700">PRONOUN</text>',
        '<text x="52" y="102" text-anchor="middle" font-size="9" opacity="0.7">he · she · it</text>',
        '<rect x="100" y="72" width="76" height="40" rx="6" fill="rgba(244,114,182,0.18)" stroke="#f472b6"/>',
        '<text x="138" y="88" text-anchor="middle" font-weight="700">PREPOSITION</text>',
        '<text x="138" y="102" text-anchor="middle" font-size="9" opacity="0.7">under · into</text>',
        '<rect x="186" y="72" width="76" height="40" rx="6" fill="rgba(45,212,191,0.18)" stroke="#2dd4bf"/>',
        '<text x="224" y="88" text-anchor="middle" font-weight="700">CONJUNCTION</text>',
        '<text x="224" y="102" text-anchor="middle" font-size="9" opacity="0.7">and · because</text>',
        '<rect x="272" y="72" width="76" height="40" rx="6" fill="rgba(125,211,252,0.18)" stroke="#7dd3fc"/>',
        '<text x="310" y="88" text-anchor="middle" font-weight="700">DETERMINER</text>',
        '<text x="310" y="102" text-anchor="middle" font-size="9" opacity="0.7">the · this · my</text>',
        // Example sentence at the bottom
        '<text x="180" y="138" text-anchor="middle" font-weight="700" font-size="11">"The huge dog barked loudly under the table."</text>',
        '<text x="180" y="158" text-anchor="middle" font-size="9" opacity="0.7">DET · ADJ · NOUN · VERB · ADV · PREP · DET · NOUN</text>',
      '</g>',
    '</svg>'
  ].join(""),

  // Figurative-language quick reference — five technique cards with a
  // worked example for each.
  "figurative-quick-ref": [
    '<svg viewBox="0 0 360 220" role="img" aria-label="Quick reference for figurative language techniques" class="mock-visual-svg">',
      '<g font-family="Inter, sans-serif" font-size="10" fill="currentColor">',
        '<rect x="14" y="14" width="160" height="46" rx="6" fill="rgba(34,211,238,0.14)" stroke="#22d3ee"/>',
        '<text x="22" y="30" font-weight="700">SIMILE</text>',
        '<text x="22" y="44" font-size="9" opacity="0.85">like / as</text>',
        '<text x="22" y="56" font-size="9" font-style="italic" opacity="0.7">"as quiet as a mouse"</text>',
        '<rect x="184" y="14" width="160" height="46" rx="6" fill="rgba(132,204,22,0.14)" stroke="#84cc16"/>',
        '<text x="192" y="30" font-weight="700">METAPHOR</text>',
        '<text x="192" y="44" font-size="9" opacity="0.85">is / was</text>',
        '<text x="192" y="56" font-size="9" font-style="italic" opacity="0.7">"the classroom was a zoo"</text>',
        '<rect x="14" y="72" width="160" height="46" rx="6" fill="rgba(251,191,36,0.14)" stroke="#fbbf24"/>',
        '<text x="22" y="88" font-weight="700">PERSONIFICATION</text>',
        '<text x="22" y="102" font-size="9" opacity="0.85">human action for non-human</text>',
        '<text x="22" y="114" font-size="9" font-style="italic" opacity="0.7">"the wind whispered"</text>',
        '<rect x="184" y="72" width="160" height="46" rx="6" fill="rgba(249,115,22,0.14)" stroke="#f97316"/>',
        '<text x="192" y="88" font-weight="700">ALLITERATION</text>',
        '<text x="192" y="102" font-size="9" opacity="0.85">same starting sound</text>',
        '<text x="192" y="114" font-size="9" font-style="italic" opacity="0.7">"slithering, slimy snakes"</text>',
        '<rect x="100" y="130" width="160" height="46" rx="6" fill="rgba(244,114,182,0.14)" stroke="#f472b6"/>',
        '<text x="108" y="146" font-weight="700">ONOMATOPOEIA</text>',
        '<text x="108" y="160" font-size="9" opacity="0.85">word sounds like the noise</text>',
        '<text x="108" y="172" font-size="9" font-style="italic" opacity="0.7">"bang!" · "splat!"</text>',
        '<text x="180" y="200" text-anchor="middle" font-size="9" opacity="0.6">When you spot one, ask: what effect does it have on the reader?</text>',
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
