<script lang="ts">
	import Table from '$ui/table/Table.svelte';
	import Badge from '$ui/badge/Badge.svelte';
	import type { Column } from '$ui/table/types';
	import { goto } from '$app/navigation';
	import { Tag, ToggleRight } from 'lucide-svelte';
	import type { NamingListItem } from '$shared/pcd/display.ts';
	import radarrLogo from '$lib/client/assets/Radarr.svg';
	import sonarrLogo from '$lib/client/assets/Sonarr.svg';

	export let configs: NamingListItem[];
	export let databaseId: number;

	const logos: Record<string, string> = {
		radarr: radarrLogo,
		sonarr: sonarrLogo
	};

	function handleRowClick(config: NamingListItem) {
		goto(`/media-management/${databaseId}/naming/${config.arr_type}/${encodeURIComponent(config.name)}`);
	}

	const columns: Column<NamingListItem>[] = [
		{
			key: 'name',
			header: 'Name',
			headerIcon: Tag,
			align: 'left',
			sortable: true
		},
		{
			key: 'arr_type',
			header: 'Type',
			sortable: true
		},
		{
			key: 'rename',
			header: 'Rename',
			headerIcon: ToggleRight
		}
	];
</script>

<Table {columns} data={configs} onRowClick={handleRowClick} hoverable={true}>
	<svelte:fragment slot="cell" let:row let:column>
		{#if column.key === 'name'}
			<span class="font-medium">{row.name}</span>
		{:else if column.key === 'arr_type'}
			<div class="flex items-center gap-2">
				<img
					src={logos[row.arr_type]}
					alt={row.arr_type}
					class="h-5 w-5"
				/>
			</div>
		{:else if column.key === 'rename'}
			{#if row.rename}
				<Badge variant="success">Enabled</Badge>
			{:else}
				<Badge variant="neutral">Disabled</Badge>
			{/if}
		{/if}
	</svelte:fragment>
</Table>
