import {
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
 * Returns `n` chart colours in their canonical order
 * (`CHART_FAMILY_ORDER`). Each entry references a Clay custom property
 * declared in `_tokens.scss` so consumers can re-theme without touching
 * JS.
 */
export function getAccessibleSeries(n: number): AccessibleSeriesItem[] {
	if (n <= 0) return [];
	return Array.from({length: n}, (_, i) => {
		const family = CHART_FAMILY_ORDER[i % CHART_FAMILY_ORDER.length];
		const meta = CHART_FAMILIES[family];
		return {
			family,
			color: `var(${meta.lightVar})`,
			cssVar: meta.lightVar,
			hexValue: meta.light,
			tokenPath: meta.lightTokenPath,
		};
	});
}

export function getBarSeriesColor(): string {
	return 'var(--primary-l0)';
}
