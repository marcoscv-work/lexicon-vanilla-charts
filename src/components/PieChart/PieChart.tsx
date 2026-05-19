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
		const parts = data.map((d, i) => {
			const pct = total === 0 ? 0 : (d.value / total) * 100;
			const label = d.description ?? `${d.label}: ${d.value} (${pct.toFixed(1)}%)`;
			return `${i + 1} of ${data.length}, ${label}`;
		});
		return [description, ...parts].filter(Boolean).join('. ');
	}, [data, total, description]);

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
				<ul className="cui-pie-chart__legend" aria-hidden="true">
					{data.map((d, i) => {
						const pct = total === 0 ? 0 : (d.value / total) * 100;
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
			</div>
		</figure>
	);
}
