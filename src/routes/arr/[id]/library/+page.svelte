<script lang="ts">
	import { AlertTriangle, Check, Film, ExternalLink, CircleAlert, RefreshCw, HardDrive, CheckCircle, ArrowUpCircle, Pencil, Trash2, FolderSync, Database } from 'lucide-svelte';
	import { alertStore } from '$alerts/store';
	import { enhance } from '$app/forms';
	import ExpandableTable from '$ui/table/ExpandableTable.svelte';
	import type { Column } from '$ui/table/types';
	import type { PageData } from './$types';
	import type { RadarrLibraryItem } from '$utils/arr/types.ts';

	import ActionsBar from '$ui/actions/ActionsBar.svelte';
	import SearchAction from '$ui/actions/SearchAction.svelte';
	import ActionButton from '$ui/actions/ActionButton.svelte';
	import Dropdown from '$ui/dropdown/Dropdown.svelte';
	import { createSearchStore } from '$stores/search';

	export let data: PageData;

	let refreshing = false;

	const searchStore = createSearchStore({ debounceMs: 150 });

	function handleChangeProfile(databaseName: string, profileName: string) {
		const count = moviesWithFiles.length;
		// TODO: Implement actual profile change functionality
		alertStore.add('success', `Changing ${count} movies to "${profileName}" from ${databaseName}`);
	}

	// Get base URL without trailing slash
	$: baseUrl = data.instance.url.replace(/\/$/, '');

	// Subscribe to debounced query for reactivity
	$: debouncedQuery = $searchStore.query;

	// Filter movies by search query
	$: moviesWithFiles = data.library
		.filter((m) => m.hasFile)
		.filter((m) => !debouncedQuery || m.title.toLowerCase().includes(debouncedQuery.toLowerCase()));

	// Get progress bar color
	function getProgressColor(progress: number, cutoffMet: boolean): string {
		if (cutoffMet) return 'bg-green-500 dark:bg-green-400';
		if (progress >= 0.75) return 'bg-yellow-500 dark:bg-yellow-400';
		if (progress >= 0.5) return 'bg-orange-500 dark:bg-orange-400';
		return 'bg-red-500 dark:bg-red-400';
	}

	const columns: Column<RadarrLibraryItem>[] = [
		{ key: 'title', header: 'Title', align: 'left' },
		{ key: 'qualityProfileName', header: 'Profile', align: 'left', width: 'w-40' },
		{ key: 'qualityName', header: 'Quality', align: 'left', width: 'w-32' },
		{ key: 'customFormatScore', header: 'Score', align: 'right', width: 'w-32' },
		{ key: 'progress', header: 'Progress', align: 'center', width: 'w-48' },
		{ key: 'actions', header: 'Actions', align: 'center', width: 'w-20' }
	];
</script>

<svelte:head>
	<title>{data.instance.name} - Library - Profilarr</title>
</svelte:head>


<div class="mt-6 space-y-6">
	{#if data.libraryError}
		<div class="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-950/40">
			<div class="flex items-center gap-3">
				<AlertTriangle class="h-5 w-5 text-red-600 dark:text-red-400" />
				<div>
					<h3 class="font-medium text-red-800 dark:text-red-200">Failed to load library</h3>
					<p class="mt-1 text-sm text-red-600 dark:text-red-400">{data.libraryError}</p>
				</div>
			</div>
		</div>
	{:else if data.instance.type !== 'radarr'}
		<div class="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
			<div class="flex items-center gap-3">
				<Film class="h-5 w-5 text-neutral-400" />
				<div>
					<h3 class="font-medium text-neutral-900 dark:text-neutral-50">Library view not yet available</h3>
					<p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
						Library view is currently only supported for Radarr instances.
					</p>
				</div>
			</div>
		</div>
	{:else if moviesWithFiles.length === 0}
		<div class="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
			<div class="flex items-center gap-3">
				<Film class="h-5 w-5 text-neutral-400" />
				<div>
					<h3 class="font-medium text-neutral-900 dark:text-neutral-50">No movies with files</h3>
					<p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
						This library has {data.library.length} movies but none have downloaded files yet.
					</p>
				</div>
			</div>
		</div>
	{:else}
		<!-- Header with inline stats -->
		<div class="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
			<div class="flex flex-col gap-2">
				<div class="flex items-center gap-3">
					<h2 class="text-lg font-semibold text-neutral-900 dark:text-neutral-50">{data.instance.name}</h2>
					<span class="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 capitalize">
						{data.instance.type}
					</span>
					<div class="hidden sm:flex items-center gap-2">
						<span class="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300" title="Total movies in library">
							<Film size={12} class="text-blue-500" />
							{data.library.length} Total
						</span>
						<span class="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300" title="Movies with files on disk">
							<HardDrive size={12} class="text-purple-500" />
							{moviesWithFiles.length} On Disk
						</span>
						<span class="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300" title="Movies that have met the quality cutoff">
							<CheckCircle size={12} class="text-green-500" />
							{moviesWithFiles.filter((m) => m.cutoffMet).length} Cutoff Met
						</span>
						<span class="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300" title="Movies that can still be upgraded">
							<ArrowUpCircle size={12} class="text-orange-500" />
							{moviesWithFiles.filter((m) => !m.cutoffMet).length} Upgradeable
						</span>
					</div>
				</div>
				<code class="text-xs font-mono text-neutral-500 dark:text-neutral-400">{data.instance.url}</code>
			</div>
			<div class="flex items-center gap-2">
				<form
					method="POST"
					action="?/refresh"
					use:enhance={() => {
						refreshing = true;
						return async ({ update }) => {
							await update();
							refreshing = false;
						};
					}}
				>
					<button
						type="submit"
						disabled={refreshing}
						class="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
					>
						<RefreshCw size={14} class={refreshing ? 'animate-spin' : ''} />
						Refresh
					</button>
				</form>
				<a
					href={baseUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
				>
					Open Radarr
					<ExternalLink size={14} />
				</a>
				<a
					href="/arr/{data.instance.id}/edit"
					class="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
					title="Edit instance"
				>
					<Pencil size={14} />
				</a>
				<form
					method="POST"
					action="?/delete"
					use:enhance={() => {
						if (!confirm('Are you sure you want to delete this instance?')) {
							return ({ cancel }) => cancel();
						}
						return async ({ update }) => {
							await update();
						};
					}}
				>
					<button
						type="submit"
						class="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-red-200 bg-red-50 text-red-600 transition-colors hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
						title="Delete instance"
					>
						<Trash2 size={14} />
					</button>
				</form>
			</div>
		</div>

		<!-- Actions Bar -->
		<ActionsBar>
			<SearchAction {searchStore} placeholder="Search movies..." />
			<ActionButton icon={FolderSync} hasDropdown={true} dropdownPosition="right" square={false}>
				<span class="ml-2 text-sm text-neutral-700 dark:text-neutral-300">Change Profile</span>
				<span class="ml-1 text-xs text-neutral-500 dark:text-neutral-400">({moviesWithFiles.length})</span>
				<svelte:fragment slot="dropdown" let:dropdownPosition let:open>
					<Dropdown position={dropdownPosition} {open} minWidth="16rem">
						<div class="max-h-80 overflow-y-auto py-1">
							{#if data.profilesByDatabase.length === 0}
								<div class="px-4 py-3 text-sm text-neutral-500 dark:text-neutral-400">
									No databases configured
								</div>
							{:else}
								{#each data.profilesByDatabase as db}
									<div class="border-b border-neutral-100 dark:border-neutral-700 last:border-b-0">
										<div class="px-3 py-2 bg-neutral-50 dark:bg-neutral-900 flex items-center gap-2">
											<Database size={12} class="text-neutral-400" />
											<span class="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
												{db.databaseName}
											</span>
										</div>
										{#each db.profiles as profile}
											<button
												type="button"
												on:click={() => handleChangeProfile(db.databaseName, profile)}
												class="w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700"
											>
												{profile}
											</button>
										{/each}
									</div>
								{/each}
							{/if}
						</div>
					</Dropdown>
				</svelte:fragment>
			</ActionButton>
		</ActionsBar>

		<!-- Library Table -->
		<ExpandableTable {columns} data={moviesWithFiles} getRowId={(row) => row.id} compact={true}>
			<svelte:fragment slot="cell" let:row let:column>
				{#if column.key === 'title'}
					<div>
						<div class="font-medium text-neutral-900 dark:text-neutral-50">{row.title}</div>
						{#if row.year}
							<div class="text-xs text-neutral-500 dark:text-neutral-400">{row.year}</div>
						{/if}
					</div>
				{:else if column.key === 'qualityProfileName'}
					<div class="relative group inline-flex">
						<span
							class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium {row.isProfilarrProfile ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'}"
						>
							{#if !row.isProfilarrProfile}
								<CircleAlert size={12} />
							{/if}
							{row.qualityProfileName}
						</span>
						{#if !row.isProfilarrProfile}
							<div class="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 px-2 py-1 text-xs text-white bg-neutral-800 dark:bg-neutral-700 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10">
								Not managed by Profilarr
							</div>
						{/if}
					</div>
				{:else if column.key === 'qualityName'}
					<code class="rounded bg-neutral-100 px-2 py-1 font-mono text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
						{row.qualityName ?? 'N/A'}
					</code>
				{:else if column.key === 'customFormatScore'}
					<div class="text-right">
						<span class="font-mono font-medium {row.cutoffMet ? 'text-green-600 dark:text-green-400' : 'text-neutral-900 dark:text-neutral-100'}">
							{row.customFormatScore.toLocaleString()}
						</span>
						<span class="text-xs text-neutral-500 dark:text-neutral-400">
							/ {row.cutoffScore.toLocaleString()}
						</span>
					</div>
				{:else if column.key === 'progress'}
					<div class="flex items-center gap-2">
						<div class="flex-1 h-2 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
							<div
								class="h-full rounded-full transition-all {getProgressColor(row.progress, row.cutoffMet)}"
								style="width: {Math.min(row.progress * 100, 100)}%"
							></div>
						</div>
						{#if row.cutoffMet}
							<Check size={16} class="text-green-600 dark:text-green-400 flex-shrink-0" />
						{:else}
							<span class="text-xs font-mono text-neutral-500 dark:text-neutral-400 w-10 text-right">
								{Math.round(row.progress * 100)}%
							</span>
						{/if}
					</div>
				{:else if column.key === 'actions'}
					<div class="flex items-center justify-center">
						{#if row.tmdbId}
							<a
								href="{baseUrl}/movie/{row.tmdbId}"
								target="_blank"
								rel="noopener noreferrer"
								class="inline-flex h-7 w-7 items-center justify-center rounded border border-neutral-300 bg-white text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
								title="Open in Radarr"
								on:click|stopPropagation
							>
								<ExternalLink size={14} />
							</a>
						{/if}
					</div>
				{/if}
			</svelte:fragment>

			<svelte:fragment slot="expanded" let:row>
				<div class="flex flex-col gap-3">
					<!-- File Name -->
					{#if row.fileName}
						<code class="text-xs font-mono text-neutral-600 dark:text-neutral-400 break-all">{row.fileName}</code>
					{/if}

					<!-- Custom Formats with Scores (sorted by score descending) -->
					{#if row.scoreBreakdown.length > 0}
						<div class="flex flex-wrap items-center gap-2">
							{#each row.scoreBreakdown.toSorted((a, b) => b.score - a.score) as item}
								<div class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs {item.score > 0 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : item.score < 0 ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'}">
									<span class="font-medium">{item.name}</span>
									<span class="font-mono">{item.score >= 0 ? '+' : ''}{item.score.toLocaleString()}</span>
								</div>
							{/each}
							<span class="text-xs text-neutral-500 dark:text-neutral-400">
								= <span class="font-mono font-medium">{row.customFormatScore.toLocaleString()}</span>
							</span>
						</div>
					{:else}
						<div class="text-xs text-neutral-500 dark:text-neutral-400">No custom formats matched</div>
					{/if}
				</div>
			</svelte:fragment>
		</ExpandableTable>
	{/if}
</div>
