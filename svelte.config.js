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
			$logger: './src/utils/logger/logger.ts',
			'$logger/*': './src/utils/logger/*',
			$stores: './src/lib/client/stores',
			$components: './src/components',
			$assets: './src/lib/client/assets',
			$alerts: './src/lib/client/alerts',
			$server: './src/server',
			$db: './src/db',
			$arr: './src/utils/arr',
			$http: './src/utils/http',
			$utils: './src/utils',
			$notifications: './src/notifications',
		}
	}
};

export default config;
