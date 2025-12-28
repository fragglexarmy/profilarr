<script lang="ts">
	import Tabs from '$ui/navigation/tabs/Tabs.svelte';
	import ActionsBar from '$ui/actions/ActionsBar.svelte';
	import SearchAction from '$ui/actions/SearchAction.svelte';
	import ViewToggle from '$ui/actions/ViewToggle.svelte';
	import TableView from './views/TableView.svelte';
	import CardView from './views/CardView.svelte';
	import { createDataPageStore } from '$lib/client/stores/dataPage';
	import type { PageData } from './$types';

	export let data: PageData;

	// Initialize data page store
	const { search, view, filtered, setItems } = createDataPageStore(data.qualityProfiles, {
		storageKey: 'qualityProfilesView',
		searchKeys: ['name']
	});

	// Update items when data changes (e.g., switching databases)
	$: setItems(data.qualityProfiles);

	// Map databases to tabs
	$: tabs = data.databases.map((db) => ({
		label: db.name,
		href: `/quality-profiles/${db.id}`,
		active: db.id === data.currentDatabase.id
	}));
</script>

<svelte:head>
	<title>Quality Profiles - {data.currentDatabase.name} - Profilarr</title>
</svelte:head>

<div class="space-y-6 p-8">
	<!-- Tabs -->
	<Tabs {tabs} />

	<!-- Actions Bar -->
	<ActionsBar>
		<SearchAction searchStore={search} placeholder="Search quality profiles..." />
		<ViewToggle bind:value={$view} />
	</ActionsBar>

	<!-- Quality Profiles Content -->
	<div class="mt-6">
		{#if data.qualityProfiles.length === 0}
			<div
				class="rounded-lg border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900"
			>
				<p class="text-neutral-600 dark:text-neutral-400">
					No quality profiles found for {data.currentDatabase.name}
				</p>
			</div>
		{:else if $filtered.length === 0}
			<div
				class="rounded-lg border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900"
			>
				<p class="text-neutral-600 dark:text-neutral-400">
					No quality profiles match your search
				</p>
			</div>
		{:else if $view === 'table'}
			<TableView profiles={$filtered} />
		{:else}
			<CardView profiles={$filtered} />
		{/if}
	</div>
</div>
