<script lang="ts">
	import { RefreshCw } from 'lucide-svelte';
	import type { PageData } from './$types';
	import UpgradeRunCard from './components/UpgradeRunCard.svelte';

	export let data: PageData;

	// Filter state
	type StatusFilter = 'all' | 'success' | 'partial' | 'failed' | 'skipped';
	let statusFilter: StatusFilter = 'all';

	const statusFilters: { value: StatusFilter; label: string }[] = [
		{ value: 'all', label: 'All' },
		{ value: 'success', label: 'Success' },
		{ value: 'partial', label: 'Partial' },
		{ value: 'failed', label: 'Failed' },
		{ value: 'skipped', label: 'Skipped' }
	];

	// Filtered runs
	$: filteredRuns = data.upgradeRuns.filter((run) => {
		if (statusFilter === 'all') return true;
		return run.status === statusFilter;
	});

	// Stats
	$: stats = {
		total: data.upgradeRuns.length,
		success: data.upgradeRuns.filter((r) => r.status === 'success').length,
		partial: data.upgradeRuns.filter((r) => r.status === 'partial').length,
		failed: data.upgradeRuns.filter((r) => r.status === 'failed').length,
		skipped: data.upgradeRuns.filter((r) => r.status === 'skipped').length
	};

	function refreshLogs() {
		window.location.reload();
	}
</script>

<svelte:head>
	<title>{data.instance.name} - Logs - Profilarr</title>
</svelte:head>

<div class="mt-6 space-y-6">
	<!-- Header -->
	<div class="flex items-start justify-between">
		<div>
			<h1 class="text-2xl font-bold text-neutral-900 dark:text-neutral-50">Upgrade Logs</h1>
			<p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
				View upgrade job history for this {data.instance.type} instance.
			</p>
		</div>
		<button
			type="button"
			on:click={refreshLogs}
			class="flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
		>
			<RefreshCw size={14} />
			Refresh
		</button>
	</div>

	<!-- Stats & Filters -->
	<div class="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
		<!-- Stats -->
		<div class="flex items-center gap-6 text-sm">
			<div class="text-neutral-600 dark:text-neutral-400">
				<span class="font-medium text-neutral-900 dark:text-neutral-100">{stats.total}</span> total runs
			</div>
			{#if stats.success > 0}
				<div class="text-green-600 dark:text-green-400">
					<span class="font-medium">{stats.success}</span> successful
				</div>
			{/if}
			{#if stats.partial > 0}
				<div class="text-yellow-600 dark:text-yellow-400">
					<span class="font-medium">{stats.partial}</span> partial
				</div>
			{/if}
			{#if stats.failed > 0}
				<div class="text-red-600 dark:text-red-400">
					<span class="font-medium">{stats.failed}</span> failed
				</div>
			{/if}
		</div>

		<!-- Filter Buttons -->
		<div class="flex gap-2">
			{#each statusFilters as filter}
				<button
					type="button"
					on:click={() => (statusFilter = filter.value)}
					class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors {statusFilter ===
					filter.value
						? 'bg-blue-600 text-white dark:bg-blue-500'
						: 'border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'}"
				>
					{filter.label}
				</button>
			{/each}
		</div>
	</div>

	<!-- Upgrade Runs -->
	{#if filteredRuns.length === 0}
		<div class="rounded-lg border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
			<p class="text-neutral-600 dark:text-neutral-400">
				{#if data.upgradeRuns.length === 0}
					No upgrade runs yet. Configure upgrades and run a test to see logs here.
				{:else}
					No runs match the selected filter.
				{/if}
			</p>
		</div>
	{:else}
		<div class="space-y-3">
			{#each filteredRuns as run, index (run.id)}
				<UpgradeRunCard {run} runNumber={data.upgradeRuns.length - data.upgradeRuns.indexOf(run)} />
			{/each}
		</div>
	{/if}
</div>
