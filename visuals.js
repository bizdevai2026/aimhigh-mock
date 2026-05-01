// AimHigh Mock Prep — inline SVG visuals for high-leverage topics.
//
// Each visual is an inline SVG keyed by a stable id. Questions in the
// data/<subject>.json files can attach a `visual` field whose value is
// one of these keys; the runners then render the SVG above the prompt.
//
// VISUAL STYLE
// ============
// All visuals share a refined cobalt-premium design language matching
// the Deep cobalt theme:
//   - palette: cobalt #6da7ff, coral #ff5e3a, gold #ffd13a, jade
//     #5eead4, pink #ff7eb9, lavender #c0a3f5
//   - gradient fills under shape outlines
//   - external callout lines + chip labels (no labels squeezed inside
//     small shapes)
//   - light grid under graphs/maps; scale bars where applicable
//   - readable on the dark navy session card AND on the light theme
//
// AI-HYBRID BACKDROPS
// ===================
// Five high-impact "atmospheric" topics support an optional PNG
// backdrop (assets/visuals/<key>.png), generated externally from the
// prompts in design/visuals-prompts.md. The SVG sits on top as the
// precision layer. If the PNG file isn't present yet the <img> simply
// fails to load and self-removes — the SVG-only version still renders
// cleanly. So this code can ship before any PNG exists.

const BACKDROPS = {
  "cell-comparison": "assets/visuals/cell-comparison.png",
  "river-meander":   "assets/visuals/river-meander.png",
  "coast-stack":     "assets/visuals/coast-stack.png",
  "solar-system":    "assets/visuals/solar-system.png",
  "feudal-pyramid":  "assets/visuals/feudal-pyramid.png"
};

const VISUALS = {

  // === SCIENCE ============================================================

  // Animal vs plant cell — side-by-side with external callout labels.
  "cell-comparison": [
    '<svg viewBox="0 0 360 200" role="img" aria-label="Animal and plant cell comparison" overflow="visible" class="mock-visual-svg">',
      '<defs>',
        '<radialGradient id="cellAniRef" cx="50%" cy="40%">',
          '<stop offset="0%" stop-color="#243054"/>',
          '<stop offset="100%" stop-color="#1a2440"/>',
        '</radialGradient>',
        '<radialGradient id="cellPlnRef" cx="50%" cy="40%">',
          '<stop offset="0%" stop-color="#2a3a5e"/>',
          '<stop offset="100%" stop-color="#1f2c4d"/>',
        '</radialGradient>',
      '</defs>',
      '<g transform="translate(85, 100)">',
        '<ellipse cx="0" cy="0" rx="55" ry="45" fill="url(#cellAniRef)" stroke="#6da7ff" stroke-width="1.5"/>',
        '<circle cx="-2" cy="0" r="13" fill="#1a2440" stroke="#ff5e3a" stroke-width="1.5"/>',
        '<circle cx="-2" cy="0" r="4" fill="#ff5e3a" opacity="0.6"/>',
        '<ellipse cx="22" cy="-12" rx="6" ry="3" fill="#ffd13a" opacity="0.85"/>',
        '<ellipse cx="20" cy="20" rx="5" ry="2.5" fill="#ffd13a" opacity="0.85"/>',
        '<ellipse cx="-24" cy="22" rx="5" ry="2.5" fill="#ffd13a" opacity="0.85"/>',
      '</g>',
      '<g font-family="Outfit, sans-serif" font-size="11" fill="#c4cce0" font-weight="500">',
        // Labels positioned safely INSIDE the viewBox (origin 0,0 → 360,200).
        // Earlier version put nucleus + cell-membrane labels at x=14 with
        // text-anchor="end" so the words extended OUT of the viewBox to the
        // left. On phone-sized renders the parent .mock-visual-stack clips
        // overflow and the user saw "leus" instead of "nucleus".
        '<line x1="83" y1="100" x2="38" y2="55" stroke="#6da7ff" stroke-width="0.8" opacity="0.6"/>',
        '<text x="36" y="51" text-anchor="end">nucleus</text>',
        '<line x1="107" y1="88" x2="158" y2="60" stroke="#ffd13a" stroke-width="0.8" opacity="0.6"/>',
        '<text x="160" y="56">mitochondrion</text>',
        '<line x1="42" y1="115" x2="42" y2="155" stroke="#6da7ff" stroke-width="0.8" opacity="0.6"/>',
        '<text x="40" y="167" text-anchor="middle">cell membrane</text>',
      '</g>',
      '<g transform="translate(275, 100)">',
        '<rect x="-55" y="-45" width="110" height="90" rx="6" fill="#1a2440" stroke="#6da7ff" stroke-width="2.5"/>',
        '<rect x="-50" y="-40" width="100" height="80" rx="3" fill="url(#cellPlnRef)" stroke="#6da7ff" stroke-width="0.8" opacity="0.9"/>',
        '<circle cx="0" cy="-5" r="13" fill="#1a2440" stroke="#ff5e3a" stroke-width="1.5"/>',
        '<circle cx="0" cy="-5" r="4" fill="#ff5e3a" opacity="0.6"/>',
        '<ellipse cx="-22" cy="20" rx="7" ry="3.5" fill="#5eead4" opacity="0.9"/>',
        '<ellipse cx="0" cy="25" rx="7" ry="3.5" fill="#5eead4" opacity="0.9"/>',
        '<ellipse cx="22" cy="18" rx="7" ry="3.5" fill="#5eead4" opacity="0.9"/>',
      '</g>',
      '<g font-family="Outfit, sans-serif" font-size="11" fill="#c4cce0" font-weight="500">',
        '<line x1="220" y1="60" x2="195" y2="40" stroke="#6da7ff" stroke-width="0.8" opacity="0.6"/>',
        '<text x="190" y="36" text-anchor="end">cell wall</text>',
        '<line x1="275" y1="120" x2="260" y2="148" stroke="#5eead4" stroke-width="0.8" opacity="0.6"/>',
        '<text x="260" y="160">chloroplasts</text>',
      '</g>',
      '<g font-family="Outfit, sans-serif" font-weight="700" font-size="11" fill="#f0f4ff" letter-spacing="0.08em">',
        '<text x="85" y="22" text-anchor="middle">ANIMAL</text>',
        '<text x="275" y="22" text-anchor="middle">PLANT</text>',
      '</g>',
    '</svg>'
  ].join(""),

  // Particle states — solid lattice / liquid cluster / gas spread.
  "particle-states": [
    '<svg viewBox="0 0 360 180" role="img" aria-label="Particle arrangement in solid, liquid and gas" overflow="visible" class="mock-visual-svg">',
      '<defs>',
        '<linearGradient id="psBox" x1="0%" x2="0%" y1="0%" y2="100%">',
          '<stop offset="0%" stop-color="#243054"/>',
          '<stop offset="100%" stop-color="#1a2440"/>',
        '</linearGradient>',
      '</defs>',
      '<rect x="14" y="40" width="100" height="100" rx="8" fill="url(#psBox)" stroke="#6da7ff" stroke-width="1.2"/>',
      '<rect x="130" y="40" width="100" height="100" rx="8" fill="url(#psBox)" stroke="#ff5e3a" stroke-width="1.2"/>',
      '<rect x="246" y="40" width="100" height="100" rx="8" fill="url(#psBox)" stroke="#ffd13a" stroke-width="1.2"/>',
      // solid: regular grid
      '<g fill="#6da7ff">',
        '<circle cx="34" cy="60" r="5"/><circle cx="60" cy="60" r="5"/><circle cx="86" cy="60" r="5"/>',
        '<circle cx="34" cy="86" r="5"/><circle cx="60" cy="86" r="5"/><circle cx="86" cy="86" r="5"/>',
        '<circle cx="34" cy="112" r="5"/><circle cx="60" cy="112" r="5"/><circle cx="86" cy="112" r="5"/>',
      '</g>',
      // liquid: clustered
      '<g fill="#ff5e3a">',
        '<circle cx="146" cy="68" r="5"/><circle cx="164" cy="74" r="5"/><circle cx="180" cy="62" r="5"/>',
        '<circle cx="200" cy="76" r="5"/><circle cx="156" cy="92" r="5"/><circle cx="178" cy="96" r="5"/>',
        '<circle cx="198" cy="106" r="5"/><circle cx="148" cy="118" r="5"/><circle cx="172" cy="120" r="5"/>',
        '<circle cx="194" cy="124" r="5"/>',
      '</g>',
      // gas: scattered
      '<g fill="#ffd13a">',
        '<circle cx="262" cy="60" r="5"/><circle cx="324" cy="68" r="5"/>',
        '<circle cx="278" cy="98" r="5"/><circle cx="312" cy="110" r="5"/>',
        '<circle cx="290" cy="128" r="5"/>',
      '</g>',
      // chip labels above each box
      '<g font-family="Outfit, sans-serif" font-weight="700" font-size="10" letter-spacing="0.12em">',
        '<rect x="34" y="14" width="60" height="20" rx="4" fill="#1a2440" stroke="#6da7ff" stroke-width="1"/>',
        '<text x="64" y="28" text-anchor="middle" fill="#6da7ff">SOLID</text>',
        '<rect x="150" y="14" width="60" height="20" rx="4" fill="#1a2440" stroke="#ff5e3a" stroke-width="1"/>',
        '<text x="180" y="28" text-anchor="middle" fill="#ff5e3a">LIQUID</text>',
        '<rect x="266" y="14" width="60" height="20" rx="4" fill="#1a2440" stroke="#ffd13a" stroke-width="1"/>',
        '<text x="296" y="28" text-anchor="middle" fill="#ffd13a">GAS</text>',
      '</g>',
      // kinetic-energy footnote
      '<g font-family="Outfit, sans-serif" font-size="11" fill="#8a92a8" text-anchor="middle">',
        '<text x="64" y="158">low energy · fixed</text>',
        '<text x="180" y="158">medium · flowing</text>',
        '<text x="296" y="158">high · free</text>',
      '</g>',
    '</svg>'
  ].join(""),

  // pH scale — coloured bar with neutral marker, acid/alkali chips.
  "ph-scale": [
    '<svg viewBox="0 0 360 130" role="img" aria-label="pH scale from 0 to 14" overflow="visible" class="mock-visual-svg">',
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
      // tick marks 0..14
      '<g stroke="#8a92a8" stroke-width="0.8">',
        '<line x1="20" y1="76" x2="20" y2="80"/>',
        '<line x1="44" y1="76" x2="44" y2="80"/>',
        '<line x1="68" y1="76" x2="68" y2="80"/>',
        '<line x1="92" y1="76" x2="92" y2="80"/>',
        '<line x1="116" y1="76" x2="116" y2="80"/>',
        '<line x1="140" y1="76" x2="140" y2="80"/>',
        '<line x1="164" y1="76" x2="164" y2="80"/>',
        '<line x1="188" y1="76" x2="188" y2="80"/>',
        '<line x1="212" y1="76" x2="212" y2="80"/>',
        '<line x1="236" y1="76" x2="236" y2="80"/>',
        '<line x1="260" y1="76" x2="260" y2="80"/>',
        '<line x1="284" y1="76" x2="284" y2="80"/>',
        '<line x1="308" y1="76" x2="308" y2="80"/>',
        '<line x1="332" y1="76" x2="332" y2="80"/>',
      '</g>',
      // bar
      '<rect x="20" y="46" width="320" height="30" rx="6" fill="url(#phGrad)" stroke="rgba(255,255,255,0.18)"/>',
      // numeric labels above bar
      '<g font-family="Outfit, sans-serif" font-size="9" fill="#c4cce0" text-anchor="middle" font-weight="600">',
        '<text x="20" y="40">0</text>',
        '<text x="92" y="40">3</text>',
        '<text x="188" y="40" font-weight="800" fill="#5eead4">7</text>',
        '<text x="284" y="40">11</text>',
        '<text x="332" y="40">14</text>',
      '</g>',
      // neutral marker
      '<line x1="188" y1="42" x2="188" y2="80" stroke="#5eead4" stroke-width="1.5"/>',
      '<rect x="166" y="14" width="44" height="16" rx="3" fill="#1a2440" stroke="#5eead4" stroke-width="1"/>',
      '<text x="188" y="25" text-anchor="middle" font-family="Outfit, sans-serif" font-size="11" font-weight="700" fill="#5eead4" letter-spacing="0.1em">NEUTRAL</text>',
      // acid / alkali chips below
      '<g font-family="Outfit, sans-serif" font-weight="700" font-size="9" letter-spacing="0.1em">',
        '<rect x="40" y="92" width="60" height="20" rx="4" fill="#1a2440" stroke="#ff5e3a" stroke-width="1"/>',
        '<text x="70" y="106" text-anchor="middle" fill="#ff5e3a">ACID</text>',
        '<rect x="260" y="92" width="60" height="20" rx="4" fill="#1a2440" stroke="#6da7ff" stroke-width="1"/>',
        '<text x="290" y="106" text-anchor="middle" fill="#6da7ff">ALKALI</text>',
      '</g>',
      // tiny example labels
      '<g font-family="Outfit, sans-serif" font-size="10" fill="#8a92a8">',
        '<text x="44" y="124" text-anchor="middle">lemon</text>',
        '<text x="164" y="124" text-anchor="middle">water</text>',
        '<text x="284" y="124" text-anchor="middle">soap</text>',
      '</g>',
    '</svg>'
  ].join(""),

  // Sound wave — sine + amplitude + wavelength callouts.
  "sound-wave": [
    '<svg viewBox="0 0 360 150" role="img" aria-label="Sound wave with amplitude and wavelength" overflow="visible" class="mock-visual-svg">',
      '<defs>',
        '<linearGradient id="swGrad" x1="0%" x2="0%" y1="0%" y2="100%">',
          '<stop offset="0%" stop-color="rgba(255,94,58,0.35)"/>',
          '<stop offset="100%" stop-color="rgba(255,94,58,0)"/>',
        '</linearGradient>',
      '</defs>',
      // grid
      '<g stroke="#2a3658" stroke-width="0.5" opacity="0.5">',
        '<line x1="20" y1="40" x2="340" y2="40"/>',
        '<line x1="20" y1="110" x2="340" y2="110"/>',
      '</g>',
      // equilibrium dashed
      '<line x1="20" y1="75" x2="340" y2="75" stroke="#8a92a8" stroke-width="0.8" stroke-dasharray="3 4" opacity="0.7"/>',
      // wave fill (positive half)
      '<path d="M 20,75 Q 60,25 100,75 T 180,75 T 260,75 T 340,75 L 340,75 L 20,75 Z" fill="url(#swGrad)"/>',
      // wave line
      '<path d="M 20,75 Q 60,25 100,75 T 180,75 T 260,75 T 340,75" fill="none" stroke="#ff5e3a" stroke-width="2.4"/>',
      // amplitude marker (vertical) at the first crest
      '<line x1="60" y1="75" x2="60" y2="25" stroke="#6da7ff" stroke-width="1.2"/>',
      '<line x1="55" y1="25" x2="65" y2="25" stroke="#6da7ff" stroke-width="1.2"/>',
      '<line x1="55" y1="75" x2="65" y2="75" stroke="#6da7ff" stroke-width="1.2"/>',
      // wavelength marker (horizontal) between two crests
      '<line x1="60" y1="125" x2="180" y2="125" stroke="#ffd13a" stroke-width="1.2"/>',
      '<line x1="60" y1="120" x2="60" y2="130" stroke="#ffd13a" stroke-width="1.2"/>',
      '<line x1="180" y1="120" x2="180" y2="130" stroke="#ffd13a" stroke-width="1.2"/>',
      // chip labels
      '<g font-family="Outfit, sans-serif" font-weight="700" font-size="9" letter-spacing="0.08em">',
        '<rect x="72" y="40" width="74" height="18" rx="3" fill="#1a2440" stroke="#6da7ff" stroke-width="1"/>',
        '<text x="109" y="52" text-anchor="middle" fill="#6da7ff">AMPLITUDE</text>',
        '<rect x="200" y="116" width="84" height="18" rx="3" fill="#1a2440" stroke="#ffd13a" stroke-width="1"/>',
        '<text x="242" y="128" text-anchor="middle" fill="#ffd13a">WAVELENGTH</text>',
      '</g>',
    '</svg>'
  ].join(""),

  // === MATHS ==============================================================

  // Function machine — input + 5 × 2 → output.
  "function-machine": [
    '<svg viewBox="0 0 360 110" role="img" aria-label="Function machine: input through two operations to output" overflow="visible" class="mock-visual-svg">',
      '<defs>',
        '<linearGradient id="fmIn" x1="0%" x2="0%" y1="0%" y2="100%">',
          '<stop offset="0%" stop-color="rgba(94,234,212,0.18)"/>',
          '<stop offset="100%" stop-color="rgba(94,234,212,0.05)"/>',
        '</linearGradient>',
        '<linearGradient id="fmOp" x1="0%" x2="0%" y1="0%" y2="100%">',
          '<stop offset="0%" stop-color="rgba(109,167,255,0.18)"/>',
          '<stop offset="100%" stop-color="rgba(109,167,255,0.05)"/>',
        '</linearGradient>',
        '<linearGradient id="fmOut" x1="0%" x2="0%" y1="0%" y2="100%">',
          '<stop offset="0%" stop-color="rgba(255,209,58,0.20)"/>',
          '<stop offset="100%" stop-color="rgba(255,209,58,0.06)"/>',
        '</linearGradient>',
      '</defs>',
      // input
      '<rect x="14" y="34" width="60" height="36" rx="8" fill="url(#fmIn)" stroke="#5eead4" stroke-width="1.5"/>',
      '<text x="44" y="58" text-anchor="middle" font-family="Outfit, sans-serif" font-weight="700" font-size="11" fill="#5eead4">input</text>',
      // arrow to op1
      '<line x1="74" y1="52" x2="100" y2="52" stroke="#6da7ff" stroke-width="1.5"/>',
      '<polyline points="94,48 100,52 94,56" fill="none" stroke="#6da7ff" stroke-width="1.5"/>',
      // op1
      '<rect x="100" y="34" width="60" height="36" rx="8" fill="url(#fmOp)" stroke="#6da7ff" stroke-width="1.5"/>',
      '<text x="130" y="58" text-anchor="middle" font-family="Outfit, sans-serif" font-weight="700" font-size="13" fill="#f0f4ff">+ 5</text>',
      // arrow to op2
      '<line x1="160" y1="52" x2="186" y2="52" stroke="#6da7ff" stroke-width="1.5"/>',
      '<polyline points="180,48 186,52 180,56" fill="none" stroke="#6da7ff" stroke-width="1.5"/>',
      // op2
      '<rect x="186" y="34" width="60" height="36" rx="8" fill="url(#fmOp)" stroke="#6da7ff" stroke-width="1.5"/>',
      '<text x="216" y="58" text-anchor="middle" font-family="Outfit, sans-serif" font-weight="700" font-size="13" fill="#f0f4ff">&times; 2</text>',
      // arrow to output
      '<line x1="246" y1="52" x2="272" y2="52" stroke="#ffd13a" stroke-width="1.5"/>',
      '<polyline points="266,48 272,52 266,56" fill="none" stroke="#ffd13a" stroke-width="1.5"/>',
      // output (with subtle glow via stroke and offset bg)
      '<rect x="272" y="34" width="74" height="36" rx="8" fill="url(#fmOut)" stroke="#ffd13a" stroke-width="1.8"/>',
      '<text x="309" y="58" text-anchor="middle" font-family="Outfit, sans-serif" font-weight="700" font-size="11" fill="#ffd13a">output</text>',
      // axis-style labels above
      '<g font-family="Outfit, sans-serif" font-size="11" fill="#8a92a8" text-anchor="middle" letter-spacing="0.12em">',
        '<text x="44" y="22">x</text>',
        '<text x="130" y="22">+5</text>',
        '<text x="216" y="22">×2</text>',
        '<text x="309" y="22">y</text>',
      '</g>',
      // worked example tick under
      '<text x="180" y="98" text-anchor="middle" font-family="Outfit, sans-serif" font-size="9" fill="#c4cce0" font-weight="500">e.g. <tspan fill="#5eead4" font-weight="700">3</tspan> → 8 → <tspan fill="#ffd13a" font-weight="700">16</tspan></text>',
    '</svg>'
  ].join(""),

  // Distance-time graph — fast / slow / stationary, gradient fills.
  "distance-time": [
    '<svg viewBox="0 0 360 220" role="img" aria-label="Distance-time graph: fast, slow, stationary" overflow="visible" class="mock-visual-svg">',
      '<defs>',
        '<linearGradient id="dtFastFill" x1="0%" x2="0%" y1="0%" y2="100%">',
          '<stop offset="0%" stop-color="rgba(255,94,58,0.35)"/>',
          '<stop offset="100%" stop-color="rgba(255,94,58,0)"/>',
        '</linearGradient>',
        '<linearGradient id="dtSlowFill" x1="0%" x2="0%" y1="0%" y2="100%">',
          '<stop offset="0%" stop-color="rgba(109,167,255,0.30)"/>',
          '<stop offset="100%" stop-color="rgba(109,167,255,0)"/>',
        '</linearGradient>',
      '</defs>',
      '<g stroke="#2a3658" stroke-width="0.5" opacity="0.55">',
        '<line x1="40" y1="40" x2="340" y2="40"/>',
        '<line x1="40" y1="80" x2="340" y2="80"/>',
        '<line x1="40" y1="120" x2="340" y2="120"/>',
        '<line x1="40" y1="160" x2="340" y2="160"/>',
        '<line x1="100" y1="20" x2="100" y2="180"/>',
        '<line x1="160" y1="20" x2="160" y2="180"/>',
        '<line x1="220" y1="20" x2="220" y2="180"/>',
        '<line x1="280" y1="20" x2="280" y2="180"/>',
      '</g>',
      '<line x1="40" y1="20" x2="40" y2="180" stroke="#c4cce0" stroke-width="1.5"/>',
      '<line x1="40" y1="180" x2="340" y2="180" stroke="#c4cce0" stroke-width="1.5"/>',
      '<path d="M 40,180 L 150,40 L 150,180 Z" fill="url(#dtFastFill)"/>',
      '<line x1="40" y1="180" x2="150" y2="40" stroke="#ff5e3a" stroke-width="2.4" stroke-linecap="round"/>',
      '<circle cx="150" cy="40" r="3.5" fill="#ff5e3a" stroke="#fff" stroke-width="1"/>',
      '<path d="M 40,180 L 240,100 L 240,180 Z" fill="url(#dtSlowFill)"/>',
      '<line x1="40" y1="180" x2="240" y2="100" stroke="#6da7ff" stroke-width="2.4" stroke-linecap="round"/>',
      '<circle cx="240" cy="100" r="3.5" fill="#6da7ff" stroke="#fff" stroke-width="1"/>',
      '<line x1="40" y1="150" x2="240" y2="150" stroke="#5eead4" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="6 3"/>',
      '<circle cx="240" cy="150" r="3.5" fill="#5eead4" stroke="#fff" stroke-width="1"/>',
      '<g font-family="Outfit, sans-serif" font-weight="700" font-size="9" letter-spacing="0.06em">',
        '<rect x="155" y="32" width="50" height="16" rx="3" fill="#1a2440" stroke="#ff5e3a" stroke-width="1"/>',
        '<text x="180" y="43" text-anchor="middle" fill="#ff5e3a">FAST</text>',
        '<rect x="245" y="92" width="50" height="16" rx="3" fill="#1a2440" stroke="#6da7ff" stroke-width="1"/>',
        '<text x="270" y="103" text-anchor="middle" fill="#6da7ff">SLOW</text>',
        '<rect x="245" y="142" width="78" height="16" rx="3" fill="#1a2440" stroke="#5eead4" stroke-width="1"/>',
        '<text x="284" y="153" text-anchor="middle" fill="#5eead4">STATIONARY</text>',
      '</g>',
      '<g font-family="Outfit, sans-serif" font-size="9.5" fill="#c4cce0" font-weight="500">',
        '<text x="14" y="22">distance</text>',
        '<text x="14" y="33" font-size="7" fill="#8a92a8" font-weight="400">m</text>',
        '<text x="305" y="200">time</text>',
        '<text x="305" y="210" font-size="7" fill="#8a92a8" font-weight="400">s</text>',
      '</g>',
    '</svg>'
  ].join(""),

  // === HISTORY =============================================================

  // Feudal pyramid — gradient pyramid, numbered tiers, exchange flows.
  "feudal-pyramid": [
    '<svg viewBox="0 0 280 240" role="img" aria-label="Feudal pyramid: King, Barons, Knights, Peasants" overflow="visible" class="mock-visual-svg">',
      '<defs>',
        '<linearGradient id="pyrGrad" x1="0%" x2="0%" y1="0%" y2="100%">',
          '<stop offset="0%" stop-color="#ffd13a"/>',
          '<stop offset="50%" stop-color="#ff5e3a"/>',
          '<stop offset="100%" stop-color="#6da7ff"/>',
        '</linearGradient>',
      '</defs>',
      '<polygon points="140,15 220,205 60,205" fill="url(#pyrGrad)" opacity="0.18" stroke="#6da7ff" stroke-width="1.5"/>',
      '<g stroke="#6da7ff" stroke-width="0.8" opacity="0.6">',
        '<line x1="120" y1="55" x2="160" y2="55"/>',
        '<line x1="106" y1="100" x2="174" y2="100"/>',
        '<line x1="92" y1="145" x2="188" y2="145"/>',
      '</g>',
      '<g font-family="Outfit, sans-serif" font-weight="800" font-size="10">',
        '<circle cx="220" cy="35" r="11" fill="#1a2440" stroke="#ffd13a" stroke-width="1.5"/>',
        '<text x="220" y="39" text-anchor="middle" fill="#ffd13a">1</text>',
        '<circle cx="220" cy="78" r="11" fill="#1a2440" stroke="#ff5e3a" stroke-width="1.5"/>',
        '<text x="220" y="82" text-anchor="middle" fill="#ff5e3a">2</text>',
        '<circle cx="220" cy="123" r="11" fill="#1a2440" stroke="#6da7ff" stroke-width="1.5"/>',
        '<text x="220" y="127" text-anchor="middle" fill="#6da7ff">3</text>',
        '<circle cx="220" cy="175" r="11" fill="#1a2440" stroke="#5eead4" stroke-width="1.5"/>',
        '<text x="220" y="179" text-anchor="middle" fill="#5eead4">4</text>',
      '</g>',
      '<g font-family="Outfit, sans-serif" font-weight="700" letter-spacing="0.08em">',
        '<text x="140" y="38" text-anchor="middle" font-size="9" fill="#ffd13a">KING</text>',
        '<text x="140" y="48" text-anchor="middle" font-size="6.5" fill="#8a92a8" font-weight="500" letter-spacing="0">~1 person</text>',
        '<text x="140" y="80" text-anchor="middle" font-size="9" fill="#ff5e3a">BARONS</text>',
        '<text x="140" y="90" text-anchor="middle" font-size="6.5" fill="#8a92a8" font-weight="500" letter-spacing="0">~200</text>',
        '<text x="140" y="125" text-anchor="middle" font-size="9" fill="#6da7ff">KNIGHTS</text>',
        '<text x="140" y="135" text-anchor="middle" font-size="6.5" fill="#8a92a8" font-weight="500" letter-spacing="0">~5,000</text>',
        '<text x="140" y="178" text-anchor="middle" font-size="9" fill="#5eead4">PEASANTS</text>',
        '<text x="140" y="188" text-anchor="middle" font-size="6.5" fill="#8a92a8" font-weight="500" letter-spacing="0">~1.5 million</text>',
      '</g>',
      '<g font-family="Outfit, sans-serif" font-size="10" fill="#c4cce0" opacity="0.85">',
        '<text x="40" y="60" text-anchor="middle">↓ grants</text>',
        '<text x="40" y="105" text-anchor="middle">↓ titles</text>',
        '<text x="40" y="150" text-anchor="middle">↓ duties</text>',
        '<text x="248" y="60" text-anchor="start">loyalty ↑</text>',
        '<text x="248" y="105" text-anchor="start">service ↑</text>',
        '<text x="248" y="150" text-anchor="start">labour ↑</text>',
      '</g>',
    '</svg>'
  ].join(""),

  // === GEOGRAPHY ===========================================================

  // River meander — survey-map style, callout chips outside the channel.
  "river-meander": [
    '<svg viewBox="0 0 360 200" role="img" aria-label="River meander showing erosion and deposition" overflow="visible" class="mock-visual-svg">',
      '<defs>',
        '<linearGradient id="rivCobalt" x1="0%" x2="0%" y1="0%" y2="100%">',
          '<stop offset="0%" stop-color="#3a4d7a"/>',
          '<stop offset="100%" stop-color="#1f2c4d"/>',
        '</linearGradient>',
      '</defs>',
      '<g stroke="#2a3658" stroke-width="0.5" opacity="0.5">',
        '<line x1="0" y1="40" x2="360" y2="40"/>',
        '<line x1="0" y1="80" x2="360" y2="80"/>',
        '<line x1="0" y1="120" x2="360" y2="120"/>',
        '<line x1="0" y1="160" x2="360" y2="160"/>',
        '<line x1="60" y1="0" x2="60" y2="200"/>',
        '<line x1="180" y1="0" x2="180" y2="200"/>',
        '<line x1="300" y1="0" x2="300" y2="200"/>',
      '</g>',
      '<path d="M 10,55 Q 90,55 115,95 Q 140,135 220,135 Q 290,135 350,95" fill="none" stroke="url(#rivCobalt)" stroke-width="22" stroke-linecap="round"/>',
      '<path d="M 10,55 Q 90,55 115,95 Q 140,135 220,135 Q 290,135 350,95" fill="none" stroke="#6da7ff" stroke-width="1.2" stroke-linecap="round" opacity="0.8"/>',
      '<g stroke="#6da7ff" stroke-width="1.4" fill="#6da7ff">',
        '<line x1="40" y1="55" x2="68" y2="55"/>',
        '<polyline points="62,51 68,55 62,59" fill="none"/>',
        '<text x="22" y="48" font-family="Outfit, sans-serif" font-size="11" fill="#6da7ff" font-weight="600" letter-spacing="0.1em">FLOW</text>',
      '</g>',
      '<g>',
        '<circle cx="120" cy="78" r="3" fill="#ff5e3a"/>',
        '<line x1="120" y1="78" x2="135" y2="40" stroke="#ff5e3a" stroke-width="1" opacity="0.7"/>',
        '<rect x="135" y="22" width="105" height="32" rx="4" fill="#1a2440" stroke="#ff5e3a" stroke-width="1"/>',
        '<text x="187" y="36" text-anchor="middle" font-family="Outfit, sans-serif" font-size="9" font-weight="700" fill="#ff5e3a" letter-spacing="0.1em">EROSION</text>',
        '<text x="187" y="48" text-anchor="middle" font-family="Outfit, sans-serif" font-size="11" fill="#c4cce0">outer bank · fast flow</text>',
      '</g>',
      '<g>',
        '<circle cx="220" cy="118" r="3" fill="#5eead4"/>',
        '<line x1="220" y1="118" x2="235" y2="160" stroke="#5eead4" stroke-width="1" opacity="0.7"/>',
        '<rect x="180" y="160" width="120" height="32" rx="4" fill="#1a2440" stroke="#5eead4" stroke-width="1"/>',
        '<text x="240" y="174" text-anchor="middle" font-family="Outfit, sans-serif" font-size="9" font-weight="700" fill="#5eead4" letter-spacing="0.1em">DEPOSITION</text>',
        '<text x="240" y="186" text-anchor="middle" font-family="Outfit, sans-serif" font-size="11" fill="#c4cce0">inner bank · slow flow</text>',
      '</g>',
      '<g font-family="Outfit, sans-serif" font-size="10" fill="#8a92a8">',
        '<line x1="300" y1="190" x2="345" y2="190" stroke="#8a92a8" stroke-width="1"/>',
        '<line x1="300" y1="187" x2="300" y2="193" stroke="#8a92a8"/>',
        '<line x1="345" y1="187" x2="345" y2="193" stroke="#8a92a8"/>',
        '<text x="322" y="184" text-anchor="middle">~50m</text>',
      '</g>',
    '</svg>'
  ].join(""),

  // Coastal erosion sequence — cliff → arch → stack → stump, with arrows.
  "coast-stack": [
    '<svg viewBox="0 0 360 180" role="img" aria-label="Coastal erosion sequence" overflow="visible" class="mock-visual-svg">',
      '<defs>',
        '<linearGradient id="rockGrad" x1="0%" x2="0%" y1="0%" y2="100%">',
          '<stop offset="0%" stop-color="#3a4565"/>',
          '<stop offset="100%" stop-color="#1f2840"/>',
        '</linearGradient>',
        '<linearGradient id="seaGrad" x1="0%" x2="0%" y1="0%" y2="100%">',
          '<stop offset="0%" stop-color="rgba(109,167,255,0.30)"/>',
          '<stop offset="100%" stop-color="rgba(109,167,255,0.05)"/>',
        '</linearGradient>',
      '</defs>',
      // sea
      '<rect x="0" y="125" width="360" height="55" fill="url(#seaGrad)"/>',
      '<line x1="0" y1="125" x2="360" y2="125" stroke="#6da7ff" stroke-width="1.2" opacity="0.7"/>',
      // 1. cliff
      '<g>',
        '<rect x="14" y="40" width="60" height="85" fill="url(#rockGrad)" stroke="#6da7ff" stroke-width="1.2"/>',
        '<line x1="44" y1="42" x2="44" y2="115" stroke="#ff5e3a" stroke-width="1" stroke-dasharray="2 2"/>',
      '</g>',
      // arrow 1→2
      '<g stroke="#6da7ff" stroke-width="1.2" fill="#6da7ff">',
        '<line x1="78" y1="80" x2="96" y2="80"/>',
        '<polyline points="92,76 96,80 92,84" fill="none"/>',
      '</g>',
      // 2. arch
      '<g fill="url(#rockGrad)" stroke="#6da7ff" stroke-width="1.2">',
        '<path d="M 100,40 L 174,40 L 174,125 L 158,125 L 158,95 Q 150,80 138,95 L 138,125 L 100,125 Z"/>',
      '</g>',
      // arrow 2→3
      '<g stroke="#6da7ff" stroke-width="1.2" fill="#6da7ff">',
        '<line x1="178" y1="80" x2="196" y2="80"/>',
        '<polyline points="192,76 196,80 192,84" fill="none"/>',
      '</g>',
      // 3. stack (separated)
      '<g fill="url(#rockGrad)" stroke="#6da7ff" stroke-width="1.2">',
        '<rect x="200" y="55" width="32" height="70"/>',
        '<rect x="244" y="42" width="30" height="83"/>',
      '</g>',
      // arrow 3→4
      '<g stroke="#6da7ff" stroke-width="1.2" fill="#6da7ff">',
        '<line x1="278" y1="80" x2="296" y2="80"/>',
        '<polyline points="292,76 296,80 292,84" fill="none"/>',
      '</g>',
      // 4. stump
      '<rect x="305" y="105" width="36" height="20" fill="url(#rockGrad)" stroke="#6da7ff" stroke-width="1.2"/>',
      // chip labels
      '<g font-family="Outfit, sans-serif" font-weight="700" font-size="11" letter-spacing="0.08em">',
        '<rect x="22" y="148" width="44" height="18" rx="3" fill="#1a2440" stroke="#6da7ff" stroke-width="1"/>',
        '<text x="44" y="160" text-anchor="middle" fill="#6da7ff">CLIFF</text>',
        '<rect x="110" y="148" width="46" height="18" rx="3" fill="#1a2440" stroke="#6da7ff" stroke-width="1"/>',
        '<text x="133" y="160" text-anchor="middle" fill="#6da7ff">ARCH</text>',
        '<rect x="208" y="148" width="58" height="18" rx="3" fill="#1a2440" stroke="#ff5e3a" stroke-width="1"/>',
        '<text x="237" y="160" text-anchor="middle" fill="#ff5e3a">STACK</text>',
        '<rect x="298" y="148" width="50" height="18" rx="3" fill="#1a2440" stroke="#ffd13a" stroke-width="1"/>',
        '<text x="323" y="160" text-anchor="middle" fill="#ffd13a">STUMP</text>',
      '</g>',
      // direction-of-erosion footnote
      '<text x="180" y="20" text-anchor="middle" font-family="Outfit, sans-serif" font-size="11" fill="#8a92a8" letter-spacing="0.1em">EROSION OVER TIME →</text>',
    '</svg>'
  ].join(""),

  // Contour rings — concentric ellipses with height chips.
  "contour-hill": [
    '<svg viewBox="0 0 280 180" role="img" aria-label="Contour rings showing a hill summit" overflow="visible" class="mock-visual-svg">',
      '<defs>',
        '<radialGradient id="hillGrad" cx="50%" cy="50%">',
          '<stop offset="0%" stop-color="rgba(255,209,58,0.18)"/>',
          '<stop offset="100%" stop-color="rgba(109,167,255,0.05)"/>',
        '</radialGradient>',
      '</defs>',
      '<rect x="0" y="0" width="280" height="180" fill="url(#hillGrad)"/>',
      // contour rings, each with its own colour from cobalt outer to gold inner
      '<g fill="none" stroke-width="1.5">',
        '<ellipse cx="140" cy="90" rx="115" ry="60" stroke="#6da7ff" opacity="0.7"/>',
        '<ellipse cx="140" cy="90" rx="90"  ry="46" stroke="#6da7ff" opacity="0.85"/>',
        '<ellipse cx="140" cy="90" rx="65"  ry="32" stroke="#5eead4"/>',
        '<ellipse cx="140" cy="90" rx="40"  ry="20" stroke="#ff5e3a"/>',
        '<ellipse cx="140" cy="90" rx="16"  ry="8"  stroke="#ffd13a"/>',
      '</g>',
      // summit marker
      '<circle cx="140" cy="90" r="3" fill="#ffd13a"/>',
      // height chips on the right side of each ring
      '<g font-family="Outfit, sans-serif" font-size="11" font-weight="700">',
        '<rect x="245" y="84" width="32" height="14" rx="3" fill="#1a2440" stroke="#ffd13a" stroke-width="1"/>',
        '<text x="261" y="94" text-anchor="middle" fill="#ffd13a">100</text>',
        '<rect x="184" y="68" width="28" height="13" rx="3" fill="#1a2440" stroke="#ff5e3a" stroke-width="1"/>',
        '<text x="198" y="78" text-anchor="middle" fill="#ff5e3a">90</text>',
        '<rect x="208" y="55" width="28" height="13" rx="3" fill="#1a2440" stroke="#5eead4" stroke-width="1"/>',
        '<text x="222" y="65" text-anchor="middle" fill="#5eead4">80</text>',
        '<rect x="232" y="40" width="28" height="13" rx="3" fill="#1a2440" stroke="#6da7ff" stroke-width="1"/>',
        '<text x="246" y="50" text-anchor="middle" fill="#6da7ff">70</text>',
        '<rect x="252" y="22" width="28" height="13" rx="3" fill="#1a2440" stroke="#6da7ff" stroke-width="1" opacity="0.7"/>',
        '<text x="266" y="32" text-anchor="middle" fill="#6da7ff">60</text>',
      '</g>',
      // key
      '<g font-family="Outfit, sans-serif" font-size="9" fill="#c4cce0" letter-spacing="0.06em">',
        '<text x="140" y="170" text-anchor="middle" font-style="italic" opacity="0.85">summit at the centre · rings = same height</text>',
      '</g>',
    '</svg>'
  ].join(""),

  // Solar system — sun + 8 planets, gradient orbital line, glow on sun.
  "solar-system": [
    '<svg viewBox="0 0 360 110" role="img" aria-label="Solar system: Sun and eight planets in order" overflow="visible" class="mock-visual-svg">',
      '<defs>',
        '<linearGradient id="orbitGrad" x1="0%" x2="100%">',
          '<stop offset="0%" stop-color="rgba(255,209,58,0.4)"/>',
          '<stop offset="100%" stop-color="rgba(109,167,255,0.25)"/>',
        '</linearGradient>',
        '<radialGradient id="sunGrad" cx="50%" cy="50%">',
          '<stop offset="0%" stop-color="#fff5b8"/>',
          '<stop offset="60%" stop-color="#ffd13a"/>',
          '<stop offset="100%" stop-color="#ff8a3a"/>',
        '</radialGradient>',
      '</defs>',
      // orbit guide
      '<line x1="20" y1="50" x2="350" y2="50" stroke="url(#orbitGrad)" stroke-width="1" stroke-dasharray="2 4"/>',
      // sun
      '<circle cx="36" cy="50" r="22" fill="url(#sunGrad)" filter="drop-shadow(0 0 8px rgba(255,209,58,0.4))"/>',
      '<circle cx="36" cy="50" r="22" fill="none" stroke="rgba(255,209,58,0.5)" stroke-width="1"/>',
      // planets
      '<circle cx="84"  cy="50" r="3"   fill="#a8a8b8"/>',
      '<circle cx="108" cy="50" r="5"   fill="#e8b070"/>',
      '<circle cx="138" cy="50" r="5.5" fill="#6da7ff"/>',
      '<circle cx="166" cy="50" r="4.5" fill="#ff5e3a"/>',
      '<circle cx="212" cy="50" r="11"  fill="#d68f5a"/>',
      '<circle cx="258" cy="50" r="9"   fill="#e8c890"/>',
      '<ellipse cx="258" cy="50" rx="14" ry="3" fill="none" stroke="#ffd13a" stroke-width="1.2" opacity="0.85"/>',
      '<circle cx="298" cy="50" r="7"   fill="#a3e8e0"/>',
      '<circle cx="332" cy="50" r="7"   fill="#3a6dc8"/>',
      // chip names
      '<g font-family="Outfit, sans-serif" font-size="10" fill="#c4cce0" text-anchor="middle" font-weight="600" letter-spacing="0.04em">',
        '<text x="36"  y="92" fill="#ffd13a" font-weight="700" font-size="9">SUN</text>',
        '<text x="84"  y="92">Mercury</text>',
        '<text x="108" y="92">Venus</text>',
        '<text x="138" y="92" fill="#6da7ff" font-weight="700">Earth</text>',
        '<text x="166" y="92">Mars</text>',
        '<text x="212" y="92">Jupiter</text>',
        '<text x="258" y="92">Saturn</text>',
        '<text x="298" y="92">Uranus</text>',
        '<text x="332" y="92">Neptune</text>',
      '</g>',
    '</svg>'
  ].join(""),

  // === MORE MATHS ==========================================================

  // Triangle types — equilateral, isosceles, right-angled — with markers.
  "triangle-types": [
    '<svg viewBox="0 0 360 150" role="img" aria-label="Triangle types: equilateral, isosceles, right-angled" overflow="visible" class="mock-visual-svg">',
      '<defs>',
        '<linearGradient id="triFill" x1="0%" x2="0%" y1="0%" y2="100%">',
          '<stop offset="0%" stop-color="rgba(109,167,255,0.22)"/>',
          '<stop offset="100%" stop-color="rgba(109,167,255,0.05)"/>',
        '</linearGradient>',
      '</defs>',
      '<g fill="url(#triFill)" stroke="#6da7ff" stroke-width="1.6" stroke-linejoin="round">',
        '<polygon points="40,100 80,30 120,100"/>',
        '<polygon points="160,100 200,30 240,100"/>',
        '<polygon points="280,100 320,40 320,100"/>',
      '</g>',
      // equilateral: tick marks on all 3 sides
      '<g stroke="#5eead4" stroke-width="1.5" fill="none">',
        '<line x1="58" y1="68" x2="64" y2="62"/>',
        '<line x1="98" y1="62" x2="104" y2="68"/>',
        '<line x1="78" y1="103" x2="82" y2="97"/>',
      '</g>',
      // isosceles: tick marks on 2 equal slanted sides only
      '<g stroke="#5eead4" stroke-width="1.5" fill="none">',
        '<line x1="178" y1="68" x2="184" y2="62"/>',
        '<line x1="218" y1="62" x2="224" y2="68"/>',
      '</g>',
      // right-angled: small square in the corner
      '<g stroke="#ffd13a" stroke-width="1.5" fill="none">',
        '<polyline points="312,100 312,92 320,92"/>',
      '</g>',
      // chip labels
      '<g font-family="Outfit, sans-serif" font-weight="700" font-size="11" letter-spacing="0.06em">',
        '<rect x="38" y="116" width="84" height="20" rx="3" fill="#1a2440" stroke="#5eead4" stroke-width="1"/>',
        '<text x="80" y="130" text-anchor="middle" fill="#5eead4">EQUILATERAL</text>',
        '<rect x="158" y="116" width="84" height="20" rx="3" fill="#1a2440" stroke="#5eead4" stroke-width="1"/>',
        '<text x="200" y="130" text-anchor="middle" fill="#5eead4">ISOSCELES</text>',
        '<rect x="270" y="116" width="80" height="20" rx="3" fill="#1a2440" stroke="#ffd13a" stroke-width="1"/>',
        '<text x="310" y="130" text-anchor="middle" fill="#ffd13a">RIGHT-ANGLED</text>',
      '</g>',
    '</svg>'
  ].join(""),

  // Polygon family — pentagon, hexagon, octagon, side counts.
  "polygon-family": [
    '<svg viewBox="0 0 360 150" role="img" aria-label="Pentagon, hexagon and octagon" overflow="visible" class="mock-visual-svg">',
      '<defs>',
        '<linearGradient id="polyFill" x1="0%" x2="0%" y1="0%" y2="100%">',
          '<stop offset="0%" stop-color="rgba(94,234,212,0.22)"/>',
          '<stop offset="100%" stop-color="rgba(94,234,212,0.05)"/>',
        '</linearGradient>',
      '</defs>',
      '<g fill="url(#polyFill)" stroke="#5eead4" stroke-width="1.8" stroke-linejoin="round">',
        '<polygon points="60,30 95,55 82,95 38,95 25,55"/>',
        '<polygon points="180,30 215,50 215,90 180,110 145,90 145,50"/>',
        '<polygon points="298,30 322,40 332,64 322,88 298,98 274,88 264,64 274,40"/>',
      '</g>',
      // chip labels with side count
      '<g font-family="Outfit, sans-serif" font-weight="700" font-size="9" letter-spacing="0.08em">',
        '<rect x="22" y="116" width="76" height="22" rx="3" fill="#1a2440" stroke="#5eead4" stroke-width="1"/>',
        '<text x="60" y="125" text-anchor="middle" fill="#5eead4">PENTAGON</text>',
        '<text x="60" y="135" text-anchor="middle" font-size="7" fill="#c4cce0" font-weight="500" letter-spacing="0.02em">5 sides</text>',
        '<rect x="142" y="116" width="76" height="22" rx="3" fill="#1a2440" stroke="#5eead4" stroke-width="1"/>',
        '<text x="180" y="125" text-anchor="middle" fill="#5eead4">HEXAGON</text>',
        '<text x="180" y="135" text-anchor="middle" font-size="7" fill="#c4cce0" font-weight="500" letter-spacing="0.02em">6 sides</text>',
        '<rect x="260" y="116" width="76" height="22" rx="3" fill="#1a2440" stroke="#5eead4" stroke-width="1"/>',
        '<text x="298" y="125" text-anchor="middle" fill="#5eead4">OCTAGON</text>',
        '<text x="298" y="135" text-anchor="middle" font-size="7" fill="#c4cce0" font-weight="500" letter-spacing="0.02em">8 sides</text>',
      '</g>',
    '</svg>'
  ].join(""),

  // Powers grid — 1², 2², 3², 4², 5² as actual squares.
  "powers-grid": [
    '<svg viewBox="0 0 360 150" role="img" aria-label="Square numbers shown as actual squares" overflow="visible" class="mock-visual-svg">',
      '<defs>',
        '<linearGradient id="pwrFill" x1="0%" x2="0%" y1="0%" y2="100%">',
          '<stop offset="0%" stop-color="rgba(255,209,58,0.30)"/>',
          '<stop offset="100%" stop-color="rgba(255,94,58,0.10)"/>',
        '</linearGradient>',
      '</defs>',
      // 1²
      '<rect x="20" y="100" width="16" height="16" fill="url(#pwrFill)" stroke="#ffd13a" stroke-width="1.2"/>',
      '<text x="28" y="132" text-anchor="middle" font-family="Outfit, sans-serif" font-weight="700" font-size="11" fill="#ffd13a">1²</text>',
      '<text x="28" y="22" text-anchor="middle" font-family="Outfit, sans-serif" font-size="11" fill="#c4cce0" font-weight="500">= 1</text>',
      // 2²
      '<rect x="60" y="84" width="32" height="32" fill="url(#pwrFill)" stroke="#ffd13a" stroke-width="1.2"/>',
      '<g stroke="#ffd13a" stroke-width="0.4" opacity="0.5">',
        '<line x1="76" y1="84" x2="76" y2="116"/>',
        '<line x1="60" y1="100" x2="92" y2="100"/>',
      '</g>',
      '<text x="76" y="132" text-anchor="middle" font-family="Outfit, sans-serif" font-weight="700" font-size="11" fill="#ffd13a">2²</text>',
      '<text x="76" y="22" text-anchor="middle" font-family="Outfit, sans-serif" font-size="11" fill="#c4cce0" font-weight="500">= 4</text>',
      // 3²
      '<rect x="116" y="68" width="48" height="48" fill="url(#pwrFill)" stroke="#ff5e3a" stroke-width="1.2"/>',
      '<g stroke="#ff5e3a" stroke-width="0.4" opacity="0.5">',
        '<line x1="132" y1="68" x2="132" y2="116"/>',
        '<line x1="148" y1="68" x2="148" y2="116"/>',
        '<line x1="116" y1="84" x2="164" y2="84"/>',
        '<line x1="116" y1="100" x2="164" y2="100"/>',
      '</g>',
      '<text x="140" y="132" text-anchor="middle" font-family="Outfit, sans-serif" font-weight="700" font-size="11" fill="#ff5e3a">3²</text>',
      '<text x="140" y="58" text-anchor="middle" font-family="Outfit, sans-serif" font-size="11" fill="#c4cce0" font-weight="500">= 9</text>',
      // 4²
      '<rect x="196" y="52" width="64" height="64" fill="url(#pwrFill)" stroke="#ff5e3a" stroke-width="1.2"/>',
      '<g stroke="#ff5e3a" stroke-width="0.4" opacity="0.5">',
        '<line x1="212" y1="52" x2="212" y2="116"/>',
        '<line x1="228" y1="52" x2="228" y2="116"/>',
        '<line x1="244" y1="52" x2="244" y2="116"/>',
        '<line x1="196" y1="68" x2="260" y2="68"/>',
        '<line x1="196" y1="84" x2="260" y2="84"/>',
        '<line x1="196" y1="100" x2="260" y2="100"/>',
      '</g>',
      '<text x="228" y="132" text-anchor="middle" font-family="Outfit, sans-serif" font-weight="700" font-size="11" fill="#ff5e3a">4²</text>',
      '<text x="228" y="42" text-anchor="middle" font-family="Outfit, sans-serif" font-size="11" fill="#c4cce0" font-weight="500">= 16</text>',
      // 5²
      '<rect x="276" y="36" width="80" height="80" fill="url(#pwrFill)" stroke="#6da7ff" stroke-width="1.2"/>',
      '<text x="316" y="132" text-anchor="middle" font-family="Outfit, sans-serif" font-weight="700" font-size="11" fill="#6da7ff">5²</text>',
      '<text x="316" y="26" text-anchor="middle" font-family="Outfit, sans-serif" font-size="11" fill="#c4cce0" font-weight="500">= 25</text>',
    '</svg>'
  ].join(""),

  // === HUMAN BIOLOGY =======================================================

  // Skeleton — clean stick figure, callout chips outside.
  "skeleton": [
    '<svg viewBox="0 0 240 230" role="img" aria-label="Simplified human skeleton with key bones" overflow="visible" class="mock-visual-svg">',
      '<defs>',
        '<radialGradient id="boneGlow" cx="50%" cy="50%">',
          '<stop offset="0%" stop-color="rgba(109,167,255,0.06)"/>',
          '<stop offset="100%" stop-color="transparent"/>',
        '</radialGradient>',
      '</defs>',
      '<rect x="0" y="0" width="240" height="230" fill="url(#boneGlow)"/>',
      '<g stroke="#c4cce0" stroke-width="2.5" fill="none" stroke-linecap="round">',
        '<circle cx="120" cy="40" r="14" fill="#1a2440" stroke="#6da7ff"/>',
        '<line x1="120" y1="54" x2="120" y2="128" stroke="#6da7ff"/>',
        // ribs
        '<line x1="100" y1="70" x2="140" y2="70" stroke="#5eead4"/>',
        '<line x1="98"  y1="82" x2="142" y2="82" stroke="#5eead4"/>',
        '<line x1="98"  y1="94" x2="142" y2="94" stroke="#5eead4"/>',
        '<line x1="100" y1="106" x2="140" y2="106" stroke="#5eead4"/>',
        // arms
        '<line x1="120" y1="66" x2="84" y2="108" stroke="#ffd13a"/>',
        '<line x1="84" y1="108" x2="80" y2="146" stroke="#ffd13a"/>',
        '<line x1="120" y1="66" x2="156" y2="108" stroke="#ffd13a"/>',
        '<line x1="156" y1="108" x2="160" y2="146" stroke="#ffd13a"/>',
        // pelvis + legs
        '<line x1="100" y1="128" x2="140" y2="128" stroke="#ff5e3a"/>',
        '<line x1="104" y1="128" x2="100" y2="190" stroke="#ff5e3a"/>',
        '<line x1="100" y1="190" x2="94" y2="218" stroke="#ff5e3a"/>',
        '<line x1="136" y1="128" x2="140" y2="190" stroke="#ff5e3a"/>',
        '<line x1="140" y1="190" x2="146" y2="218" stroke="#ff5e3a"/>',
      '</g>',
      // callout chips
      '<g font-family="Outfit, sans-serif" font-size="11" font-weight="700" letter-spacing="0.06em">',
        '<line x1="134" y1="36" x2="180" y2="20" stroke="#6da7ff" stroke-width="0.8" opacity="0.6"/>',
        '<rect x="180" y="10" width="56" height="18" rx="3" fill="#1a2440" stroke="#6da7ff" stroke-width="1"/>',
        '<text x="208" y="22" text-anchor="middle" fill="#6da7ff">SKULL</text>',
        '<line x1="98" y1="86" x2="50" y2="74" stroke="#5eead4" stroke-width="0.8" opacity="0.6"/>',
        '<rect x="2" y="64" width="48" height="18" rx="3" fill="#1a2440" stroke="#5eead4" stroke-width="1"/>',
        '<text x="26" y="76" text-anchor="middle" fill="#5eead4">RIBS</text>',
        '<line x1="160" y1="120" x2="206" y2="125" stroke="#ffd13a" stroke-width="0.8" opacity="0.6"/>',
        '<rect x="206" y="116" width="32" height="18" rx="3" fill="#1a2440" stroke="#ffd13a" stroke-width="1"/>',
        '<text x="222" y="128" text-anchor="middle" fill="#ffd13a">ARM</text>',
        '<line x1="140" y1="170" x2="190" y2="170" stroke="#ff5e3a" stroke-width="0.8" opacity="0.6"/>',
        '<rect x="190" y="162" width="48" height="18" rx="3" fill="#1a2440" stroke="#ff5e3a" stroke-width="1"/>',
        '<text x="214" y="174" text-anchor="middle" fill="#ff5e3a">FEMUR</text>',
      '</g>',
    '</svg>'
  ].join(""),

  // === ENGLISH =============================================================

  // Word classes — eight chips in 2x4 grid, colour-coded example sentence.
  "word-classes-chart": [
    '<svg viewBox="0 0 360 210" role="img" aria-label="The eight main word classes with examples" overflow="visible" class="mock-visual-svg">',
      // grid of 8 chips, each with class name + example
      '<g font-family="Outfit, sans-serif">',
        // row 1
        '<rect x="14" y="14" width="76" height="40" rx="6" fill="rgba(109,167,255,0.16)" stroke="#6da7ff"/>',
        '<text x="52" y="30" text-anchor="middle" font-weight="700" font-size="10" fill="#6da7ff">NOUN</text>',
        '<text x="52" y="44" text-anchor="middle" font-size="9" fill="#c4cce0">cat · idea</text>',
        '<rect x="100" y="14" width="76" height="40" rx="6" fill="rgba(255,94,58,0.16)" stroke="#ff5e3a"/>',
        '<text x="138" y="30" text-anchor="middle" font-weight="700" font-size="10" fill="#ff5e3a">VERB</text>',
        '<text x="138" y="44" text-anchor="middle" font-size="9" fill="#c4cce0">run · is</text>',
        '<rect x="186" y="14" width="76" height="40" rx="6" fill="rgba(255,209,58,0.16)" stroke="#ffd13a"/>',
        '<text x="224" y="30" text-anchor="middle" font-weight="700" font-size="10" fill="#ffd13a">ADJECTIVE</text>',
        '<text x="224" y="44" text-anchor="middle" font-size="9" fill="#c4cce0">huge · blue</text>',
        '<rect x="272" y="14" width="76" height="40" rx="6" fill="rgba(94,234,212,0.16)" stroke="#5eead4"/>',
        '<text x="310" y="30" text-anchor="middle" font-weight="700" font-size="10" fill="#5eead4">ADVERB</text>',
        '<text x="310" y="44" text-anchor="middle" font-size="9" fill="#c4cce0">quickly · very</text>',
        // row 2
        '<rect x="14" y="68" width="76" height="40" rx="6" fill="rgba(255,126,185,0.16)" stroke="#ff7eb9"/>',
        '<text x="52" y="84" text-anchor="middle" font-weight="700" font-size="10" fill="#ff7eb9">PRONOUN</text>',
        '<text x="52" y="98" text-anchor="middle" font-size="9" fill="#c4cce0">he · she · it</text>',
        '<rect x="100" y="68" width="76" height="40" rx="6" fill="rgba(192,163,245,0.16)" stroke="#c0a3f5"/>',
        '<text x="138" y="84" text-anchor="middle" font-weight="700" font-size="9" fill="#c0a3f5">PREPOSITION</text>',
        '<text x="138" y="98" text-anchor="middle" font-size="9" fill="#c4cce0">under · into</text>',
        '<rect x="186" y="68" width="76" height="40" rx="6" fill="rgba(163,232,179,0.16)" stroke="#a3e8b3"/>',
        '<text x="224" y="84" text-anchor="middle" font-weight="700" font-size="9" fill="#a3e8b3">CONJUNCTION</text>',
        '<text x="224" y="98" text-anchor="middle" font-size="9" fill="#c4cce0">and · because</text>',
        '<rect x="272" y="68" width="76" height="40" rx="6" fill="rgba(255,176,136,0.16)" stroke="#ffb088"/>',
        '<text x="310" y="84" text-anchor="middle" font-weight="700" font-size="10" fill="#ffb088">DETERMINER</text>',
        '<text x="310" y="98" text-anchor="middle" font-size="9" fill="#c4cce0">the · this · my</text>',
      '</g>',
      // example sentence — words colour-coded to chip colours
      '<g font-family="Outfit, sans-serif" font-size="12" font-weight="600" text-anchor="middle">',
        '<text x="180" y="148">',
          '<tspan fill="#ffb088">The</tspan> <tspan fill="#ffd13a">huge</tspan> <tspan fill="#6da7ff">dog</tspan> <tspan fill="#ff5e3a">barked</tspan> <tspan fill="#5eead4">loudly</tspan> <tspan fill="#c0a3f5">under</tspan> <tspan fill="#ffb088">the</tspan> <tspan fill="#6da7ff">table</tspan>.',
        '</text>',
      '</g>',
      '<text x="180" y="172" text-anchor="middle" font-family="Outfit, sans-serif" font-size="11" fill="#8a92a8" letter-spacing="0.08em">DET · ADJ · NOUN · VERB · ADV · PREP · DET · NOUN</text>',
      '<text x="180" y="196" text-anchor="middle" font-family="Outfit, sans-serif" font-size="9" fill="#c4cce0" font-style="italic" opacity="0.85">every word in a sentence belongs to a class</text>',
    '</svg>'
  ].join(""),

  // Figurative-language quick reference — five technique cards.
  "figurative-quick-ref": [
    '<svg viewBox="0 0 360 230" role="img" aria-label="Quick reference for figurative language techniques" overflow="visible" class="mock-visual-svg">',
      '<g font-family="Outfit, sans-serif">',
        // SIMILE
        '<rect x="14" y="14" width="160" height="50" rx="6" fill="rgba(109,167,255,0.12)" stroke="#6da7ff" stroke-width="1.2"/>',
        '<text x="22" y="30" font-weight="700" font-size="10" fill="#6da7ff" letter-spacing="0.08em">SIMILE</text>',
        '<text x="22" y="44" font-size="11" fill="#c4cce0">uses <tspan font-weight="700" fill="#f0f4ff">like</tspan> or <tspan font-weight="700" fill="#f0f4ff">as</tspan></text>',
        '<text x="22" y="58" font-size="9" font-style="italic" fill="#8a92a8">"as quiet as a mouse"</text>',
        // METAPHOR
        '<rect x="184" y="14" width="160" height="50" rx="6" fill="rgba(255,94,58,0.12)" stroke="#ff5e3a" stroke-width="1.2"/>',
        '<text x="192" y="30" font-weight="700" font-size="10" fill="#ff5e3a" letter-spacing="0.08em">METAPHOR</text>',
        '<text x="192" y="44" font-size="11" fill="#c4cce0">says it <tspan font-weight="700" fill="#f0f4ff">is</tspan> something else</text>',
        '<text x="192" y="58" font-size="9" font-style="italic" fill="#8a92a8">"the classroom was a zoo"</text>',
        // PERSONIFICATION
        '<rect x="14" y="76" width="160" height="50" rx="6" fill="rgba(255,209,58,0.12)" stroke="#ffd13a" stroke-width="1.2"/>',
        '<text x="22" y="92" font-weight="700" font-size="10" fill="#ffd13a" letter-spacing="0.08em">PERSONIFICATION</text>',
        '<text x="22" y="106" font-size="11" fill="#c4cce0">human action for a non-human</text>',
        '<text x="22" y="120" font-size="9" font-style="italic" fill="#8a92a8">"the wind whispered"</text>',
        // ALLITERATION
        '<rect x="184" y="76" width="160" height="50" rx="6" fill="rgba(94,234,212,0.12)" stroke="#5eead4" stroke-width="1.2"/>',
        '<text x="192" y="92" font-weight="700" font-size="10" fill="#5eead4" letter-spacing="0.08em">ALLITERATION</text>',
        '<text x="192" y="106" font-size="11" fill="#c4cce0">same starting sound, repeated</text>',
        '<text x="192" y="120" font-size="9" font-style="italic" fill="#8a92a8">"slithering, slimy snakes"</text>',
        // ONOMATOPOEIA
        '<rect x="100" y="138" width="160" height="50" rx="6" fill="rgba(255,126,185,0.12)" stroke="#ff7eb9" stroke-width="1.2"/>',
        '<text x="108" y="154" font-weight="700" font-size="10" fill="#ff7eb9" letter-spacing="0.08em">ONOMATOPOEIA</text>',
        '<text x="108" y="168" font-size="11" fill="#c4cce0">word sounds like the noise</text>',
        '<text x="108" y="182" font-size="9" font-style="italic" fill="#8a92a8">"bang!" · "splat!"</text>',
      '</g>',
      // footnote
      '<text x="180" y="212" text-anchor="middle" font-family="Outfit, sans-serif" font-size="9" fill="#8a92a8" font-style="italic">when you spot one, ask: <tspan fill="#c4cce0" font-style="normal" font-weight="600">what effect does it have on the reader?</tspan></text>',
    '</svg>'
  ].join("")
};

export function getVisual(key) {
  if (!key) return null;
  const svg = VISUALS[key];
  if (!svg) return null;
  const bgPath = BACKDROPS[key];
  if (!bgPath) return svg;
  // PNG backdrop is optional — onerror removes the <img> if the file isn't
  // there yet, leaving the SVG-only render. So this code can ship before
  // the user has generated the backdrops.
  return (
    '<div class="mock-visual-stack">' +
      '<img class="mock-visual-backdrop" src="' + bgPath + '" alt="" loading="lazy" onerror="this.remove()"/>' +
      svg +
    '</div>'
  );
}

export function listVisualKeys() {
  return Object.keys(VISUALS);
}
