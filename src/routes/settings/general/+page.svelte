<script lang="ts">
	import LoggingSettings from './components/LoggingSettings.svelte';
	import BackupSettings from './components/BackupSettings.svelte';
	import AISettings from './components/AISettings.svelte';
	import TMDBSettings from './components/TMDBSettings.svelte';
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<div class="p-8">
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-neutral-900 dark:text-neutral-50">General Settings</h1>
		<p class="mt-3 text-lg text-neutral-600 dark:text-neutral-400">
			Configure general application settings and preferences
		</p>
	</div>

	<div class="space-y-8">
		<!-- Backup Configuration -->
		<BackupSettings settings={data.backupSettings} />

		<!-- Logging Configuration -->
		<LoggingSettings settings={data.logSettings} />

		<!-- AI Configuration -->
		<AISettings settings={data.aiSettings} />

		<!-- TMDB Configuration -->
		<TMDBSettings settings={data.tmdbSettings} />
	</div>
</div>
