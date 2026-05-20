/**
 * Marker positions for the stylised world map in `world-map.svg`
 * (viewBox `0 0 558 282`).
 *
 * The base SVG isn't a clean equirectangular or Mercator projection — it
 * is an illustration where every continent is reshaped for readability.
 * Any single linear/Mercator fit leaves entire regions on the wrong
 * landmass (Ireland in the Atlantic, Brazil in the Pacific, ...).
 *
 * The hand-calibrated `x` / `y` per country in `countries.ts` is the
 * single source of truth for marker placement. This file only re-exports
 * the viewBox so consumers don't have to reach into the SVG to know how
 * big it is.
 *
 * **If you swap the base SVG, re-calibrate `x` / `y` in `countries.ts`.**
 */

import type {CountryCoord} from './countries';

export const MAP_VIEWBOX = {width: 558, height: 282};

export function projectCountry(country: CountryCoord): {x: number; y: number} {
	return {x: country.x, y: country.y};
}
