/**
 * Country coordinates for the proportional-symbol map.
 *
 * Each entry stores three things:
 *
 * 1. `lat` / `lon` — the country's geographic centroid (rough). Kept for
 *    documentation, accessible labels, and potential future use of a real
 *    projection. **Not** used to position the marker.
 * 2. `x` / `y` — the marker's pixel position inside the SVG's `558 × 282`
 *    viewBox. These are hand-calibrated against the stylised artwork in
 *    `world-map.svg` so the dot lands on the actual landmass.
 *
 * The artwork compresses/stretches different regions in ways no linear
 * (or even Mercator) projection can reproduce — for example, the Americas
 * are visibly squashed inwards relative to Europe. A piecewise-linear
 * lat/lon → SVG mapping placed Ireland in the Atlantic, Brazil in the
 * Pacific, etc. Direct per-country pixels are honest about the fact that
 * the base map is illustration, not cartography.
 *
 * **If you swap the base SVG, re-calibrate every `x` / `y` here.** See
 * `CLAUDE.md` ("The map projection is hand-tuned") for the rationale.
 *
 * Extend with the same shape if a data point you need isn't here.
 */

export interface CountryCoord {
	iso: string; // ISO 3166-1 alpha-2
	name: string;
	lat: number;
	lon: number;
	/** Hand-calibrated marker x within the 558-wide SVG viewBox. */
	x: number;
	/** Hand-calibrated marker y within the 282-tall SVG viewBox. */
	y: number;
}

export const COUNTRY_COORDS: Record<string, CountryCoord> = {
	// North America
	US: {iso: 'US', name: 'United States', lat: 39.5, lon: -98.35, x: 115, y: 113},
	CA: {iso: 'CA', name: 'Canada', lat: 56.13, lon: -106.35, x: 115, y: 70},
	MX: {iso: 'MX', name: 'Mexico', lat: 23.63, lon: -102.55, x: 105, y: 138},

	// Central / South America
	BR: {iso: 'BR', name: 'Brazil', lat: -14.24, lon: -51.93, x: 180, y: 205},
	AR: {iso: 'AR', name: 'Argentina', lat: -38.42, lon: -63.62, x: 165, y: 218},
	CL: {iso: 'CL', name: 'Chile', lat: -35.68, lon: -71.54, x: 155, y: 220},
	CO: {iso: 'CO', name: 'Colombia', lat: 4.57, lon: -74.3, x: 156, y: 170},
	PE: {iso: 'PE', name: 'Peru', lat: -9.19, lon: -75.02, x: 153, y: 188},
	VE: {iso: 'VE', name: 'Venezuela', lat: 6.42, lon: -66.59, x: 166, y: 168},

	// Europe
	GB: {iso: 'GB', name: 'United Kingdom', lat: 55.38, lon: -3.44, x: 258, y: 78},
	IE: {iso: 'IE', name: 'Ireland', lat: 53.41, lon: -8.24, x: 250, y: 82},
	ES: {iso: 'ES', name: 'Spain', lat: 40.46, lon: -3.75, x: 258, y: 110},
	PT: {iso: 'PT', name: 'Portugal', lat: 39.4, lon: -8.22, x: 251, y: 112},
	FR: {iso: 'FR', name: 'France', lat: 46.23, lon: 2.21, x: 268, y: 97},
	DE: {iso: 'DE', name: 'Germany', lat: 51.17, lon: 10.45, x: 282, y: 87},
	IT: {iso: 'IT', name: 'Italy', lat: 41.87, lon: 12.57, x: 295, y: 105},
	NL: {iso: 'NL', name: 'Netherlands', lat: 52.13, lon: 5.29, x: 275, y: 85},
	BE: {iso: 'BE', name: 'Belgium', lat: 50.5, lon: 4.47, x: 273, y: 90},
	CH: {iso: 'CH', name: 'Switzerland', lat: 46.82, lon: 8.23, x: 281, y: 98},
	AT: {iso: 'AT', name: 'Austria', lat: 47.52, lon: 14.55, x: 292, y: 95},
	PL: {iso: 'PL', name: 'Poland', lat: 51.92, lon: 19.15, x: 300, y: 86},
	SE: {iso: 'SE', name: 'Sweden', lat: 60.13, lon: 18.64, x: 295, y: 62},
	NO: {iso: 'NO', name: 'Norway', lat: 60.47, lon: 8.47, x: 285, y: 60},
	FI: {iso: 'FI', name: 'Finland', lat: 61.92, lon: 25.75, x: 307, y: 55},
	DK: {iso: 'DK', name: 'Denmark', lat: 56.26, lon: 9.5, x: 285, y: 74},
	GR: {iso: 'GR', name: 'Greece', lat: 39.07, lon: 21.82, x: 313, y: 115},
	RO: {iso: 'RO', name: 'Romania', lat: 45.94, lon: 24.97, x: 312, y: 100},
	UA: {iso: 'UA', name: 'Ukraine', lat: 48.38, lon: 31.17, x: 325, y: 92},
	RU: {iso: 'RU', name: 'Russia', lat: 61.52, lon: 105.32, x: 430, y: 55},
	TR: {iso: 'TR', name: 'Türkiye', lat: 38.96, lon: 35.24, x: 345, y: 120},

	// Africa
	MA: {iso: 'MA', name: 'Morocco', lat: 31.79, lon: -7.09, x: 255, y: 127},
	DZ: {iso: 'DZ', name: 'Algeria', lat: 28.03, lon: 1.66, x: 268, y: 135},
	EG: {iso: 'EG', name: 'Egypt', lat: 26.82, lon: 30.8, x: 328, y: 137},
	NG: {iso: 'NG', name: 'Nigeria', lat: 9.08, lon: 8.68, x: 282, y: 168},
	KE: {iso: 'KE', name: 'Kenya', lat: -0.02, lon: 37.91, x: 320, y: 190},
	ET: {iso: 'ET', name: 'Ethiopia', lat: 9.15, lon: 40.49, x: 330, y: 175},
	ZA: {iso: 'ZA', name: 'South Africa', lat: -30.56, lon: 22.94, x: 300, y: 208},
	GH: {iso: 'GH', name: 'Ghana', lat: 7.95, lon: -1.02, x: 272, y: 173},

	// Middle East
	SA: {iso: 'SA', name: 'Saudi Arabia', lat: 23.89, lon: 45.08, x: 378, y: 148},
	AE: {iso: 'AE', name: 'United Arab Emirates', lat: 23.42, lon: 53.85, x: 405, y: 150},
	IL: {iso: 'IL', name: 'Israel', lat: 31.05, lon: 34.85, x: 340, y: 128},
	IR: {iso: 'IR', name: 'Iran', lat: 32.43, lon: 53.69, x: 392, y: 128},

	// Asia
	IN: {iso: 'IN', name: 'India', lat: 20.59, lon: 78.96, x: 415, y: 148},
	PK: {iso: 'PK', name: 'Pakistan', lat: 30.38, lon: 69.35, x: 402, y: 132},
	BD: {iso: 'BD', name: 'Bangladesh', lat: 23.68, lon: 90.36, x: 432, y: 142},
	CN: {iso: 'CN', name: 'China', lat: 35.86, lon: 104.2, x: 440, y: 115},
	JP: {iso: 'JP', name: 'Japan', lat: 36.2, lon: 138.25, x: 475, y: 113},
	KR: {iso: 'KR', name: 'South Korea', lat: 35.91, lon: 127.77, x: 462, y: 115},
	VN: {iso: 'VN', name: 'Vietnam', lat: 14.06, lon: 108.28, x: 455, y: 148},
	TH: {iso: 'TH', name: 'Thailand', lat: 15.87, lon: 100.99, x: 448, y: 150},
	ID: {iso: 'ID', name: 'Indonesia', lat: -0.79, lon: 113.92, x: 458, y: 182},
	MY: {iso: 'MY', name: 'Malaysia', lat: 4.21, lon: 101.98, x: 450, y: 167},
	PH: {iso: 'PH', name: 'Philippines', lat: 12.88, lon: 121.77, x: 470, y: 158},
	SG: {iso: 'SG', name: 'Singapore', lat: 1.35, lon: 103.82, x: 452, y: 174},

	// Oceania
	AU: {iso: 'AU', name: 'Australia', lat: -25.27, lon: 133.78, x: 472, y: 220},
	NZ: {iso: 'NZ', name: 'New Zealand', lat: -40.9, lon: 174.89, x: 527, y: 255},
};

export function lookupCountry(iso: string): CountryCoord | undefined {
	return COUNTRY_COORDS[iso.toUpperCase()];
}
