import adapter from 'sveltekit-adapter-deno';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter({
			usage: 'deno-compile'
		}),
		alias: {
			$config: './src/utils/config/config.ts',
			$stores: './src/stores',
			$components: './src/components',
			$static: './src/static',
			$server: './src/server'
		}
	}
};

export default config;
