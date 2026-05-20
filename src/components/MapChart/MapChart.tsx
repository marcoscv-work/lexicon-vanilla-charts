import {
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
	type KeyboardEvent,
} from 'react';
import {useReducedMotion} from '../../a11y/useReducedMotion';
import {COUNTRY_COORDS, lookupCountry} from './countries';
import {
	MapChartChoropleth,
	type ChoroplethCanvasHandle,
} from './MapChartChoropleth';
import {MAP_VIEWBOX} from './projection';
import worldSvg from './world-map.svg?raw';
import './MapChart.scss';

/**
 * Strip the outer `<svg>` shell so the inner paths can be inlined inside
 * the component's own `<svg>` element (and re-themed via CSS).
 *
 * The original `_Map.svg` paints every land path with `fill="#F1F2F5"` —
 * we drop that so `.cui-map-chart__land` can take over via CSS.
 */
const WORLD_INNER = worldSvg
	.replace(/^<svg[^>]*>/, '')
	.replace(/<\/svg>\s*$/, '')
	.replace(/fill="#F1F2F5"/g, '');

export interface MapDatum {
	/** ISO 3166-1 alpha-2 code, e.g. `'ES'`. Case-insensitive. */
	country: string;
	value: number;
	/** Optional override for the screen-reader description. */
	description?: string;
}

export type MapColorScheme = 'blue' | 'categorical';

export type MapChartFit = 'world' | 'data';

export type MapChartLegend = 'scale' | 'list' | 'table' | 'none';

/**
 * EXPERIMENTAL — rendering style.
 *
 * - `markers` (default): the current proportional-symbol map (dots
 *   placed on hand-calibrated x/y per country).
 * - `choropleth`: the country itself is filled with the bucket colour
 *   (uses `MapChartChoropleth` + `_experimental-countries-map.svg`).
 *   The `fit` prop is ignored — the choropleth always renders the full
 *   world. Reversion notes in `MapChartChoropleth.tsx`.
 */
export type MapChartVariant = 'markers' | 'choropleth';

export interface MapChartProps {
	data: MapDatum[];
	/**
	 * Colour scale.
	 *
	 * - `blue` (default): a 5-step monochrome scale from `--blue-l4` to
	 *   `--blue-d4`. Darker == higher density.
	 * - `categorical`: 5 hues from the Clay chart palette, ordered cold
	 *   to warm (cyan → green → yellow → orange → red).
	 */
	scheme?: MapColorScheme;
	/** Number of buckets the values are binned into (2–6). Default `5`. */
	steps?: number;
	/**
	 * Viewport mode.
	 *
	 * - `world` (default): always shows the full world map.
	 * - `data`: zooms to the bounding box of the rendered markers. Useful
	 *   when the data is concentrated in one region (e.g. only European
	 *   countries) — the rest of the map gets cropped out so the markers
	 *   read at full size. Land paths around the data still draw, so the
	 *   surrounding geographic context isn't lost.
	 */
	fit?: MapChartFit;
	/**
	 * Legend layout.
	 *
	 * - `scale` (default): a horizontal ramp under the canvas showing
	 *   the colour buckets from "less" to "more".
	 * - `list`: a per-country list to the right of the canvas (sorted
	 *   by value, highest first) — same shape as the PieChart legend.
	 *   Each row is clickable and focuses the matching marker.
	 * - `table`: a Google-Analytics-style table BELOW the canvas with
	 *   rank, colour swatch, country, value and share of total. The
	 *   table is the primary representation (real semantic `<table>`
	 *   readable by screen readers) — the per-datum sr-only summary
	 *   is suppressed in this mode so AT users don't hear the data
	 *   twice. Rows are clickable and sync the active state with
	 *   the map.
	 * - `none`: no legend.
	 */
	legend?: MapChartLegend;
	/**
	 * EXPERIMENTAL — see `MapChartVariant`. Default `markers`.
	 */
	variant?: MapChartVariant;
	/** Accessible name for the chart as a whole. */
	title: string;
	/** Optional accessible long description. */
	description?: string;
	/** Reveal animation (default `true`). */
	animated?: boolean;
	/** Class name appended to the root `<figure>`. */
	className?: string;
}

/** CSS variables for the two built-in colour schemes. */
const SCHEMES: Record<MapColorScheme, string[]> = {
	blue: [
		'var(--blue-l4)',
		'var(--blue-l2)',
		'var(--blue)',
		'var(--blue-d2)',
		'var(--blue-d4)',
	],
	categorical: [
		'var(--cyan-l3)',
		'var(--green-l4)',
		'var(--yellow-l2)',
		'var(--orange-l3)',
		'var(--red-l2)',
	],
};

/**
 * Bin `values` into `steps` quantile buckets. Returns the boundaries
 * (exclusive upper bounds) and a `bucket(value)` helper that maps any
 * value to its 0..steps-1 index.
 */
function buildBuckets(values: number[], steps: number) {
	const sorted = [...values].filter((v) => v > 0).sort((a, b) => a - b);
	if (sorted.length === 0) {
		return {boundaries: [] as number[], bucket: () => 0};
	}
	const boundaries: number[] = [];
	for (let i = 1; i < steps; i++) {
		const idx = Math.floor((sorted.length * i) / steps);
		boundaries.push(sorted[Math.min(idx, sorted.length - 1)]);
	}
	const bucket = (v: number) => {
		for (let i = 0; i < boundaries.length; i++) {
			if (v <= boundaries[i]) return i;
		}
		return boundaries.length;
	};
	return {boundaries, bucket};
}

export function MapChart({
	data,
	scheme = 'blue',
	steps = 5,
	fit = 'world',
	legend = 'scale',
	variant = 'markers',
	title,
	description,
	animated = true,
	className,
}: MapChartProps) {
	const isChoropleth = variant === 'choropleth';
	const reactId = useId();
	const titleId = `${reactId}-title`;
	const descId = `${reactId}-desc`;

	const reducedMotion = useReducedMotion();
	const motionOn = animated && !reducedMotion;

	const [focusIndex, setFocusIndex] = useState<number | null>(null);
	const [hoverIndex, setHoverIndex] = useState<number | null>(null);
	const activeIndex = focusIndex ?? hoverIndex;
	const markerRefs = useRef<Array<SVGCircleElement | null>>([]);
	const choroplethRef = useRef<ChoroplethCanvasHandle | null>(null);

	// Shared hover/focus handlers so the choropleth variant can drive the
	// same `activeIndex` state the markers variant does.
	const onEnterIndex = useCallback(
		(i: number) => setHoverIndex(i),
		[]
	);
	const onLeaveIndex = useCallback(
		(i: number) =>
			setHoverIndex((cur) => (cur === i ? null : cur)),
		[]
	);
	const onFocusIndex = useCallback(
		(i: number) => setFocusIndex(i),
		[]
	);
	const onBlurIndex = useCallback(
		(i: number) =>
			setFocusIndex((cur) => (cur === i ? null : cur)),
		[]
	);

	const clampedSteps = Math.max(
		2,
		Math.min(SCHEMES[scheme].length, Math.floor(steps))
	);
	// Memoise — `.slice()` on every render would otherwise hand a new
	// array identity to the choropleth canvas, restarting all reveal
	// animations every time `activeIndex` changes (i.e. on every focus
	// or hover).
	const palette = useMemo(
		() => SCHEMES[scheme].slice(0, clampedSteps),
		[scheme, clampedSteps]
	);

	const enriched = useMemo(
		() =>
			data
				.map((d) => {
					const country = lookupCountry(d.country);
					if (!country) return null;
					return {datum: d, country, x: country.x, y: country.y};
				})
				.filter(
					(v): v is {
						datum: MapDatum;
						country: (typeof COUNTRY_COORDS)[string];
						x: number;
						y: number;
					} => v !== null
				),
		[data]
	);

	const {bucket, boundaries} = useMemo(
		() => buildBuckets(enriched.map((e) => e.datum.value), clampedSteps),
		[enriched, clampedSteps]
	);

	// When `fit === 'data'`, crop the viewBox to the marker bounding box
	// (with padding) so the visible region matches where the data is.
	// Land paths outside still draw — they're just clipped by the SVG
	// viewport, which keeps the surrounding geographic context.
	const viewBox = useMemo(() => {
		if (fit !== 'data' || enriched.length === 0) {
			return `0 0 ${MAP_VIEWBOX.width} ${MAP_VIEWBOX.height}`;
		}
		const xs = enriched.map((e) => e.x);
		const ys = enriched.map((e) => e.y);
		const PAD = 30;
		let minX = Math.max(0, Math.min(...xs) - PAD);
		let minY = Math.max(0, Math.min(...ys) - PAD);
		const maxX = Math.min(MAP_VIEWBOX.width, Math.max(...xs) + PAD);
		const maxY = Math.min(MAP_VIEWBOX.height, Math.max(...ys) + PAD);
		let w = maxX - minX;
		let h = maxY - minY;
		// Avoid degenerate boxes (e.g. a single marker) by enforcing a
		// minimum 200×100 viewport. Smaller boxes also blow up marker
		// radius too much.
		const MIN_W = 200;
		const MIN_H = 100;
		if (w < MIN_W) {
			minX = Math.max(0, minX - (MIN_W - w) / 2);
			w = MIN_W;
		}
		if (h < MIN_H) {
			minY = Math.max(0, minY - (MIN_H - h) / 2);
			h = MIN_H;
		}
		return `${minX} ${minY} ${w} ${h}`;
	}, [fit, enriched]);

	// Marker radius shrinks proportionally when zoomed so a tight cluster
	// doesn't end up with comically large dots.
	const markerScale = useMemo(() => {
		const [, , w] = viewBox.split(' ').map(Number);
		if (!w || !isFinite(w)) return 1;
		return Math.max(0.45, Math.min(1, w / MAP_VIEWBOX.width));
	}, [viewBox]);

	const summary = useMemo(() => {
		// `legend="table"` renders a real semantic <table> below the
		// canvas — that is the screen-reader-friendly representation in
		// that mode, so we skip the per-datum dump to avoid duplication.
		if (legend === 'table') return description ?? '';
		const parts = enriched
			.slice()
			.sort((a, b) => b.datum.value - a.datum.value)
			.map(
				(e) =>
					e.datum.description ??
					`${e.country.name}: ${e.datum.value}`
			);
		return [description, ...parts].filter(Boolean).join('. ');
	}, [enriched, description, legend]);

	const onMarkerKeyDown = useCallback(
		(e: KeyboardEvent<SVGCircleElement>, idx: number) => {
			const n = enriched.length;
			if (n === 0) return;
			let next = idx;
			switch (e.key) {
				case 'ArrowRight':
				case 'ArrowDown':
					next = (idx + 1) % n;
					break;
				case 'ArrowLeft':
				case 'ArrowUp':
					next = (idx - 1 + n) % n;
					break;
				case 'Home':
					next = 0;
					break;
				case 'End':
					next = n - 1;
					break;
				default:
					return;
			}
			e.preventDefault();
			markerRefs.current[next]?.focus();
		},
		[enriched.length]
	);

	useEffect(() => {
		markerRefs.current = markerRefs.current.slice(0, enriched.length);
	}, [enriched.length]);

	const active = activeIndex != null ? enriched[activeIndex] : null;

	const focusMarker = useCallback(
		(idx: number) => {
			if (isChoropleth) {
				choroplethRef.current?.focusIndex(idx);
			} else {
				markerRefs.current[idx]?.focus();
			}
		},
		[isChoropleth]
	);

	// Per-country legend (sorted by value desc) for `legend="list"` and
	// `legend="table"`. The `table` variant additionally carries `rank`
	// and `share` (% of total) — both derived here once instead of in
	// the render path.
	const legendItems = useMemo(() => {
		if (legend !== 'list' && legend !== 'table') return [];
		const total = enriched.reduce(
			(acc, e) => acc + Math.max(0, e.datum.value),
			0
		);
		return enriched
			.map((e, i) => ({...e, dataIndex: i}))
			.sort((a, b) => b.datum.value - a.datum.value)
			.map((item, sortedIdx) => ({
				...item,
				rank: sortedIdx + 1,
				share: total > 0 ? item.datum.value / total : 0,
			}));
	}, [enriched, legend]);

	return (
		<figure
			className={[
				'cui-map-chart',
				`cui-map-chart--${scheme}`,
				`cui-map-chart--variant-${variant}`,
				`cui-map-chart--legend-${legend}`,
				motionOn && 'cui-map-chart--motion',
				className,
			]
				.filter(Boolean)
				.join(' ')}
			aria-labelledby={titleId}
			aria-describedby={descId}
		>
			<figcaption id={titleId} className="cui-map-chart__title">
				{title}
			</figcaption>
			<p id={descId} className="cui-sr-only">
				{summary}
			</p>
			<div className="cui-map-chart__body">
				<div className="cui-map-chart__canvas">
				{isChoropleth ? (
					<MapChartChoropleth
						ref={choroplethRef}
						enriched={enriched}
						palette={palette}
						bucket={bucket}
						activeIndex={activeIndex}
						focusIndex={focusIndex}
						motionOn={motionOn}
						onEnterIndex={onEnterIndex}
						onLeaveIndex={onLeaveIndex}
						onFocusIndex={onFocusIndex}
						onBlurIndex={onBlurIndex}
					/>
				) : (
				<svg
					viewBox={viewBox}
					preserveAspectRatio="xMidYMid meet"
					focusable="false"
					style={{
						width: '100%',
						height: 'auto',
						display: 'block',
					}}
				>
					<g
						className="cui-map-chart__land"
						aria-hidden="true"
						dangerouslySetInnerHTML={{__html: WORLD_INNER}}
					/>
					<g className="cui-map-chart__markers">
						{enriched.map((e, i) => {
							const b = bucket(e.datum.value);
							const color = palette[b];
							const isActive = activeIndex === i;
							const r = 6 * markerScale;
							return (
								<circle
									key={e.country.iso}
									ref={(el) => {
										markerRefs.current[i] = el;
									}}
									cx={e.x}
									cy={e.y}
									r={r}
									className={[
										'cui-map-chart__marker',
										isActive && 'is-active',
									]
										.filter(Boolean)
										.join(' ')}
									style={
										{
											'--cui-marker-fill': color,
											'--cui-marker-delay': `${i * 25}ms`,
										} as React.CSSProperties
									}
									tabIndex={0}
									role="img"
									aria-label={
										e.datum.description ??
										`${e.country.name}: ${e.datum.value}`
									}
									onFocus={() => setFocusIndex(i)}
									onBlur={() =>
										setFocusIndex((cur) =>
											cur === i ? null : cur
										)
									}
									onMouseEnter={() => setHoverIndex(i)}
									onMouseLeave={() =>
										setHoverIndex((cur) =>
											cur === i ? null : cur
										)
									}
									onKeyDown={(ev) => onMarkerKeyDown(ev, i)}
								/>
							);
						})}
					</g>
					{/*
						Active-marker overlay. The DOM order of the main
						markers stays stable (so React + the browser don't
						restart their reveal animation when the active
						index changes); we just paint a non-interactive
						copy of the active marker on top, plus — when the
						active state came from keyboard focus — two
						concentric rings (white halo + primary outer)
						matching the Lexicon focus pattern that PieChart
						uses on its slices.
					*/}
					{active && (
						<g
							className="cui-map-chart__active-overlay"
							pointerEvents="none"
							aria-hidden="true"
						>
							{focusIndex === activeIndex && (
								<>
									<circle
										cx={active.x}
										cy={active.y}
										r={10.5 * markerScale}
										className="cui-map-chart__focus-ring-outer"
									/>
									<circle
										cx={active.x}
										cy={active.y}
										r={8.5 * markerScale}
										className="cui-map-chart__focus-ring-inner"
									/>
								</>
							)}
							<circle
								cx={active.x}
								cy={active.y}
								r={7.5 * markerScale}
								className={[
									'cui-map-chart__marker',
									'cui-map-chart__marker--overlay',
									focusIndex === activeIndex && 'is-focused',
								]
									.filter(Boolean)
									.join(' ')}
								style={
									{
										'--cui-marker-fill':
											palette[bucket(active.datum.value)],
									} as React.CSSProperties
								}
							/>
						</g>
					)}
				</svg>
				)}
				{active && (
					<div
						className="cui-map-chart__tooltip"
						aria-hidden="true"
					>
						<span className="cui-map-chart__tooltip-label">
							{active.country.name}
						</span>
						<span className="cui-map-chart__tooltip-value">
							{active.datum.value}
						</span>
					</div>
				)}
			</div>
			{legend === 'list' && (
				<ul
					className="cui-map-chart__legend-list"
					aria-hidden="true"
				>
					{legendItems.map((item) => {
						const isActive = activeIndex === item.dataIndex;
						const color = palette[bucket(item.datum.value)];
						return (
							<li
								key={item.country.iso}
								className={[
									'cui-map-chart__legend-item',
									isActive && 'is-active',
								]
									.filter(Boolean)
									.join(' ')}
								onMouseEnter={() =>
									setHoverIndex(item.dataIndex)
								}
								onMouseLeave={() =>
									setHoverIndex((cur) =>
										cur === item.dataIndex ? null : cur
									)
								}
								onClick={() => focusMarker(item.dataIndex)}
							>
								<span
									className="cui-map-chart__legend-swatch"
									style={{background: color}}
								/>
								<span className="cui-map-chart__legend-label">
									{item.country.name}
								</span>
								<span className="cui-map-chart__legend-value">
									{item.datum.value}
								</span>
							</li>
						);
					})}
				</ul>
			)}
			</div>
			{legend === 'table' && (
				<table
					className="cui-map-chart__legend-table"
					aria-labelledby={titleId}
				>
					<thead>
						<tr>
							<th
								scope="col"
								className="cui-map-chart__legend-table-th cui-map-chart__legend-table-th--rank"
							>
								#
							</th>
							<th
								scope="col"
								className="cui-map-chart__legend-table-th cui-map-chart__legend-table-th--color"
							>
								<span className="cui-sr-only">Colour</span>
							</th>
							<th
								scope="col"
								className="cui-map-chart__legend-table-th cui-map-chart__legend-table-th--label"
							>
								Country
							</th>
							<th
								scope="col"
								className="cui-map-chart__legend-table-th cui-map-chart__legend-table-th--value"
							>
								Value
							</th>
							<th
								scope="col"
								className="cui-map-chart__legend-table-th cui-map-chart__legend-table-th--share"
							>
								Share
							</th>
						</tr>
					</thead>
					<tbody>
						{legendItems.map((item) => {
							const isActive = activeIndex === item.dataIndex;
							const color = palette[bucket(item.datum.value)];
							return (
								<tr
									key={item.country.iso}
									className={[
										'cui-map-chart__legend-row',
										isActive && 'is-active',
									]
										.filter(Boolean)
										.join(' ')}
									onMouseEnter={() =>
										setHoverIndex(item.dataIndex)
									}
									onMouseLeave={() =>
										setHoverIndex((cur) =>
											cur === item.dataIndex ? null : cur
										)
									}
									onClick={() => focusMarker(item.dataIndex)}
								>
									<td className="cui-map-chart__legend-cell cui-map-chart__legend-cell--rank">
										{item.rank}
									</td>
									<td className="cui-map-chart__legend-cell cui-map-chart__legend-cell--color">
										<span
											className="cui-map-chart__legend-swatch"
											style={{background: color}}
										/>
									</td>
									<th
										scope="row"
										className="cui-map-chart__legend-cell cui-map-chart__legend-cell--label"
									>
										{item.country.name}
									</th>
									<td className="cui-map-chart__legend-cell cui-map-chart__legend-cell--value">
										{item.datum.value.toLocaleString()}
									</td>
									<td className="cui-map-chart__legend-cell cui-map-chart__legend-cell--share">
										{(item.share * 100).toFixed(1)}%
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			)}
			{legend === 'scale' && (
				<div
					className="cui-map-chart__legend-scale-wrap"
					role="img"
					aria-label={`Color scale: ${clampedSteps} buckets, lighter is less, darker is more`}
				>
					<span className="cui-map-chart__legend-label">Less</span>
					<ul className="cui-map-chart__legend-scale">
						{palette.map((color, i) => {
							const upper = boundaries[i];
							const upperText =
								i < palette.length - 1 && upper != null
									? `≤ ${upper}`
									: i === palette.length - 1
										? `> ${boundaries[boundaries.length - 1] ?? ''}`
										: '';
							return (
								<li
									key={i}
									className="cui-map-chart__legend-step"
									style={
										{
											'--cui-marker-fill': color,
										} as React.CSSProperties
									}
									title={upperText}
								/>
							);
						})}
						</ul>
					<span className="cui-map-chart__legend-label">More</span>
				</div>
			)}
		</figure>
	);
}
