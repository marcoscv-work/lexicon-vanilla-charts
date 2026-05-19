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
import {MAP_VIEWBOX, projectLonLat} from './projection';
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
	title,
	description,
	animated = true,
	className,
}: MapChartProps) {
	const reactId = useId();
	const titleId = `${reactId}-title`;
	const descId = `${reactId}-desc`;

	const reducedMotion = useReducedMotion();
	const motionOn = animated && !reducedMotion;

	const [focusIndex, setFocusIndex] = useState<number | null>(null);
	const [hoverIndex, setHoverIndex] = useState<number | null>(null);
	const activeIndex = focusIndex ?? hoverIndex;
	const markerRefs = useRef<Array<SVGCircleElement | null>>([]);

	const clampedSteps = Math.max(
		2,
		Math.min(SCHEMES[scheme].length, Math.floor(steps))
	);
	const palette = SCHEMES[scheme].slice(0, clampedSteps);

	const enriched = useMemo(
		() =>
			data
				.map((d) => {
					const country = lookupCountry(d.country);
					if (!country) return null;
					const {x, y} = projectLonLat(country.lon, country.lat);
					return {datum: d, country, x, y};
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

	const summary = useMemo(() => {
		const parts = enriched
			.slice()
			.sort((a, b) => b.datum.value - a.datum.value)
			.map(
				(e) =>
					e.datum.description ??
					`${e.country.name}: ${e.datum.value}`
			);
		return [description, ...parts].filter(Boolean).join('. ');
	}, [enriched, description]);

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

	return (
		<figure
			className={[
				'cui-map-chart',
				`cui-map-chart--${scheme}`,
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
			<div className="cui-map-chart__canvas">
				<svg
					viewBox={`0 0 ${MAP_VIEWBOX.width} ${MAP_VIEWBOX.height}`}
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
						{
							// SVG paint order is DOM order (no z-index).
							// Render the active marker last so it sits on
							// top of overlapping neighbours. Refs still
							// index by data position so keyboard nav stays
							// stable.
							enriched
								.map((_, i) => i)
								.sort((a, b) => {
									const aActive = activeIndex === a ? 1 : 0;
									const bActive = activeIndex === b ? 1 : 0;
									return aActive - bActive;
								})
								.map((i) => {
									const e = enriched[i];
									const b = bucket(e.datum.value);
									const color = palette[b];
									const isActive = activeIndex === i;
									const r = isActive ? 7.5 : 6;
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
											onMouseEnter={() =>
												setHoverIndex(i)
											}
											onMouseLeave={() =>
												setHoverIndex((cur) =>
													cur === i ? null : cur
												)
											}
											onKeyDown={(ev) =>
												onMarkerKeyDown(ev, i)
											}
										/>
									);
								})
						}
					</g>
				</svg>
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
			<div
				className="cui-map-chart__legend"
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
		</figure>
	);
}
