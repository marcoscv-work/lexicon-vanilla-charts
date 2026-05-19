export interface SliceGeometry {
	startAngle: number; // radians
	endAngle: number; // radians
	midAngle: number;
	path: string;
	labelX: number;
	labelY: number;
	pop: {dx: number; dy: number};
}

const TAU = Math.PI * 2;

export function buildSlices(
	values: number[],
	cx: number,
	cy: number,
	rOuter: number,
	rInner = 0
): SliceGeometry[] {
	const total = values.reduce((acc, v) => acc + Math.max(0, v), 0);
	if (total <= 0) return [];

	const isDonut = rInner > 0;

	let cursor = -Math.PI / 2; // start at 12 o'clock
	return values.map((v) => {
		const sweep = (Math.max(0, v) / total) * TAU;
		const start = cursor;
		const end = cursor + sweep;
		cursor = end;

		const mid = (start + end) / 2;
		const largeArc = sweep > Math.PI ? 1 : 0;

		const sxO = cx + rOuter * Math.cos(start);
		const syO = cy + rOuter * Math.sin(start);
		const exO = cx + rOuter * Math.cos(end);
		const eyO = cy + rOuter * Math.sin(end);

		let path: string;
		if (sweep >= TAU - 1e-6) {
			// Full circle — render as two arcs, with a hole if donut.
			path = isDonut
				? `M ${cx - rOuter} ${cy} A ${rOuter} ${rOuter} 0 1 1 ${cx + rOuter} ${cy} A ${rOuter} ${rOuter} 0 1 1 ${cx - rOuter} ${cy} Z ` +
					`M ${cx - rInner} ${cy} A ${rInner} ${rInner} 0 1 0 ${cx + rInner} ${cy} A ${rInner} ${rInner} 0 1 0 ${cx - rInner} ${cy} Z`
				: `M ${cx - rOuter} ${cy} A ${rOuter} ${rOuter} 0 1 1 ${cx + rOuter} ${cy} A ${rOuter} ${rOuter} 0 1 1 ${cx - rOuter} ${cy} Z`;
		} else if (isDonut) {
			const sxI = cx + rInner * Math.cos(start);
			const syI = cy + rInner * Math.sin(start);
			const exI = cx + rInner * Math.cos(end);
			const eyI = cy + rInner * Math.sin(end);
			path =
				`M ${sxO} ${syO} ` +
				`A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${exO} ${eyO} ` +
				`L ${exI} ${eyI} ` +
				`A ${rInner} ${rInner} 0 ${largeArc} 0 ${sxI} ${syI} Z`;
		} else {
			path = `M ${cx} ${cy} L ${sxO} ${syO} A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${exO} ${eyO} Z`;
		}

		const labelR = isDonut ? (rOuter + rInner) / 2 : rOuter * 0.65;
		const labelX = cx + labelR * Math.cos(mid);
		const labelY = cy + labelR * Math.sin(mid);

		const popMag = 8;
		const pop = {dx: Math.cos(mid) * popMag, dy: Math.sin(mid) * popMag};

		return {startAngle: start, endAngle: end, midAngle: mid, path, labelX, labelY, pop};
	});
}
