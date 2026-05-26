# @clayui/charts (POC)

> Accessible, token-driven chart primitives following Clay UI conventions.
> Proof of concept — meant to be promoted into the main Clay repo without
> redesign once the API is validated.

Four components ship today:

- **`<BarChart>`** — vertical or horizontal bars. Two colour schemes
  (`blue` monochrome and `categorical` per-bar hues), optional list /
  table legend below the SVG, hover/focus chip showing the value.
- **`<PieChart>`** — accessible donut or solid pie with per-slice
  keyboard focus, screen-reader announcements, size + thickness
  presets, optional list / table legend.
- **`<MapChart>`** — country-level heatmap. Two built-in colour schemes
  (monochrome blue density / categorical cold-to-warm), `fit='data'`
  zoom to a regional bounding box, optional list / table legend, and an
  **experimental** `variant='choropleth'` that fills each country path
  instead of dropping a marker on top.
- **`<LineChart>`** — multi-series line chart with **9 marker shapes ×
  9 dash patterns** cycled per series (so 9 lines stay visually
  distinguishable even when colour collapses). Per-point keyboard focus
  with a Lexicon-style halo, optional anchored popover at the active
  marker, list / table legends.

The whole package weighs four React components, a token mirror, three
small a11y helpers and ~600 lines of SCSS. There are no chart
libraries under the hood — just `<svg>`, a couple of geometry helpers
and a regex-light SVG path parser for the experimental choropleth.

---

## Quick start

```bash
npm install
npm run storybook         # open http://localhost:6006
```

```tsx
import {BarChart, LineChart, PieChart, MapChart} from '@clayui/charts';

<BarChart
  title="Quarterly revenue (€k)"
  scheme="categorical"
  legend="list"
  data={[
    {label: 'Q1', value: 42},
    {label: 'Q2', value: 68},
    {label: 'Q3', value: 51},
    {label: 'Q4', value: 90},
  ]}
/>

<LineChart
  title="Value per year"
  categories={['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']}
  series={[
    {label: '2024', values: [15, 50, 65, 140, 142, 200]},
    {label: '2025', values: [115, 80, 170, 235, 168, 240]},
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
| `scheme` | `'blue' \| 'categorical'` | `'blue'` | `categorical` reads per-bar hues from `getAccessibleSeries(n)`; the active-state uses `filter: brightness/saturate` so the per-bar colour is preserved instead of flattening to `--primary`. |
| `legend` | `'list' \| 'table' \| 'none'` | `'none'` | Legend below the SVG. `list` mirrors PieChart's compact grid; `table` is the GA-style detail table (see below). Defaults to `none` because axis labels already name each bar. |
| `size` | `'default' \| 'inline'` | `'default'` | `'inline'` flattens every bar to a fixed 8 px regardless of band size — the progress-bar-style row. Hides the axis baseline (a single-row chart has nothing to anchor). Pairs naturally with `track` and `rounded`; works in both orientations though it's designed for horizontal. |
| `track` | `boolean` | `false` | Draws a `--light-d1` rect behind each bar that spans the full plot length, so the row reads as "value out of total" even when the bar is short. Static — the reveal animation only runs on the bar. |
| `rounded` | `boolean` | `false` | Rounds bar (and track) ends into a pill — `rx = thickness/2`. Independent of `size`, so consumers can mix-and-match: default-thickness rounded, inline square-ended, etc. |
| `width`, `height` | `number` | `480 × 280` | Pixel viewport. |
| `title` | `string` | – | Accessible name (`<figcaption>`). |
| `description` | `string` | (auto from data) | Long description, read by AT. Suppressed when `legend='table'`. |
| `animated` | `boolean` | `true` | Reveal animation. Honors reduced-motion. |
| `className` | `string` | – | |

Behaviour highlights:

- Every bar is `tabIndex=0`, `role="img"`, `aria-label="<label>: <value>"`.
- Values are always visible above the bar; on hover/focus they pop into
  a chip with `--primary` background and white text (≈ 5.1:1 vs the
  white surface — WCAG 1.4.11 ✓).
- Reveal animation respects the OS media query **and** the
  `c-prefers-reduced-motion` body class.
- When a legend is opted in, the figure switches from `inline-block` to
  `block` so the legend can flow under the SVG.

```tsx
// Single progress row — the pattern in the screenshots.
<BarChart
  title="Storage used"
  orientation="horizontal"
  size="inline"
  track
  rounded
  data={[{label: 'Progress', value: 62}]}
/>

// Several rows sharing the same gray track.
<BarChart
  title="Quota usage"
  orientation="horizontal"
  size="inline"
  track
  rounded
  data={[
    {label: 'Storage', value: 62},
    {label: 'Bandwidth', value: 28},
    {label: 'API calls', value: 91},
    {label: 'Seats', value: 45},
  ]}
/>
```

### `<MapChart>`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `data` | `Array<{country, value, description?}>` | – | `country` is ISO 3166-1 alpha-2 (e.g. `'ES'`). |
| `scheme` | `'blue' \| 'categorical'` | `'blue'` | Colour scale. Blue = monochrome density. Categorical = cyan→red. |
| `steps` | `number` | `5` | Number of quantile buckets (2–5). |
| `fit` | `'world' \| 'data'` | `'world'` | `'data'` zooms the viewBox to the marker bounding box (with padding) so regional datasets fill the canvas. Ignored when `variant='choropleth'`. |
| `legend` | `'scale' \| 'list' \| 'table' \| 'none'` | `'scale'` | `'scale'` is the colour ramp under the canvas. `'list'` is a per-country list to the right. `'table'` renders a Google-Analytics-style detail table below the canvas (rank, swatch, country, value, share). |
| `variant` | `'markers' \| 'choropleth'` | `'markers'` | **Experimental.** `'choropleth'` fills the country path instead of placing a dot. Uses a separate per-country SVG (CC BY-SA 3.0) with ISO-id paths. See "Experimental: choropleth" below. |
| `title`, `description`, `animated`, `className` | … | … | Same shape as the other charts. |

```tsx
<MapChart
  title="Active users by country"
  scheme="blue"
  legend="table"            // or 'scale' (default), 'list', 'none'
  data={[
    {country: 'US', value: 12450},
    {country: 'DE', value: 5210},
    {country: 'ES', value: 3640},
    {country: 'CN', value: 14210},
  ]}
/>
```

Behaviour highlights:

- Renders the stylised world map from `world-map.svg` as the geographic
  base (themed via `--light` / `--light-d1`).
- Each datum becomes a `<circle>` marker placed via hand-calibrated
  per-country pixel coordinates (`countries.ts`). The artwork isn't a
  mathematical projection — see `CLAUDE.md` if you swap the SVG.
- Markers carry `tabIndex=0`, `role="img"` and an `aria-label` with the
  country name and value. `←/→/↑/↓/Home/End` cycle between countries
  in the order they appear in `data`.
- Focus draws a Lexicon-style ring (2 px primary + 2 px white) around
  the active marker.
- `legend='table'` is the screen-reader-friendly representation: the
  per-datum `aria-describedby` dump is suppressed so AT users don't
  hear the data twice.

### `<PieChart>`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `data` | `Array<{label, value, color?, description?}>` | – | |
| `size` | `'xs' \| 'sm' \| 'md' \| 'lg' \| number` | `'md'` | `160 / 220 / 280 / 360 px`. |
| `thickness` | `'md' \| 'lg'` | `'md'` | Ring band width. `lg` widens it. |
| `innerRadius` | `number (0–0.95)` | (from `thickness`) | Fraction of the outer radius. Overrides `thickness`. **`0` renders a classic solid pie** — the centre label / hover summary are gated on `rInner > 0` and disappear automatically in that mode. |
| `legend` | `'list' \| 'table' \| 'none'` | `'list'` | `list` is the compact swatch/label/% grid (the historical default). `table` renders the GA-style detail table below the chart. `none` hides the legend entirely. |
| `title`, `description`, `animated`, `className` | … | … | |

Behaviour highlights:

- Each slice is `tabIndex=0` with `role="img"` and an `aria-label`
  including the percentage. `←/→/↑/↓/Home/End` cycle between slices.
- Focus is drawn as a two-stroke inset border inside the slice shape —
  2 px `--primary-l0` then 2 px `--white` — clipped via SVG `clipPath`
  so it fits both the outer and inner ring edges.
- Hover does **not** translate the slice (that caused enter/leave
  jitter at slice edges). It only bumps `filter: brightness/saturate`.
  The pop effect lives on focus.
- Adjacent slices are separated by a 2 px stroke (`--white`). This is
  the formal WCAG 1.4.11 separator: hue choice can stay tuned for
  aesthetics.
- Donut centre stack shows the active slice's `label`, `percentage`
  and raw `value` — or the total when no slice is hovered/focused.
  Suppressed when `innerRadius={0}` (there's no centre to fill).

### `<LineChart>`

| Prop | Type | Default | Notes |
|---|---|---|---|
| `series` | `LineSeries[]` | – | See `LineSeries` below. |
| `categories` | `string[]` | – | Tick labels for the x-axis (must match `values.length` of each series). |
| `scheme` | `'blue' \| 'categorical'` | `'blue'` | `blue` keeps every series at `--primary-l0`; series stay distinguishable via marker shape + dash pattern. `categorical` reads per-series hues from `getAccessibleSeries(n)`. |
| `legend` | `'list' \| 'table' \| 'none'` | `'list'` | List shows a marker + dashed mini-line + label + latest value. Table renders the GA-style detail table with totals + averages per series. |
| `pointTooltip` | `'popover' \| 'corner' \| 'none'` | `'popover'` | Where the active-point value chip appears. `'popover'` anchors it to the marker with a small down-arrow (flips above ↔ below depending on the point's vertical position to avoid clipping the title). `'corner'` is the MapChart-style top-left chip. |
| `width`, `height` | `number` | `640 × 320` | Pixel viewport. |
| `yTicks` | `number` | `5` | Tick count on the y-axis (auto-rounded to "nice" numbers like 5/10/25/50/100). |
| `yFormat` | `(value) => string` | – | Optional formatter for y-axis labels and the tooltip value (e.g. add `€`, `%`, thousands separators). |
| `title`, `description`, `animated`, `className` | … | … | |

```ts
interface LineSeries {
  label: string;
  values: Array<number | null>;   // `null` breaks the polyline
  color?: string;                  // any CSS expression
  dasharray?: string;              // overrides the per-series cycle
  markerShape?: LineMarkerShape;   // overrides the per-series cycle
  description?: string;            // accessible override
}
```

Behaviour highlights:

- **9 marker shapes × 9 dash patterns**, cycled per series in the
  canonical order:

  | Slot | Marker | Dash |
  |------|--------|------|
  | 0 | `circle` | `1 1` |
  | 1 | `square` | `2 1` |
  | 2 | `triangle` | `4 1` |
  | 3 | `diamond` | `1 2` |
  | 4 | `triangle-down` | `2 2` |
  | 5 | `d-up` (half-disc up) | `4 2` |
  | 6 | `d-down` (half-disc down) | `1 4` |
  | 7 | `bar-h` | `2 4` |
  | 8 | `bar-v` | `4 4` |

  Override per series with `markerShape` and `dasharray` if needed.
- Each intersection is a focusable `<g>` (`tabIndex=0`, `role="img"`,
  `aria-label="{series}, {category}: {value}"`). `←/→` move within a
  series, `↑/↓` between series, `Home/End` jump to the first/last
  category.
- Focus halo re-emits the marker shape at scales 2.0 (primary) and 1.5
  (white) under the marker so the Lexicon 2 px-primary + 2 px-white
  ring follows the shape — exact for `circle`/`square`/`diamond`,
  approximated on `bar-h`/`bar-v` (the band is thinner on the short
  axis but still clearly visible).
- `null` values break the polyline and skip the marker from the focus
  tab order. Useful for sensor data with dropouts.
- `pointTooltip='popover'` renders a dark chip anchored to the active
  marker with a down-arrow (matches the Material/Apple tooltip
  convention). Position is expressed as a percentage of the SVG
  viewBox, so it stays aligned when `max-width: 100%` shrinks the
  chart. For points in the top 25 % of the canvas the chip flips below
  the marker so it doesn't collide with the title.
- Lines fade in (opacity, staggered 80 ms per series); markers
  scale + fade. The marker animation runs on an inner `__point-anim`
  `<g>` rather than the positioning `<g>` — animating the positioned
  node would replace its `transform="translate(cx,cy)"` and the marker
  would scale in from `(0,0)` instead of from its data point.

---

## Tokens and palette

`Light.tokens.json` at the repo root is the single source of truth.
`src/styles/_tokens.scss` declares the Clay-named CSS custom properties
(`--primary`, `--primary-l0`, `--yellow-l2`, …) with the same hexes;
`src/tokens.ts` mirrors the same values in JS along with the source
path of each.

When this package is dropped into the main Clay repo, the
`_tokens.scss` declarations become redundant — Clay's global
stylesheet already exposes the same names — but they're useful here so
the package runs standalone.

### Base palette (slots 0–9, `CHART_FAMILY_ORDER`)

Matches `references.png`.

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

### Extended palette (slots 10–19, `CHART_EXTENDED_PALETTE`)

Same hue order, one shade darker — the `Color.Charts.{Family}.{family}-d2`
token of each family. Used by `getAccessibleSeries(n)` once the 10 base
families are exhausted, so a chart with 11–20 series stops repeating
colours immediately.

| Family   | CSS variable    | Hex       | DTCG token path                |
|----------|-----------------|-----------|--------------------------------|
| Blue     | `--blue-d2`     | `#005fcc` | `Color.Charts.Blue.blue-d2`    |
| Yellow   | `--yellow-d2`   | `#cc9600` | `Color.Charts.Yellow.yellow-d2`|
| Red      | `--red-d2`      | `#b30000` | `Color.Charts.Red.red-d2`      |
| Green    | `--green-d2`    | `#2e590d` | `Color.Charts.Green.green-d2`  |
| Purple   | `--purple-d2`   | `#9500ff` | `Color.Charts.Purple.purple-d2`|
| Teal     | `--teal-d2`     | `#125449` | `Color.Charts.Teal.teal-d2`    |
| Pink     | `--pink-d2`     | `#b30065` | `Color.Charts.Pink.pink-d2`    |
| Orange   | `--orange-d2`   | `#993b00` | `Color.Charts.Orange.orange-d2`|
| Cyan     | `--cyan-d2`     | `#005580` | `Color.Charts.Cyan.cyan-d2`    |
| Indigo   | `--indigo-d2`   | `#1a30ff` | `Color.Charts.Indigo.indigo-d2`|

`getAccessibleSeries(n)` cycles `base → extended → wrap`. For `n ≤ 10`
the result is byte-identical to before the extension — the base 10 are
considered stable API.

---

## Accessibility model

1. **Per-element keyboard + AT support.** Every bar, slice, marker and
   line intersection is a focusable `role="img"` element with an
   `aria-label`. Pie slices announce the percentage; line points
   announce `"{series}, {category}: {value}"`; map markers announce
   `"{country}: {value}"`. Arrow keys move between siblings; on the
   LineChart `↑/↓` switch series, `←/→` move within a series.

2. **Token-driven palette.** Fills come from Clay's chart tokens via
   CSS variables — see the tables above. `getAccessibleSeries(n)`
   returns the first `n` slots as `var(...)` expressions so consumers
   re-theme via CSS without touching JS.

3. **Adjacent slice separation.** A 2 px `--white` stroke on every pie
   slice is the formal WCAG 1.4.11 separator between adjacent colours,
   so the hue palette can prioritise aesthetics. LineChart leans on
   marker shape + dash pattern for the same job — colour-blind users
   keep nine cleanly distinguishable lines even in `scheme='blue'`.

4. **Focus indication ≥ 3:1.** Pie slices get a 2 px `--primary-l0`
   inset ring (clipped to the slice). Map markers and line points get
   the same 2 px-primary + 2 px-white halo, drawn either as concentric
   circles (markers) or by re-emitting the marker shape at scale 2.0
   and 1.5 (line points). Bars get a `--primary-d2` outline. Every
   variant passes 1.4.11 against the surrounding surface.

5. **State-change contrast ≥ 3:1.** Hover/focus chips (bar value
   badge, pie/map/line tooltips, legend active rows) flip to
   `--primary` background with white text — ≈ 5.1:1 vs the white
   surface, comfortably past the 3:1 bar.

6. **Reduced motion.** Animations are on by default and disabled when:
   - the OS reports `prefers-reduced-motion: reduce`, **or**
   - `<body>` carries the `c-prefers-reduced-motion` class.

   Both conditions are honoured via the React hook **and** via a CSS
   safety net (`!important` rules), so the animation can't sneak past
   on mount-timing races.

7. **Table legend = primary AT surface.** When `legend='table'` the
   chart renders a real semantic `<table>` (with `<th scope="col">`
   headers and `<th scope="row">` on the label/country/series name).
   In that mode the per-datum `aria-describedby` summary is suppressed
   so AT users don't hear the same data twice.

---

## Responsive

Each component picks one of two layout strategies:

- **`<MapChart>`** — figure is `display: block`, SVG is
  `width: 100%; height: auto`. Stretches to fill the parent.
- **`<BarChart>`, `<PieChart>`, `<LineChart>`** — figure is
  `display: inline-block` so the SVG renders at the `width` prop
  instead of stretching. The SVG keeps `max-width: 100%`, so a narrow
  parent shrinks the chart while the `viewBox` preserves the aspect
  ratio. BarChart and LineChart flip to `display: block` when a
  legend is opted in, so the legend can flow underneath.

No `ResizeObserver`, no container queries (see `CLAUDE.md` for why
`container-type` collapses the chart).

---

## Experimental: choropleth (MapChart)

`<MapChart variant='choropleth' />` fills each country's vector path
instead of dropping a marker on it. It's gated behind the prop and
**not** part of the stable API yet — the implementation lives in
isolated files prefixed `MapChartChoropleth.*` so reverting is just a
matter of deleting them + a one-line change in `MapChart.tsx`.

Notes:

- The base SVG (`_experimental-countries-map.svg`) is CC BY-SA 3.0,
  derived from [flekschas/simple-world-map](https://github.com/flekschas/simple-world-map).
  Country paths are identified by ISO 3166-1 alpha-2 ids (lowercase).
- `fit='data'` is ignored in this mode — the choropleth always renders
  the full world.
- The focus ring uses an SVG `clipPath` containing all paths of the
  focused country (multi-part countries like US + Alaska, AU +
  Tasmania, CA, ES) so the 2 px-primary + 2 px-white band traces the
  country's outline exactly.
- The path map (`iso → d[]`) is parsed once at module init with a
  small regex, kept in memory and reused for every focus state — much
  cheaper than walking the live DOM each render.

Reversion plan and the rest of the experimental contract live at the
top of `src/components/MapChart/MapChartChoropleth.tsx`.

---

## Storybook

Run `npm run storybook`. Stories are grouped under **Charts/**, in the
order MapChart → LineChart → PieChart → BarChart (set in
`.storybook/preview.ts`):

- **MapChart** — `BlueDensity`, `Categorical`, `ThreeBuckets`,
  `Sparse`, `LegendList`, `LegendListCategorical`, `LegendTable`,
  `LegendTableCategorical`, `FitToDataEurope`, `FitToDataAsia`,
  `ChoroplethBlue`, `ChoroplethCategorical`, `Responsive`,
  `ReducedMotion`.
- **LineChart** — `Default`, `Categorical`, `SingleSeries`,
  `NineSeries` (the full 9-shape × 9-dash matrix),
  `PopoverTooltip`, `CornerTooltip`, `LegendTable`, `WithGaps`,
  `ReducedMotion`, `KeyboardNavigation`.
- **PieChart** — `Default`, `TwoSlices`, `OddSliceCount`, `ManySlices`,
  `Sizes`, `Thickness`, `Solid` (innerRadius=0), `LegendTable`,
  `LegendNone`, `Responsive`, `ReducedMotion`, `KeyboardNavigation`.
- **BarChart** — `Vertical`, `Horizontal`, `ManyBars`, `Categorical`,
  `CategoricalManyBars` (20 series, demos the extended palette),
  `CategoricalHorizontal`, `LegendList`, `LegendTable`,
  `Inline` (single 8 px row + track + pill ends), `InlineMultiple`
  (the same applied to a quota-usage list), `InlineSquare`
  (`rounded={false}` to see the 2 px corner default),
  `ReducedMotion`.

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
`wcag2a/aa`, `wcag21a/aa` and `best-practice`. Add new story IDs to
the array when you add new stories. **CI gate: `Total violations: 0`.**

---

## What's intentionally not here

- No second axis on the bar chart, no stacked bars, no multi-series
  bar.
- No multi-value crosshair tooltip on the line chart (the popover
  shows the active point only — common pattern is enough for a POC).
- No separate icon component, theme provider, or design-token loader —
  Clay already has all of that.
- No build pipeline yet. Source ships as TS; type-only build via
  `tsc -p tsconfig.build.json` is enough until this lands in Clay's
  monorepo.

---

## License

To be defined by Clay before promotion.
