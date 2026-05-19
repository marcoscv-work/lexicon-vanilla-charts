# @clayui/charts (POC)

> Accessible, token-driven chart primitives following Clay UI conventions.
> Proof of concept — meant to be promoted into the main Clay repo without
> redesign once the API is validated.

Three components ship today:

- **`<BarChart>`** — single-series vertical or horizontal bars, primary
  blue fill, hover/focus chip showing the value.
- **`<PieChart>`** — accessible donut/pie with per-slice keyboard focus,
  screen-reader announcements, sized via presets, ring thickness control
  and an animated reveal that respects `prefers-reduced-motion`.
- **`<MapChart>`** — country-level heatmap (proportional symbol). Two
  built-in colour schemes: a monochrome blue scale and a five-hue
  cold-to-warm categorical scale. Markers are keyboard-focusable.

The whole package weighs just two React components, a token mirror, three
small a11y helpers and ~250 lines of SCSS. There are no chart libraries
under the hood — just `<svg>` and a couple of geometry helpers.

---

## Quick start

```bash
npm install
npm run storybook         # open http://localhost:6006
```

```tsx
import {PieChart, BarChart} from '@clayui/charts';

<BarChart
  title="Quarterly revenue (€k)"
  data={[
    {label: 'Q1', value: 42},
    {label: 'Q2', value: 68},
    {label: 'Q3', value: 51},
    {label: 'Q4', value: 90},
  ]}
/>

<PieChart
  title="Traffic by source"
  size="md"
  thickness="md"
  data={[
    {label: 'Organic search', value: 420},
    {label: 'Paid social', value: 210},
    {label: 'Direct', value: 180},
    {label: 'Referral', value: 90},
  ]}
/>
```

---

## Component API

### `<BarChart>`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `data` | `Array<{label, value, description?}>` | – | Single series. |
| `orientation` | `'vertical' \| 'horizontal'` | `'vertical'` | |
| `width`, `height` | `number` | `480 × 280` | Pixel viewport. |
| `title` | `string` | – | Accessible name (`<figcaption>`). |
| `description` | `string` | (auto from data) | Long description, read by AT. |
| `animated` | `boolean` | `true` | Reveal animation. Honors reduced-motion. |
| `className` | `string` | – | |

Behaviour highlights:

- Every bar is `tabIndex=0`, `role="img"`, `aria-label="<label>: <value>"`.
- Values are always visible; on hover/focus they pop into a chip with
  `--primary` background and white text (state change ≈ 5.1:1 vs the
  white surface — WCAG 1.4.11 ✓).
- Reveal animation respects the OS media query *and* the
  `c-prefers-reduced-motion` body class (Clay's convention).

### `<MapChart>`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `data` | `Array<{country, value, description?}>` | – | `country` is ISO 3166-1 alpha-2 (e.g. `'ES'`). |
| `scheme` | `'blue' \| 'categorical'` | `'blue'` | Colour scale. Blue = monochrome density. Categorical = cyan→red. |
| `steps` | `number` | `5` | Number of quantile buckets (2–5). |
| `fit` | `'world' \| 'data'` | `'world'` | `'data'` zooms the viewBox to the marker bounding box (with padding) so regional datasets fill the canvas. |
| `legend` | `'scale' \| 'list' \| 'none'` | `'scale'` | `'scale'` is the colour ramp under the canvas. `'list'` is a per-country list to the right (same layout as the PieChart legend). |
| `title` | `string` | – | Accessible name. |
| `description` | `string` | (auto) | Long description for AT. |
| `animated` | `boolean` | `true` | Reveal stagger. Respects reduced-motion. |
| `className` | `string` | – | |

```tsx
<MapChart
  title="Active users by country"
  scheme="blue"   // or "categorical"
  data={[
    {country: 'US', value: 12450},
    {country: 'DE', value: 5210},
    {country: 'ES', value: 3640},
    {country: 'CN', value: 14210},
    // ~50 countries supported out of the box — see COUNTRY_COORDS.
  ]}
/>
```

Behaviour highlights:

- Renders the stylised world map from `world-map.svg` as the geographic
  base (themed via `--light` / `--light-d1`).
- Each datum becomes a `<circle>` marker placed via a piecewise-linear
  lat/lon projection tuned to that base art. Approximate but readable
  per-region — see `CLAUDE.md` if you swap the SVG.
- Markers carry `tabIndex=0`, `role="img"` and an `aria-label` with the
  country name and value. `←/→/↑/↓/Home/End` cycle between countries
  in the order they appear in `data`.
- Hover/focus surfaces a `--primary` tooltip on the canvas with the
  active country's value.
- Legend strip below the canvas shows the colour ramp from less to
  more. Bucket boundaries are exposed as `title` tooltips per swatch.

### `<PieChart>`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `data` | `Array<{label, value, color?, description?}>` | – | |
| `size` | `'xs' \| 'sm' \| 'md' \| 'lg' \| number` | `'md'` | `160 / 220 / 280 / 360 px`. |
| `thickness` | `'md' \| 'lg'` | `'md'` | Ring band width. `lg` widens it. |
| `innerRadius` | `number (0–0.95)` | (from `thickness`) | Fraction of the outer radius. Overrides `thickness`. |
| `title` | `string` | – | Accessible name. |
| `description` | `string` | (auto) | |
| `animated` | `boolean` | `true` | |
| `className` | `string` | – | |

Behaviour highlights:

- Each slice is `tabIndex=0` with `role="img"` and an `aria-label`
  including the percentage. `←/→/↑/↓/Home/End` cycle between slices.
- Focus is drawn as a two-stroke inset border inside the slice shape —
  2px `--primary-l0` then 2px `--white` — clipped via SVG `clipPath` so
  it fits both the outer and inner ring edges.
- Hover does **not** translate the slice (that caused enter/leave jitter
  at slice edges). It only bumps `filter: brightness/saturate`. The pop
  effect lives on focus.
- Adjacent slices are separated by a 2px stroke
  (`--white` on the chart surface). This is the formal WCAG 1.4.11
  separator: hue choice can stay tuned for aesthetics (see "Palette"
  below) instead of being constrained by 3:1 luminance contrast.
- Donut center stack shows the active slice's `label`, `percentage` and
  raw `value` — or the total when no slice is hovered/focused.

---

## Tokens

`Light.tokens.json` at the repo root is the single source of truth for
the chart palette. `src/styles/_tokens.scss` declares the Clay-named CSS
custom properties (`--primary`, `--primary-l0`, `--yellow-l2`, ...) with
the same hexes; `src/tokens.ts` mirrors the same values in JS along with
the source path of each.

When this package is dropped into the main Clay repo, the `_tokens.scss`
declarations become redundant — Clay's global stylesheet already exposes
the same names — but they're useful here so the package runs standalone.

### Palette mapping (matches `references.png`)

| Family   | CSS variable     | Hex       | DTCG token path                  |
|----------|------------------|-----------|----------------------------------|
| Blue     | `--primary-l0`   | `#5791ff` | `Color.Primary.primary-l0`       |
| Yellow   | `--yellow-l2`    | `#ffd666` | `Color.Charts.Yellow.yellow-l2`  |
| Red      | `--red-l2`       | `#ff6666` | `Color.Charts.Red.red-l2`        |
| Green    | `--green-l4`     | `#9de963` | `Color.Charts.Green.green-l4`    |
| Purple   | `--purple-l1`    | `#bf66ff` | `Color.Charts.Purple.purple-l1`  |
| Teal     | `--teal-l2`      | `#42d7be` | `Color.Charts.Teal.teal-l2`      |
| Pink     | `--pink-l2`      | `#ff80c8` | `Color.Charts.Pink.pink-l2`      |
| Orange   | `--orange-l3`    | `#ffa166` | `Color.Charts.Orange.orange-l3`  |
| Cyan     | `--cyan-l3`      | `#66ccff` | `Color.Charts.Cyan.cyan-l3`      |
| Indigo   | `--indigo-l3`    | `#b2baff` | `Color.Charts.Indigo.indigo-l3`  |

`getAccessibleSeries(n)` returns the first `n` colours from that order
as `var(...)` expressions, so consumers re-theme via CSS without
touching JS.

---

## Accessibility model

1. **Per-element keyboard + AT support.** Every bar and pie slice is a
   focusable `role="img"` element with an `aria-label` describing the
   datum (and percentage, for slices). `←/→/↑/↓/Home/End` move between
   pie slices.
2. **Token-driven palette.** Slice fills come from Clay's chart palette
   tokens via CSS variables — see the table above. The palette is the
   "flat" pastel scheme from `references.png`, mapped 1:1 to the
   matching shade in `Light.tokens.json`.
3. **Adjacent slice separation.** A 2px stroke (`--white`) sits on every
   slice edge. This is the formal WCAG 1.4.11 separator between
   adjacent colours, so the hue palette can prioritise aesthetics.
4. **Focus indication ≥ 3:1.** Focused slices get a 2px `--primary-l0`
   inset border (clipped to the slice). Bars get a `--primary-d2`
   outline. Both pass 1.4.11 against the surrounding surface.
5. **State-change contrast ≥ 3:1.** Hover/focus chips (bar value badge,
   pie legend item) flip to `--primary` background with white text —
   ≈ 5.1:1 vs the white surface, comfortably past the 3:1 bar.
6. **Reduced motion.** Animations are on by default and disabled when:
   - the OS reports `prefers-reduced-motion: reduce`, *or*
   - `<body>` carries the `c-prefers-reduced-motion` class (Clay
     convention).

   Both conditions are honoured via the React hook **and** via a CSS
   safety net (`!important` rules), so the animation can't sneak past
   on mount-timing races.

---

## Responsive

The chart's `<figcaption>` + `<svg>` + legend live inside a `<flex>`
row with `flex-wrap`. When the parent narrows below the combined width
of canvas + legend, the legend wraps to the next line and ends up under
the canvas. No `ResizeObserver`, no container queries (see
`CLAUDE.md` for why container queries collapse the chart).

The SVG itself is fluid: `max-width: 100%; height: auto` plus a viewBox
keeps the aspect ratio.

---

## Storybook

Run `npm run storybook`. Stories are grouped under **Charts/**:

- `BarChart` — `Vertical`, `Horizontal`, `ManyBars`, `ReducedMotion`.
- `PieChart` — `Default`, `TwoSlices`, `OddSliceCount`, `ManySlices`,
  `Sizes`, `Thickness`, `Responsive`, `ReducedMotion`,
  `KeyboardNavigation`.
- `MapChart` — `BlueDensity`, `Categorical`, `ThreeBuckets`, `Sparse`,
  `LegendList`, `LegendListCategorical`, `FitToDataEurope`,
  `FitToDataAsia`, `Responsive`, `ReducedMotion`.

The preview toolbar has a **Reduced motion** toggle that flips
`c-prefers-reduced-motion` on `<body>`. Each story is wrapped in
`<main>` + `<h1>` (sr-only) so the iframe satisfies axe's
`landmark-one-main` / `page-has-heading-one` / `region` rules.

---

## Scripts

```bash
npm run dev               # alias for storybook
npm run storybook         # storybook dev server (port 6006)
npm run build-storybook   # static build
npm run typecheck         # tsc --noEmit
node scripts/a11y-scan.mjs  # headless axe-core scan vs running storybook
```

The a11y scanner spins up headless Chrome via Puppeteer, opens every
story listed in `scripts/a11y-scan.mjs` and runs axe-core with
`wcag2a/aa`, `wcag21a/aa` and `best-practice`. Add new story IDs to the
array when you add new stories.

---

## What's intentionally not here

- No second axis on the bar chart, no multi-series, no stacked bars.
- No tooltip component. Hover/focus already surface the value inline
  (bar chip, pie center label, legend chip).
- No SVG-side animation library. CSS handles every transition.
- No build pipeline yet. `tsc -p tsconfig.build.json` emits types; the
  consumer bundles the source directly. When this lands in Clay, the
  monorepo build takes over.

---

## License

To be defined by Clay before promotion.
