# AI-hybrid backdrop prompts

The 5 atmospheric topics that benefit from a painted backdrop under the SVG overlay. The SVG layer (precision: labels, callouts, chips, scale bars) is already in `visuals.js`. The PNGs below sit underneath at 55% opacity in dark mode, 45% in light.

## Workflow

1. Paste a prompt into your image-gen tool of choice (DALL-E, Midjourney, Imagen, Adobe Firefly, ChatGPT).
2. Generate at 16:9 (≈1280×720 or higher). Square or 4:3 also works — the CSS uses `object-fit: cover`.
3. Save as PNG to `aimhigh-mock/assets/visuals/<key>.png` using the exact key name from the heading below.
4. Commit + push. The next page load will show the backdrop under the SVG.
5. If you don't generate one for a key, nothing breaks — the SVG-only render is the fallback.

## Style consistency rules (apply to every prompt)

- **Negative space at edges.** The SVG callout chips sit near the edges; busy detail there will compete.
- **No text or labels in the image.** AI text is unreliable; SVG handles all labels.
- **No hard photographic realism.** Watercolour / painterly / impressionist reads better behind a precision overlay than a photo would.
- **Dark-friendly tones.** The backdrop sits at 55% opacity on a navy card, so naturally darker / desaturated outputs look better than bright daylight ones.
- **No people in the foreground.** Distant figures are fine.
- **Composition matches the SVG.** Where the SVG has a single subject (cell, river, pyramid), the backdrop should echo that placement.

---

## 1 · `cell-comparison`

> Side-by-side watercolour cross-sections of an animal cell (round, soft pink-purple membrane, visible nucleus and small mitochondria) and a plant cell (boxy, soft green cell wall, internal chloroplasts), microscope-stained painterly look, soft pastel wash, no text or labels, gentle bokeh between them, educational illustration style. 16:9, dark navy background dominant, cells centred-left and centred-right.

**Save as:** `assets/visuals/cell-comparison.png`

---

## 2 · `river-meander`

> Aerial watercolour painting of a single sweeping river meander curving from upper-left to lower-right, soft sage-green and dusty-gold banks, gentle blue water with subtle ripples, no text or labels, no human figures, no boats, peaceful overhead view, painterly impressionist style. 16:9. Bird's-eye perspective, like a watercolour painting of a satellite map.

**Save as:** `assets/visuals/river-meander.png`

---

## 3 · `coast-stack`

> Watercolour painting of a rugged coastline at golden hour, sea cliff on the left transitioning to a small sea arch in the middle and a separated rock stack on the right, calm blue-grey sea, no text or labels, no people, no boats, painterly impressionist style. 16:9. Side-on perspective. Subdued saturation so the SVG overlay reads cleanly.

**Save as:** `assets/visuals/coast-stack.png`

---

## 4 · `solar-system`

> Painterly stylised illustration of the solar system, the sun glowing on the left and eight planets arranged in a horizontal line moving outward to the right, deep navy space with subtle nebula wash in indigo and violet, no text, no orbital lines, no labels, gentle bokeh stars, painterly impressionist. 16:9. Sun is clearly the brightest element; planets are smaller and progressively dimmer to the right.

**Save as:** `assets/visuals/solar-system.png`

---

## 5 · `feudal-pyramid`

> Soft painterly medieval English village in summer afternoon, distant stone castle on a hill in the background, small thatched cottages, golden-hour purple-and-amber sky, warm earthy palette, no people in the foreground, no text, no flags or banners with writing, blurred slightly to support a diagram overlay. 16:9, painterly impressionist. Composition keeps the centre relatively empty so the pyramid SVG sits over open sky.

**Save as:** `assets/visuals/feudal-pyramid.png`

---

## After generation

- Verify each PNG is educationally accurate (AI invents wrong organelle counts, mislabels planets, etc.). Reject and regenerate anything off.
- Keep file sizes reasonable (aim for under 300 KB per PNG; if needed, run through TinyPNG / Squoosh).
- Commit them under `assets/visuals/` and push. Cache version in `visuals.js` doesn't need bumping (the PNG path is uncached, served fresh by GitHub Pages).
