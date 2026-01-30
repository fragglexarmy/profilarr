<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { clickOutside } from '$lib/client/utils/clickOutside';

	type Option = {
		value: string;
		label: string;
		[key: string]: unknown;
	};

	export let options: Option[] = [];
	export let value: string | null = null;
	export let placeholder: string = 'Search...';
	export let disabled: boolean = false;
	export let fullWidth: boolean = true;

	const dispatch = createEventDispatcher<{ change: string }>();

	let open = false;
	let searchQuery = '';
	let inputElement: HTMLInputElement;

	$: if (!open) {
		searchQuery = value ?? '';
	}

	$: filteredOptions = options.filter((opt) =>
		opt.label.toLowerCase().includes(searchQuery.toLowerCase())
	);

	function handleInput(e: Event) {
		searchQuery = (e.currentTarget as HTMLInputElement).value;
		open = true;
	}

	function handleFocus() {
		if (!disabled) {
			open = true;
		}
	}

	function close() {
		open = false;
	}

	function handleBlur() {
		setTimeout(() => {
			open = false;
		}, 100);
	}

	function selectOption(option: Option) {
		searchQuery = option.label;
		dispatch('change', option.value);
		open = false;
	}

	function clearSelection() {
		searchQuery = '';
		dispatch('change', '');
		open = false;
		inputElement?.focus();
	}
</script>

<div class="relative" use:clickOutside={close} class:w-full={fullWidth}>
	<input
		bind:this={inputElement}
		type="text"
		{disabled}
		bind:value={searchQuery}
		on:input={handleInput}
		on:focus={handleFocus}
		on:blur={handleBlur}
		placeholder={placeholder}
		class="block w-full h-10 rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm leading-5 text-neutral-900 placeholder-neutral-400 transition-colors focus:border-accent-500 focus:ring-1 focus:ring-accent-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
	/>

	{#if value}
		<button
			type="button"
			on:click={clearSelection}
			aria-label="Clear selection"
			class="absolute top-1/2 right-3 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300"
		>
			<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M6 18L18 6M6 6l12 12"
				/>
			</svg>
		</button>
	{/if}

	{#if open && filteredOptions.length > 0}
		<div
			class="absolute top-full z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
		>
			{#each filteredOptions as option}
				<button
					type="button"
					on:mousedown={() => selectOption(option)}
					class="w-full px-3 py-2 text-left text-sm text-neutral-900 transition-colors hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-700"
				>
					<slot name="item" {option}>
						{option.label}
					</slot>
				</button>
			{/each}
		</div>
	{/if}
</div>
