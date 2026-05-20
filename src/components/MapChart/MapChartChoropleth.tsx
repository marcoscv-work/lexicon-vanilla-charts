/**
 * EXPERIMENTAL — country-fill variant of the MapChart canvas.
 *
 * Renders only the SVG canvas (no figure/legend/aria — those live in
 * `MapChart.tsx`, which owns the shared state and delegates here when
 * `variant === 'choropleth'`).
 *
 * Base SVG: `_experimental-countries-map.svg`, derived from
 * https://github.com/flekschas/simple-world-map (CC BY-SA 3.0,
 * by Al MacDonald, edited by Fritz Lekschas). Country paths use ISO
 * 3166-1 alpha-2 ids (lowercase). Sub-region paths inside multi-part
 * countries are grouped under a single `<g id="xx">`.
 *
 * Reversion plan if the variant is rejected:
 *   1. Delete this file + `MapChartChoropleth.scss`.
 *   2. Delete `_experimental-countries-map.svg`.
 *   3. Remove the `variant` prop and the matching branch in `MapChart.tsx`.
 *   4. Remove the Choropleth story + its entry in `a11y-scan.mjs`.
 */
import {
	forwardRef,
	useCallback,
	useId,
	useImperativeHandle,
	useLayoutEffect,
	useRef,
	type FocusEvent,
	type KeyboardEvent,
	type MouseEvent,
} from 'react';
import type {CountryCoord} from './countries';
import type {MapDatum} from './MapChart';
import countriesSvgRaw from './_experimental-countries-map.svg?raw';
import './MapChartChoropleth.scss';

const VIEWBOX =
	/viewBox="([^"]+)"/.exec(countriesSvgRaw)?.[1] ?? '0 0 800 460';

// Strip the outer <svg> shell + title/desc so the rest can be inlined
// inside our own <svg> element and re-themed through CSS.
const SVG_INNER = countriesSvgRaw
	.replace(/^[\s\S]*?<svg[^>]*>/, '')
	.replace(/<\/svg>\s*$/, '')
	.replace(/<title>[\s\S]*?<\/title>/gi, '')
	.replace(/<desc>[\s\S]*?<\/desc>/gi, '');

/**
 * Parse the source SVG once at module init into `iso -> d[]`. Used by
 * the focus overlay to draw a Lexicon-style 2px-primary + 2px-white
 * ring inside the country edge — the ring needs the same path shapes
 * as the original country so it can be clipped to the country area.
 *
 * Multi-part countries appear as `<g id="xx"><path d="..." /> ...</g>`
 * (mainland + islands). Simple countries appear as
 * `<path id="xx" d="..." />`.
 */
function parseCountryPaths(svg: string): Map<string, string[]> {
	const out = new Map<string, string[]>();
	const groupRe = /<g\s+id="([a-z]{2})"\s*>([\s\S]*?)<\/g>/g;
	const pathInGroupRe = /<path[^>]*\sd="([^"]+)"[^>]*\/>/g;
	let gm: RegExpExecArray | null;
	while ((gm = groupRe.exec(svg)) !== null) {
		const iso = gm[1];
		const ds: string[] = [];
		pathInGroupRe.lastIndex = 0;
		let pm: RegExpExecArray | null;
		while ((pm = pathInGroupRe.exec(gm[2])) !== null) {
			ds.push(pm[1]);
		}
		if (ds.length > 0) out.set(iso, ds);
	}
	const standaloneRe =
		/<path\s+id="([a-z]{2})"\s+d="([^"]+)"[^>]*\/>/g;
	let sm: RegExpExecArray | null;
	while ((sm = standaloneRe.exec(svg)) !== null) {
		if (!out.has(sm[1])) out.set(sm[1], [sm[2]]);
	}
	return out;
}

const COUNTRY_PATH_DS = parseCountryPaths(countriesSvgRaw);

export interface ChoroplethCanvasHandle {
	focusIndex: (idx: number) => void;
}

export interface ChoroplethEnriched {
	datum: MapDatum;
	country: CountryCoord;
}

interface Props {
	enriched: ChoroplethEnriched[];
	palette: string[];
	bucket: (value: number) => number;
	activeIndex: number | null;
	focusIndex: number | null;
	motionOn: boolean;
	onEnterIndex: (idx: number) => void;
	onLeaveIndex: (idx: number) => void;
	onFocusIndex: (idx: number) => void;
	onBlurIndex: (idx: number) => void;
}

export const MapChartChoropleth = forwardRef<ChoroplethCanvasHandle, Props>(
	function MapChartChoropleth(
		{
			enriched,
			palette,
			bucket,
			activeIndex,
			focusIndex,
			motionOn,
			onEnterIndex,
			onLeaveIndex,
			onFocusIndex,
			onBlurIndex,
		},
		ref
	) {
		const svgRef = useRef<SVGSVGElement | null>(null);
		const reactId = useId();
		const clipBaseId = `${reactId}-focus-clip`;

		// --- Effect 1: structural marking (classes, tabindex, aria) ---------
		// Runs only when `enriched` changes. Crucially: does NOT depend on
		// `palette` — otherwise every parent re-render would strip + re-add
		// `is-data`, which would restart the reveal animation for every
		// country in the chart on each click / hover.
		useLayoutEffect(() => {
			const root = svgRef.current;
			if (!root) return;

			root.querySelectorAll<SVGGraphicsElement>('[data-iso]').forEach(
				(el) => {
					el.removeAttribute('data-iso');
					el.removeAttribute('data-index');
					el.removeAttribute('tabindex');
					el.removeAttribute('role');
					el.removeAttribute('aria-label');
					el.style.removeProperty('--cui-country-delay');
					el.classList.remove(
						'cui-map-choropleth__country',
						'is-data',
						'is-active'
					);
				}
			);

			enriched.forEach((e, i) => {
				const iso = e.country.iso.toLowerCase();
				const el = root.querySelector<SVGGraphicsElement>(`#${iso}`);
				if (!el) return;
				el.setAttribute('data-iso', iso);
				el.setAttribute('data-index', String(i));
				el.setAttribute('tabindex', '0');
				el.setAttribute('role', 'img');
				el.setAttribute(
					'aria-label',
					e.datum.description ??
						`${e.country.name}: ${e.datum.value}`
				);
				el.classList.add('cui-map-choropleth__country', 'is-data');
				el.style.setProperty('--cui-country-delay', `${i * 25}ms`);
			});
		}, [enriched]);

		// --- Effect 2: fill colours -----------------------------------------
		// Cheap CSS-variable update; never strips classes, so changing
		// `palette` or `bucket` does not restart any reveal animation.
		useLayoutEffect(() => {
			const root = svgRef.current;
			if (!root) return;
			for (const e of enriched) {
				const iso = e.country.iso.toLowerCase();
				const el = root.querySelector<SVGGraphicsElement>(
					`[data-iso="${iso}"]`
				);
				if (!el) continue;
				el.style.setProperty(
					'--cui-country-fill',
					palette[bucket(e.datum.value)]
				);
			}
		}, [enriched, palette, bucket]);

		// --- Reflect activeIndex as a class on the matching element --------
		useLayoutEffect(() => {
			const root = svgRef.current;
			if (!root) return;
			root.querySelectorAll<SVGGraphicsElement>('.is-active').forEach(
				(el) => el.classList.remove('is-active')
			);
			if (activeIndex == null) return;
			const el = root.querySelector<SVGGraphicsElement>(
				`[data-index="${activeIndex}"]`
			);
			el?.classList.add('is-active');
		}, [activeIndex]);

		// --- External focus handle (used by the legend list) ---------------
		useImperativeHandle(
			ref,
			() => ({
				focusIndex(idx: number) {
					const root = svgRef.current;
					if (!root) return;
					const el = root.querySelector<
						SVGGraphicsElement & {focus: () => void}
					>(`[data-index="${idx}"]`);
					el?.focus?.();
				},
			}),
			[]
		);

		const indexFromEvent = useCallback(
			(
				e:
					| MouseEvent<SVGSVGElement>
					| FocusEvent<SVGSVGElement>
					| KeyboardEvent<SVGSVGElement>
			): number | null => {
				const t = e.target as Element | null;
				if (!t) return null;
				const host = t.closest('[data-index]');
				if (!host) return null;
				const idx = Number(host.getAttribute('data-index'));
				return Number.isFinite(idx) ? idx : null;
			},
			[]
		);

		// Event delegation: a single handler set on the SVG root resolves
		// the host country via `closest('[data-index]')`. React normalises
		// onFocus/onBlur to use `focusin`/`focusout`, which bubble — so
		// per-country focus events do reach this root listener.
		const onMouseOver = useCallback(
			(e: MouseEvent<SVGSVGElement>) => {
				const idx = indexFromEvent(e);
				if (idx != null) onEnterIndex(idx);
			},
			[indexFromEvent, onEnterIndex]
		);

		const onMouseOut = useCallback(
			(e: MouseEvent<SVGSVGElement>) => {
				const idx = indexFromEvent(e);
				if (idx != null) onLeaveIndex(idx);
			},
			[indexFromEvent, onLeaveIndex]
		);

		const onFocus = useCallback(
			(e: FocusEvent<SVGSVGElement>) => {
				const idx = indexFromEvent(e);
				if (idx != null) onFocusIndex(idx);
			},
			[indexFromEvent, onFocusIndex]
		);

		const onBlur = useCallback(
			(e: FocusEvent<SVGSVGElement>) => {
				const idx = indexFromEvent(e);
				if (idx != null) onBlurIndex(idx);
			},
			[indexFromEvent, onBlurIndex]
		);

		const onKeyDown = useCallback(
			(e: KeyboardEvent<SVGSVGElement>) => {
				const n = enriched.length;
				if (n === 0) return;
				const cur = indexFromEvent(e);
				if (cur == null) return;
				let next = cur;
				switch (e.key) {
					case 'ArrowRight':
					case 'ArrowDown':
						next = (cur + 1) % n;
						break;
					case 'ArrowLeft':
					case 'ArrowUp':
						next = (cur - 1 + n) % n;
						break;
					case 'Home':
						next = 0;
						break;
					case 'End':
						next = n - 1;
						break;
					default:
						return;
				}
				e.preventDefault();
				const root = svgRef.current;
				const el = root?.querySelector<
					SVGGraphicsElement & {focus: () => void}
				>(`[data-index="${next}"]`);
				el?.focus?.();
			},
			[enriched.length, indexFromEvent]
		);

		const focused =
			focusIndex != null ? enriched[focusIndex] ?? null : null;
		const focusedDs = focused
			? COUNTRY_PATH_DS.get(focused.country.iso.toLowerCase()) ?? null
			: null;
		const clipId = `${clipBaseId}-${focusIndex ?? 'none'}`;

		return (
			<svg
				ref={svgRef}
				className={[
					'cui-map-choropleth__svg',
					motionOn && 'cui-map-choropleth--motion',
				]
					.filter(Boolean)
					.join(' ')}
				viewBox={VIEWBOX}
				preserveAspectRatio="xMidYMid meet"
				focusable="false"
				style={{width: '100%', height: 'auto', display: 'block'}}
				onMouseOver={onMouseOver}
				onMouseOut={onMouseOut}
				onFocus={onFocus}
				onBlur={onBlur}
				onKeyDown={onKeyDown}
			>
				<g
					className="cui-map-choropleth__land"
					dangerouslySetInnerHTML={{__html: SVG_INNER}}
				/>
				{focusedDs && (
					<g
						className="cui-map-choropleth__focus-overlay"
						aria-hidden="true"
						pointerEvents="none"
					>
						<defs>
							<clipPath id={clipId}>
								{focusedDs.map((d, i) => (
									<path key={i} d={d} />
								))}
							</clipPath>
						</defs>
						{focusedDs.map((d, i) => (
							<path
								key={`halo-${i}`}
								d={d}
								className="cui-map-choropleth__focus-inset-halo"
								clipPath={`url(#${clipId})`}
							/>
						))}
						{focusedDs.map((d, i) => (
							<path
								key={`ring-${i}`}
								d={d}
								className="cui-map-choropleth__focus-inset-ring"
								clipPath={`url(#${clipId})`}
							/>
						))}
					</g>
				)}
			</svg>
		);
	}
);
