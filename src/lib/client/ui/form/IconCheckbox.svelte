<script lang="ts">
	import type { ComponentType } from 'svelte';

	export let checked: boolean = false;
	export let icon: ComponentType;
	export let color: string = 'accent'; // accent, blue, green, red, neutral, or hex color like #FFC230
	export let shape: 'square' | 'circle' | 'rounded' = 'rounded';
	export let disabled: boolean = false;
	export let variant: 'filled' | 'outline' = 'filled';
	export let iconColor: string = '';

	// Shape classes
	const shapeClasses: Record<string, string> = {
		square: 'rounded-none',
		circle: 'rounded-full',
		rounded: 'rounded'
	};

	$: shapeClass = shapeClasses[shape] || shapeClasses.rounded;
	$: isCustomColor = color.startsWith('#');
	$: isAccent = color === 'accent';

	const outlineIconClasses = {
		accent: 'text-accent-600 dark:text-accent-400',
		neutral: 'text-neutral-900 dark:text-neutral-100',
		green: 'text-green-600 dark:text-green-400',
		red: 'text-red-600 dark:text-red-400',
		blue: 'text-blue-600 dark:text-blue-400'
	};

	$: outlineIconClass = isCustomColor
		? 'text-current'
		: outlineIconClasses[color] || outlineIconClasses.accent;
	$: resolvedIconClass = iconColor || (variant === 'filled' ? 'text-white' : outlineIconClass);
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
			? variant === 'filled'
				? 'hover:brightness-110'
				: 'bg-white hover:bg-neutral-50 dark:bg-neutral-900 dark:hover:bg-neutral-800'
			: 'bg-neutral-50 hover:border-neutral-400 hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:border-neutral-500 dark:hover:bg-neutral-700'}"
		style="background-color: {checked && variant === 'filled' ? color : ''}; border-color: {checked
			? color
			: 'rgb(229, 231, 235)'}; color: {checked && variant === 'outline' ? color : ''};"
	>
		{#if checked}
			<svelte:component
				this={icon}
				size={14}
				class={resolvedIconClass}
			/>
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
			? variant === 'filled'
				? 'border-accent-600 bg-accent-600 hover:brightness-110 dark:border-accent-500 dark:bg-accent-500'
				: 'border-accent-600 bg-white hover:bg-neutral-50 dark:border-accent-500 dark:bg-neutral-900 dark:hover:bg-neutral-800'
			: 'border-neutral-300 bg-neutral-50 hover:border-neutral-400 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-500 dark:hover:bg-neutral-700'} {disabled
			? 'cursor-not-allowed opacity-50'
			: 'cursor-pointer focus:outline-none'}"
	>
		{#if checked}
			<svelte:component
				this={icon}
				size={14}
				class={resolvedIconClass}
			/>
		{/if}
	</button>
{:else if color === 'neutral'}
	<button
		type="button"
		role="checkbox"
		aria-checked={checked}
		{disabled}
		on:click
		class="flex h-5 w-5 items-center justify-center border-2 transition-all {shapeClass} {checked
			? variant === 'filled'
				? 'border-neutral-900 bg-neutral-900 hover:brightness-110 dark:border-neutral-200 dark:bg-neutral-200'
				: 'border-neutral-400 bg-white hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-900 dark:hover:bg-neutral-800'
			: 'border-neutral-300 bg-neutral-50 hover:border-neutral-400 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-500 dark:hover:bg-neutral-700'} {disabled
			? 'cursor-not-allowed opacity-50'
			: 'cursor-pointer focus:outline-none'}"
	>
		{#if checked}
			<svelte:component
				this={icon}
				size={14}
				class={resolvedIconClass}
			/>
		{/if}
	</button>
{:else if color === 'green'}
	<button
		type="button"
		role="checkbox"
		aria-checked={checked}
		{disabled}
		on:click
		class="flex h-5 w-5 items-center justify-center border-2 transition-all {shapeClass} {checked
			? variant === 'filled'
				? 'border-green-600 bg-green-600 hover:brightness-110 dark:border-green-500 dark:bg-green-500'
				: 'border-green-600 bg-white hover:bg-neutral-50 dark:border-green-500 dark:bg-neutral-900 dark:hover:bg-neutral-800'
			: 'border-neutral-300 bg-neutral-50 hover:border-neutral-400 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-500 dark:hover:bg-neutral-700'} {disabled
			? 'cursor-not-allowed opacity-50'
			: 'cursor-pointer focus:outline-none'}"
	>
		{#if checked}
			<svelte:component
				this={icon}
				size={14}
				class={resolvedIconClass}
			/>
		{/if}
	</button>
{:else if color === 'red'}
	<button
		type="button"
		role="checkbox"
		aria-checked={checked}
		{disabled}
		on:click
		class="flex h-5 w-5 items-center justify-center border-2 transition-all {shapeClass} {checked
			? variant === 'filled'
				? 'border-red-600 bg-red-600 hover:brightness-110 dark:border-red-500 dark:bg-red-500'
				: 'border-red-600 bg-white hover:bg-neutral-50 dark:border-red-500 dark:bg-neutral-900 dark:hover:bg-neutral-800'
			: 'border-neutral-300 bg-neutral-50 hover:border-neutral-400 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-500 dark:hover:bg-neutral-700'} {disabled
			? 'cursor-not-allowed opacity-50'
			: 'cursor-pointer focus:outline-none'}"
	>
		{#if checked}
			<svelte:component
				this={icon}
				size={14}
				class={resolvedIconClass}
			/>
		{/if}
	</button>
{:else if color === 'blue'}
	<button
		type="button"
		role="checkbox"
		aria-checked={checked}
		{disabled}
		on:click
		class="flex h-5 w-5 items-center justify-center border-2 transition-all {shapeClass} {checked
			? variant === 'filled'
				? 'border-blue-600 bg-blue-600 hover:brightness-110 dark:border-blue-500 dark:bg-blue-500'
				: 'border-blue-600 bg-white hover:bg-neutral-50 dark:border-blue-500 dark:bg-neutral-900 dark:hover:bg-neutral-800'
			: 'border-neutral-300 bg-neutral-50 hover:border-neutral-400 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-500 dark:hover:bg-neutral-700'} {disabled
			? 'cursor-not-allowed opacity-50'
			: 'cursor-pointer focus:outline-none'}"
	>
		{#if checked}
			<svelte:component
				this={icon}
				size={14}
				class={resolvedIconClass}
			/>
		{/if}
	</button>
{:else}
	<!-- Fallback to accent for unknown colors -->
	<button
		type="button"
		role="checkbox"
		aria-checked={checked}
		{disabled}
		on:click
		class="flex h-5 w-5 items-center justify-center border-2 transition-all {shapeClass} {checked
			? 'border-accent-600 bg-accent-600 hover:brightness-110 dark:border-accent-500 dark:bg-accent-500'
			: 'border-neutral-300 bg-neutral-50 hover:border-neutral-400 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-500 dark:hover:bg-neutral-700'} {disabled
			? 'cursor-not-allowed opacity-50'
			: 'cursor-pointer focus:outline-none'}"
	>
		{#if checked}
			<svelte:component
				this={icon}
				size={14}
				class={resolvedIconClass}
			/>
		{/if}
	</button>
{/if}
