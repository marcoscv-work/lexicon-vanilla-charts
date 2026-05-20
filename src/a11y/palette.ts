import {
	CHART_EXTENDED_PALETTE,
	CHART_FAMILIES,
	CHART_FAMILY_ORDER,
	type ChartFamily,
} from '../tokens';

export interface AccessibleSeriesItem {
	family: ChartFamily;
	/**
	 * CSS expression usable as `fill`, `background`, etc. References a
	 * Clay-conventional custom property (e.g. `var(--primary-l0)`,
	 * `var(--yellow-l2)`) declared in `_tokens.scss` and mirrored from
	 * `Light.tokens.json`. Read `hexValue` if you need the raw colour.
	 */
	color: string;
	/** Raw hex value mirrored from the source DTCG token. */
	hexValue: string;
	/** CSS custom property name (without `var()`). */
	cssVar: string;
	/** Source DTCG token path. */
	tokenPath: string;
}

/**
 * Returns `n` chart colours in their canonical order. Slots 0–9 use
 * the 10 base families (`CHART_FAMILY_ORDER` × `lightVar`) — unchanged
 * since the package's first version. Slots 10–19 fall through to
 * `CHART_EXTENDED_PALETTE` (one `-d2` shade per family, same hue
 * order), so charts with 11–20 series stop repeating colours after
 * only 10 entries. Past 20 the rotation wraps.
 *
 * Each entry references a Clay custom property declared in
 * `_tokens.scss` so consumers can re-theme without touching JS.
 */
export function getAccessibleSeries(n: number): AccessibleSeriesItem[] {
	if (n <= 0) return [];
	const baseSize = CHART_FAMILY_ORDER.length;
	const totalSize = baseSize + CHART_EXTENDED_PALETTE.length;
	return Array.from({length: n}, (_, i) => {
		const slot = i % totalSize;
		if (slot < baseSize) {
			const family = CHART_FAMILY_ORDER[slot];
			const meta = CHART_FAMILIES[family];
			return {
				family,
				color: `var(${meta.lightVar})`,
				cssVar: meta.lightVar,
				hexValue: meta.light,
				tokenPath: meta.lightTokenPath,
			};
		}
		const ext = CHART_EXTENDED_PALETTE[slot - baseSize];
		return {
			family: ext.family,
			color: ext.color,
			cssVar: ext.cssVar,
			hexValue: ext.hexValue,
			tokenPath: ext.tokenPath,
		};
	});
}

export function getBarSeriesColor(): string {
	return 'var(--primary-l0)';
}
