<script lang="ts">
	import type { Component } from 'svelte';
	import type { MouseEventHandler } from 'svelte/elements';

	interface Props {
		checked?: boolean;
		icon: Component<{ size?: number; class?: string }>;
		color?: string; // accent, blue, green, red, or hex color like #FFC230
		shape?: 'square' | 'circle' | 'rounded';
		disabled?: boolean;
		onclick?: MouseEventHandler<HTMLButtonElement>;
	}

	let {
		checked = false,
		icon,
		color = 'accent',
		shape = 'rounded',
		disabled = false,
		onclick
	}: Props = $props();

	// Shape classes
	const shapeClasses: Record<string, string> = {
		square: 'rounded-none',
		circle: 'rounded-full',
		rounded: 'rounded'
	};

	const shapeClass = $derived(shapeClasses[shape] || shapeClasses.rounded);
	const isCustomColor = $derived(color.startsWith('#'));
	const isAccent = $derived(color === 'accent');

	const colorClasses: Record<string, string> = {
		accent:
			'bg-accent-600 border-accent-600 dark:bg-accent-500 dark:border-accent-500 hover:brightness-110',
		green:
			'bg-green-600 border-green-600 dark:bg-green-500 dark:border-green-500 hover:brightness-110',
		red: 'bg-red-600 border-red-600 dark:bg-red-500 dark:border-red-500 hover:brightness-110',
		blue: 'bg-blue-600 border-blue-600 dark:bg-blue-500 dark:border-blue-500 hover:brightness-110'
	};

	const uncheckedClass =
		'bg-neutral-50 border-neutral-300 hover:bg-neutral-100 hover:border-neutral-400 dark:bg-neutral-800 dark:border-neutral-700 dark:hover:bg-neutral-700 dark:hover:border-neutral-500';

	const checkedClass = $derived(colorClasses[color] || colorClasses.accent);
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
			: uncheckedClass}"
		style="background-color: {checked ? color : ''}; border-color: {checked
			? color
			: 'rgb(229, 231, 235)'};"
	>
		{#if checked}
			{@const Icon = icon}
			<Icon size={14} class="text-white" />
		{/if}
	</button>
{:else}
	<button
		type="button"
		role="checkbox"
		aria-checked={checked}
		{disabled}
		{onclick}
		class="flex h-5 w-5 items-center justify-center border-2 transition-all {shapeClass} {checked
			? checkedClass
			: uncheckedClass} {disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer focus:outline-none'}"
	>
		{#if checked}
			{@const Icon = icon}
			<Icon size={14} class="text-white" />
		{/if}
	</button>
{/if}
