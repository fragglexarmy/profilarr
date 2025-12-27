<script lang="ts">
	import type { Column } from '$ui/table/types';
	import type { RadarrLibraryItem } from '$utils/arr/types.ts';

	export let column: Column<RadarrLibraryItem>;

	// Randomize widths slightly for organic feel
	const widths = ['w-24', 'w-32', 'w-40', 'w-28', 'w-36'];
	const randomWidth = () => widths[Math.floor(Math.random() * widths.length)];
</script>

{#if column.key === 'title'}
	<div class="space-y-1.5">
		<div class="h-4 {randomWidth()} rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse"></div>
		<div class="h-3 w-12 rounded bg-neutral-100 dark:bg-neutral-800 animate-pulse"></div>
	</div>
{:else if column.key === 'qualityProfileName'}
	<div class="h-5 w-20 rounded-full bg-neutral-200 dark:bg-neutral-700 animate-pulse"></div>
{:else if column.key === 'qualityName'}
	<div class="h-6 w-16 rounded bg-neutral-100 dark:bg-neutral-800 animate-pulse"></div>
{:else if column.key === 'customFormatScore'}
	<div class="flex justify-end gap-1">
		<div class="h-4 w-10 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse"></div>
		<div class="h-4 w-12 rounded bg-neutral-100 dark:bg-neutral-800 animate-pulse"></div>
	</div>
{:else if column.key === 'progress'}
	<div class="flex items-center gap-2">
		<div class="flex-1 h-2 rounded-full bg-neutral-200 dark:bg-neutral-700 animate-pulse"></div>
		<div class="h-4 w-8 rounded bg-neutral-100 dark:bg-neutral-800 animate-pulse"></div>
	</div>
{:else if column.key === 'popularity'}
	<div class="h-4 w-8 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse"></div>
{:else if column.key === 'dateAdded'}
	<div class="h-4 w-16 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse"></div>
{:else if column.key === 'actions'}
	<div class="flex justify-center">
		<div class="h-7 w-7 rounded border border-neutral-200 dark:border-neutral-700 animate-pulse"></div>
	</div>
{/if}
