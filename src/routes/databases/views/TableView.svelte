<script lang="ts">
	import { goto } from '$app/navigation';
	import { ExternalLink, Unlink, Lock, Code } from 'lucide-svelte';
	import Table from '$ui/table/Table.svelte';
	import TableActionButton from '$ui/table/TableActionButton.svelte';
	import Badge from '$ui/badge/Badge.svelte';
	import type { Column } from '$ui/table/types';
	import type { DatabaseInstance } from '$db/queries/databaseInstances.ts';
	import { parseUTC } from '$shared/utils/dates';
	import { createEventDispatcher } from 'svelte';
	import DatabaseAvatar from '../components/DatabaseAvatar.svelte';

	export let databases: DatabaseInstance[];

	const dispatch = createEventDispatcher<{
		unlink: DatabaseInstance;
	}>();

	// Avatar handled by DatabaseAvatar component

	// Format sync strategy for display
	function formatSyncStrategy(minutes: number): string {
		if (minutes === 0) return 'Manual';
		if (minutes < 60) return `Every ${minutes} min`;
		if (minutes === 60) return 'Hourly';
		if (minutes < 1440) return `Every ${minutes / 60}h`;
		return `Every ${minutes / 1440}d`;
	}

	// Format last synced date
	function formatLastSynced(date: string | null): string {
		const d = parseUTC(date);
		if (!d) return 'Never';
		return d.toLocaleString(undefined, {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	// Handle row click - navigate to database details
	function handleRowClick(database: DatabaseInstance) {
		goto(`/databases/${database.id}`);
	}

	// Handle unlink click
	function handleUnlinkClick(e: Event, database: DatabaseInstance) {
		e.stopPropagation();
		dispatch('unlink', database);
	}

	// Define table columns
	const columns: Column<DatabaseInstance>[] = [
		{ key: 'name', header: 'Name', align: 'left' },
		{ key: 'repository_url', header: 'Repository', align: 'left' },
		{ key: 'sync_strategy', header: 'Sync', align: 'left', width: 'w-32' },
		{ key: 'last_synced_at', header: 'Last Synced', align: 'left', width: 'w-40' }
	];
</script>

<Table {columns} data={databases} hoverable={true}>
	<svelte:fragment slot="cell" let:row let:column>
		<div
			on:click={() => handleRowClick(row)}
			role="button"
			tabindex="0"
			on:keydown={(e) => e.key === 'Enter' && handleRowClick(row)}
			class="cursor-pointer"
		>
			{#if column.key === 'name'}
				<div class="flex items-center gap-3">
					<DatabaseAvatar name={row.name} repoUrl={row.repository_url} size="sm" />
					<div class="flex items-center gap-2">
						<div class="font-medium text-neutral-900 dark:text-neutral-50">
							{row.name}
						</div>
						{#if row.is_private}
							<Badge variant="neutral" icon={Lock} mono>Private</Badge>
						{/if}
						{#if row.personal_access_token}
							<Badge variant="info" icon={Code} mono>Dev</Badge>
						{/if}
					</div>
				</div>
			{:else if column.key === 'repository_url'}
				<Badge variant="neutral" mono>{row.repository_url.replace('https://github.com/', '')}</Badge
				>
			{:else if column.key === 'sync_strategy'}
				<Badge variant="neutral" mono>{formatSyncStrategy(row.sync_strategy)}</Badge>
			{:else if column.key === 'last_synced_at'}
				<Badge variant="neutral" mono>{formatLastSynced(row.last_synced_at)}</Badge>
			{/if}
		</div>
	</svelte:fragment>

	<svelte:fragment slot="actions" let:row>
		<div class="flex items-center justify-end gap-1">
			<a
				href={row.repository_url}
				target="_blank"
				rel="noopener noreferrer"
				on:click={(e) => e.stopPropagation()}
			>
				<TableActionButton icon={ExternalLink} title="View on GitHub" />
			</a>
			<TableActionButton
				icon={Unlink}
				title="Unlink database"
				variant="danger"
				on:click={(e) => handleUnlinkClick(e, row)}
			/>
		</div>
	</svelte:fragment>
</Table>
