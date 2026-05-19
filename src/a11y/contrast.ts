/**
 * WCAG 2.x relative-luminance and contrast helpers.
 *
 * Used by the chart palette utilities to keep adjacent slices at ≥ 3:1
 * contrast (WCAG 1.4.11 Non-text Contrast).
 */

function hexToRgb(hex: string): [number, number, number] {
	const clean = hex.replace('#', '');
	const full =
		clean.length === 3
			? clean
					.split('')
					.map((c) => c + c)
					.join('')
			: clean;
	const num = parseInt(full, 16);
	return [(num >> 16) & 0xff, (num >> 8) & 0xff, num & 0xff];
}

export function relativeLuminance(hex: string): number {
	const [r, g, b] = hexToRgb(hex).map((c) => {
		const sc = c / 255;
		return sc <= 0.03928 ? sc / 12.92 : Math.pow((sc + 0.055) / 1.055, 2.4);
	}) as [number, number, number];
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
	const la = relativeLuminance(a);
	const lb = relativeLuminance(b);
	return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export function meetsRatio(a: string, b: string, min = 3): boolean {
	return contrastRatio(a, b) >= min;
}
