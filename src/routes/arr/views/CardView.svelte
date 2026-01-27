<script lang="ts">
	import { goto } from '$app/navigation';
	import { ExternalLink, Trash2, Link } from 'lucide-svelte';
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

	// Format type for display with proper casing
	function formatType(type: string): string {
		return type.charAt(0).toUpperCase() + type.slice(1);
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

<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
	{#each instances as instance}
		<div
			on:click={() => handleCardClick(instance)}
			on:keydown={(e) => e.key === 'Enter' && handleCardClick(instance)}
			role="button"
			tabindex="0"
			class="group relative flex cursor-pointer flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4 text-left transition-all hover:border-neutral-300 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
		>
			<!-- Header with logo, name, and status -->
			<div class="flex items-start gap-3">
				<div class="relative h-10 w-10 flex-shrink-0">
					{#if !loadedImages.has(instance.id)}
						<div
							class="absolute inset-0 animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-700"
						></div>
					{/if}
					<img
						src={getLogoPath(instance.type)}
						alt="{formatType(instance.type)} logo"
						class="h-10 w-10 rounded-lg {loadedImages.has(instance.id)
							? 'opacity-100'
							: 'opacity-0'}"
						on:load={() => handleImageLoad(instance.id)}
					/>
				</div>
				<div class="min-w-0 flex-1">
					<h3 class="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
						{instance.name}
					</h3>
					<div class="mt-1">
						{#if instance.enabled}
							<Badge variant="success">Enabled</Badge>
						{:else}
							<Badge variant="neutral">Disabled</Badge>
						{/if}
					</div>
				</div>
			</div>

			<!-- URL -->
			<div class="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
				<Link size={12} class="flex-shrink-0" />
				<span class="truncate">{instance.url}</span>
			</div>

			<!-- Action buttons (absolute positioned) -->
			<div
				class="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100"
			>
				<a
					href={instance.url}
					target="_blank"
					rel="noopener noreferrer"
					on:click={(e) => e.stopPropagation()}
					class="rounded p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
				>
					<ExternalLink size={14} />
				</a>
				<button
					on:click={(e) => handleDeleteClick(e, instance)}
					class="rounded p-1.5 text-neutral-400 transition-colors hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
				>
					<Trash2 size={14} />
				</button>
			</div>
		</div>
	{/each}
</div>
