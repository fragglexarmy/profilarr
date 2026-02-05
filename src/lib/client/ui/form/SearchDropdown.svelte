<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { clickOutside } from '$lib/client/utils/clickOutside';
	import FormInput from '$ui/form/FormInput.svelte';

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
	export let label: string = 'Search';
	export let description: string = '';
	export let name: string = '';
	export let hideLabel: boolean = true;
	export let size: 'sm' | 'md' | 'lg' = 'md';

	const dispatch = createEventDispatcher<{ change: string }>();

	let open = false;
	let searchQuery = '';
	let inputElement: HTMLInputElement | HTMLTextAreaElement | null = null;

	$: selectedOption = options.find((opt) => opt.value === value);
	$: if (!open) {
		searchQuery = selectedOption?.label ?? '';
	}
	$: filteredOptions = options.filter((opt) =>
		opt.label.toLowerCase().includes(searchQuery.toLowerCase())
	);
	$: hasClear = value != null && value !== '';

	function handleInput(event: CustomEvent<string>) {
		searchQuery = event.detail;
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
	<FormInput
		{label}
		{description}
		{name}
		{placeholder}
		{disabled}
		{size}
		{hideLabel}
		bind:value={searchQuery}
		bind:inputElement
		on:input={handleInput}
		on:focus={handleFocus}
		on:blur={handleBlur}
	>
		<svelte:fragment slot="suffix">
			{#if hasClear}
				<button
					type="button"
					on:mousedown|preventDefault
					on:click={clearSelection}
					aria-label="Clear selection"
					class="text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300"
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
		</svelte:fragment>
	</FormInput>

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
