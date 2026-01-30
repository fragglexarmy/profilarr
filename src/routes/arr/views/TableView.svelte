<script lang="ts">
	import { goto } from '$app/navigation';
	import { ExternalLink, Trash2 } from 'lucide-svelte';
	import Table from '$ui/table/Table.svelte';
	import TableActionButton from '$ui/table/TableActionButton.svelte';
	import Badge from '$ui/badge/Badge.svelte';
	import type { Column } from '$ui/table/types';
	import type { ArrInstance } from '$db/queries/arrInstances.ts';
	import radarrLogo from '$lib/client/assets/Radarr.svg';
	import sonarrLogo from '$lib/client/assets/Sonarr.svg';
	import { createEventDispatcher } from 'svelte';

	export let instances: ArrInstance[];

	const dispatch = createEventDispatcher<{
		delete: ArrInstance;
	}>();

	// Logo lookup by type
	const logos: Record<string, string> = {
		radarr: radarrLogo,
		sonarr: sonarrLogo
	};

	// Track loaded images
	let loadedImages: Set<number> = new Set();

	// Get logo path based on arr type
	function getLogoPath(type: string): string {
		return logos[type] || '';
	}

	function handleImageLoad(id: number) {
		loadedImages.add(id);
		loadedImages = loadedImages;
	}

	// Format type for display with proper casing
	function formatType(type: string): string {
		return type.charAt(0).toUpperCase() + type.slice(1);
	}

	// Handle row click
	function handleRowClick(instance: ArrInstance) {
		goto(`/arr/${instance.id}`);
	}

	// Handle delete click
	function handleDeleteClick(e: Event, instance: ArrInstance) {
		e.stopPropagation();
		dispatch('delete', instance);
	}

	// Define table columns
	const columns: Column<ArrInstance>[] = [
		{ key: 'name', header: 'Name', align: 'left' },
		{ key: 'url', header: 'URL', align: 'left' },
		{ key: 'enabled', header: 'Enabled', align: 'center', width: 'w-24' }
	];
</script>

<Table {columns} data={instances} hoverable={true} onRowClick={handleRowClick}>
	<svelte:fragment slot="cell" let:row let:column>
		{#if column.key === 'name'}
			<div class="flex items-center gap-3">
				<div class="relative h-8 w-8">
					{#if !loadedImages.has(row.id)}
						<div
							class="absolute inset-0 animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-700"
						></div>
					{/if}
					<img
						src={getLogoPath(row.type)}
						alt="{formatType(row.type)} logo"
						class="h-8 w-8 rounded-lg {loadedImages.has(row.id) ? 'opacity-100' : 'opacity-0'}"
						on:load={() => handleImageLoad(row.id)}
					/>
				</div>
				<div class="flex items-center gap-2">
					<div class="font-medium text-neutral-900 dark:text-neutral-50">
						{row.name}
					</div>
				</div>
			</div>
		{:else if column.key === 'url'}
			<Badge variant="neutral" mono>{row.url}</Badge>
		{:else if column.key === 'enabled'}
			<div class="flex justify-center">
				{#if row.enabled}
					<Badge variant="success">Enabled</Badge>
				{:else}
					<Badge variant="neutral">Disabled</Badge>
				{/if}
			</div>
		{/if}
	</svelte:fragment>

	<svelte:fragment slot="actions" let:row>
		<div class="flex items-center justify-end gap-1">
			<a
				href={row.url}
				target="_blank"
				rel="noopener noreferrer"
				on:click={(e) => e.stopPropagation()}
			>
				<TableActionButton icon={ExternalLink} title="Open in {formatType(row.type)}" />
			</a>
			<TableActionButton
				icon={Trash2}
				title="Delete instance"
				variant="danger"
				on:click={(e) => handleDeleteClick(e, row)}
			/>
		</div>
	</svelte:fragment>
</Table>
