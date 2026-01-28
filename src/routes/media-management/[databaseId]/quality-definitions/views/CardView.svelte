<script lang="ts">
	import { goto } from '$app/navigation';
	import Badge from '$ui/badge/Badge.svelte';
	import type { QualityDefinitionListItem } from '$shared/pcd/display.ts';
	import radarrLogo from '$lib/client/assets/Radarr.svg';
	import sonarrLogo from '$lib/client/assets/Sonarr.svg';

	export let configs: QualityDefinitionListItem[];
	export let databaseId: number;

	const logos: Record<string, string> = {
		radarr: radarrLogo,
		sonarr: sonarrLogo
	};

	let loadedImages: Set<string> = new Set();

	function handleImageLoad(name: string) {
		loadedImages.add(name);
		loadedImages = loadedImages;
	}

	function handleCardClick(config: QualityDefinitionListItem) {
		goto(
			`/media-management/${databaseId}/quality-definitions/${config.arr_type}/${encodeURIComponent(config.name)}`
		);
	}
</script>

<div class="grid grid-cols-1 gap-3">
	{#each configs as config}
		<div
			on:click={() => handleCardClick(config)}
			on:keydown={(e) => e.key === 'Enter' && handleCardClick(config)}
			role="button"
			tabindex="0"
			class="group flex cursor-pointer items-center gap-4 rounded-lg border border-neutral-200 bg-white p-3 transition-all hover:border-neutral-300 hover:shadow-md active:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700 dark:active:bg-neutral-800"
		>
			<!-- Left: Logo + Name -->
			<div class="flex min-w-0 flex-1 items-center gap-3">
				<div class="relative h-10 w-10 flex-shrink-0">
					{#if !loadedImages.has(config.name)}
						<div
							class="absolute inset-0 animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-700"
						></div>
					{/if}
					<img
						src={logos[config.arr_type]}
						alt="{config.arr_type} logo"
						class="h-10 w-10 rounded-lg {loadedImages.has(config.name)
							? 'opacity-100'
							: 'opacity-0'}"
						on:load={() => handleImageLoad(config.name)}
					/>
				</div>
				<div class="min-w-0">
					<h3 class="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
						{config.name}
					</h3>
					<div class="mt-1">
						<Badge variant="neutral">{config.quality_count} qualities</Badge>
					</div>
				</div>
			</div>
		</div>
	{/each}
</div>
