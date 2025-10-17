/**
 * Theme store for light/dark mode
 */

import { writable } from 'svelte/store';
import { browser } from '$app/environment';

type Theme = 'light' | 'dark';

function createThemeStore() {
	// Initialize theme from localStorage or system preference
	let initialTheme: Theme = 'dark';
	if (browser) {
		const stored = localStorage.getItem('theme') as Theme | null;
		if (stored) {
			initialTheme = stored;
		} else {
			initialTheme = globalThis.matchMedia('(prefers-color-scheme: dark)').matches
				? 'dark'
				: 'light';
		}
	}

	const { subscribe, set, update } = writable<Theme>(initialTheme);

	// Apply theme on initialization
	if (browser) {
		applyTheme(initialTheme);
	}

	function applyTheme(newTheme: Theme) {
		if (browser) {
			document.documentElement.classList.remove('light', 'dark');
			document.documentElement.classList.add(newTheme);
		}
	}

	function toggle() {
		update((current) => {
			const newTheme = current === 'light' ? 'dark' : 'light';
			applyTheme(newTheme);
			if (browser) {
				localStorage.setItem('theme', newTheme);
			}
			return newTheme;
		});
	}

	return {
		subscribe,
		toggle
	};
}

export const themeStore = createThemeStore();
