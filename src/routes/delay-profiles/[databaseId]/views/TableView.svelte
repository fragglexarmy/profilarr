<script lang="ts">
	import Table from '$ui/table/Table.svelte';
	import type { Column } from '$ui/table/types';
	import type { DelayProfileTableRow } from '$pcd/queries/delayProfiles';
	import { Tag, Clock, Zap, Shield, Calendar } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { parseUTC } from '$shared/dates';

	export let profiles: DelayProfileTableRow[];

	function formatDate(dateString: string): string {
		const date = parseUTC(dateString);
		if (!date) return '-';
		return date.toLocaleString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function handleRowClick(row: DelayProfileTableRow) {
		const databaseId = $page.params.databaseId;
		goto(`/delay-profiles/${databaseId}/${row.id}`);
	}

	function formatProtocol(protocol: string): string {
		switch (protocol) {
			case 'prefer_usenet':
				return 'Prefer Usenet';
			case 'prefer_torrent':
				return 'Prefer Torrent';
			case 'only_usenet':
				return 'Only Usenet';
			case 'only_torrent':
				return 'Only Torrent';
			default:
				return protocol;
		}
	}

	function formatDelay(minutes: number | null): string {
		if (minutes === null) return '-';
		if (minutes === 0) return 'No delay';
		if (minutes < 60) return `${minutes}m`;
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
	}

	const columns: Column<DelayProfileTableRow>[] = [
		{
			key: 'name',
			header: 'Name',
			headerIcon: Tag,
			align: 'left',
			sortable: true,
			cell: (row: DelayProfileTableRow) => ({
				html: `<div class="font-medium">${row.name}</div>`
			})
		},
		{
			key: 'preferred_protocol',
			header: 'Protocol',
			headerIcon: Zap,
			align: 'left',
			width: 'w-44',
			cell: (row: DelayProfileTableRow) => ({
				html: `<span class="font-mono text-xs bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded">${formatProtocol(row.preferred_protocol)}</span>`
			})
		},
		{
			key: 'delays',
			header: 'Delays',
			headerIcon: Clock,
			align: 'left',
			width: 'w-48',
			cell: (row: DelayProfileTableRow) => ({
				html: `
					<div class="text-xs space-y-0.5">
						${row.usenet_delay !== null ? `<div>Usenet: <span class="font-mono text-[10px] bg-neutral-100 dark:bg-neutral-800 px-1 rounded">${formatDelay(row.usenet_delay)}</span></div>` : ''}
						${row.torrent_delay !== null ? `<div>Torrent: <span class="font-mono text-[10px] bg-neutral-100 dark:bg-neutral-800 px-1 rounded">${formatDelay(row.torrent_delay)}</span></div>` : ''}
					</div>
				`
			})
		},
		{
			key: 'bypass',
			header: 'Bypass',
			headerIcon: Shield,
			align: 'left',
			width: 'w-56',
			cell: (row: DelayProfileTableRow) => {
				const bypasses: string[] = [];
				if (row.bypass_if_highest_quality) {
					bypasses.push('Highest Quality');
				}
				if (row.bypass_if_above_custom_format_score && row.minimum_custom_format_score !== null) {
					bypasses.push(`CF Score ≥ ${row.minimum_custom_format_score}`);
				}

				if (bypasses.length === 0) {
					return { html: '<span class="text-neutral-400">None</span>' };
				}

				return {
					html: `
						<div class="text-xs space-y-0.5">
							${bypasses.map((b) => `<div class="font-mono text-[10px] bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-1.5 py-0.5 rounded inline-block">${b}</div>`).join('')}
						</div>
					`
				};
			}
		},
		{
			key: 'updated_at',
			header: 'Updated',
			headerIcon: Calendar,
			align: 'left',
			width: 'w-44',
			sortable: true,
			cell: (row: DelayProfileTableRow) => ({
				html: `<span class="text-xs text-neutral-500 dark:text-neutral-400">${formatDate(row.updated_at)}</span>`
			})
		},
		{
			key: 'created_at',
			header: 'Created',
			headerIcon: Calendar,
			align: 'left',
			width: 'w-44',
			sortable: true,
			cell: (row: DelayProfileTableRow) => ({
				html: `<span class="text-xs text-neutral-500 dark:text-neutral-400">${formatDate(row.created_at)}</span>`
			})
		}
	];
</script>

<Table
	data={profiles}
	{columns}
	emptyMessage="No delay profiles found"
	hoverable={true}
	compact={false}
	onRowClick={handleRowClick}
/>
