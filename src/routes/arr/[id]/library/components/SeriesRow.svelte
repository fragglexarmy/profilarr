<script lang="ts">
	import { CircleAlert } from 'lucide-svelte';
	import Badge from '$ui/badge/Badge.svelte';
	import Tooltip from '$ui/tooltip/Tooltip.svelte';
	import type { SonarrLibraryItem } from '$utils/arr/types.ts';
	import type { Column } from '$ui/table/types';

	export let row: SonarrLibraryItem;
	export let column: Column<SonarrLibraryItem>;

	function formatSize(bytes: number): string {
		if (!bytes) return '-';
		const gb = bytes / (1024 * 1024 * 1024);
		if (gb >= 1) return `${gb.toFixed(1)} GB`;
		const mb = bytes / (1024 * 1024);
		return `${mb.toFixed(0)} MB`;
	}

	function formatDate(isoString?: string): string {
		if (!isoString) return '-';
		const date = new Date(isoString);
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
	}
</script>

{#if column.key === 'title'}
	<div>
		<div class="font-medium text-neutral-900 dark:text-neutral-50">{row.title}</div>
		{#if row.year}
			<div class="text-xs text-neutral-500 dark:text-neutral-400">{row.year}</div>
		{/if}
	</div>
{:else if column.key === 'qualityProfileName'}
	<Tooltip text={row.isProfilarrProfile ? '' : 'Not managed by Profilarr'} position="top">
		<Badge
			variant={row.isProfilarrProfile ? 'accent' : 'warning'}
			icon={row.isProfilarrProfile ? null : CircleAlert}
			mono
		>
			{row.qualityProfileName}
		</Badge>
	</Tooltip>
{:else if column.key === 'episodes'}
	<Badge variant={row.episodeFileCount === row.episodeCount ? 'success' : 'neutral'} mono>
		{row.episodeFileCount}/{row.episodeCount}
	</Badge>
{:else if column.key === 'sizeOnDisk'}
	<Badge variant="neutral" mono>{formatSize(row.sizeOnDisk)}</Badge>
{:else if column.key === 'dateAdded'}
	<Badge variant="neutral" mono>{formatDate(row.dateAdded)}</Badge>
{/if}
