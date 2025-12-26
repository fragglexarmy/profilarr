<script lang="ts">
	import type { PageData } from './$types';
	import type { FilterConfig, FilterMode } from '$lib/shared/filters';
	import { Info } from 'lucide-svelte';
	import CoreSettings from './components/CoreSettings.svelte';
	import FilterSettings from './components/FilterSettings.svelte';
	import UpgradesInfoModal from './components/UpgradesInfoModal.svelte';

	export let data: PageData;

	let enabled = true;
	let schedule = '360'; // 6 hours in minutes
	let filterMode: FilterMode = 'round_robin';
	let filters: FilterConfig[] = [];

	let showInfoModal = false;
</script>

<svelte:head>
	<title>{data.instance.name} - Upgrades - Profilarr</title>
</svelte:head>

<div class="mt-6 space-y-6">
	<!-- Header -->
	<div class="flex items-start justify-between">
		<div>
			<h1 class="text-2xl font-bold text-neutral-900 dark:text-neutral-50">Upgrade Configuration</h1>
			<p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
				Automatically search for better quality releases for your library items.
			</p>
		</div>
		<button
			type="button"
			on:click={() => (showInfoModal = true)}
			class="flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
		>
			<Info size={14} />
			How it works
		</button>
	</div>

	<CoreSettings bind:enabled bind:schedule bind:filterMode />
	<FilterSettings bind:filters />
</div>

<UpgradesInfoModal bind:open={showInfoModal} />
