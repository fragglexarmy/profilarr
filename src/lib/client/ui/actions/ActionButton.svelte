<script lang="ts">
	import { fly } from 'svelte/transition';
	import type { ComponentType } from 'svelte';

	export let icon: ComponentType | undefined = undefined;
	export let square: boolean = true; // Fixed size square button
	export let hasDropdown: boolean = false;
	export let dropdownPosition: 'left' | 'right' | 'middle' = 'left';

	let isHovered = false;
	let leaveTimer: ReturnType<typeof setTimeout> | null = null;

	function handleMouseEnter() {
		if (leaveTimer) {
			clearTimeout(leaveTimer);
			leaveTimer = null;
		}
		isHovered = true;
	}

	function handleMouseLeave() {
		// Small delay before closing to allow mouse to move to dropdown
		leaveTimer = setTimeout(() => {
			isHovered = false;
		}, 100);
	}
</script>

<div
	class="relative flex"
	on:mouseenter={handleMouseEnter}
	on:mouseleave={handleMouseLeave}
	role="group"
>
	<button
		class="flex items-center justify-center border border-neutral-200 bg-white transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700 {square
			? 'h-10 w-10'
			: 'h-10 px-4'}"
		on:click
	>
		{#if icon}
			<svelte:component this={icon} size={20} class="text-neutral-700 dark:text-neutral-300" />
		{/if}
		<slot />
	</button>

	{#if hasDropdown && isHovered}
		<div class="z-50" transition:fly={{ y: -8, duration: 150 }}>
			<slot name="dropdown" {dropdownPosition} open={isHovered} />
		</div>
	{/if}
</div>
