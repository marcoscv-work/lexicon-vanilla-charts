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
import {getAccessibleSeries} from '../../a11y/palette';
import {buildSlices} from './geometry';
import './PieChart.scss';

export interface PieDatum {
	label: string;
	value: number;
	/** Override the auto-assigned colour. */
	color?: string;
	/** Override the slice's accessible description. */
	description?: string;
}

export type PieChartSize = 'xs' | 'sm' | 'md' | 'lg';
export type PieChartThickness = 'md' | 'lg';

/**
 * Legend layout.
 *
 * - `list` (default): the slim swatch/label/% grid that's been the
 *   PieChart's default since v0 — sits to the right of the chart (or
 *   below at narrow widths).
 * - `table`: a Google-Analytics-style detail table BELOW the chart
 *   with rank, colour swatch, label, value and share of total. Real
 *   semantic `<table>`; suppresses the per-datum sr-only summary so
 *   screen readers don't hear the data twice.
 * - `none`: no legend.
 */
export type PieChartLegend = 'list' | 'table' | 'none';

const SIZE_PRESETS: Record<PieChartSize, number> = {
	xs: 160,
	sm: 220,
	md: 280,
	lg: 360,
};

/**
 * Maps a thickness preset to the inner-radius fraction of the outer radius.
 * Smaller fraction = wider ring band ("thicker" ring).
 */
const THICKNESS_PRESETS: Record<PieChartThickness, number> = {
	md: 0.65,
	lg: 0.5,
};

export interface PieChartProps {
	data: PieDatum[];
	/**
	 * Outer diameter. Accepts a preset (`xs`, `sm`, `md`, `lg`) or an exact
	 * pixel value. Defaults to `md` (280px).
	 */
	size?: PieChartSize | number;
	/**
	 * Ring band width. `md` (default) keeps the regular slim band; `lg`
	 * widens it for a heavier visual. Ignored when `innerRadius` is set
	 * explicitly.
	 */
	thickness?: PieChartThickness;
	/**
	 * Donut hole size as a fraction of the outer radius (0–0.95). Overrides
	 * `thickness` when provided. `0` renders a solid pie.
	 */
	innerRadius?: number;
	/** Legend layout. See `PieChartLegend`. Default `list`. */
	legend?: PieChartLegend;
	/** Accessible name for the chart as a whole. */
	title: string;
	/** Optional long description, announced after the title. */
	description?: string;
	/** Enable slice reveal animation (default `true`). */
	animated?: boolean;
	/** Optional class name for the root `<figure>`. */
	className?: string;
}

function resolveSize(size: PieChartProps['size']): number {
	if (typeof size === 'number') return size;
	return SIZE_PRESETS[size ?? 'md'];
}

export function PieChart({
	data,
	size = 'md',
	thickness = 'md',
	innerRadius,
	legend = 'list',
	title,
	description,
	animated = true,
	className,
}: PieChartProps) {
	const resolvedInner =
		innerRadius ?? THICKNESS_PRESETS[thickness] ?? THICKNESS_PRESETS.md;
	const reactId = useId();
	const titleId = `${reactId}-title`;
	const descId = `${reactId}-desc`;
	const clipBase = `${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}-clip`;

	const reducedMotion = useReducedMotion();
	const motionOn = animated && !reducedMotion;

	const [hoverIndex, setHoverIndex] = useState<number | null>(null);
	const [focusIndex, setFocusIndex] = useState<number | null>(null);
	const sliceRefs = useRef<Array<SVGPathElement | null>>([]);

	const activeIndex = focusIndex ?? hoverIndex;

	const palette = useMemo(
		() => getAccessibleSeries(data.length),
		[data.length]
	);

	const colors = useMemo(
		() =>
			data.map(
				(d, i) =>
					d.color ?? palette[i]?.color ?? 'var(--primary)'
			),
		[data, palette]
	);

	const total = useMemo(
		() => data.reduce((acc, d) => acc + Math.max(0, d.value), 0),
		[data]
	);

	const px = resolveSize(size);
	const cx = px / 2;
	const cy = px / 2;
	const rOuter = px / 2 - 6;
	const rInner = Math.max(0, Math.min(0.95, resolvedInner)) * rOuter;

	const slices = useMemo(
		() => buildSlices(data.map((d) => d.value), cx, cy, rOuter, rInner),
		[data, cx, cy, rOuter, rInner]
	);

	const centerValue = useMemo(() => {
		if (activeIndex == null || total === 0) return null;
		const d = data[activeIndex];
		const pct = (d.value / total) * 100;
		return {label: d.label, value: d.value, pct};
	}, [activeIndex, data, total]);

	const summary = useMemo(() => {
		// `legend="table"` renders a real semantic <table> below the
		// chart — that is the screen-reader-friendly representation in
		// that mode, so we skip the per-datum dump to avoid duplication.
		if (legend === 'table') return description ?? '';
		const parts = data.map((d, i) => {
			const pct = total === 0 ? 0 : (d.value / total) * 100;
			const label = d.description ?? `${d.label}: ${d.value} (${pct.toFixed(1)}%)`;
			return `${i + 1} of ${data.length}, ${label}`;
		});
		return [description, ...parts].filter(Boolean).join('. ');
	}, [data, total, description, legend]);

	// Per-slice ranked rows (sorted by value desc) used by both
	// `legend="list"` (when we want a sorted view) and `legend="table"`.
	// For the legend list we still iterate `data` in its original order
	// for backwards compatibility — only the table reorders.
	const tableRows = useMemo(() => {
		if (legend !== 'table') return [];
		return data
			.map((d, i) => ({
				datum: d,
				dataIndex: i,
				color: colors[i],
				share: total === 0 ? 0 : d.value / total,
			}))
			.sort((a, b) => b.datum.value - a.datum.value)
			.map((row, sortedIdx) => ({...row, rank: sortedIdx + 1}));
	}, [data, colors, total, legend]);

	const focusSlice = useCallback((idx: number) => {
		const el = sliceRefs.current[idx];
		if (el) el.focus();
	}, []);

	const onSliceKeyDown = useCallback(
		(e: KeyboardEvent<SVGPathElement>, idx: number) => {
			const n = data.length;
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
			focusSlice(next);
		},
		[data.length, focusSlice]
	);

	useEffect(() => {
		sliceRefs.current = sliceRefs.current.slice(0, data.length);
	}, [data.length]);

	return (
		<figure
			className={[
				'cui-pie-chart',
				`cui-pie-chart--size-${typeof size === 'string' ? size : 'custom'}`,
				`cui-pie-chart--legend-${legend}`,
				motionOn && 'cui-pie-chart--motion',
				className,
			]
				.filter(Boolean)
				.join(' ')}
			aria-labelledby={titleId}
			aria-describedby={descId}
		>
			<figcaption id={titleId} className="cui-pie-chart__title">
				{title}
			</figcaption>
			<p id={descId} className="cui-sr-only">
				{summary}
			</p>
			<div className="cui-pie-chart__body">
				<div
					className="cui-pie-chart__canvas"
					style={{width: px}}
				>
					<svg
						width={px}
						height={px}
						viewBox={`0 0 ${px} ${px}`}
						preserveAspectRatio="xMidYMid meet"
						focusable="false"
						style={{maxWidth: '100%', height: 'auto', display: 'block'}}
					>
						<defs>
							{slices.map((s, i) => (
								<clipPath
									key={`clip-${i}`}
									id={`${clipBase}-${i}`}
								>
									<path d={s.path} />
								</clipPath>
							))}
						</defs>

						{slices.map((s, i) => {
							const datum = data[i];
							const pct =
								total === 0 ? 0 : (datum.value / total) * 100;
							const label =
								datum.description ??
								`${datum.label}: ${datum.value} (${pct.toFixed(1)}%)`;
							const isHover = hoverIndex === i;
							const isFocus = focusIndex === i;
							return (
								<g
									key={`${datum.label}-${i}`}
									className="cui-pie-chart__slice-group"
								>
									<path
										ref={(el) => {
											sliceRefs.current[i] = el;
										}}
										d={s.path}
										fillRule="evenodd"
										className={[
											'cui-pie-chart__slice',
											isHover && 'is-hover',
											isFocus && 'is-focus',
										]
											.filter(Boolean)
											.join(' ')}
										style={
											{
												'--cui-slice-fill': colors[i],
												'--cui-slice-delay': `${i * 80}ms`,
											} as React.CSSProperties
										}
										tabIndex={0}
										role="img"
										aria-label={label}
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
										onKeyDown={(e) =>
											onSliceKeyDown(e, i)
										}
									/>
									{isFocus && (
										<g
											className="cui-pie-chart__focus-overlay"
											clipPath={`url(#${clipBase}-${i})`}
											pointerEvents="none"
										>
											<path
												d={s.path}
												className="cui-pie-chart__focus-inset-halo"
											/>
											<path
												d={s.path}
												className="cui-pie-chart__focus-inset-ring"
											/>
										</g>
									)}
								</g>
							);
						})}
					</svg>
					{rInner > 0 && (
						<div
							className="cui-pie-chart__center"
							aria-hidden="true"
						>
							{centerValue ? (
								<>
									<span className="cui-pie-chart__center-label">
										{centerValue.label}
									</span>
									<span className="cui-pie-chart__center-value">
										{centerValue.pct.toFixed(1)}%
									</span>
									<span className="cui-pie-chart__center-sub">
										{centerValue.value}
									</span>
								</>
							) : (
								<>
									<span className="cui-pie-chart__center-label">
										Total
									</span>
									<span className="cui-pie-chart__center-value">
										{total}
									</span>
								</>
							)}
						</div>
					)}
				</div>
				{legend === 'list' && (
					<ul className="cui-pie-chart__legend" aria-hidden="true">
						{data.map((d, i) => {
							const pct =
								total === 0 ? 0 : (d.value / total) * 100;
							return (
								<li
									key={`${d.label}-${i}`}
									className={[
										'cui-pie-chart__legend-item',
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
									onClick={() => focusSlice(i)}
								>
									<span
										className="cui-pie-chart__legend-swatch"
										style={{background: colors[i]}}
									/>
									<span className="cui-pie-chart__legend-label">
										{d.label}
									</span>
									<span className="cui-pie-chart__legend-value">
										{pct.toFixed(1)}%
									</span>
								</li>
							);
						})}
					</ul>
				)}
			</div>
			{legend === 'table' && (
				<table
					className="cui-pie-chart__legend-table"
					aria-labelledby={titleId}
				>
					<thead>
						<tr>
							<th
								scope="col"
								className="cui-pie-chart__legend-table-th cui-pie-chart__legend-table-th--rank"
							>
								#
							</th>
							<th
								scope="col"
								className="cui-pie-chart__legend-table-th cui-pie-chart__legend-table-th--color"
							>
								<span className="cui-sr-only">Colour</span>
							</th>
							<th
								scope="col"
								className="cui-pie-chart__legend-table-th cui-pie-chart__legend-table-th--label"
							>
								Label
							</th>
							<th
								scope="col"
								className="cui-pie-chart__legend-table-th cui-pie-chart__legend-table-th--value"
							>
								Value
							</th>
							<th
								scope="col"
								className="cui-pie-chart__legend-table-th cui-pie-chart__legend-table-th--share"
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
										'cui-pie-chart__legend-row',
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
									onClick={() => focusSlice(row.dataIndex)}
								>
									<td className="cui-pie-chart__legend-cell cui-pie-chart__legend-cell--rank">
										{row.rank}
									</td>
									<td className="cui-pie-chart__legend-cell cui-pie-chart__legend-cell--color">
										<span
											className="cui-pie-chart__legend-swatch"
											style={{background: row.color}}
										/>
									</td>
									<th
										scope="row"
										className="cui-pie-chart__legend-cell cui-pie-chart__legend-cell--label"
									>
										{row.datum.label}
									</th>
									<td className="cui-pie-chart__legend-cell cui-pie-chart__legend-cell--value">
										{row.datum.value.toLocaleString()}
									</td>
									<td className="cui-pie-chart__legend-cell cui-pie-chart__legend-cell--share">
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
