<script lang="ts">
	import { goto } from '$app/navigation';
	import { Plus } from 'lucide-svelte';
	import Tabs from '$ui/navigation/tabs/Tabs.svelte';
	import ActionsBar from '$ui/actions/ActionsBar.svelte';
	import ActionButton from '$ui/actions/ActionButton.svelte';
	import SearchAction from '$ui/actions/SearchAction.svelte';
	import ViewToggle from '$ui/actions/ViewToggle.svelte';
	import TableView from './views/TableView.svelte';
	import CardView from './views/CardView.svelte';
	import { createDataPageStore } from '$lib/client/stores/dataPage';
	import { browser } from '$app/environment';
	import type { PageData } from './$types';

	export let data: PageData;

	// Initialize data page store
	const { search, view, filtered, setItems } = createDataPageStore(data.qualityProfiles, {
		storageKey: 'qualityProfilesView',
		searchKeys: ['name'],
		searchKey: `qualityProfilesSearch:${data.currentDatabase.id}`
	});

	// Update items when data changes (e.g., switching databases)
	$: setItems(data.qualityProfiles);

	// Map databases to tabs
	$: tabs = data.databases.map((db) => ({
		label: db.name,
		href: `/quality-profiles/${db.id}`,
		active: db.id === data.currentDatabase.id
	}));

	// Persist selected database tab
	$: if (browser && data.currentDatabase?.id) {
		localStorage.setItem('qualityProfilesDatabase', String(data.currentDatabase.id));
	}
</script>

<svelte:head>
	<title>Quality Profiles - {data.currentDatabase.name} - Profilarr</title>
</svelte:head>

<div class="space-y-6 px-4 pt-4 pb-8 md:px-8">
	<!-- Tabs -->
	<Tabs {tabs} responsive />

	<!-- Actions Bar -->
	<ActionsBar>
		<SearchAction searchStore={search} placeholder="Search quality profiles..." />
		<ActionButton
			icon={Plus}
			on:click={() => goto(`/quality-profiles/${data.currentDatabase.id}/new`)}
		/>
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
				<p class="text-neutral-600 dark:text-neutral-400">No quality profiles match your search</p>
			</div>
		{:else if $view === 'table'}
			<TableView profiles={$filtered} />
		{:else}
			<CardView profiles={$filtered} />
		{/if}
	</div>
</div>
