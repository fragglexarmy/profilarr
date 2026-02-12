<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import Badge from '$ui/badge/Badge.svelte';
	import Button from '$ui/button/Button.svelte';
	import { Copy, Download } from 'lucide-svelte';
	import type { NamingListItem } from '$shared/pcd/display.ts';
	import radarrLogo from '$lib/client/assets/Radarr.svg';
	import sonarrLogo from '$lib/client/assets/Sonarr.svg';

	export let configs: NamingListItem[];
	export let databaseId: number;

	const dispatch = createEventDispatcher<{
		clone: { name: string; arr_type: string };
		export: { name: string; arr_type: string };
	}>();

	const logos: Record<string, string> = {
		radarr: radarrLogo,
		sonarr: sonarrLogo
	};

	let loadedImages: Set<string> = new Set();

	function handleImageLoad(name: string) {
		loadedImages.add(name);
		loadedImages = loadedImages;
	}
</script>

<div class="grid grid-cols-1 gap-3">
	{#each configs as config}
		<a
			href="/media-management/{databaseId}/naming/{config.arr_type}/{encodeURIComponent(config.name)}"
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
						{#if config.rename}
							<Badge variant="success">Rename Enabled</Badge>
						{:else}
							<Badge variant="neutral">Rename Disabled</Badge>
						{/if}
					</div>
				</div>
			</div>

			<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
			<div class="flex items-center gap-0.5" on:click|stopPropagation|preventDefault>
				<Button
					icon={Download}
					size="xs"
					variant="ghost"
					tooltip="Export"
					on:click={() => dispatch('export', { name: config.name, arr_type: config.arr_type })}
				/>
				<Button
					icon={Copy}
					size="xs"
					variant="ghost"
					tooltip="Clone"
					on:click={() => dispatch('clone', { name: config.name, arr_type: config.arr_type })}
				/>
			</div>
		</a>
	{/each}
</div>
