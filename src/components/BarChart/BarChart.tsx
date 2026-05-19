import {useId, useMemo, useState} from 'react';
import {useReducedMotion} from '../../a11y/useReducedMotion';
import './BarChart.scss';

export interface BarDatum {
	label: string;
	value: number;
	/** Optional descriptive text read by screen readers. Defaults to `${label}: ${value}`. */
	description?: string;
}

export interface BarChartProps {
	data: BarDatum[];
	/** Layout direction. `vertical` is the default (bars rise upward). */
	orientation?: 'vertical' | 'horizontal';
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

	const max = useMemo(
		() => Math.max(0, ...data.map((d) => d.value)),
		[data]
	);

	const pad = orientation === 'vertical' ? VERTICAL_PADDING : HORIZONTAL_PADDING;
	const plotW = width - pad.left - pad.right;
	const plotH = height - pad.top - pad.bottom;

	const isVertical = orientation === 'vertical';
	const bandSize = (isVertical ? plotW : plotH) / Math.max(1, data.length);
	const barThickness = Math.max(4, bandSize * 0.6);

	const summaryText =
		description ??
		data
			.map((d) => d.description ?? `${d.label}: ${d.value}`)
			.join('. ');

	return (
		<figure
			className={[
				'cui-bar-chart',
				`cui-bar-chart--${orientation}`,
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
								className="cui-bar-chart__bar"
								x={x}
								y={y}
								width={w}
								height={h}
								rx={2}
								style={
									{
										'--cui-bar-delay': `${i * 60}ms`,
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
		</figure>
	);
}
