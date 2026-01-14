<script lang="ts">
	import { enhance } from '$app/forms';
	import { Film, Tv, Trash2 } from 'lucide-svelte';
	import { createEventDispatcher } from 'svelte';
	import ExpandableTable from '$ui/table/ExpandableTable.svelte';
	import ReleaseTable from './ReleaseTable.svelte';
	import { alertStore } from '$lib/client/alerts/store';
	import type { Column } from '$ui/table/types';
	import type { TestEntity, TestRelease, ReleaseEvaluation, ProfileCfScores, CustomFormatInfo } from './types';

	export let entities: TestEntity[];
	export let evaluations: Record<number, ReleaseEvaluation>;
	export let selectedProfileId: number | null;
	export let cfScoresData: { customFormats: CustomFormatInfo[]; profiles: ProfileCfScores[] };
	export let calculateScore: (releaseId: number, entityType: 'movie' | 'series') => number | null;

	const dispatch = createEventDispatcher<{
		confirmDelete: { entity: TestEntity; formRef: HTMLFormElement };
		addRelease: { entityId: number };
		editRelease: { entityId: number; release: TestRelease };
		confirmDeleteRelease: { release: TestRelease; formRef: HTMLFormElement };
	}>();

	const columns: Column<TestEntity>[] = [
		{
			key: 'poster_path',
			header: '',
			width: 'w-12'
		},
		{
			key: 'title',
			header: 'Title',
			sortable: true
		},
		{
			key: 'type',
			header: 'Type',
			width: 'w-24',
			sortable: true
		},
		{
			key: 'releases',
			header: 'Releases',
			width: 'w-28',
			align: 'center',
			sortable: true,
			sortAccessor: (row) => row.releases.length
		}
	];

	function getRowId(row: TestEntity): number {
		return row.id;
	}
</script>

<ExpandableTable
	{columns}
	data={entities}
	{getRowId}
	compact={true}
	flushExpanded={true}
	emptyMessage="No entities match your search"
	chevronPosition="right"
>
	<svelte:fragment slot="cell" let:row let:column>
		{#if column.key === 'poster_path'}
			{#if row.poster_path}
				<div class="h-12 w-8">
					<img
						src="https://image.tmdb.org/t/p/w92{row.poster_path}"
						alt={row.title}
						class="h-full w-full rounded object-cover"
					/>
				</div>
			{:else}
				<div
					class="flex h-12 w-8 items-center justify-center rounded bg-neutral-200 dark:bg-neutral-700"
				>
					{#if row.type === 'movie'}
						<Film size={16} class="text-neutral-400" />
					{:else}
						<Tv size={16} class="text-neutral-400" />
					{/if}
				</div>
			{/if}
		{:else if column.key === 'title'}
			<div class="flex flex-col">
				<span class="font-medium">{row.title}</span>
				{#if row.year}
					<span class="text-xs text-neutral-500 dark:text-neutral-400">{row.year}</span>
				{/if}
			</div>
		{:else if column.key === 'type'}
			<span
				class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium {row.type ===
				'movie'
					? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
					: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400'}"
			>
				{#if row.type === 'movie'}
					<Film size={12} />
					Movie
				{:else}
					<Tv size={12} />
					Series
				{/if}
			</span>
		{:else if column.key === 'releases'}
			<span class="text-neutral-600 dark:text-neutral-400">
				{row.releases.length}
			</span>
		{/if}
	</svelte:fragment>

	<svelte:fragment slot="actions" let:row>
		{@const formId = `delete-form-${row.id}`}
		<form
			id={formId}
			method="POST"
			action="?/deleteEntity"
			use:enhance={() => {
				return async ({ result, update }) => {
					if (result.type === 'failure' && result.data) {
						alertStore.add(
							'error',
							(result.data as { error?: string }).error || 'Failed to delete entity'
						);
					} else if (result.type === 'success') {
						alertStore.add('success', `Deleted ${row.title}`);
					}
					await update();
				};
			}}
		>
			<input type="hidden" name="entityId" value={row.id} />
			<button
				type="button"
				on:click={() => {
					const form = document.getElementById(formId) as HTMLFormElement;
					dispatch('confirmDelete', { entity: row, formRef: form });
				}}
				class="rounded p-1 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
				title="Delete entity"
			>
				<Trash2 size={16} />
			</button>
		</form>
	</svelte:fragment>

	<svelte:fragment slot="expanded" let:row>
		<div class="px-4 py-3">
			<ReleaseTable
				entityId={row.id}
				entityType={row.type}
				releases={row.releases}
				{evaluations}
				{selectedProfileId}
				{cfScoresData}
				{calculateScore}
				on:add={(e) => dispatch('addRelease', e.detail)}
				on:edit={(e) => dispatch('editRelease', e.detail)}
				on:confirmDelete={(e) => dispatch('confirmDeleteRelease', e.detail)}
			/>
		</div>
	</svelte:fragment>
</ExpandableTable>
