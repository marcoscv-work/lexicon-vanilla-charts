import {useCallback, useId, useMemo, useRef, useState} from 'react';
import {getAccessibleSeries} from '../../a11y/palette';
import {useReducedMotion} from '../../a11y/useReducedMotion';
import './BarChart.scss';

export interface BarDatum {
	label: string;
	value: number;
	/** Optional descriptive text read by screen readers. Defaults to `${label}: ${value}`. */
	description?: string;
}

/**
 * Colour scheme.
 *
 * - `blue` (default): every bar uses `--primary-l0`. Best when the
 *   categories along the axis are already labelled and the chart
 *   doesn't need to encode anything extra in colour.
 * - `categorical`: each bar gets a distinct hue from the Clay chart
 *   palette via `getAccessibleSeries(n)`, matching how PieChart
 *   colours its slices. Useful when the categories should also read
 *   as visually distinct (legends, sparse-label dashboards, …).
 */
export type BarChartScheme = 'blue' | 'categorical';

/**
 * Legend layout. BarChart already labels each bar inline along the
 * axis, so a legend is opt-in — default `none`.
 *
 * - `none` (default): no legend below the chart.
 * - `list`: a compact swatch/label/value row grid (same shape PieChart
 *   uses by default). Each item is clickable and focuses the matching
 *   bar.
 * - `table`: a Google-Analytics-style detail table BELOW the chart
 *   with rank, colour swatch, label, value and share of total. Real
 *   semantic `<table>`; suppresses the per-datum sr-only summary in
 *   that mode.
 */
export type BarChartLegend = 'list' | 'table' | 'none';

export interface BarChartProps {
	data: BarDatum[];
	/** Layout direction. `vertical` is the default (bars rise upward). */
	orientation?: 'vertical' | 'horizontal';
	/** Colour scheme. Default `blue`. See `BarChartScheme`. */
	scheme?: BarChartScheme;
	/** Legend layout. See `BarChartLegend`. Default `none`. */
	legend?: BarChartLegend;
	/** Width of the SVG viewport. */
	width?: number;
	/** Height of the SVG viewport. */
	height?: number;
	/** Accessible name for the chart as a whole. */
	title: string;
	/** Optional accessible long description for the chart. */
	description?: string;
	/** Enable bar reveal + hover animations (default `true`). */
	animated?: boolean;
	/** Optional class name for the root `<figure>`. */
	className?: string;
}

const VERTICAL_PADDING = {top: 28, right: 16, bottom: 32, left: 40};
const HORIZONTAL_PADDING = {top: 16, right: 48, bottom: 24, left: 96};

export function BarChart({
	data,
	orientation = 'vertical',
	scheme = 'blue',
	legend = 'none',
	width = 480,
	height = 280,
	title,
	description,
	animated = true,
	className,
}: BarChartProps) {
	const reactId = useId();
	const titleId = `${reactId}-title`;
	const descId = `${reactId}-desc`;

	const reducedMotion = useReducedMotion();
	const motionOn = animated && !reducedMotion;

	const [focusIndex, setFocusIndex] = useState<number | null>(null);
	const [hoverIndex, setHoverIndex] = useState<number | null>(null);
	const activeIndex = focusIndex ?? hoverIndex;
	const barRefs = useRef<Array<SVGRectElement | null>>([]);

	const max = useMemo(
		() => Math.max(0, ...data.map((d) => d.value)),
		[data]
	);
	const total = useMemo(
		() => data.reduce((acc, d) => acc + Math.max(0, d.value), 0),
		[data]
	);

	// Categorical mode pulls per-bar hues from the same accessible chart
	// palette PieChart uses. Blue mode keeps the single `--primary-l0`
	// (the CSS default), so we skip allocating a palette entirely.
	const palette = useMemo(
		() =>
			scheme === 'categorical'
				? getAccessibleSeries(data.length)
				: null,
		[scheme, data.length]
	);

	// Per-bar colour used by the legend swatches. In blue mode every
	// swatch matches the single bar fill; categorical mode reads from
	// the palette.
	const colorFor = useCallback(
		(i: number): string =>
			palette ? (palette[i]?.color ?? 'var(--primary-l0)') : 'var(--primary-l0)',
		[palette]
	);

	const pad = orientation === 'vertical' ? VERTICAL_PADDING : HORIZONTAL_PADDING;
	const plotW = width - pad.left - pad.right;
	const plotH = height - pad.top - pad.bottom;

	const isVertical = orientation === 'vertical';
	const bandSize = (isVertical ? plotW : plotH) / Math.max(1, data.length);
	const barThickness = Math.max(4, bandSize * 0.6);

	const summaryText = useMemo(() => {
		// `legend="table"` renders a real semantic <table> below the
		// chart — skip the per-datum sr-only dump so AT users don't
		// hear the data twice.
		if (legend === 'table') return description ?? '';
		return (
			description ??
			data
				.map((d) => d.description ?? `${d.label}: ${d.value}`)
				.join('. ')
		);
	}, [data, description, legend]);

	const focusBar = useCallback((idx: number) => {
		barRefs.current[idx]?.focus();
	}, []);

	const tableRows = useMemo(() => {
		if (legend !== 'table') return [];
		return data
			.map((d, i) => ({
				datum: d,
				dataIndex: i,
				color: colorFor(i),
				share: total === 0 ? 0 : d.value / total,
			}))
			.sort((a, b) => b.datum.value - a.datum.value)
			.map((row, sortedIdx) => ({...row, rank: sortedIdx + 1}));
	}, [data, colorFor, total, legend]);

	return (
		<figure
			className={[
				'cui-bar-chart',
				`cui-bar-chart--${orientation}`,
				`cui-bar-chart--${scheme}`,
				`cui-bar-chart--legend-${legend}`,
				motionOn && 'cui-bar-chart--motion',
				className,
			]
				.filter(Boolean)
				.join(' ')}
			aria-labelledby={titleId}
			aria-describedby={descId}
		>
			<figcaption id={titleId} className="cui-bar-chart__title">
				{title}
			</figcaption>
			<p id={descId} className="cui-sr-only">
				{summaryText}
			</p>
			<svg
				viewBox={`0 0 ${width} ${height}`}
				width={width}
				height={height}
				focusable="false"
			>
				{/* axis baseline */}
				<line
					x1={pad.left}
					y1={isVertical ? height - pad.bottom : pad.top}
					x2={isVertical ? width - pad.right : pad.left}
					y2={height - pad.bottom}
					className="cui-bar-chart__axis"
				/>
				{data.map((d, i) => {
					const ratio = max === 0 ? 0 : d.value / max;
					const length = ratio * (isVertical ? plotH : plotW);
					const bandStart =
						(isVertical ? pad.left : pad.top) +
						i * bandSize +
						(bandSize - barThickness) / 2;

					const x = isVertical ? bandStart : pad.left;
					const y = isVertical
						? height - pad.bottom - length
						: bandStart;
					const w = isVertical ? barThickness : length;
					const h = isVertical ? length : barThickness;

					const isActive = focusIndex === i || hoverIndex === i;

					return (
						<g
							key={`${d.label}-${i}`}
							className={[
								'cui-bar-chart__bar-group',
								isActive && 'is-active',
							]
								.filter(Boolean)
								.join(' ')}
						>
							<rect
								ref={(el) => {
									barRefs.current[i] = el;
								}}
								className="cui-bar-chart__bar"
								x={x}
								y={y}
								width={w}
								height={h}
								rx={2}
								style={
									{
										'--cui-bar-delay': `${i * 60}ms`,
										...(palette
											? {
													'--cui-bar-fill':
														palette[i]?.color,
												}
											: null),
									} as React.CSSProperties
								}
								tabIndex={0}
								role="img"
								aria-label={
									d.description ?? `${d.label}: ${d.value}`
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
							/>
							<text
								className="cui-bar-chart__label"
								x={
									isVertical
										? x + barThickness / 2
										: pad.left - 8
								}
								y={
									isVertical
										? height - pad.bottom + 16
										: bandStart + barThickness / 2 + 4
								}
								textAnchor={isVertical ? 'middle' : 'end'}
							>
								{d.label}
							</text>
							{(() => {
								const valueText = String(d.value);
								const charW = 7.5;
								const padX = 6;
								const valueW =
									valueText.length * charW + padX * 2;
								const valueH = 18;
								const cxV = isVertical
									? x + barThickness / 2
									: x + length + padX + valueW / 2;
								const cyV = isVertical
									? y - 4 - valueH / 2
									: bandStart + barThickness / 2;

								return (
									<g
										className={[
											'cui-bar-chart__value-group',
											isActive && 'is-active',
										]
											.filter(Boolean)
											.join(' ')}
										transform={`translate(${cxV} ${cyV})`}
									>
										{isActive && (
											<rect
												className="cui-bar-chart__value-bg"
												x={-valueW / 2}
												y={-valueH / 2}
												width={valueW}
												height={valueH}
												rx={4}
											/>
										)}
										<text
											className="cui-bar-chart__value"
											x={0}
											y={4}
											textAnchor="middle"
										>
											{valueText}
										</text>
									</g>
								);
							})()}
						</g>
					);
				})}
			</svg>
			{legend === 'list' && (
				<ul className="cui-bar-chart__legend" aria-hidden="true">
					{data.map((d, i) => {
						const pct = total === 0 ? 0 : (d.value / total) * 100;
						return (
							<li
								key={`${d.label}-${i}`}
								className={[
									'cui-bar-chart__legend-item',
									activeIndex === i && 'is-active',
								]
									.filter(Boolean)
									.join(' ')}
								onMouseEnter={() => setHoverIndex(i)}
								onMouseLeave={() =>
									setHoverIndex((cur) =>
										cur === i ? null : cur
									)
								}
								onClick={() => focusBar(i)}
							>
								<span
									className="cui-bar-chart__legend-swatch"
									style={{background: colorFor(i)}}
								/>
								<span className="cui-bar-chart__legend-label">
									{d.label}
								</span>
								<span className="cui-bar-chart__legend-value">
									{pct.toFixed(1)}%
								</span>
							</li>
						);
					})}
				</ul>
			)}
			{legend === 'table' && (
				<table
					className="cui-bar-chart__legend-table"
					aria-labelledby={titleId}
				>
					<thead>
						<tr>
							<th
								scope="col"
								className="cui-bar-chart__legend-table-th cui-bar-chart__legend-table-th--rank"
							>
								#
							</th>
							<th
								scope="col"
								className="cui-bar-chart__legend-table-th cui-bar-chart__legend-table-th--color"
							>
								<span className="cui-sr-only">Colour</span>
							</th>
							<th
								scope="col"
								className="cui-bar-chart__legend-table-th cui-bar-chart__legend-table-th--label"
							>
								Label
							</th>
							<th
								scope="col"
								className="cui-bar-chart__legend-table-th cui-bar-chart__legend-table-th--value"
							>
								Value
							</th>
							<th
								scope="col"
								className="cui-bar-chart__legend-table-th cui-bar-chart__legend-table-th--share"
							>
								Share
							</th>
						</tr>
					</thead>
					<tbody>
						{tableRows.map((row) => {
							const isActive = activeIndex === row.dataIndex;
							return (
								<tr
									key={`${row.datum.label}-${row.dataIndex}`}
									className={[
										'cui-bar-chart__legend-row',
										isActive && 'is-active',
									]
										.filter(Boolean)
										.join(' ')}
									onMouseEnter={() =>
										setHoverIndex(row.dataIndex)
									}
									onMouseLeave={() =>
										setHoverIndex((cur) =>
											cur === row.dataIndex ? null : cur
										)
									}
									onClick={() => focusBar(row.dataIndex)}
								>
									<td className="cui-bar-chart__legend-cell cui-bar-chart__legend-cell--rank">
										{row.rank}
									</td>
									<td className="cui-bar-chart__legend-cell cui-bar-chart__legend-cell--color">
										<span
											className="cui-bar-chart__legend-swatch"
											style={{background: row.color}}
										/>
									</td>
									<th
										scope="row"
										className="cui-bar-chart__legend-cell cui-bar-chart__legend-cell--label"
									>
										{row.datum.label}
									</th>
									<td className="cui-bar-chart__legend-cell cui-bar-chart__legend-cell--value">
										{row.datum.value.toLocaleString()}
									</td>
									<td className="cui-bar-chart__legend-cell cui-bar-chart__legend-cell--share">
										{(row.share * 100).toFixed(1)}%
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
