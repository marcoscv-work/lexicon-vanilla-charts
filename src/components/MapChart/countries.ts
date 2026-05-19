/**
 * Country coordinates for the proportional-symbol map. Lat/lon are the
 * country's geographic centroid (rough). The projection helper in
 * `projection.ts` maps these to the `_Map.svg` viewBox (558×282).
 *
 * Curated subset of ~60 countries — wide geographic coverage without
 * inflating the bundle. Extend `COUNTRY_COORDS` with the same shape if a
 * data point you need isn't here.
 */

export interface CountryCoord {
	iso: string; // ISO 3166-1 alpha-2
	name: string;
	lat: number;
	lon: number;
}

export const COUNTRY_COORDS: Record<string, CountryCoord> = {
	// North America
	US: {iso: 'US', name: 'United States', lat: 39.5, lon: -98.35},
	CA: {iso: 'CA', name: 'Canada', lat: 56.13, lon: -106.35},
	MX: {iso: 'MX', name: 'Mexico', lat: 23.63, lon: -102.55},

	// Central / South America
	BR: {iso: 'BR', name: 'Brazil', lat: -14.24, lon: -51.93},
	AR: {iso: 'AR', name: 'Argentina', lat: -38.42, lon: -63.62},
	CL: {iso: 'CL', name: 'Chile', lat: -35.68, lon: -71.54},
	CO: {iso: 'CO', name: 'Colombia', lat: 4.57, lon: -74.3},
	PE: {iso: 'PE', name: 'Peru', lat: -9.19, lon: -75.02},
	VE: {iso: 'VE', name: 'Venezuela', lat: 6.42, lon: -66.59},

	// Europe
	GB: {iso: 'GB', name: 'United Kingdom', lat: 55.38, lon: -3.44},
	IE: {iso: 'IE', name: 'Ireland', lat: 53.41, lon: -8.24},
	ES: {iso: 'ES', name: 'Spain', lat: 40.46, lon: -3.75},
	PT: {iso: 'PT', name: 'Portugal', lat: 39.4, lon: -8.22},
	FR: {iso: 'FR', name: 'France', lat: 46.23, lon: 2.21},
	DE: {iso: 'DE', name: 'Germany', lat: 51.17, lon: 10.45},
	IT: {iso: 'IT', name: 'Italy', lat: 41.87, lon: 12.57},
	NL: {iso: 'NL', name: 'Netherlands', lat: 52.13, lon: 5.29},
	BE: {iso: 'BE', name: 'Belgium', lat: 50.5, lon: 4.47},
	CH: {iso: 'CH', name: 'Switzerland', lat: 46.82, lon: 8.23},
	AT: {iso: 'AT', name: 'Austria', lat: 47.52, lon: 14.55},
	PL: {iso: 'PL', name: 'Poland', lat: 51.92, lon: 19.15},
	SE: {iso: 'SE', name: 'Sweden', lat: 60.13, lon: 18.64},
	NO: {iso: 'NO', name: 'Norway', lat: 60.47, lon: 8.47},
	FI: {iso: 'FI', name: 'Finland', lat: 61.92, lon: 25.75},
	DK: {iso: 'DK', name: 'Denmark', lat: 56.26, lon: 9.5},
	GR: {iso: 'GR', name: 'Greece', lat: 39.07, lon: 21.82},
	RO: {iso: 'RO', name: 'Romania', lat: 45.94, lon: 24.97},
	UA: {iso: 'UA', name: 'Ukraine', lat: 48.38, lon: 31.17},
	RU: {iso: 'RU', name: 'Russia', lat: 61.52, lon: 105.32},
	TR: {iso: 'TR', name: 'Türkiye', lat: 38.96, lon: 35.24},

	// Africa
	MA: {iso: 'MA', name: 'Morocco', lat: 31.79, lon: -7.09},
	DZ: {iso: 'DZ', name: 'Algeria', lat: 28.03, lon: 1.66},
	EG: {iso: 'EG', name: 'Egypt', lat: 26.82, lon: 30.8},
	NG: {iso: 'NG', name: 'Nigeria', lat: 9.08, lon: 8.68},
	KE: {iso: 'KE', name: 'Kenya', lat: -0.02, lon: 37.91},
	ET: {iso: 'ET', name: 'Ethiopia', lat: 9.15, lon: 40.49},
	ZA: {iso: 'ZA', name: 'South Africa', lat: -30.56, lon: 22.94},
	GH: {iso: 'GH', name: 'Ghana', lat: 7.95, lon: -1.02},

	// Middle East
	SA: {iso: 'SA', name: 'Saudi Arabia', lat: 23.89, lon: 45.08},
	AE: {iso: 'AE', name: 'United Arab Emirates', lat: 23.42, lon: 53.85},
	IL: {iso: 'IL', name: 'Israel', lat: 31.05, lon: 34.85},
	IR: {iso: 'IR', name: 'Iran', lat: 32.43, lon: 53.69},

	// Asia
	IN: {iso: 'IN', name: 'India', lat: 20.59, lon: 78.96},
	PK: {iso: 'PK', name: 'Pakistan', lat: 30.38, lon: 69.35},
	BD: {iso: 'BD', name: 'Bangladesh', lat: 23.68, lon: 90.36},
	CN: {iso: 'CN', name: 'China', lat: 35.86, lon: 104.2},
	JP: {iso: 'JP', name: 'Japan', lat: 36.2, lon: 138.25},
	KR: {iso: 'KR', name: 'South Korea', lat: 35.91, lon: 127.77},
	VN: {iso: 'VN', name: 'Vietnam', lat: 14.06, lon: 108.28},
	TH: {iso: 'TH', name: 'Thailand', lat: 15.87, lon: 100.99},
	ID: {iso: 'ID', name: 'Indonesia', lat: -0.79, lon: 113.92},
	MY: {iso: 'MY', name: 'Malaysia', lat: 4.21, lon: 101.98},
	PH: {iso: 'PH', name: 'Philippines', lat: 12.88, lon: 121.77},
	SG: {iso: 'SG', name: 'Singapore', lat: 1.35, lon: 103.82},

	// Oceania
	AU: {iso: 'AU', name: 'Australia', lat: -25.27, lon: 133.78},
	NZ: {iso: 'NZ', name: 'New Zealand', lat: -40.9, lon: 174.89},
};

export function lookupCountry(iso: string): CountryCoord | undefined {
	return COUNTRY_COORDS[iso.toUpperCase()];
}
