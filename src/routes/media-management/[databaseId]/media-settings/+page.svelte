<script lang="ts">
	import ActionsBar from '$ui/actions/ActionsBar.svelte';
	import ActionButton from '$ui/actions/ActionButton.svelte';
	import SearchAction from '$ui/actions/SearchAction.svelte';
	import TableView from './views/TableView.svelte';
	import { createDataPageStore } from '$lib/client/stores/dataPage';
	import { goto } from '$app/navigation';
	import { Plus } from 'lucide-svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	// Initialize data page store
	const { search, filtered, setItems } = createDataPageStore(data.mediaSettingsConfigs, {
		storageKey: 'mediaSettingsView',
		searchKeys: ['name']
	});

	// Update items when data changes
	$: setItems(data.mediaSettingsConfigs);
</script>

<!-- Actions Bar -->
<ActionsBar>
	<SearchAction searchStore={search} placeholder="Search media settings..." />
	<ActionButton
		icon={Plus}
		on:click={() => goto(`/media-management/${data.currentDatabase.id}/media-settings/new`)}
	/>
</ActionsBar>

<!-- Media Settings Content -->
<div class="mt-6">
	{#if data.mediaSettingsConfigs.length === 0}
		<div
			class="rounded-lg border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900"
		>
			<p class="text-neutral-600 dark:text-neutral-400">
				No media settings configs found for {data.currentDatabase.name}
			</p>
		</div>
	{:else if $filtered.length === 0}
		<div
			class="rounded-lg border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900"
		>
			<p class="text-neutral-600 dark:text-neutral-400">No media settings configs match your search</p>
		</div>
	{:else}
		<TableView configs={$filtered} databaseId={data.currentDatabase.id} />
	{/if}
</div>
