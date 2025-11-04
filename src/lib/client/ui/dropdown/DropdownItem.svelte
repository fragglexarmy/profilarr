<script lang="ts">
	import type { ComponentType } from 'svelte';
	import { Check } from 'lucide-svelte';

	export let icon: ComponentType | undefined = undefined;
	export let label: string;
	export let disabled: boolean = false;
	export let danger: boolean = false;
	export let selected: boolean = false;
</script>

<button
	class="flex w-full items-center gap-3 border-b border-neutral-200 px-4 py-2 text-left text-sm transition-colors first:rounded-t-lg last:rounded-b-lg last:border-b-0 dark:border-neutral-700
		{disabled
		? 'cursor-not-allowed text-neutral-400 dark:text-neutral-600'
		: danger
			? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30'
			: 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700'}"
	{disabled}
	on:click
>
	{#if icon}
		<svelte:component this={icon} size={16} />
	{/if}
	<span class="flex-1">{label}</span>
	{#if selected}
		<Check size={16} class="text-blue-600 dark:text-blue-400" />
	{/if}
</button>
