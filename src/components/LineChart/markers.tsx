/**
 * Marker shapes and dash patterns the LineChart cycles through per series.
 *
 * The reference SVG (`Chart Line.svg` from Lexicon) ships nine shapes and
 * nine dash patterns so adjacent series stay distinguishable even when
 * colours are constrained (monochrome printing, deuteranopia, etc.).
 *
 * Each `MarkerShapeRenderer` is invoked with a `size` (the visible
 * half-width / radius) and produces SVG markup centred on the origin —
 * the parent `<g transform="translate(cx,cy)">` places it at the data
 * point. The component never reads colour from props: fill comes from
 * the cascading `--cui-marker-fill` custom property the LineChart sets
 * per series, so the same renderer powers the active-state overlay,
 * the focus halo, the legend swatch and the actual marker without
 * branching.
 *
 * Focus halos are drawn by rendering the same shape at scale 2.0
 * (primary band) and 1.5 (white band) underneath the marker — the
 * Lexicon 2 px-primary + 2 px-white pattern is exact for the radially
 * symmetric shapes (`circle`, `square`, `diamond`) and approximated
 * for the asymmetric ones (`bar-h`, `bar-v`) where the ring on the
 * shorter axis comes out closer to 1 px.
 */

export type LineMarkerShape =
	| 'circle'
	| 'square'
	| 'triangle'
	| 'diamond'
	| 'triangle-down'
	| 'd-up'
	| 'd-down'
	| 'bar-h'
	| 'bar-v';

/**
 * Cycle order. Mirrors the row-major reading of the 3×3 grid in the
 * reference SVG so the default visuals match the design spec.
 */
export const LINE_MARKER_SHAPE_ORDER: ReadonlyArray<LineMarkerShape> = [
	'circle',
	'square',
	'triangle',
	'diamond',
	'triangle-down',
	'd-up',
	'd-down',
	'bar-h',
	'bar-v',
];

/**
 * `stroke-dasharray` values for the 9 line types in the reference. The
 * order mirrors the 3×3 grid (dot-thickness × gap) so series 1 stays
 * the finest dotted line and series 9 the chunkiest dashed.
 */
export const LINE_DASH_PATTERNS: ReadonlyArray<string> = [
	'1 1',
	'2 1',
	'4 1',
	'1 2',
	'2 2',
	'4 2',
	'1 4',
	'2 4',
	'4 4',
];

/**
 * Default visible size of a marker (half-width for symmetric shapes,
 * radius for `circle`). The bar shapes use this as their long axis and
 * `size / 2` as their short axis.
 */
export const DEFAULT_MARKER_SIZE = 4;

interface ShapeProps {
	shape: LineMarkerShape;
	/** Half-width / radius. Defaults to `DEFAULT_MARKER_SIZE`. */
	size?: number;
	className?: string;
}

/**
 * Render one marker shape centred on the origin. Fill / stroke are
 * left for CSS so the same component drives the data point, the
 * focus halo and the legend swatch.
 */
export function MarkerShape({
	shape,
	size = DEFAULT_MARKER_SIZE,
	className,
}: ShapeProps) {
	const s = size;
	switch (shape) {
		case 'circle':
			return <circle className={className} cx={0} cy={0} r={s} />;
		case 'square':
			return (
				<rect
					className={className}
					x={-s}
					y={-s}
					width={s * 2}
					height={s * 2}
				/>
			);
		case 'triangle':
			// Equilateral-ish, tip-up. Vertices fit a bounding box of 2s × 2s.
			return (
				<polygon
					className={className}
					points={`0,${-s} ${s},${s} ${-s},${s}`}
				/>
			);
		case 'triangle-down':
			return (
				<polygon
					className={className}
					points={`0,${s} ${s},${-s} ${-s},${-s}`}
				/>
			);
		case 'diamond':
			return (
				<polygon
					className={className}
					points={`0,${-s} ${s},0 0,${s} ${-s},0`}
				/>
			);
		case 'd-up':
			// Half-disk, flat bottom.
			return (
				<path
					className={className}
					d={`M ${-s} 0 A ${s} ${s} 0 0 1 ${s} 0 Z`}
				/>
			);
		case 'd-down':
			return (
				<path
					className={className}
					d={`M ${-s} 0 A ${s} ${s} 0 0 0 ${s} 0 Z`}
				/>
			);
		case 'bar-h':
			// Wide horizontal bar — long axis = 2s, short axis = s.
			return (
				<rect
					className={className}
					x={-s}
					y={-s / 2}
					width={s * 2}
					height={s}
				/>
			);
		case 'bar-v':
			return (
				<rect
					className={className}
					x={-s / 2}
					y={-s}
					width={s}
					height={s * 2}
				/>
			);
	}
}
