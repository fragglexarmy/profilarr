import adapter from 'sveltekit-adapter-deno';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter({
			usage: 'deno-compile',
			out: 'dist/build'
		}),
		outDir: 'dist/.svelte-kit',
		alias: {
			$config: './src/lib/server/utils/config/config.ts',
			$logger: './src/lib/server/utils/logger',
			$shared: './src/lib/shared',
			$stores: './src/lib/client/stores',
			$ui: './src/lib/client/ui',
			$assets: './src/lib/client/assets',
			$alerts: './src/lib/client/alerts',
			$server: './src/server',
			$db: './src/lib/server/db',
			$jobs: './src/lib/server/jobs',
			$pcd: './src/lib/server/pcd',
			$arr: './src/lib/server/utils/arr',
			$http: './src/lib/server/utils/http',
			$utils: './src/lib/server/utils',
			$notifications: './src/lib/server/notifications',
		}
	}
};

export default config;
