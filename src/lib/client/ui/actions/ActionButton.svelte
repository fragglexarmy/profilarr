<script lang="ts">
	import { fly } from 'svelte/transition';
	import type { ComponentType } from 'svelte';

	export let icon: ComponentType | undefined = undefined;
	export let iconClass: string = '';
	export let square: boolean = true; // Fixed size square button
	export let hasDropdown: boolean = false;
	export let dropdownPosition: 'left' | 'right' | 'middle' = 'left';
	export let disabled: boolean = false;
	export let title: string = '';
	export let type: 'button' | 'submit' = 'button';
	export let variant: 'neutral' | 'danger' = 'neutral';

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

	const variantClasses = {
		neutral: 'hover:bg-neutral-100 dark:hover:bg-neutral-700',
		danger: 'hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400'
	};
</script>

<div
	class="relative flex"
	on:mouseenter={handleMouseEnter}
	on:mouseleave={handleMouseLeave}
	role="group"
>
	<button
		{type}
		{title}
		class="flex items-center justify-center border border-neutral-200 bg-white transition-colors dark:border-neutral-700 dark:bg-neutral-800 {square
			? 'h-10 w-10'
			: 'h-10 px-4'} {disabled ? 'cursor-not-allowed opacity-50' : variantClasses[variant]}"
		{disabled}
		on:click
	>
		{#if icon}
			<svelte:component this={icon} size={20} class="text-neutral-700 dark:text-neutral-300 {iconClass}" />
		{/if}
		<slot />
	</button>

	{#if hasDropdown && isHovered}
		<div class="z-50" transition:fly={{ y: -8, duration: 150 }}>
			<slot name="dropdown" {dropdownPosition} open={isHovered} />
		</div>
	{/if}
</div>
