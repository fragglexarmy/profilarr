/**
 * Accent color store for app theming
 */

import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type AccentColor = 'blue' | 'yellow';

export const accentColors: { value: AccentColor; label: string; color: string }[] = [
	{ value: 'blue', label: 'Blue', color: '#2563eb' },
	{ value: 'yellow', label: 'Yellow', color: '#eab308' }
];

function createAccentStore() {
	let initialAccent: AccentColor = 'blue';
	if (browser) {
		const stored = localStorage.getItem('accent') as AccentColor | null;
		if (stored && accentColors.some((c) => c.value === stored)) {
			initialAccent = stored;
		}
	}

	const { subscribe, set } = writable<AccentColor>(initialAccent);

	function setAccent(accent: AccentColor) {
		set(accent);
		if (browser) {
			localStorage.setItem('accent', accent);
		}
	}

	return {
		subscribe,
		set: setAccent
	};
}

export const accentStore = createAccentStore();
