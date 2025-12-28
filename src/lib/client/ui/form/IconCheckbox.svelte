<script lang="ts">
	import type { ComponentType } from 'svelte';

	export let checked: boolean = false;
	export let icon: ComponentType;
	export let color: string = 'accent'; // accent, blue, green, red, or hex color like #FFC230
	export let shape: 'square' | 'circle' | 'rounded' = 'rounded';
	export let disabled: boolean = false;

	// Shape classes
	const shapeClasses: Record<string, string> = {
		square: 'rounded-none',
		circle: 'rounded-full',
		rounded: 'rounded'
	};

	$: shapeClass = shapeClasses[shape] || shapeClasses.rounded;
	$: isCustomColor = color.startsWith('#');
	$: isAccent = color === 'accent';
</script>

{#if isCustomColor}
	<button
		type="button"
		role="checkbox"
		aria-checked={checked}
		{disabled}
		on:click
		class="flex h-5 w-5 items-center justify-center border-2 transition-all {shapeClass} {disabled
			? 'cursor-not-allowed opacity-50'
			: 'cursor-pointer focus:outline-none'} {checked
			? 'hover:brightness-110'
			: 'bg-neutral-50 hover:bg-neutral-100 hover:border-neutral-400 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:hover:border-neutral-500'}"
		style="background-color: {checked ? color : ''}; border-color: {checked
			? color
			: 'rgb(229, 231, 235)'};"
	>
		{#if checked}
			<svelte:component this={icon} size={14} class="text-white" />
		{/if}
	</button>
{:else if isAccent}
	<button
		type="button"
		role="checkbox"
		aria-checked={checked}
		{disabled}
		on:click
		class="flex h-5 w-5 items-center justify-center border-2 transition-all {shapeClass} {checked
			? 'bg-accent-600 border-accent-600 dark:bg-accent-500 dark:border-accent-500 hover:brightness-110'
			: 'bg-neutral-50 border-neutral-300 hover:bg-neutral-100 hover:border-neutral-400 dark:bg-neutral-800 dark:border-neutral-700 dark:hover:bg-neutral-700 dark:hover:border-neutral-500'} {disabled
			? 'cursor-not-allowed opacity-50'
			: 'cursor-pointer focus:outline-none'}"
	>
		{#if checked}
			<svelte:component this={icon} size={14} class="text-white" />
		{/if}
	</button>
{:else}
	<button
		type="button"
		role="checkbox"
		aria-checked={checked}
		{disabled}
		on:click
		class="flex h-5 w-5 items-center justify-center border-2 transition-all {shapeClass} {checked
			? `bg-${color}-600 border-${color}-600 dark:bg-${color}-500 dark:border-${color}-500 hover:brightness-110`
			: 'bg-neutral-50 border-neutral-300 hover:bg-neutral-100 hover:border-neutral-400 dark:bg-neutral-800 dark:border-neutral-700 dark:hover:bg-neutral-700 dark:hover:border-neutral-500'} {disabled
			? 'cursor-not-allowed opacity-50'
			: 'cursor-pointer focus:outline-none'}"
	>
		{#if checked}
			<svelte:component this={icon} size={14} class="text-white" />
		{/if}
	</button>
{/if}
