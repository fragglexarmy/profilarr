<script lang="ts">
	import type { QualityProfileTableRow } from '$shared/pcd/display.ts';
	import { page } from '$app/stores';
	import { BookOpenText, Gauge, Earth } from 'lucide-svelte';

	export let profiles: QualityProfileTableRow[];

	$: databaseId = $page.params.databaseId;
</script>

<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
	{#each profiles as profile}
		<a
			href="/quality-profiles/{databaseId}/{profile.id}/general"
			class="group relative flex cursor-pointer flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4 text-left transition-all hover:border-neutral-300 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
		>
			<!-- Header with name and tags -->
			<div>
				<h3 class="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{profile.name}</h3>
				{#if profile.tags.length > 0}
					<div class="mt-2 flex flex-wrap gap-1">
						{#each profile.tags as tag}
							<span
								class="inline-flex items-center rounded bg-accent-100 px-1.5 py-0.5 font-mono text-[10px] text-accent-800 dark:bg-accent-900 dark:text-accent-200"
							>
								{tag.name}
							</span>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Description if exists -->
			{#if profile.description}
				<div class="description text-xs text-neutral-600 dark:text-neutral-400">
					{@html profile.description}
				</div>
			{/if}

			<!-- Qualities preview -->
			<div class="flex flex-wrap items-center gap-1">
				{#each profile.qualities.slice(0, 3) as quality, idx}
					{#if idx > 0}
						<span class="text-xs text-neutral-400">›</span>
					{/if}
					<span
						class="inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] text-neutral-900 dark:text-neutral-100
						{quality.is_upgrade_until
							? 'border-accent-200 bg-accent-50 dark:border-accent-800 dark:bg-accent-950'
							: 'border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800'}"
					>
						{quality.name}
					</span>
				{/each}
				{#if profile.qualities.length > 3}
					<span class="text-[10px] text-neutral-500 dark:text-neutral-400">
						+{profile.qualities.length - 3} more
					</span>
				{/if}
			</div>

			<!-- Stats row -->
			<div
				class="flex items-center gap-3 border-t border-neutral-100 pt-3 text-xs dark:border-neutral-800"
			>
				<!-- Custom Formats -->
				<div class="flex items-center gap-1">
					<BookOpenText size={12} class="text-neutral-400" />
					<span
						class="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px] text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
					>
						{profile.custom_formats.total}
					</span>
				</div>

				<!-- Scores -->
				<div class="flex items-center gap-1">
					<Gauge size={12} class="text-neutral-400" />
					<span
						class="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px] text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
					>
						{profile.minimum_custom_format_score}
					</span>
				</div>

				<!-- Language -->
				{#if profile.language}
					<div class="flex items-center gap-1">
						<Earth size={12} class="text-neutral-400" />
						<span
							class="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px] text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
						>
							{profile.language.name}
						</span>
					</div>
				{/if}
			</div>
		</a>
	{/each}
</div>

<style>
	.description :global(ul) {
		list-style-type: disc;
		padding-left: 1.5rem;
		margin: 0.5rem 0;
	}

	.description :global(ol) {
		list-style-type: decimal;
		padding-left: 1.5rem;
		margin: 0.5rem 0;
	}

	.description :global(li) {
		margin: 0.25rem 0;
	}

	.description :global(p) {
		margin: 0.5rem 0;
	}

	.description :global(strong) {
		font-weight: 600;
	}
</style>
