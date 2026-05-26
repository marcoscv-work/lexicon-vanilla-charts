# CLAUDE.md

Project context and conventions for future Claude (and human) sessions.
Read this before making structural changes — several decisions look
unusual until you know why.

## Project shape

```
new-charts/
├── Light.tokens.json          # DTCG source of truth (do not edit by hand)
├── references.png             # the "flat" GoT palette the chart matches
├── README.md                  # consumer-facing docs
├── CLAUDE.md                  # this file
├── package.json               # vite + storybook + sass + ts
├── .storybook/
│   ├── main.ts                # CSF3 + a11y addon
│   └── preview.ts             # wraps stories in <main><h1 sr-only>; reduced-motion toggle
├── scripts/
│   └── a11y-scan.mjs          # puppeteer + axe-core headless scan
└── src/
    ├── index.ts               # public exports
    ├── tokens.ts              # JS mirror of the chart palette + family metadata + extended palette
    ├── styles/
    │   ├── _tokens.scss       # Clay-named CSS vars (mirrors Light.tokens.json)
    │   └── global.scss        # body reset + .cui-sr-only
    ├── a11y/
    │   ├── contrast.ts        # WCAG luminance helpers (unused at runtime; kept for tests)
    │   ├── palette.ts         # getAccessibleSeries(n) — cycles base → extended → wrap
    │   └── useReducedMotion.ts
    └── components/
        ├── BarChart/
        │   ├── BarChart.tsx
        │   ├── BarChart.scss
        │   └── BarChart.stories.tsx
        ├── PieChart/
        │   ├── PieChart.tsx
        │   ├── PieChart.scss
        │   ├── PieChart.stories.tsx
        │   └── geometry.ts                # buildSlices(values, cx, cy, rOuter, rInner)
        ├── LineChart/
        │   ├── LineChart.tsx
        │   ├── LineChart.scss
        │   ├── LineChart.stories.tsx
        │   └── markers.tsx                # 9 shape renderers + 9 dash patterns
        └── MapChart/
            ├── MapChart.tsx
            ├── MapChart.scss
            ├── MapChart.stories.tsx
            ├── world-map.svg              # stylised base art for markers variant
            ├── countries.ts               # ISO + lat/lon + hand-calibrated x/y for ~55 countries
            ├── projection.ts              # viewBox re-export (lat/lon NOT used to position)
            ├── MapChartChoropleth.tsx     # EXPERIMENTAL — gated by variant='choropleth'
            ├── MapChartChoropleth.scss
            └── _experimental-countries-map.svg  # CC BY-SA 3.0 per-country SVG (ISO ids)
```

## Naming conventions

- Class prefix is `cui-` (Clay UI). Block / element / modifier per BEM.
- CSS custom properties use the **bare** Clay names (`--primary`,
  `--primary-l0`, `--yellow-l2`, `--blue-d2`, `--white`, `--dark-d1`,
  …). When the package is promoted into the main Clay repo the
  `_tokens.scss` redeclarations become redundant — Clay's global
  stylesheet already exposes the same names. **Do not invent new
  `--cui-*` aliases for tokens that already exist in Clay.**
- Slot vars set per element (e.g. `--cui-slice-fill`,
  `--cui-marker-fill`, `--cui-bar-delay`, `--cui-line-stroke`,
  `--cui-line-dash`, `--cui-country-fill`) keep the `cui-` prefix —
  they're internal to a component, not theme tokens.

## Architectural rules I had to learn the hard way

### 1. `container-type: inline-size` collapses the chart

CSS containment zeroes the intrinsic inline size of the element. Any
sizing strategy that relies on intrinsic width — `display: inline-block`
shrink-to-fit, `width: fit-content`, anything `auto`-ish — resolves to
**0**. The chart disappears.

**Therefore**: we do not use container queries on the chart root. The
responsive layout (legend drops under canvas when there isn't enough
room) is achieved with plain `display: flex; flex-wrap: wrap` on
`__body`. It's old-school but bulletproof.

If a future iteration needs container-aware logic, do it through a
ResizeObserver + a modifier class — never `container-type` on the
chart root.

### 2. Reduced motion needs both a hook AND a CSS rule

The Storybook decorator (and a host app's preference panel) may set
`<body class="c-prefers-reduced-motion">` *after* the chart has already
mounted. The React hook's initial `detect()` runs once on mount; by the
time the MutationObserver catches up, the animation has played.

**Therefore**: every animation is gated twice:

1. A `--motion` modifier class added/removed by the component based on
   `useReducedMotion()`.
2. A CSS rule with `!important` that strips `animation` and
   `transition` whenever `body.c-prefers-reduced-motion` is present —
   evaluated on every paint, no React lifecycle involved.

Same shape for the OS-level `@media (prefers-reduced-motion: reduce)`.

### 3. The pie pop-translate-on-hover causes jitter

Moving the slice outward on hover changes the hit area. If the cursor
sits near the seam, you get an enter-leave-enter loop and the slice
shakes.

**Therefore**: hover only changes `filter` (brightness/saturate). The
"emphasis" lives on focus, where the hit area isn't part of the
question.

### 4. Focus indicator is two SVG paths, not an `outline`

`outline` looks awful on SVG paths and never lines up with the donut
shape. Instead we render two extra `<path>` overlays per focused
slice, clipped to the slice itself via `<clipPath>`:

- 8 px white stroke (4 px visible inside the slice edge)
- 4 px primary-l0 stroke on top (outermost 2 px stays primary)

Net effect from the edge inward: 2 px primary, 2 px white, then the
slice colour. The same trick works on the inner ring edge for free.

LineChart can't use the clipPath-stroke approach because the markers
are too small for a meaningful inside-stroke band. Instead it
re-emits the same marker shape at scales 2.0 (primary) and 1.5
(white) **under** the marker — see rule 9.

If you redesign focus, keep one of those two approaches — anything
based on `outline` or `filter: drop-shadow` won't follow the slice /
marker contour.

### 5. The slice stroke is the WCAG 1.4.11 separator, not the colour pair

I tried to enforce ≥ 3:1 luminance contrast between adjacent slice
colours (exhaustive 2ⁿ search across dark/light shades). For odd `n`,
the wraparound is mathematically impossible to satisfy with the
curated palette. More importantly, forcing it produces ugly
alternating dark/light charts.

**Therefore**: we keep the slice stroke (2 px `--white`) as the formal
separator. WCAG 1.4.11 is satisfied by the stroke; the palette can be
chosen for hue/aesthetics.

LineChart leans on **marker shape + dash pattern** for the same job —
two consecutive series carry different shapes and different dash
patterns, so colour-blind users still get nine cleanly distinguishable
lines even in `scheme='blue'` (everything is `--primary-l0`).

If a consumer disables the stroke (or removes marker shapes), they
re-enter "colours must contrast" territory and `getAccessibleSeries`
is no longer enough on its own.

### 6. ARIA: SVG isn't the image, the figure is

Original mistake: `<svg role="img" aria-hidden="true">`. axe rightly
flagged it — focusable children inside an `aria-hidden` subtree are a
contradiction.

**Therefore**: `<svg>` has no `role` and no `aria-hidden`. The
`<figure>` provides naming (`aria-labelledby` + `<figcaption>`) and
description (`aria-describedby` + an sr-only `<p>` summarising every
datum). Individual bars / slices / markers / line points keep their
own `role="img"` + `aria-label`.

### 7. Marker positions are a per-country pixel table, not a projection

`world-map.svg` is a stylised artwork, not a mathematical projection.
The Americas are visually compressed inward, the southern hemisphere
is stretched, and Europe is enlarged. Any single linear/Mercator fit —
even piecewise per hemisphere — leaves entire regions on the wrong
landmass (Ireland in the Atlantic, Brazil in the Pacific, Argentina
in Chile).

**Therefore**: every entry in `src/components/MapChart/countries.ts`
carries a hand-calibrated `x` / `y` inside the `558 × 282` SVG viewBox.
The `lat` / `lon` is kept for documentation and accessible labels but
**not** used to position the marker. `projection.ts` only re-exports
the viewBox.

To calibrate a new country: render the SVG with a grid overlay, pick
the pixel that lands on its landmass, iterate until the marker hits the
right region. Earlier attempts at a piecewise lat/lon fit are in the
git history and **should not be revived** — the artwork is too uneven.

**If you swap the base SVG, every `x` / `y` in `countries.ts` must be
re-calibrated.** Don't try to use a real projection library — that's a
much bigger dependency than this POC needs, and the artwork is
hand-drawn anyway so any "correct" projection will still be off.

The base SVG is imported via Vite's `?raw` query and injected via
`dangerouslySetInnerHTML` so its paths can be themed through a single
`.cui-map-chart__land` selector (the original `fill="#F1F2F5"` is
stripped during import).

### 8. Storybook a11y warnings include the iframe shell

When the user complains about a11y warnings, separate component
violations from iframe-shell violations (`landmark-one-main`,
`page-has-heading-one`, `region`). The preview wrapper in
`.storybook/preview.ts` wraps every story in `<main>` + sr-only
`<h1>` to silence the shell warnings. **Do not delete that wrapper
without replacing it.**

### 9. CSS animations on an SVG `<g>` replace its positioning transform

A LineChart data-point `<g>` carries its position via the SVG
`transform="translate(cx,cy)"` attribute. Running a CSS animation that
keyframes `transform: scale(...)` on the **same** `<g>` replaces the
translate during the animation: the marker scales in from `(0,0)` and
then "pops" to its data point at the end. (SVG / CSS only honour one
`transform` per element.)

**Therefore**: marker reveal animations run on an **inner**
`__point-anim` `<g>` wrapping the visuals. The outer `__point` keeps
the positioning translate and the interactive props (tabIndex,
role, aria-label, focus/hover handlers); the inner is the CSS
animation target. Splitting them keeps position and animation on
separate `transform`s.

Same principle applies anywhere we mix an SVG-attribute transform with
a CSS animated transform. **Never animate the same `<g>` that owns the
positioning translate.**

### 10. Line markers are parametric so the focus halo can scale uniformly

LineChart has nine marker shapes (`circle`, `square`, `triangle`,
`diamond`, `triangle-down`, `d-up`, `d-down`, `bar-h`, `bar-v`). The
Lexicon focus pattern is "2 px primary + 2 px white around the
marker" — we replicate it by re-emitting the **same** marker shape at
scales 2.0 (primary band) and 1.5 (white band) underneath the marker,
so the ring traces the marker's silhouette.

This only works because every shape is defined by a single `size`
parameter and centred on the origin. If you add a new marker shape,
keep that shape — anything that branches by aspect ratio or uses
explicit width/height instead of `size` breaks the focus halo for
the asymmetric variants.

The pattern is exact for `circle`, `square`, `diamond` and the
triangles. For `bar-h` / `bar-v` the visible band on the **short** axis
is thinner than 2 px because uniform scaling halves the short-axis
padding. The ring is still clearly visible — the asymmetric band is
the documented trade-off.

### 11. `legend='table'` suppresses the per-datum sr-only summary

MapChart / PieChart / BarChart / LineChart all support `legend='table'`
to render the data as a real semantic `<table>` below the canvas (with
`<th scope="col">` headers and `<th scope="row">` on the
label/country/series name). When that mode is on, the per-datum
`aria-describedby` summary on the figure is suppressed — otherwise AT
users hear the same data twice (the table reads identically to the
dump). Only the user-provided `description` survives.

If you add a new chart type with a table-legend variant, mirror the
same suppression in the `summary` memo. If you add another semantic
representation later (e.g. a real `<dl>`), apply the same rule.

### 12. The extended palette only appends; the base 10 are stable API

`getAccessibleSeries(n)` cycles `CHART_FAMILY_ORDER` (slots 0–9) first,
then `CHART_EXTENDED_PALETTE` (slots 10–19), then wraps. For `n ≤ 10`
the function is byte-identical to the pre-extension version — the
first ten slots are considered **stable API** and consumers may rely
on the specific colours.

When adding new slots: **append** to `CHART_EXTENDED_PALETTE`. Do not
reorder, do not re-shade, do not insert in the middle. Each new entry
must be an already-existing Clay/Lexicon chart token — pick a shade
from `Color.Charts.{Family}` in `Light.tokens.json` rather than
inventing a hex.

### 13. `size='inline'` hides the axis baseline by design

BarChart paints a 1 px `--light-d2` axis baseline anchoring the bars
(`y=height-pad.bottom` in vertical, `x=pad.left` in horizontal). At
`size='inline'`, the chart is a single thin row with no notion of an
axis — the optional gray `track` plays that role instead. Rendering
the baseline in inline mode shows up as a stray vertical tick at the
left edge of the bar (the user-reported "línea inicial gris").

**Therefore**: the axis `<line>` is rendered only when `size !==
'inline'`. If you add new size presets in the future and they too
should drop the axis (`'sparkline'`, `'micro'`, …) extend the guard
rather than relabelling the existing check.

### 14. `track` is decorative, not data — animate the bar only

The `<rect className="cui-bar-chart__bar-track">` is not in the focus
order, has `pointer-events: none`, and carries no `role` / `aria-label`.
It also is **not** targeted by the `cui-bar-rise` / `cui-bar-grow-x`
animations — the reveal only plays on the bar. If the track animated
alongside, the row would feel like the data is filling up *and* the
canvas is appearing, which fights the "x out of total" reading. Same
reasoning when the track ever gains hover/focus state in the future:
don't.

`rounded` is independent of both `size` and `track` — it just sets
`rx = thickness/2` on whatever rects exist (bar always, track when
enabled). Keep it that way; consumers ask for the three independently.

### 15. The choropleth variant is experimental and self-contained

`<MapChart variant='choropleth' />` is gated behind a prop, with the
whole implementation in three isolated files:

- `MapChartChoropleth.tsx`
- `MapChartChoropleth.scss`
- `_experimental-countries-map.svg`

Reversion is "delete those three files + revert the prop / branch /
ref triplet in `MapChart.tsx`". Don't entangle the choropleth code
with the markers code — that's what the variant prop is for.

Other implementation notes worth carrying forward:

- The country SVG (CC BY-SA 3.0, from
  [flekschas/simple-world-map](https://github.com/flekschas/simple-world-map))
  encodes country paths as ISO 3166-1 alpha-2 ids (lowercase).
  Multi-part countries appear as `<g id="xx"><path .../></g>`; simple
  countries appear as `<path id="xx" .../>`.
- The SVG is parsed once at module init into a `Map<iso, d[]>` so the
  focus ring `clipPath` overlay can render every sub-path of the
  focused country (US + Alaska, AU + Tasmania, CA, ES, …). If you
  swap the base SVG, audit `parseCountryPaths` in
  `MapChartChoropleth.tsx` — the regex assumes the two structural
  patterns above.
- The component splits its layout effects into "structural" (depends
  on `enriched` only, sets the data-iso/tabindex/role/aria classes
  once) and "fill" (depends on `palette`/`bucket`, only writes the
  `--cui-country-fill` CSS variable). This avoids strip-and-readd-ing
  `.is-data` on every `palette` reference change — which would
  otherwise restart every reveal animation on every focus/hover.
  Same shape applies to any future variant that uses an injected SVG.

## Testing

There is no unit test runner today. Coverage comes from:

- `npm run typecheck` — `tsc --noEmit`. Fast, catches API drift.
- `node scripts/a11y-scan.mjs` (with `npm run storybook` running) —
  Puppeteer + axe-core scan of every story listed in the array.
  Must return `Total violations: 0` before any PR.

Add new story IDs to `STORIES` in `scripts/a11y-scan.mjs` when adding
new stories.

## When working on this codebase

- Don't add a new `--cui-*` token if Clay already exposes the same
  thing under its own name (`--primary`, `--yellow-l2`, `--blue-d2`,
  …).
- Don't reintroduce `container-type: inline-size` on the chart root.
- Don't move the focus indicator off the clipPath overlay approach
  (pie) or the scaled-shape overlay approach (line / map markers)
  without making sure it still follows the slice / marker contour.
- Don't translate slices on hover.
- Don't animate the same SVG `<g>` that owns a positioning
  `transform="translate(...)"` attribute — wrap the visuals in an
  inner `<g>` and animate that one.
- Don't reorder or re-shade `CHART_FAMILY_ORDER` or
  `CHART_EXTENDED_PALETTE` — append only.
- Don't entangle `MapChartChoropleth` code into `MapChart`. The
  variant prop is the seam.
- Don't render the BarChart axis line in `size='inline'`, and don't
  push focus / hover state onto the `__bar-track` rect — see rules
  13 and 14.
- Animations must be gated by both the React hook and a CSS fallback.
- New chart components with a `legend='table'` variant must suppress
  the per-datum `aria-describedby` summary in that mode.
- Every change must keep `npm run typecheck` green and
  `node scripts/a11y-scan.mjs` at zero violations.

## Out-of-scope reminders

These come up periodically — they are **explicitly** not part of this
package:

- Multi-series / stacked bar charts.
- Multi-value crosshair tooltips on the line chart (popover shows the
  active point only — common pattern is enough for the POC).
- A separate icon component, theme provider, or design-token loader —
  Clay already has all of that.
- Build / bundling. Source ships as TS. Type-only build via
  `tsc -p tsconfig.build.json` is enough until this lands in Clay's
  monorepo.
