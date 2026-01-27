<script lang="ts">
	import Table from '$ui/table/Table.svelte';
	import type { Column } from '$ui/table/types';
	import { goto } from '$app/navigation';
	import { Tag } from 'lucide-svelte';
	import type { QualityDefinitionListItem } from '$shared/pcd/display.ts';
	import radarrLogo from '$lib/client/assets/Radarr.svg';
	import sonarrLogo from '$lib/client/assets/Sonarr.svg';

	export let configs: QualityDefinitionListItem[];
	export let databaseId: number;

	const logos: Record<string, string> = {
		radarr: radarrLogo,
		sonarr: sonarrLogo
	};

	function handleRowClick(config: QualityDefinitionListItem) {
		goto(`/media-management/${databaseId}/quality-definitions/${config.arr_type}/${encodeURIComponent(config.name)}`);
	}

	const columns: Column<QualityDefinitionListItem>[] = [
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
		{/if}
	</svelte:fragment>
</Table>
