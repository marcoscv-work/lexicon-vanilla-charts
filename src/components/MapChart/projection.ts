/**
 * Lon/lat → SVG-coordinate projection tailored to the stylised world map
 * shipped in `world-map.svg` (viewBox `0 0 558 282`).
 *
 * The base SVG isn't a clean equirectangular or Mercator — it's an
 * artist's rendering where the Americas are slightly compressed inward
 * and the southern hemisphere is stretched. A piecewise-linear fit per
 * hemisphere gets every country in `COUNTRY_COORDS` close enough to its
 * visible region in the artwork; sub-degree accuracy was not the goal.
 *
 * Calibrated visually against London (51.5, -0.1), Mid-USA (39.5, -98),
 * Tokyo (35.7, 139.8), São Paulo (-23.5, -46.6) and Sydney (-33.9, 151.2).
 * Update these constants if you swap the base SVG.
 */

export const MAP_VIEWBOX = {width: 558, height: 282};

// Offsets re-calibrated against Spain (lat 40.46, lon -3.75) → (256.625,
// 108.471) in the SVG. Whole-map shift of (-8 px, +15 px) from the
// previous origin; the per-hemisphere scales still match the artwork.
const LON_OFFSET = 263; // x at lon = 0 (Greenwich meridian)
const LON_SCALE_W = 1.7; // px per |deg| west of Greenwich
const LON_SCALE_E = 1.45; // px per deg east of Greenwich

const LAT_OFFSET = 155; // y at lat = 0 (equator)
const LAT_SCALE_N = 1.15; // px per deg north of equator
const LAT_SCALE_S = 1.75; // px per |deg| south of equator

export function projectLonLat(lon: number, lat: number): {x: number; y: number} {
	const x =
		lon >= 0
			? LON_OFFSET + lon * LON_SCALE_E
			: LON_OFFSET + lon * LON_SCALE_W;
	const y =
		lat >= 0
			? LAT_OFFSET - lat * LAT_SCALE_N
			: LAT_OFFSET - lat * LAT_SCALE_S;
	return {x, y};
}
