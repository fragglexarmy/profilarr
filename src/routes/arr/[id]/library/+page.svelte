<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<svelte:head>
	<title>{data.instance.name} - Library - Profilarr</title>
</svelte:head>

<div class="mt-6">
	<div class="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
		<h2 class="text-lg font-semibold text-neutral-900 dark:text-neutral-50">Library</h2>
		<p class="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
			View and manage the library for this {data.instance.type} instance.
		</p>
		<div class="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
			Library content coming soon...
		</div>
	</div>
</div>
