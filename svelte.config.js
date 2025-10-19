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
			$stores: './src/stores',
			$components: './src/components',
			$static: './src/static',
			$server: './src/server',
			$db: './src/db',
			$arr: './src/utils/arr',
			$http: './src/utils/http',
			$api: './src/utils/api/request.ts'
		}
	}
};

export default config;
