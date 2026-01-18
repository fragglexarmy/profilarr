<script lang="ts">
	import type { CustomFormatTableRow } from '$pcd/queries/customFormats';
	import { Layers, FlaskConical } from 'lucide-svelte';
	import { marked } from 'marked';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	export let formats: CustomFormatTableRow[];

	function handleCardClick(format: CustomFormatTableRow) {
		const databaseId = $page.params.databaseId;
		goto(`/custom-formats/${databaseId}/${format.id}`);
	}

	// Configure marked for inline parsing (no wrapping <p> tags for short text)
	function parseMarkdown(text: string | null): string {
		if (!text) return '';
		return marked.parseInline(text) as string;
	}
</script>

<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
	{#each formats as format}
		<button
			type="button"
			on:click={() => handleCardClick(format)}
			class="group relative flex cursor-pointer flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4 text-left transition-all hover:border-neutral-300 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
		>
			<!-- Header with name and condition count -->
			<div>
				<div class="flex items-start justify-between gap-2">
					<h3 class="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
						{format.name}
					</h3>
					<div class="flex flex-shrink-0 items-center gap-1.5">
						<div
							class="flex items-center gap-1 rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
							title="{format.conditions.length} condition{format.conditions.length !== 1
								? 's'
								: ''}"
						>
							<Layers size={12} />
							<span>{format.conditions.length}</span>
						</div>
						{#if format.testCount > 0}
							<div
								class="flex items-center gap-1 rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
								title="{format.testCount} test{format.testCount !== 1 ? 's' : ''}"
							>
								<FlaskConical size={12} />
								<span>{format.testCount}</span>
							</div>
						{/if}
					</div>
				</div>
				{#if format.tags.length > 0}
					<div class="mt-2 flex flex-wrap gap-1">
						{#each format.tags as tag}
							<span
								class="inline-flex items-center rounded bg-accent-100 px-1.5 py-0.5 font-mono text-[10px] text-accent-800 dark:bg-accent-900 dark:text-accent-200"
							>
								{tag.name}
							</span>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Description -->
			{#if format.description}
				<div class="prose-inline line-clamp-2 text-xs text-neutral-600 dark:text-neutral-400">
					{@html parseMarkdown(format.description)}
				</div>
			{:else}
				<div class="text-xs text-neutral-400 italic dark:text-neutral-500">No description</div>
			{/if}
		</button>
	{/each}
</div>

<style>
	/* Inline prose styles for markdown content */
	:global(.prose-inline code) {
		background-color: rgb(229 231 235);
		padding: 0.125rem 0.25rem;
		border-radius: 0.25rem;
		font-size: 0.75rem;
		font-family: ui-monospace, monospace;
	}

	:global(.dark .prose-inline code) {
		background-color: rgb(38 38 38);
	}

	:global(.prose-inline strong) {
		font-weight: 600;
	}

	:global(.prose-inline a) {
		color: rgb(var(--color-accent-600));
		text-decoration: underline;
	}

	:global(.dark .prose-inline a) {
		color: rgb(var(--color-accent-400));
	}
</style>
