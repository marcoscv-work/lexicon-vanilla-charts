/**
 * Tokens derived from Light.tokens.json at the repo root.
 *
 * Only the values the chart primitives actually consume are mirrored here.
 * Re-export pruned by hand for now. A future `npm run tokens` task can
 * regenerate this from `Light.tokens.json` mechanically.
 */

export const BRAND = {
	primary: '#0B5FFF',
	primaryD1: '#0053F0',
	primaryD2: '#004AD7',
	primaryL0: '#5791FF',
	primaryL1: '#80ACFF',
	primaryL2: '#B3CDFF',
	primaryL3: '#F0F5FF',
} as const;

export const NEUTRAL = {
	white: '#FFFFFF',
	lightL1: '#F7F8F9',
	light: '#F1F2F5',
	lightD1: '#E2E4EA',
	lightD2: '#D3D6E0',
	dark: '#272833',
	darkD1: '#1C1C24',
} as const;

export type ChartFamily =
	| 'blue'
	| 'orange'
	| 'teal'
	| 'pink'
	| 'green'
	| 'purple'
	| 'yellow'
	| 'cyan'
	| 'red'
	| 'indigo';

/**
 * Per-family shades the chart primitives consume.
 *
 * Every `light` hex is mirrored verbatim from a token in
 * `Light.tokens.json` (the `lightTokenPath` field records exactly which
 * one), and the same value is republished as the CSS custom property
 * `--cui-chart-{family}-light` in `src/styles/_tokens.scss`. JS and CSS
 * therefore share a single source of truth.
 *
 * The slice-separator stroke is what keeps neighbouring slices
 * distinguishable — the colours themselves are tuned for hue, not for
 * adjacent contrast.
 */
export interface ChartFamilyMeta {
	base: string;
	dark: string;
	light: string;
	/** CSS custom property name (Clay-conventional) used by the components. */
	lightVar: string;
	/** Path of the source value in `Light.tokens.json`. */
	lightTokenPath: string;
}

export const CHART_FAMILIES: Record<ChartFamily, ChartFamilyMeta> = {
	// Stark
	blue: {
		base: '#006EFF',
		dark: '#0053B3',
		light: '#5791FF',
		lightVar: '--primary-l0',
		lightTokenPath: 'Color.Primary.primary-l0',
	},
	// Mormont
	yellow: {
		base: '#FFBB00',
		dark: '#997000',
		light: '#FFD666',
		lightVar: '--yellow-l2',
		lightTokenPath: 'Color.Charts.Yellow.yellow-l2',
	},
	// Lannister
	red: {
		base: '#E50000',
		dark: '#990000',
		light: '#FF6666',
		lightVar: '--red-l2',
		lightTokenPath: 'Color.Charts.Red.red-l2',
	},
	// Martell
	green: {
		base: '#458613',
		dark: '#22430A',
		light: '#9DE963',
		lightVar: '--green-l4',
		lightTokenPath: 'Color.Charts.Green.green-l4',
	},
	// Tyrell
	purple: {
		base: '#AA33FF',
		dark: '#8600E6',
		light: '#BF66FF',
		lightVar: '--purple-l1',
		lightTokenPath: 'Color.Charts.Purple.purple-l1',
	},
	// Targaryen
	teal: {
		base: '#1B7E6E',
		dark: '#0D3F37',
		light: '#42D7BE',
		lightVar: '--teal-l2',
		lightTokenPath: 'Color.Charts.Teal.teal-l2',
	},
	// Dothraki
	pink: {
		base: '#E50082',
		dark: '#990057',
		light: '#FF80C8',
		lightVar: '--pink-l2',
		lightTokenPath: 'Color.Charts.Pink.pink-l2',
	},
	// Kahstark
	orange: {
		base: '#CC4E00',
		dark: '#803100',
		light: '#FFA166',
		lightVar: '--orange-l3',
		lightTokenPath: 'Color.Charts.Orange.orange-l3',
	},
	// Tarly
	cyan: {
		base: '#0077B3',
		dark: '#004466',
		light: '#66CCFF',
		lightVar: '--cyan-l3',
		lightTokenPath: 'Color.Charts.Cyan.cyan-l3',
	},
	indigo: {
		base: '#4D5FFF',
		dark: '#001AFF',
		light: '#B2BAFF',
		lightVar: '--indigo-l3',
		lightTokenPath: 'Color.Charts.Indigo.indigo-l3',
	},
};

/**
 * Default order families are picked from. Mirrors the flat palette order
 * documented in `references.png` (Stark, Mormont, Lannister, Martell,
 * Tyrell, Targaryen, Dothraki, Kahstark, Tarly).
 */
export const CHART_FAMILY_ORDER: ReadonlyArray<ChartFamily> = [
	'blue',
	'yellow',
	'red',
	'green',
	'purple',
	'teal',
	'pink',
	'orange',
	'cyan',
	'indigo',
];

export const DEFAULT_DIVIDER = NEUTRAL.white;
