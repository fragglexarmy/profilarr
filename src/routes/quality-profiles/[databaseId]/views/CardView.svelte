<script lang="ts">
	import type { QualityProfileTableRow } from '$lib/server/pcd/queries/qualityProfiles';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { BookOpenText, Gauge, Earth } from 'lucide-svelte';

	export let profiles: QualityProfileTableRow[];

	function handleCardClick(profile: QualityProfileTableRow) {
		const databaseId = $page.params.databaseId;
		goto(`/quality-profiles/${databaseId}/${profile.id}/general`);
	}
</script>

<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
	{#each profiles as profile}
		<button
			on:click={() => handleCardClick(profile)}
			class="group relative flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4 text-left transition-all hover:border-neutral-300 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700 cursor-pointer"
		>
			<!-- Header with name and tags -->
			<div>
				<h3 class="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{profile.name}</h3>
				{#if profile.tags.length > 0}
					<div class="mt-2 flex flex-wrap gap-1">
						{#each profile.tags as tag}
							<span class="inline-flex items-center px-1.5 py-0.5 rounded font-mono text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
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
					<span class="inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-mono text-neutral-900 dark:text-neutral-100
						{quality.is_upgrade_until
							? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950'
							: 'border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800'}">
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
			<div class="flex items-center gap-3 border-t border-neutral-100 pt-3 text-xs dark:border-neutral-800">
				<!-- Custom Formats -->
				<div class="flex items-center gap-1">
					<BookOpenText size={12} class="text-neutral-400" />
					<span class="font-mono text-[10px] text-neutral-900 dark:text-neutral-100 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
						{profile.custom_formats.total}
					</span>
				</div>

				<!-- Scores -->
				<div class="flex items-center gap-1">
					<Gauge size={12} class="text-neutral-400" />
					<span class="font-mono text-[10px] text-neutral-900 dark:text-neutral-100 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
						{profile.minimum_custom_format_score}
					</span>
				</div>

				<!-- Language -->
				{#if profile.language}
					<div class="flex items-center gap-1">
						<Earth size={12} class="text-neutral-400" />
						<span class="font-mono text-[10px] text-neutral-900 dark:text-neutral-100 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
							{profile.language.name}
						</span>
					</div>
				{/if}
			</div>
		</button>
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