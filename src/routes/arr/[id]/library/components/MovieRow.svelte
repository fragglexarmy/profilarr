<script lang="ts">
	import { Check, ExternalLink, CircleAlert } from 'lucide-svelte';
	import Score from '$ui/arr/Score.svelte';
	import CustomFormatBadge from '$ui/arr/CustomFormatBadge.svelte';
	import type { RadarrLibraryItem } from '$utils/arr/types.ts';
	import type { Column } from '$ui/table/types';

	export let row: RadarrLibraryItem;
	export let column: Column<RadarrLibraryItem>;
	export let baseUrl: string;
	export let mode: 'cell' | 'expanded' = 'cell';

	function getProgressColor(progress: number, cutoffMet: boolean): string {
		if (cutoffMet) return 'bg-green-500 dark:bg-green-400';
		if (progress >= 0.75) return 'bg-yellow-500 dark:bg-yellow-400';
		if (progress >= 0.5) return 'bg-orange-500 dark:bg-orange-400';
		return 'bg-red-500 dark:bg-red-400';
	}

	function formatDate(isoString?: string): string {
		if (!isoString) return '-';
		const date = new Date(isoString);
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
	}
</script>

{#if mode === 'cell'}
	{#if column.key === 'title'}
		<div>
			<div class="font-medium text-neutral-900 dark:text-neutral-50">{row.title}</div>
			{#if row.year}
				<div class="text-xs text-neutral-500 dark:text-neutral-400">{row.year}</div>
			{/if}
		</div>
	{:else if column.key === 'qualityProfileName'}
		<div class="relative group inline-flex">
			<span
				class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium {row.isProfilarrProfile ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'}"
			>
				{#if !row.isProfilarrProfile}
					<CircleAlert size={12} />
				{/if}
				{row.qualityProfileName}
			</span>
			{#if !row.isProfilarrProfile}
				<div class="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 px-2 py-1 text-xs text-white bg-neutral-800 dark:bg-neutral-700 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10">
					Not managed by Profilarr
				</div>
			{/if}
		</div>
	{:else if column.key === 'qualityName'}
		<code class="rounded bg-neutral-100 px-2 py-1 font-mono text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
			{row.qualityName ?? 'N/A'}
		</code>
	{:else if column.key === 'customFormatScore'}
		<div class="text-right">
			<Score score={row.customFormatScore} showSign={false} colored={false} />
			<span class="text-xs text-neutral-500 dark:text-neutral-400">
				/ {row.cutoffScore.toLocaleString()}
			</span>
		</div>
	{:else if column.key === 'progress'}
		<div class="flex items-center gap-2">
			<div class="flex-1 h-2 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
				<div
					class="h-full rounded-full transition-all {getProgressColor(row.progress, row.cutoffMet)}"
					style="width: {Math.min(row.progress * 100, 100)}%"
				></div>
			</div>
			{#if row.cutoffMet}
				<Check size={16} class="text-green-600 dark:text-green-400 flex-shrink-0" />
			{:else}
				<span class="text-xs font-mono text-neutral-500 dark:text-neutral-400 w-10 text-right">
					{Math.round(row.progress * 100)}%
				</span>
			{/if}
		</div>
	{:else if column.key === 'popularity'}
		<span class="font-mono text-sm text-neutral-600 dark:text-neutral-400">
			{row.popularity?.toFixed(1) ?? '-'}
		</span>
	{:else if column.key === 'dateAdded'}
		<span class="text-sm text-neutral-600 dark:text-neutral-400">
			{formatDate(row.dateAdded)}
		</span>
	{:else if column.key === 'actions'}
		<div class="flex items-center justify-center">
			{#if row.tmdbId}
				<a
					href="{baseUrl}/movie/{row.tmdbId}"
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex h-7 w-7 items-center justify-center rounded border border-neutral-300 bg-white text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
					title="Open in Radarr"
					on:click|stopPropagation
				>
					<ExternalLink size={14} />
				</a>
			{/if}
		</div>
	{/if}
{:else}
	<!-- Expanded content -->
	<div class="flex flex-col gap-3">
		<!-- File Name -->
		{#if row.fileName}
			<code class="text-xs font-mono text-neutral-600 dark:text-neutral-400 break-all">{row.fileName}</code>
		{/if}

		<!-- Custom Formats with Scores (sorted by score descending) -->
		{#if row.scoreBreakdown.length > 0}
			<div class="flex flex-wrap items-center gap-2">
				{#each [...row.scoreBreakdown].sort((a, b) => b.score - a.score) as item}
					<CustomFormatBadge name={item.name} score={item.score} />
				{/each}
			</div>
		{:else}
			<div class="text-xs text-neutral-500 dark:text-neutral-400">No custom formats matched</div>
		{/if}
	</div>
{/if}
