<script lang="ts">
	import ActionsBar from '$ui/actions/ActionsBar.svelte';
	import ActionButton from '$ui/actions/ActionButton.svelte';
	import SearchAction from '$ui/actions/SearchAction.svelte';
	import ViewToggle from '$ui/actions/ViewToggle.svelte';
	import TableView from './views/TableView.svelte';
	import CardView from './views/CardView.svelte';
	import { createDataPageStore } from '$lib/client/stores/dataPage';
	import { goto } from '$app/navigation';
	import { Plus } from 'lucide-svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	// Initialize data page store
	const { search, view, filtered, setItems } = createDataPageStore(data.qualityDefinitionsConfigs, {
		storageKey: 'qualityDefinitionsView',
		searchKeys: ['name'],
		searchKey: `qualityDefinitionsConfigsSearch:${data.currentDatabase.id}`
	});

	// Update items when data changes
	$: setItems(data.qualityDefinitionsConfigs);
</script>

<!-- Actions Bar -->
<ActionsBar>
	<SearchAction searchStore={search} placeholder="Search quality definitions..." responsive />
	<ActionButton
		icon={Plus}
		on:click={() => goto(`/media-management/${data.currentDatabase.id}/quality-definitions/new`)}
	/>
	<ViewToggle bind:value={$view} />
</ActionsBar>

<!-- Quality Definitions Content -->
<div class="mt-6">
	{#if data.qualityDefinitionsConfigs.length === 0}
		<div
			class="rounded-lg border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900"
		>
			<p class="text-neutral-600 dark:text-neutral-400">
				No quality definitions configs found for {data.currentDatabase.name}
			</p>
		</div>
	{:else if $filtered.length === 0}
		<div
			class="rounded-lg border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900"
		>
			<p class="text-neutral-600 dark:text-neutral-400">
				No quality definitions configs match your search
			</p>
		</div>
	{:else if $view === 'table'}
		<TableView configs={$filtered} databaseId={data.currentDatabase.id} />
	{:else}
		<CardView configs={$filtered} databaseId={data.currentDatabase.id} />
	{/if}
</div>
