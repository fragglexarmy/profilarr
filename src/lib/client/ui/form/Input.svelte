<script lang="ts">
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';

	export let value: string = '';
	export let placeholder: string = '';
	export let type: 'text' | 'number' | 'email' | 'password' = 'text';
	export let disabled: boolean = false;
	export let width: string = 'w-28';
	export let compact: boolean = false;
	// Responsive: auto-switch to compact on smaller screens (< 1280px)
	export let responsive: boolean = false;

	const dispatch = createEventDispatcher<{ input: string }>();

	let isSmallScreen = false;
	let mediaQuery: MediaQueryList | null = null;

	onMount(() => {
		if (responsive && typeof window !== 'undefined') {
			mediaQuery = window.matchMedia('(max-width: 1279px)');
			isSmallScreen = mediaQuery.matches;
			mediaQuery.addEventListener('change', handleMediaChange);
		}
	});

	onDestroy(() => {
		if (mediaQuery) {
			mediaQuery.removeEventListener('change', handleMediaChange);
		}
	});

	function handleMediaChange(e: MediaQueryListEvent) {
		isSmallScreen = e.matches;
	}

	$: isCompact = compact || (responsive && isSmallScreen);
	$: sizeClasses = isCompact
		? 'rounded px-2 py-1 text-xs'
		: 'rounded-lg px-3 py-2';

	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement;
		value = target.value;
		dispatch('input', value);
	}
</script>

<input
	{type}
	{value}
	{placeholder}
	{disabled}
	on:input={handleInput}
	class="{width} border border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500 {sizeClasses} {disabled
		? 'cursor-not-allowed opacity-50'
		: ''}"
/>
