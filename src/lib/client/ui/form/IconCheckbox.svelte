<script lang="ts">
	import type { ComponentType } from 'svelte';

	export let checked: boolean = false;
	export let icon: ComponentType;
	export let color: string = 'accent'; // accent, blue, green, red, or hex color like #FFC230
	export let shape: 'square' | 'circle' | 'rounded' = 'rounded';
	export let disabled: boolean = false;
	export let onclick: ((e: MouseEvent) => void) | undefined = undefined;

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
		{onclick}
		class="flex h-5 w-5 items-center justify-center border-2 transition-all {shapeClass} {disabled
			? 'cursor-not-allowed opacity-50'
			: 'cursor-pointer focus:outline-none'} {checked
			? 'hover:brightness-110'
			: 'bg-neutral-50 hover:border-neutral-400 hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:border-neutral-500 dark:hover:bg-neutral-700'}"
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
		{onclick}
		class="flex h-5 w-5 items-center justify-center border-2 transition-all {shapeClass} {checked
			? 'border-accent-600 bg-accent-600 hover:brightness-110 dark:border-accent-500 dark:bg-accent-500'
			: 'border-neutral-300 bg-neutral-50 hover:border-neutral-400 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-500 dark:hover:bg-neutral-700'} {disabled
			? 'cursor-not-allowed opacity-50'
			: 'cursor-pointer focus:outline-none'}"
	>
		{#if checked}
			<svelte:component this={icon} size={14} class="text-white" />
		{/if}
	</button>
{:else if color === 'green'}
	<button
		type="button"
		role="checkbox"
		aria-checked={checked}
		{disabled}
		{onclick}
		class="flex h-5 w-5 items-center justify-center border-2 transition-all {shapeClass} {checked
			? 'border-green-600 bg-green-600 hover:brightness-110 dark:border-green-500 dark:bg-green-500'
			: 'border-neutral-300 bg-neutral-50 hover:border-neutral-400 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-500 dark:hover:bg-neutral-700'} {disabled
			? 'cursor-not-allowed opacity-50'
			: 'cursor-pointer focus:outline-none'}"
	>
		{#if checked}
			<svelte:component this={icon} size={14} class="text-white" />
		{/if}
	</button>
{:else if color === 'red'}
	<button
		type="button"
		role="checkbox"
		aria-checked={checked}
		{disabled}
		{onclick}
		class="flex h-5 w-5 items-center justify-center border-2 transition-all {shapeClass} {checked
			? 'border-red-600 bg-red-600 hover:brightness-110 dark:border-red-500 dark:bg-red-500'
			: 'border-neutral-300 bg-neutral-50 hover:border-neutral-400 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-500 dark:hover:bg-neutral-700'} {disabled
			? 'cursor-not-allowed opacity-50'
			: 'cursor-pointer focus:outline-none'}"
	>
		{#if checked}
			<svelte:component this={icon} size={14} class="text-white" />
		{/if}
	</button>
{:else if color === 'blue'}
	<button
		type="button"
		role="checkbox"
		aria-checked={checked}
		{disabled}
		{onclick}
		class="flex h-5 w-5 items-center justify-center border-2 transition-all {shapeClass} {checked
			? 'border-blue-600 bg-blue-600 hover:brightness-110 dark:border-blue-500 dark:bg-blue-500'
			: 'border-neutral-300 bg-neutral-50 hover:border-neutral-400 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-500 dark:hover:bg-neutral-700'} {disabled
			? 'cursor-not-allowed opacity-50'
			: 'cursor-pointer focus:outline-none'}"
	>
		{#if checked}
			<svelte:component this={icon} size={14} class="text-white" />
		{/if}
	</button>
{:else}
	<!-- Fallback to accent for unknown colors -->
	<button
		type="button"
		role="checkbox"
		aria-checked={checked}
		{disabled}
		{onclick}
		class="flex h-5 w-5 items-center justify-center border-2 transition-all {shapeClass} {checked
			? 'border-accent-600 bg-accent-600 hover:brightness-110 dark:border-accent-500 dark:bg-accent-500'
			: 'border-neutral-300 bg-neutral-50 hover:border-neutral-400 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-500 dark:hover:bg-neutral-700'} {disabled
			? 'cursor-not-allowed opacity-50'
			: 'cursor-pointer focus:outline-none'}"
	>
		{#if checked}
			<svelte:component this={icon} size={14} class="text-white" />
		{/if}
	</button>
{/if}
