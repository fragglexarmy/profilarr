<script lang="ts">
	import Tabs from '$ui/navigation/tabs/Tabs.svelte';
	import ActionsBar from '$ui/actions/ActionsBar.svelte';
	import ActionButton from '$ui/actions/ActionButton.svelte';
	import SearchAction from '$ui/actions/SearchAction.svelte';
	import Dropdown from '$ui/dropdown/Dropdown.svelte';
	import DropdownItem from '$ui/dropdown/DropdownItem.svelte';
	import TableView from './views/TableView.svelte';
	import CardView from './views/CardView.svelte';
	import { createSearchStore } from '$lib/client/stores/search';
	import { Eye, LayoutGrid, Table } from 'lucide-svelte';
	import { browser } from '$app/environment';
	import type { PageData } from './$types';

	export let data: PageData;

	// Initialize search store
	const searchStore = createSearchStore({ debounceMs: 300 });

	// View state - load from localStorage or default to 'table'
	let currentView: 'cards' | 'table' = 'table';

	if (browser) {
		const savedView = localStorage.getItem('qualityProfilesView') as 'cards' | 'table' | null;
		if (savedView) {
			currentView = savedView;
		}
	}

	// Save view to localStorage when it changes
	$: if (browser && currentView) {
		localStorage.setItem('qualityProfilesView', currentView);
	}

	// Map databases to tabs
	$: tabs = data.databases.map((db) => ({
		label: db.name,
		href: `/quality-profiles/${db.id}`,
		active: db.id === data.currentDatabase.id
	}));

	// Filter quality profiles based on search
	$: filteredProfiles = data.qualityProfiles.filter((profile) => {
		const query = $searchStore.query;
		if (!query) return true;

		const searchLower = query.toLowerCase();
		return profile.name?.toLowerCase().includes(searchLower);
	});
</script>

<svelte:head>
	<title>Quality Profiles - {data.currentDatabase.name} - Profilarr</title>
</svelte:head>

<div class="space-y-6 p-8">
	<!-- Tabs -->
	<Tabs {tabs} />

	<!-- Actions Bar -->
	<ActionsBar>
		<SearchAction {searchStore} placeholder="Search quality profiles..." />
		<ActionButton icon={Eye} hasDropdown={true} dropdownPosition="right">
			<Dropdown slot="dropdown" let:open position="right">
				<DropdownItem
					icon={LayoutGrid}
					label="Cards"
					selected={currentView === 'cards'}
					on:click={() => (currentView = 'cards')}
				/>
				<DropdownItem
					icon={Table}
					label="Table"
					selected={currentView === 'table'}
					on:click={() => (currentView = 'table')}
				/>
			</Dropdown>
		</ActionButton>
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
		{:else if filteredProfiles.length === 0}
			<div
				class="rounded-lg border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900"
			>
				<p class="text-neutral-600 dark:text-neutral-400">
					No quality profiles match your search
				</p>
			</div>
		{:else if currentView === 'table'}
			<TableView profiles={filteredProfiles} />
		{:else}
			<CardView profiles={filteredProfiles} />
		{/if}
	</div>
</div>
