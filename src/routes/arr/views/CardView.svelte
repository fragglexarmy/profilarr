<script lang="ts">
	import { goto } from '$app/navigation';
	import { ExternalLink, Trash2 } from 'lucide-svelte';
	import Badge from '$ui/badge/Badge.svelte';
	import type { ArrInstance } from '$db/queries/arrInstances.ts';
	import radarrLogo from '$lib/client/assets/Radarr.svg';
	import sonarrLogo from '$lib/client/assets/Sonarr.svg';
	import { createEventDispatcher } from 'svelte';

	export let instances: ArrInstance[];

	const dispatch = createEventDispatcher<{
		delete: ArrInstance;
	}>();

	// Logo lookup by type
	const logos: Record<string, string> = {
		radarr: radarrLogo,
		sonarr: sonarrLogo
	};

	// Track loaded images
	let loadedImages: Set<number> = new Set();

	// Get logo path based on arr type
	function getLogoPath(type: string): string {
		return logos[type] || '';
	}

	function handleImageLoad(id: number) {
		loadedImages.add(id);
		loadedImages = loadedImages;
	}

	// Handle card click
	function handleCardClick(instance: ArrInstance) {
		goto(`/arr/${instance.id}`);
	}

	// Handle delete click
	function handleDeleteClick(e: MouseEvent, instance: ArrInstance) {
		e.stopPropagation();
		dispatch('delete', instance);
	}
</script>

<div class="grid grid-cols-1 gap-3">
	{#each instances as instance}
		<div
			on:click={() => handleCardClick(instance)}
			on:keydown={(e) => e.key === 'Enter' && handleCardClick(instance)}
			role="button"
			tabindex="0"
			class="group flex cursor-pointer items-center gap-4 rounded-lg border border-neutral-200 bg-white p-3 text-left transition-all hover:border-neutral-300 hover:shadow-md active:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700 dark:active:bg-neutral-800"
		>
			<!-- Left: Logo + Name -->
			<div class="flex min-w-0 flex-1 items-center gap-3">
				<div class="relative h-10 w-10 flex-shrink-0">
					{#if !loadedImages.has(instance.id)}
						<div
							class="absolute inset-0 animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-700"
						></div>
					{/if}
					<img
						src={getLogoPath(instance.type)}
						alt="{instance.type} logo"
						class="h-10 w-10 rounded-lg {loadedImages.has(instance.id)
							? 'opacity-100'
							: 'opacity-0'}"
						on:load={() => handleImageLoad(instance.id)}
					/>
				</div>
				<div class="min-w-0">
					<h3 class="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
						{instance.name}
					</h3>
					<div class="mt-1 flex flex-wrap items-center gap-1">
						{#if instance.enabled}
							<Badge variant="success">Enabled</Badge>
						{:else}
							<Badge variant="neutral">Disabled</Badge>
						{/if}
						<Badge variant="neutral" mono>{instance.url}</Badge>
					</div>
				</div>
			</div>

			<!-- Action buttons - always visible, mobile-friendly -->
			<div class="flex flex-shrink-0 flex-col gap-1">
				<a
					href={instance.url}
					target="_blank"
					rel="noopener noreferrer"
					on:click={(e) => e.stopPropagation()}
					class="flex items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 p-2.5 text-neutral-600 transition-colors hover:bg-neutral-100 active:bg-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:active:bg-neutral-600"
				>
					<ExternalLink size={18} />
				</a>
				<button
					on:click={(e) => handleDeleteClick(e, instance)}
					class="flex items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 p-2.5 text-neutral-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 active:border-red-300 active:bg-red-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:border-red-800 dark:hover:bg-red-900/30 dark:hover:text-red-400 dark:active:bg-red-900/50"
				>
					<Trash2 size={18} />
				</button>
			</div>
		</div>
	{/each}
</div>
