<script lang="ts">
	import type { RegularExpressionWithTags } from '$shared/pcd/display';
	import { ExternalLink } from 'lucide-svelte';
	import { marked } from 'marked';
	import { page } from '$app/stores';

	export let expressions: RegularExpressionWithTags[];

	$: databaseId = $page.params.databaseId;

	// Configure marked for inline parsing (no wrapping <p> tags for short text)
	function parseMarkdown(text: string | null): string {
		if (!text) return '';
		return marked.parseInline(text) as string;
	}
</script>

<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
	{#each expressions as expression}
		<a
			href="/regular-expressions/{databaseId}/{expression.id}"
			class="group relative flex cursor-pointer flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4 text-left transition-all hover:border-neutral-300 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
		>
			<!-- Header with name and tags -->
			<div>
				<div class="flex items-start justify-between gap-2">
					<h3 class="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
						{expression.name}
					</h3>
					{#if expression.regex101_id}
						<button
							type="button"
							class="relative z-10 flex-shrink-0 text-accent-600 hover:text-accent-700 dark:text-accent-400 dark:hover:text-accent-300"
							title="View on regex101"
							on:click|preventDefault|stopPropagation={() => window.open(`https://regex101.com/r/${expression.regex101_id}`, '_blank')}
						>
							<ExternalLink size={14} />
						</button>
					{/if}
				</div>
				{#if expression.tags.length > 0}
					<div class="mt-2 flex flex-wrap gap-1">
						{#each expression.tags as tag}
							<span
								class="inline-flex items-center rounded bg-accent-100 px-1.5 py-0.5 font-mono text-[10px] text-accent-800 dark:bg-accent-900 dark:text-accent-200"
							>
								{tag.name}
							</span>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Pattern -->
			<div class="rounded bg-neutral-100 p-2 dark:bg-neutral-800">
				<code
					class="block whitespace-pre-wrap break-all font-mono text-xs text-neutral-900 dark:text-neutral-100"
				>
					{expression.pattern}
				</code>
			</div>

			<!-- Description -->
			{#if expression.description}
				<div class="prose-inline text-xs text-neutral-600 dark:text-neutral-400">
					{@html parseMarkdown(expression.description)}
				</div>
			{/if}
		</a>
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
