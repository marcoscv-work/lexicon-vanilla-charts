import {
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
	type KeyboardEvent,
} from 'react';
import {getAccessibleSeries} from '../../a11y/palette';
import {useReducedMotion} from '../../a11y/useReducedMotion';
import {
	DEFAULT_MARKER_SIZE,
	LINE_DASH_PATTERNS,
	LINE_MARKER_SHAPE_ORDER,
	MarkerShape,
	type LineMarkerShape,
} from './markers';
import './LineChart.scss';

export interface LineSeries {
	label: string;
	/** Same length as `categories`. Missing values can be `null`. */
	values: Array<number | null>;
	/** Optional colour override (any CSS expression, e.g. `var(--blue-d2)`). */
	color?: string;
	/** Optional `stroke-dasharray` override. Defaults to a per-series cycle. */
	dasharray?: string;
	/** Optional marker shape override. Defaults to a per-series cycle. */
	markerShape?: LineMarkerShape;
	/** Optional accessible description override for this series. */
	description?: string;
}

/**
 * Colour scheme.
 *
 * - `blue` (default): every series uses `--primary-l0`. The series are
 *   distinguished by their dash pattern and marker shape (the 9-by-9
 *   matrix in the reference design), not by hue. Best for monochrome
 *   prints / colour-constrained surfaces.
 * - `categorical`: per-series hues from `getAccessibleSeries(n)`,
 *   matching how PieChart / BarChart colour their items. Dash + shape
 *   still vary so the chart stays distinguishable when colours
 *   collapse.
 */
export type LineChartScheme = 'blue' | 'categorical';

/**
 * Legend layout. Same vocabulary as the other charts.
 *
 * - `list` (default): a compact swatch / label / latest-value grid
 *   below the chart.
 * - `table`: GA-style detail table with rank, swatch, series, total
 *   and average. Real semantic `<table>`; suppresses the per-datum
 *   sr-only summary in that mode.
 * - `none`: no legend.
 */
export type LineChartLegend = 'list' | 'table' | 'none';

export interface LineChartProps {
	/** One entry per data series. */
	series: LineSeries[];
	/** Tick labels for the x-axis (e.g. `['Jan', 'Feb', ...]`). */
	categories: string[];
	/** SVG viewport width. Default `640`. */
	width?: number;
	/** SVG viewport height. Default `320`. */
	height?: number;
	/** Number of y-axis ticks. Default `5` (matches the reference). */
	yTicks?: number;
	/** Optional formatter for the y-axis labels. */
	yFormat?: (value: number) => string;
	/** Colour scheme. See `LineChartScheme`. Default `blue`. */
	scheme?: LineChartScheme;
	/** Legend layout. See `LineChartLegend`. Default `list`. */
	legend?: LineChartLegend;
	/** Accessible name for the chart as a whole. */
	title: string;
	/** Optional accessible long description. */
	description?: string;
	/** Enable reveal animation (default `true`). */
	animated?: boolean;
	/** Class name appended to the root `<figure>`. */
	className?: string;
}

const DEFAULT_PAD = {top: 24, right: 16, bottom: 36, left: 48};

/**
 * Pick a "nice" tick interval close to the raw range / tickCount value
 * — one of {1, 2, 2.5, 5} × 10^k — so axis labels read as round
 * numbers (5, 10, 25, 50, 100, …) instead of arbitrary decimals.
 */
function niceTickStep(range: number, tickCount: number): number {
	if (range <= 0 || !isFinite(range)) return 1;
	const rough = range / Math.max(1, tickCount - 1);
	const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
	const normalized = rough / magnitude;
	let nice: number;
	if (normalized < 1.5) nice = 1;
	else if (normalized < 3) nice = 2;
	else if (normalized < 4) nice = 2.5;
	else if (normalized < 7) nice = 5;
	else nice = 10;
	return nice * magnitude;
}

function computeTicks(min: number, max: number, count: number) {
	const step = niceTickStep(max - min, count);
	const niceMin = Math.floor(min / step) * step;
	const niceMax = Math.ceil(max / step) * step;
	const ticks: number[] = [];
	for (let t = niceMin; t <= niceMax + step / 2; t += step) {
		ticks.push(Number(t.toFixed(10)));
	}
	return {ticks, min: niceMin, max: niceMax};
}

export function LineChart({
	series,
	categories,
	width = 640,
	height = 320,
	yTicks = 5,
	yFormat,
	scheme = 'blue',
	legend = 'list',
	title,
	description,
	animated = true,
	className,
}: LineChartProps) {
	const reactId = useId();
	const titleId = `${reactId}-title`;
	const descId = `${reactId}-desc`;

	const reducedMotion = useReducedMotion();
	const motionOn = animated && !reducedMotion;

	// `focusKey` / `hoverKey` are encoded `"{seriesIdx}:{pointIdx}"` so the
	// active state covers both axes (series and category) in a single
	// scalar that's cheap to compare.
	const [focusKey, setFocusKey] = useState<string | null>(null);
	const [hoverKey, setHoverKey] = useState<string | null>(null);
	const activeKey = focusKey ?? hoverKey;
	const pointRefs = useRef<Map<string, SVGGElement | null>>(new Map());

	const pad = DEFAULT_PAD;
	const plotW = Math.max(1, width - pad.left - pad.right);
	const plotH = Math.max(1, height - pad.top - pad.bottom);

	// Per-series resolved colours.
	const palette = useMemo(
		() =>
			scheme === 'categorical'
				? getAccessibleSeries(series.length)
				: null,
		[scheme, series.length]
	);

	const resolvedSeries = useMemo(
		() =>
			series.map((s, i) => {
				const fallbackColor = palette
					? palette[i]?.color ?? 'var(--primary-l0)'
					: 'var(--primary-l0)';
				return {
					...s,
					_index: i,
					_color: s.color ?? fallbackColor,
					_dasharray:
						s.dasharray ??
						LINE_DASH_PATTERNS[
							i % LINE_DASH_PATTERNS.length
						],
					_markerShape:
						s.markerShape ??
						LINE_MARKER_SHAPE_ORDER[
							i % LINE_MARKER_SHAPE_ORDER.length
						],
				};
			}),
		[series, palette]
	);

	// Y range across all values (treating nulls as missing).
	const {yMin, yMax, yTicksList} = useMemo(() => {
		const flat: number[] = [];
		for (const s of series) {
			for (const v of s.values) {
				if (typeof v === 'number' && isFinite(v)) flat.push(v);
			}
		}
		if (flat.length === 0) {
			return {yMin: 0, yMax: 1, yTicksList: [0, 1]};
		}
		const rawMin = Math.min(0, ...flat);
		const rawMax = Math.max(...flat);
		const {ticks, min, max} = computeTicks(rawMin, rawMax, yTicks);
		return {yMin: min, yMax: max, yTicksList: ticks};
	}, [series, yTicks]);

	const xAt = useCallback(
		(idx: number) => {
			if (categories.length <= 1) return pad.left + plotW / 2;
			return pad.left + (idx * plotW) / (categories.length - 1);
		},
		[categories.length, pad.left, plotW]
	);

	const yAt = useCallback(
		(v: number) => {
			const range = yMax - yMin || 1;
			return pad.top + plotH - ((v - yMin) / range) * plotH;
		},
		[yMax, yMin, pad.top, plotH]
	);

	const formatY = useCallback(
		(v: number) => (yFormat ? yFormat(v) : String(v)),
		[yFormat]
	);

	// Pre-compute the polyline for each series.
	const seriesPaths = useMemo(
		() =>
			resolvedSeries.map((s) => {
				const segments: string[] = [];
				let pendingMove = true;
				s.values.forEach((v, i) => {
					if (v == null || !isFinite(v)) {
						pendingMove = true;
						return;
					}
					const cmd = pendingMove ? 'M' : 'L';
					segments.push(`${cmd}${xAt(i)},${yAt(v)}`);
					pendingMove = false;
				});
				return segments.join(' ');
			}),
		[resolvedSeries, xAt, yAt]
	);

	const summary = useMemo(() => {
		if (legend === 'table') return description ?? '';
		const parts = resolvedSeries.flatMap((s) =>
			s.values.map((v, i) => {
				if (v == null) return null;
				const cat = categories[i] ?? `#${i + 1}`;
				return `${s.label}, ${cat}: ${formatY(v)}`;
			})
		);
		return [description, ...parts].filter(Boolean).join('. ');
	}, [resolvedSeries, categories, description, formatY, legend]);

	const focusPoint = useCallback((key: string) => {
		pointRefs.current.get(key)?.focus();
	}, []);

	const onPointKeyDown = useCallback(
		(e: KeyboardEvent<SVGGElement>, sIdx: number, pIdx: number) => {
			const sN = resolvedSeries.length;
			const pN = categories.length;
			if (sN === 0 || pN === 0) return;
			let ns = sIdx;
			let np = pIdx;
			switch (e.key) {
				case 'ArrowRight':
					np = (pIdx + 1) % pN;
					break;
				case 'ArrowLeft':
					np = (pIdx - 1 + pN) % pN;
					break;
				case 'ArrowDown':
					ns = (sIdx + 1) % sN;
					break;
				case 'ArrowUp':
					ns = (sIdx - 1 + sN) % sN;
					break;
				case 'Home':
					np = 0;
					break;
				case 'End':
					np = pN - 1;
					break;
				default:
					return;
			}
			e.preventDefault();
			focusPoint(`${ns}:${np}`);
		},
		[resolvedSeries.length, categories.length, focusPoint]
	);

	useEffect(() => {
		// Drop refs for keys that no longer exist (series count / category
		// count changed) so the Map doesn't leak across renders.
		const valid = new Set<string>();
		for (let s = 0; s < resolvedSeries.length; s++) {
			for (let p = 0; p < categories.length; p++) {
				valid.add(`${s}:${p}`);
			}
		}
		for (const key of pointRefs.current.keys()) {
			if (!valid.has(key)) pointRefs.current.delete(key);
		}
	}, [resolvedSeries.length, categories.length]);

	const [activeSeriesIdx, activePointIdx] = useMemo(() => {
		if (activeKey == null) return [null, null] as const;
		const [s, p] = activeKey.split(':').map(Number);
		return [s, p] as const;
	}, [activeKey]);

	const activeInfo = useMemo(() => {
		if (activeSeriesIdx == null || activePointIdx == null) return null;
		const s = resolvedSeries[activeSeriesIdx];
		if (!s) return null;
		const v = s.values[activePointIdx];
		if (v == null) return null;
		return {
			series: s,
			pointIdx: activePointIdx,
			value: v,
			category: categories[activePointIdx] ?? '',
			x: xAt(activePointIdx),
			y: yAt(v),
		};
	}, [activeSeriesIdx, activePointIdx, resolvedSeries, categories, xAt, yAt]);

	const tableRows = useMemo(() => {
		if (legend !== 'table') return [];
		return resolvedSeries
			.map((s) => {
				const numeric = s.values.filter(
					(v): v is number => v != null && isFinite(v)
				);
				const total = numeric.reduce((acc, v) => acc + v, 0);
				const avg = numeric.length > 0 ? total / numeric.length : 0;
				return {
					series: s,
					total,
					avg,
				};
			})
			.sort((a, b) => b.total - a.total)
			.map((row, sortedIdx) => ({...row, rank: sortedIdx + 1}));
	}, [resolvedSeries, legend]);

	return (
		<figure
			className={[
				'cui-line-chart',
				`cui-line-chart--${scheme}`,
				`cui-line-chart--legend-${legend}`,
				motionOn && 'cui-line-chart--motion',
				className,
			]
				.filter(Boolean)
				.join(' ')}
			aria-labelledby={titleId}
			aria-describedby={descId}
		>
			<figcaption id={titleId} className="cui-line-chart__title">
				{title}
			</figcaption>
			<p id={descId} className="cui-sr-only">
				{summary}
			</p>
			<div className="cui-line-chart__canvas">
				<svg
					className="cui-line-chart__svg"
					viewBox={`0 0 ${width} ${height}`}
					width={width}
					height={height}
					focusable="false"
				>
					{/* --- Grid + axes ----------------------------------- */}
					<g
						className="cui-line-chart__grid"
						aria-hidden="true"
					>
						{yTicksList.map((t) => (
							<line
								key={`y-${t}`}
								className="cui-line-chart__grid-line"
								x1={pad.left}
								y1={yAt(t)}
								x2={pad.left + plotW}
								y2={yAt(t)}
							/>
						))}
						{categories.map((_, i) => (
							<line
								key={`x-${i}`}
								className="cui-line-chart__grid-line cui-line-chart__grid-line--v"
								x1={xAt(i)}
								y1={pad.top}
								x2={xAt(i)}
								y2={pad.top + plotH}
							/>
						))}
					</g>
					<g
						className="cui-line-chart__axes"
						aria-hidden="true"
					>
						{yTicksList.map((t) => (
							<text
								key={`yl-${t}`}
								className="cui-line-chart__axis-label cui-line-chart__axis-label--y"
								x={pad.left - 8}
								y={yAt(t)}
								textAnchor="end"
								dominantBaseline="middle"
							>
								{formatY(t)}
							</text>
						))}
						{categories.map((c, i) => (
							<text
								key={`xl-${i}`}
								className="cui-line-chart__axis-label cui-line-chart__axis-label--x"
								x={xAt(i)}
								y={pad.top + plotH + 18}
								textAnchor="middle"
							>
								{c}
							</text>
						))}
					</g>

					{/* --- Lines (one polyline per series) --------------- */}
					<g className="cui-line-chart__lines">
						{resolvedSeries.map((s, sIdx) => (
							<path
								key={`line-${sIdx}`}
								className="cui-line-chart__line"
								d={seriesPaths[sIdx]}
								style={
									{
										'--cui-line-stroke': s._color,
										'--cui-line-dash': s._dasharray,
										'--cui-line-delay': `${sIdx * 80}ms`,
									} as React.CSSProperties
								}
								aria-hidden="true"
								fill="none"
							/>
						))}
					</g>

					{/* --- Markers (one <g> per data point) -------------- */}
					<g className="cui-line-chart__markers">
						{resolvedSeries.map((s, sIdx) =>
							s.values.map((v, pIdx) => {
								if (v == null || !isFinite(v)) return null;
								const key = `${sIdx}:${pIdx}`;
								const cx = xAt(pIdx);
								const cy = yAt(v);
								const isActive = activeKey === key;
								const isFocused = focusKey === key;
								return (
									<g
										key={key}
										ref={(el) => {
											if (el)
												pointRefs.current.set(key, el);
											else pointRefs.current.delete(key);
										}}
										className={[
											'cui-line-chart__point',
											isActive && 'is-active',
											isFocused && 'is-focused',
										]
											.filter(Boolean)
											.join(' ')}
										transform={`translate(${cx} ${cy})`}
										tabIndex={0}
										role="img"
										aria-label={
											s.description
												? `${s.description} — ${
														categories[pIdx] ?? ''
													}: ${formatY(v)}`
												: `${s.label}, ${
														categories[pIdx] ?? ''
													}: ${formatY(v)}`
										}
										style={
											{
												'--cui-marker-fill': s._color,
												'--cui-marker-delay': `${
													sIdx * 80 + pIdx * 25
												}ms`,
											} as React.CSSProperties
										}
										onFocus={() => setFocusKey(key)}
										onBlur={() =>
											setFocusKey((cur) =>
												cur === key ? null : cur
											)
										}
										onMouseEnter={() => setHoverKey(key)}
										onMouseLeave={() =>
											setHoverKey((cur) =>
												cur === key ? null : cur
											)
										}
										onKeyDown={(e) =>
											onPointKeyDown(e, sIdx, pIdx)
										}
									>
										{/*
											Inner <g> is the animation
											target. The outer <g> already
											carries the positioning
											`transform="translate(cx,cy)"`,
											and SVG honours only one
											`transform` per element — if we
											ran the CSS scale animation on
											the outer node it would replace
											the translate and the marker
											would animate from (0,0) instead
											of from its data point. Wrapping
											the visuals in this inner <g>
											keeps positioning and animation
											on separate elements.
										*/}
										<g className="cui-line-chart__point-anim">
											{/*
												Focus halo. Draw order matters:
												the outer (primary) shape goes
												first, then the white band, then
												the marker itself on top. The
												Lexicon 2 px-primary + 2 px-white
												pattern is exact for symmetric
												shapes and approximated for the
												bar / triangle variants — the
												ring still reads clearly.
											*/}
											{isFocused && (
												<g
													className="cui-line-chart__point-halo"
													pointerEvents="none"
												>
													<MarkerShape
														shape={s._markerShape}
														size={
															DEFAULT_MARKER_SIZE *
															2
														}
														className="cui-line-chart__halo-outer"
													/>
													<MarkerShape
														shape={s._markerShape}
														size={
															DEFAULT_MARKER_SIZE *
															1.5
														}
														className="cui-line-chart__halo-inner"
													/>
												</g>
											)}
											<MarkerShape
												shape={s._markerShape}
												size={DEFAULT_MARKER_SIZE}
												className="cui-line-chart__marker"
											/>
										</g>
									</g>
								);
							})
						)}
					</g>
				</svg>
				{activeInfo && (
					<div
						className="cui-line-chart__tooltip"
						aria-hidden="true"
					>
						<span className="cui-line-chart__tooltip-label">
							{activeInfo.series.label} · {activeInfo.category}
						</span>
						<span className="cui-line-chart__tooltip-value">
							{formatY(activeInfo.value)}
						</span>
					</div>
				)}
			</div>
			{legend === 'list' && (
				<ul
					className="cui-line-chart__legend"
					aria-hidden="true"
				>
					{resolvedSeries.map((s, sIdx) => {
						// Latest non-null value of the series — what the
						// list shows on the right (matches the reference
						// design where the legend trails the right edge of
						// the line).
						let latest: number | null = null;
						for (let i = s.values.length - 1; i >= 0; i--) {
							const v = s.values[i];
							if (v != null && isFinite(v)) {
								latest = v;
								break;
							}
						}
						const isActive = activeSeriesIdx === sIdx;
						return (
							<li
								key={`${s.label}-${sIdx}`}
								className={[
									'cui-line-chart__legend-item',
									isActive && 'is-active',
								]
									.filter(Boolean)
									.join(' ')}
								style={
									{
										'--cui-marker-fill': s._color,
										'--cui-line-dash': s._dasharray,
									} as React.CSSProperties
								}
								onMouseEnter={() =>
									setHoverKey(`${sIdx}:0`)
								}
								onMouseLeave={() =>
									setHoverKey((cur) =>
										cur && cur.startsWith(`${sIdx}:`)
											? null
											: cur
									)
								}
								onClick={() => focusPoint(`${sIdx}:0`)}
							>
								<svg
									className="cui-line-chart__legend-icon"
									viewBox="-9 -7 26 14"
									width={26}
									height={14}
									aria-hidden="true"
								>
									<line
										className="cui-line-chart__legend-line"
										x1={-9}
										y1={0}
										x2={17}
										y2={0}
									/>
									<g className="cui-line-chart__legend-marker">
										<MarkerShape
											shape={s._markerShape}
											size={DEFAULT_MARKER_SIZE}
										/>
									</g>
								</svg>
								<span className="cui-line-chart__legend-label">
									{s.label}
								</span>
								{latest != null && (
									<span className="cui-line-chart__legend-value">
										{formatY(latest)}
									</span>
								)}
							</li>
						);
					})}
				</ul>
			)}
			{legend === 'table' && (
				<table
					className="cui-line-chart__legend-table"
					aria-labelledby={titleId}
				>
					<thead>
						<tr>
							<th
								scope="col"
								className="cui-line-chart__legend-table-th cui-line-chart__legend-table-th--rank"
							>
								#
							</th>
							<th
								scope="col"
								className="cui-line-chart__legend-table-th cui-line-chart__legend-table-th--color"
							>
								<span className="cui-sr-only">Marker</span>
							</th>
							<th
								scope="col"
								className="cui-line-chart__legend-table-th cui-line-chart__legend-table-th--label"
							>
								Series
							</th>
							<th
								scope="col"
								className="cui-line-chart__legend-table-th cui-line-chart__legend-table-th--value"
							>
								Total
							</th>
							<th
								scope="col"
								className="cui-line-chart__legend-table-th cui-line-chart__legend-table-th--share"
							>
								Avg
							</th>
						</tr>
					</thead>
					<tbody>
						{tableRows.map((row) => {
							const sIdx = row.series._index;
							const isActive = activeSeriesIdx === sIdx;
							return (
								<tr
									key={`${row.series.label}-${sIdx}`}
									className={[
										'cui-line-chart__legend-row',
										isActive && 'is-active',
									]
										.filter(Boolean)
										.join(' ')}
									style={
										{
											'--cui-marker-fill':
												row.series._color,
										} as React.CSSProperties
									}
									onMouseEnter={() =>
										setHoverKey(`${sIdx}:0`)
									}
									onMouseLeave={() =>
										setHoverKey((cur) =>
											cur && cur.startsWith(`${sIdx}:`)
												? null
												: cur
										)
									}
									onClick={() => focusPoint(`${sIdx}:0`)}
								>
									<td className="cui-line-chart__legend-cell cui-line-chart__legend-cell--rank">
										{row.rank}
									</td>
									<td className="cui-line-chart__legend-cell cui-line-chart__legend-cell--color">
										<svg
											className="cui-line-chart__legend-icon"
											viewBox="-7 -5 18 10"
											width={18}
											height={10}
											aria-hidden="true"
										>
											<g className="cui-line-chart__legend-marker">
												<MarkerShape
													shape={
														row.series._markerShape
													}
													size={
														DEFAULT_MARKER_SIZE
													}
												/>
											</g>
										</svg>
									</td>
									<th
										scope="row"
										className="cui-line-chart__legend-cell cui-line-chart__legend-cell--label"
									>
										{row.series.label}
									</th>
									<td className="cui-line-chart__legend-cell cui-line-chart__legend-cell--value">
										{formatY(Math.round(row.total))}
									</td>
									<td className="cui-line-chart__legend-cell cui-line-chart__legend-cell--share">
										{formatY(Math.round(row.avg))}
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			)}
		</figure>
	);
}
