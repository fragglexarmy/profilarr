<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { Search, X } from 'lucide-svelte';
	import type { SearchStore } from '$lib/client/stores/search';
	import Badge from '$ui/badge/Badge.svelte';

	export let searchStore: SearchStore;
	export let placeholder: string = 'Search...';
	export let activeQuery: string = '';

	const dispatch = createEventDispatcher<{ submit: string; clearQuery: void }>();

	let inputRef: HTMLInputElement;
	let isFocused = false;

	// Reactive query binding
	$: query = $searchStore.query;

	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement;
		searchStore.setQuery(target.value);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && query.trim()) {
			dispatch('submit', query.trim());
		} else if (e.key === 'Backspace' && !query && activeQuery) {
			dispatch('clearQuery');
		}
	}

	function handleClear() {
		searchStore.clear();
		inputRef?.focus();
	}

	function handleClearQuery() {
		dispatch('clearQuery');
		inputRef?.focus();
	}
</script>

<div class="relative flex flex-1">
	<div
		class="relative flex h-10 w-full items-center border border-neutral-200 bg-white transition-all dark:border-neutral-700 dark:bg-neutral-800"
	>
		<!-- Search icon -->
		<div class="pointer-events-none absolute left-3 flex items-center">
			<Search size={18} class="text-neutral-500 dark:text-neutral-400" />
		</div>

		<!-- Active query badge -->
		{#if activeQuery}
			<div class="ml-10 flex h-full flex-shrink-0 items-center">
				<Badge variant="accent" size="sm">{activeQuery}</Badge>
			</div>
		{/if}

		<!-- Input -->
		<input
			bind:this={inputRef}
			type="text"
			value={query}
			on:input={handleInput}
			on:keydown={handleKeydown}
			on:focus={() => (isFocused = true)}
			on:blur={() => (isFocused = false)}
			placeholder={activeQuery ? '' : placeholder}
			class="h-full w-full bg-transparent pr-10 text-sm text-neutral-900 placeholder-neutral-500 outline-none dark:text-neutral-100 dark:placeholder-neutral-400 {activeQuery ? 'pl-2' : 'pl-10'}"
		/>

		<!-- Clear button -->
		{#if query}
			<button
				on:click={handleClear}
				class="absolute right-2 flex h-6 w-6 items-center justify-center rounded hover:bg-neutral-100 dark:hover:bg-neutral-700"
			>
				<X size={14} class="text-neutral-500 dark:text-neutral-400" />
			</button>
		{:else if activeQuery}
			<button
				on:click={handleClearQuery}
				class="absolute right-2 flex h-6 w-6 items-center justify-center rounded hover:bg-neutral-100 dark:hover:bg-neutral-700"
			>
				<X size={14} class="text-neutral-500 dark:text-neutral-400" />
			</button>
		{/if}
	</div>
</div>
