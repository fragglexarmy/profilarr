<script lang="ts">
	import Tabs from '$ui/navigation/tabs/Tabs.svelte';
	import ActionsBar from '$ui/actions/ActionsBar.svelte';
	import ActionButton from '$ui/actions/ActionButton.svelte';
	import SearchAction from '$ui/actions/SearchAction.svelte';
	import ViewToggle from '$ui/actions/ViewToggle.svelte';
	import InfoModal from '$ui/modal/InfoModal.svelte';
	import TableView from './views/TableView.svelte';
	import CardView from './views/CardView.svelte';
	import { createDataPageStore } from '$lib/client/stores/dataPage';
	import { goto } from '$app/navigation';
	import { Info, Plus } from 'lucide-svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	let showInfoModal = false;

	// Initialize data page store
	const { search, view, filtered, setItems } = createDataPageStore(data.delayProfiles, {
		storageKey: 'delayProfilesView',
		searchKeys: ['name']
	});

	// Update items when data changes (e.g., switching databases)
	$: setItems(data.delayProfiles);

	// Map databases to tabs
	$: tabs = data.databases.map((db) => ({
		label: db.name,
		href: `/delay-profiles/${db.id}`,
		active: db.id === data.currentDatabase.id
	}));
</script>

<svelte:head>
	<title>Delay Profiles - {data.currentDatabase.name} - Profilarr</title>
</svelte:head>

<div class="space-y-6 px-8 pt-4 pb-8">
	<!-- Tabs -->
	<Tabs {tabs} />

	<!-- Actions Bar -->
	<ActionsBar>
		<SearchAction searchStore={search} placeholder="Search delay profiles..." />
		<ViewToggle bind:value={$view} />
		<ActionButton icon={Info} on:click={() => (showInfoModal = true)} />
		<ActionButton icon={Plus} on:click={() => goto(`/delay-profiles/${data.currentDatabase.id}/new`)} />
	</ActionsBar>

	<!-- Delay Profiles Content -->
	<div class="mt-6">
		{#if data.delayProfiles.length === 0}
			<div
				class="rounded-lg border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900"
			>
				<p class="text-neutral-600 dark:text-neutral-400">
					No delay profiles found for {data.currentDatabase.name}
				</p>
			</div>
		{:else if $filtered.length === 0}
			<div
				class="rounded-lg border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900"
			>
				<p class="text-neutral-600 dark:text-neutral-400">
					No delay profiles match your search
				</p>
			</div>
		{:else if $view === 'table'}
			<TableView profiles={$filtered} />
		{:else}
			<CardView profiles={$filtered} />
		{/if}
	</div>
</div>

<InfoModal bind:open={showInfoModal} header="How Delay Profile Sync Works">
	<div class="space-y-4 text-sm text-neutral-600 dark:text-neutral-400">
		<div>
			<div class="font-medium text-neutral-900 dark:text-neutral-100">Replaces Existing Profiles</div>
			<p class="mt-1">
				When syncing, all existing delay profiles on the arr instance are deleted and replaced with the ones you've selected. The default profile (which cannot be deleted) is preserved.
			</p>
		</div>
		<div>
			<div class="font-medium text-neutral-900 dark:text-neutral-100">Selection Order = Priority</div>
			<p class="mt-1">
				The order you select profiles determines their priority. The first profile in your selection list gets the highest priority (order 1), the second gets order 2, and so on.
			</p>
		</div>
		<div>
			<div class="font-medium text-neutral-900 dark:text-neutral-100">Tag-Based Matching</div>
			<p class="mt-1">
				Delay profiles use tags to apply to specific series/movies. When multiple profiles match (via tags), the one with the lowest order number takes precedence.
			</p>
		</div>
	</div>
</InfoModal>
