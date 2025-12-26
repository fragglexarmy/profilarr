<script lang="ts">
	import InfoModal from '$ui/modal/InfoModal.svelte';
	import { filterFields } from '$lib/shared/filters';

	export let open: boolean = false;

	// Group fields by type for better organization
	const booleanFields = filterFields.filter((f) => f.valueType === 'boolean');
	const selectFields = filterFields.filter((f) => f.valueType === 'select');
	const textFields = filterFields.filter((f) => f.valueType === 'text');
	const numberFields = filterFields.filter((f) => f.valueType === 'number');
	const dateFields = filterFields.filter((f) => f.valueType === 'date');
</script>

<InfoModal bind:open header="Available Filters">
	<div class="space-y-5 text-sm text-neutral-600 dark:text-neutral-400">
		<p>
			Use these fields to build filter rules. Combine multiple rules with AND/OR logic to create
			complex filters.
		</p>

		{#if booleanFields.length > 0}
			<div>
				<div class="mb-2 font-medium text-neutral-900 dark:text-neutral-100">Yes/No Fields</div>
				<div class="space-y-1.5">
					{#each booleanFields as field}
						<div class="flex items-start gap-2">
							<span class="font-medium text-neutral-700 dark:text-neutral-300">{field.label}:</span>
							<span>
								{#if field.id === 'monitored'}
									Whether the item is being monitored for upgrades
								{:else if field.id === 'cutoff_met'}
									Whether the item's score meets the filter's cutoff percentage
								{/if}
							</span>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		{#if selectFields.length > 0}
			<div>
				<div class="mb-2 font-medium text-neutral-900 dark:text-neutral-100">Selection Fields</div>
				<div class="space-y-1.5">
					{#each selectFields as field}
						<div class="flex items-start gap-2">
							<span class="font-medium text-neutral-700 dark:text-neutral-300">{field.label}:</span>
							<span>
								{#if field.id === 'minimum_availability'}
									The minimum availability status ({field.values?.map((v) => v.label).join(', ')})
								{/if}
							</span>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		{#if textFields.length > 0}
			<div>
				<div class="mb-2 font-medium text-neutral-900 dark:text-neutral-100">Text Fields</div>
				<p class="mb-2 text-xs">All text comparisons are case-insensitive.</p>
				<div class="space-y-1.5">
					{#each textFields as field}
						<div class="flex items-start gap-2">
							<span class="font-medium text-neutral-700 dark:text-neutral-300">{field.label}:</span>
							<span>
								{#if field.id === 'title'}
									The title of the movie
								{:else if field.id === 'quality_profile'}
									The assigned quality profile name
								{:else if field.id === 'collection'}
									The collection the movie belongs to (e.g., "Marvel Cinematic Universe")
								{:else if field.id === 'studio'}
									The production studio
								{:else if field.id === 'original_language'}
									The original language of the movie
								{:else if field.id === 'genres'}
									Movie genres (Action, Comedy, Drama, etc.)
								{:else if field.id === 'keywords'}
									TMDb keywords associated with the movie
								{:else if field.id === 'release_group'}
									The release group of the current file
								{/if}
							</span>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		{#if numberFields.length > 0}
			<div>
				<div class="mb-2 font-medium text-neutral-900 dark:text-neutral-100">Number Fields</div>
				<div class="space-y-1.5">
					{#each numberFields as field}
						<div class="flex items-start gap-2">
							<span class="font-medium text-neutral-700 dark:text-neutral-300">{field.label}:</span>
							<span>
								{#if field.id === 'year'}
									The release year
								{:else if field.id === 'popularity'}
									TMDb popularity score
								{:else if field.id === 'runtime'}
									Movie runtime in minutes
								{:else if field.id === 'size_on_disk'}
									Current file size in GB
								{:else if field.id === 'tmdb_rating'}
									TMDb rating (0-10)
								{:else if field.id === 'imdb_rating'}
									IMDb rating (0-10)
								{:else if field.id === 'tomato_rating'}
									Rotten Tomatoes score (0-100)
								{:else if field.id === 'trakt_rating'}
									Trakt rating (0-100)
								{/if}
							</span>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		{#if dateFields.length > 0}
			<div>
				<div class="mb-2 font-medium text-neutral-900 dark:text-neutral-100">Date Fields</div>
				<div class="space-y-1.5">
					{#each dateFields as field}
						<div class="flex items-start gap-2">
							<span class="font-medium text-neutral-700 dark:text-neutral-300">{field.label}:</span>
							<span>
								{#if field.id === 'date_added'}
									When the movie was added to your library
								{/if}
							</span>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<div>
			<div class="mb-2 font-medium text-neutral-900 dark:text-neutral-100">Filter Settings</div>
			<div class="space-y-1.5">
				<div class="flex items-start gap-2">
					<span class="font-medium text-neutral-700 dark:text-neutral-300">Cutoff %:</span>
					<span>Score threshold (0-100%) for the "Cutoff Met" filter</span>
				</div>
				<div class="flex items-start gap-2">
					<span class="font-medium text-neutral-700 dark:text-neutral-300">Cooldown:</span>
					<span>Skip items that were searched within this many hours</span>
				</div>
				<div class="flex items-start gap-2">
					<span class="font-medium text-neutral-700 dark:text-neutral-300">Method:</span>
					<span>How to select items from the filtered results</span>
				</div>
				<div class="flex items-start gap-2">
					<span class="font-medium text-neutral-700 dark:text-neutral-300">Count:</span>
					<span>Number of items to search per run</span>
				</div>
			</div>
		</div>
	</div>
</InfoModal>
