import {useEffect, useState} from 'react';

/**
 * Reduced motion is enabled when ANY of the following is true:
 *   - The user's OS exposes `prefers-reduced-motion: reduce`
 *   - The host page sets `c-prefers-reduced-motion` on `<body>`
 *
 * The class-based opt-in mirrors Clay's existing convention so consumers can
 * force the affordance regardless of the OS setting (e.g. in a settings
 * panel).
 */
export function useReducedMotion(): boolean {
	const [reduced, setReduced] = useState<boolean>(() => detect());

	useEffect(() => {
		if (typeof window === 'undefined') return;

		const media = window.matchMedia('(prefers-reduced-motion: reduce)');
		const onMediaChange = () => setReduced(detect());
		media.addEventListener('change', onMediaChange);

		const observer = new MutationObserver(() => setReduced(detect()));
		observer.observe(document.body, {
			attributes: true,
			attributeFilter: ['class'],
		});

		return () => {
			media.removeEventListener('change', onMediaChange);
			observer.disconnect();
		};
	}, []);

	return reduced;
}

function detect(): boolean {
	if (typeof window === 'undefined') return false;
	const media = window.matchMedia('(prefers-reduced-motion: reduce)');
	const classOptIn = document.body.classList.contains(
		'c-prefers-reduced-motion'
	);
	return media.matches || classOptIn;
}
