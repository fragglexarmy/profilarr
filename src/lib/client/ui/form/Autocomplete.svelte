<script lang="ts">
	import { X } from 'lucide-svelte';
	import { createEventDispatcher } from 'svelte';

	type Option = {
		value: string;
		label: string;
	};

	export let options: Option[] = [];
	export let selected: Option[] = [];
	export let max: number = 1;
	export let placeholder: string = 'Type to search...';
	export let mono: boolean = false;

	const dispatch = createEventDispatcher<{
		change: Option[];
	}>();

	let inputValue = '';
	let isOpen = false;
	let highlightedIndex = 0;
	let inputElement: HTMLInputElement;

	// Filter options based on input and exclude already selected
	$: filteredOptions = options.filter(
		(opt) =>
			opt.label.toLowerCase().includes(inputValue.toLowerCase()) &&
			!selected.some((s) => s.value === opt.value)
	);

	// Reset highlight when filtered options change
	$: if (filteredOptions.length > 0) {
		highlightedIndex = Math.min(highlightedIndex, filteredOptions.length - 1);
	}

	function handleInput() {
		isOpen = true;
		highlightedIndex = 0;
	}

	function handleFocus() {
		isOpen = true;
	}

	function handleBlur(event: FocusEvent) {
		// Delay closing to allow click on option
		setTimeout(() => {
			isOpen = false;
			inputValue = '';
		}, 150);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (!isOpen) {
			if (event.key === 'ArrowDown' || event.key === 'Enter') {
				isOpen = true;
				event.preventDefault();
			}
			return;
		}

		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				highlightedIndex = Math.min(highlightedIndex + 1, filteredOptions.length - 1);
				break;
			case 'ArrowUp':
				event.preventDefault();
				highlightedIndex = Math.max(highlightedIndex - 1, 0);
				break;
			case 'Enter':
				event.preventDefault();
				if (filteredOptions[highlightedIndex]) {
					selectOption(filteredOptions[highlightedIndex]);
				}
				break;
			case 'Escape':
				event.preventDefault();
				isOpen = false;
				inputValue = '';
				break;
			case 'Backspace':
				if (inputValue === '' && selected.length > 0) {
					removeOption(selected[selected.length - 1]);
				}
				break;
		}
	}

	function selectOption(option: Option) {
		if (selected.length >= max) {
			// Replace the last one if at max
			selected = max === 1 ? [option] : [...selected.slice(0, -1), option];
		} else {
			selected = [...selected, option];
		}
		dispatch('change', selected);
		inputValue = '';
		isOpen = false;
		inputElement?.focus();
	}

	function removeOption(option: Option) {
		selected = selected.filter((s) => s.value !== option.value);
		dispatch('change', selected);
		inputElement?.focus();
	}
</script>

<div class="relative">
	<!-- Input container with selected tags -->
	<div
		class="flex min-h-[2.25rem] flex-wrap items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-2 py-1.5 dark:border-neutral-700 dark:bg-neutral-800"
	>
		<!-- Selected items as tags -->
		{#each selected as item (item.value)}
			<div
				class="flex items-center gap-1 rounded bg-accent-100 px-2 py-0.5 text-sm text-accent-800 dark:bg-accent-900/30 dark:text-accent-300"
			>
				<span class={mono ? 'font-mono' : ''}>{item.label}</span>
				<button
					type="button"
					on:click={() => removeOption(item)}
					class="cursor-pointer hover:text-accent-900 dark:hover:text-accent-100"
					aria-label="Remove {item.label}"
				>
					<X size={14} />
				</button>
			</div>
		{/each}

		<!-- Input field -->
		{#if selected.length < max}
			<input
				bind:this={inputElement}
				type="text"
				bind:value={inputValue}
				on:input={handleInput}
				on:focus={handleFocus}
				on:blur={handleBlur}
				on:keydown={handleKeydown}
				{placeholder}
				class="min-w-[120px] flex-1 border-0 bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:ring-0 dark:text-neutral-100 dark:placeholder:text-neutral-500 {mono
					? 'font-mono'
					: ''}"
			/>
		{/if}
	</div>

	<!-- Dropdown -->
	{#if isOpen && filteredOptions.length > 0}
		<div
			class="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
		>
			{#each filteredOptions as option, index (option.value)}
				<button
					type="button"
					on:mousedown|preventDefault={() => selectOption(option)}
					on:mouseenter={() => (highlightedIndex = index)}
					class="w-full px-3 py-2 text-left text-sm transition-colors {mono
						? 'font-mono'
						: ''} {highlightedIndex === index
						? 'bg-accent-100 text-accent-900 dark:bg-accent-900/30 dark:text-accent-100'
						: 'text-neutral-900 hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-700'}"
				>
					{option.label}
				</button>
			{/each}
		</div>
	{/if}

	<!-- No results message -->
	{#if isOpen && inputValue && filteredOptions.length === 0}
		<div
			class="absolute z-50 mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-500 shadow-lg dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400"
		>
			No matches found
		</div>
	{/if}
</div>
