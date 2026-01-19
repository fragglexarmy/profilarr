<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { Check, X } from 'lucide-svelte';

	export let checked: boolean = false;
	export let color: 'accent' | 'amber' | 'green' | 'red' = 'accent';
	export let disabled: boolean = false;
	export let label: string = 'Toggle';

	const dispatch = createEventDispatcher<{ change: boolean }>();

	const activeColors = {
		accent: 'bg-accent-500 text-white',
		amber: 'bg-amber-500 text-white',
		green: 'bg-green-500 text-white',
		red: 'bg-red-500 text-white'
	};

	$: activeClass = activeColors[color];

	function handleClick() {
		if (disabled) return;
		checked = !checked;
		dispatch('change', checked);
	}
</script>

<button
	type="button"
	role="switch"
	aria-checked={checked}
	aria-label={label}
	{disabled}
	on:click={handleClick}
	class="flex h-6 overflow-hidden rounded bg-neutral-200 dark:bg-neutral-700 transition-all duration-200
		{disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}"
>
	<span
		class="flex w-7 items-center justify-center rounded-l transition-all duration-200
			{!checked
				? 'bg-neutral-500 text-white dark:bg-neutral-400 dark:text-neutral-900'
				: 'text-neutral-400 dark:text-neutral-500'}"
	>
		<X size={14} strokeWidth={2.5} />
	</span>
	<span
		class="flex w-7 items-center justify-center rounded-r transition-all duration-200
			{checked
				? activeClass
				: 'text-neutral-400 dark:text-neutral-500'}"
	>
		<Check size={14} strokeWidth={2.5} />
	</span>
</button>
