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
    ├── tokens.ts              # JS mirror of the chart palette + family metadata
    ├── styles/
    │   ├── _tokens.scss       # Clay-named CSS vars (mirrors Light.tokens.json)
    │   └── global.scss        # body reset + .cui-sr-only
    ├── a11y/
    │   ├── contrast.ts        # WCAG luminance helpers (unused at runtime; kept for tests)
    │   ├── palette.ts         # getAccessibleSeries(n) — returns CSS-var references
    │   └── useReducedMotion.ts
    └── components/
        ├── BarChart/
        │   ├── BarChart.tsx
        │   ├── BarChart.scss
        │   └── BarChart.stories.tsx
        └── PieChart/
            ├── PieChart.tsx
            ├── PieChart.scss
            ├── PieChart.stories.tsx
            └── geometry.ts    # buildSlices(values, cx, cy, rOuter, rInner)
```

## Naming conventions

- Class prefix is `cui-` (Clay UI). Block / element / modifier per BEM.
- CSS custom properties use the **bare** Clay names (`--primary`,
  `--primary-l0`, `--yellow-l2`, `--white`, `--dark-d1`, ...). When the
  package is promoted into the main Clay repo, the
  `_tokens.scss` redeclarations become redundant — Clay's global
  stylesheet already exposes the same names. **Do not invent new
  `--cui-*` aliases for tokens that already exist in Clay.**
- Slot vars set per element (e.g. `--cui-slice-fill`,
  `--cui-slice-delay`, `--cui-bar-delay`) keep the `cui-` prefix —
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

- 8px white stroke (4px visible inside the slice edge)
- 4px primary-l0 stroke on top (outermost 2px stays primary)

Net effect from the edge inward: 2px primary, 2px white, then the
slice colour. The same trick works on the inner ring edge for free.

If you redesign focus, keep the clipPath approach — anything based on
`outline` or `filter: drop-shadow` won't follow the slice contour.

### 5. The slice stroke is the WCAG 1.4.11 separator, not the colour pair

I tried to enforce ≥ 3:1 luminance contrast between adjacent slice
colours (exhaustive 2ⁿ search across dark/light shades). For odd `n`,
the wraparound is mathematically impossible to satisfy with the
curated palette. More importantly, forcing it produces ugly
alternating dark/light charts.

**Therefore**: we keep the slice stroke (2px `--white`) as the formal
separator. WCAG 1.4.11 is satisfied by the stroke; the palette can be
chosen for hue/aesthetics.

If a consumer disables the stroke, they re-enter "colours must
contrast" territory and `getAccessibleSeries` is no longer enough on
its own.

### 6. ARIA: SVG isn't the image, the figure is

Original mistake: `<svg role="img" aria-hidden="true">`. axe rightly
flagged it — focusable children inside an `aria-hidden` subtree are a
contradiction.

**Therefore**: `<svg>` has no `role` and no `aria-hidden`. The
`<figure>` provides naming (`aria-labelledby` + `<figcaption>`) and
description (`aria-describedby` + an sr-only `<p>` summarising every
datum). Individual bars/slices keep their own `role="img"` +
`aria-label`.

### 7. Storybook a11y warnings include the iframe shell

When the user complains about a11y warnings, separate component
violations from iframe-shell violations (`landmark-one-main`,
`page-has-heading-one`, `region`). The preview wrapper in
`.storybook/preview.ts` wraps every story in `<main>` + sr-only
`<h1>` to silence the shell warnings. **Do not delete that wrapper
without replacing it.**

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
  thing under its own name (`--primary`, `--yellow-l2`, ...).
- Don't reintroduce `container-type: inline-size` on the chart root.
- Don't move the focus indicator off the clipPath overlay approach
  without making sure it still follows the slice contour.
- Don't translate slices on hover.
- Animations must be gated by both the React hook and a CSS fallback.
- Every change must keep `npm run typecheck` green and
  `node scripts/a11y-scan.mjs` at zero violations.

## Out-of-scope reminders

These come up periodically — they are **explicitly** not part of this
package:

- Multi-series bar charts, stacked bars, axes/grids.
- Tooltips (the inline chip + center label cover the same UX).
- A separate icon component, theme provider, or design-token loader —
  Clay already has all of that.
- Build/bundling. Source ships as TS. Type-only build via
  `tsc -p tsconfig.build.json` is enough until this lands in Clay's
  monorepo.
