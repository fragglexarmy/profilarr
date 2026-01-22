<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { clickOutside } from '$lib/client/utils/clickOutside';
	import { ChevronDown, Search } from 'lucide-svelte';
	import Button from '$ui/button/Button.svelte';
	import Dropdown from '$ui/dropdown/Dropdown.svelte';
	import DropdownItem from '$ui/dropdown/DropdownItem.svelte';

	type Option = {
		value: string;
		label: string;
		[key: string]: unknown;
	};

	export let options: Option[] = [];
	export let selected: Option[] = [];
	export let max: number = 1;
	export let placeholder: string = 'Select...';
	export let mono: boolean = false;
	export let customItems: boolean = false;
	export let width: string = 'w-full';
	export let fullWidth: boolean = false;

	const dispatch = createEventDispatcher<{
		change: Option[];
	}>();

	let searchValue = '';
	let isOpen = false;
	let highlightedIndex = 0;
	let searchInputElement: HTMLInputElement;
	let triggerEl: HTMLElement;

	// Filter options based on search and exclude already selected
	$: filteredOptions = options.filter(
		(opt) =>
			opt.label.toLowerCase().includes(searchValue.toLowerCase()) &&
			!selected.some((s) => s.value === opt.value)
	);

	// Reset highlight when filtered options change
	$: if (filteredOptions.length > 0) {
		highlightedIndex = Math.min(highlightedIndex, filteredOptions.length - 1);
	}

	// Current display label
	$: currentLabel = selected.length > 0 ? selected.map((s) => s.label).join(', ') : placeholder;

	function toggleOpen() {
		isOpen = !isOpen;
		if (isOpen) {
			searchValue = '';
			highlightedIndex = 0;
			// Focus search input after dropdown opens
			setTimeout(() => searchInputElement?.focus(), 0);
		}
	}

	function close() {
		isOpen = false;
		searchValue = '';
	}

	function handleKeydown(event: KeyboardEvent) {
		if (!isOpen) return;

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
				close();
				break;
		}
	}

	function selectOption(option: Option) {
		if (selected.length >= max) {
			selected = max === 1 ? [option] : [...selected.slice(0, -1), option];
		} else {
			selected = [...selected, option];
		}
		dispatch('change', selected);
		close();
	}
</script>

<div
	class="flex items-center gap-2 {width}"
	class:w-full={fullWidth && !width}
	bind:this={triggerEl}
	use:clickOutside={close}
>
	<div class="relative" class:flex-1={fullWidth} class:w-full={!fullWidth}>
		<Button
			text={currentLabel}
			icon={ChevronDown}
			iconPosition="right"
			size="sm"
			fullWidth
			justify="between"
			on:click={toggleOpen}
		/>
		{#if isOpen}
			<Dropdown position="left" minWidth="100%" {triggerEl}>
				<!-- Search input -->
				<div class="border-b border-neutral-200 p-2 dark:border-neutral-700">
					<div
						class="flex items-center gap-2 rounded border border-neutral-300 bg-white px-2 py-1.5 dark:border-neutral-600 dark:bg-neutral-900"
					>
						<Search size={14} class="text-neutral-400 dark:text-neutral-500" />
						<input
							bind:this={searchInputElement}
							type="text"
							bind:value={searchValue}
							on:keydown={handleKeydown}
							placeholder="Search..."
							class="w-full border-0 bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400 dark:text-neutral-100 dark:placeholder:text-neutral-500 {mono
								? 'font-mono'
								: ''}"
						/>
					</div>
				</div>

				<!-- Options list -->
				<div class="max-h-80 overflow-auto">
					{#if filteredOptions.length > 0}
						{#each filteredOptions as option, index (option.value)}
							{#if customItems}
								<button
									type="button"
									on:mousedown|preventDefault={() => selectOption(option)}
									on:mouseenter={() => (highlightedIndex = index)}
									class="flex w-full items-center border-b border-neutral-200 px-3 py-2 text-left text-sm transition-colors last:border-b-0 dark:border-neutral-700 {mono
										? 'font-mono'
										: ''} {highlightedIndex === index
										? 'bg-neutral-100 dark:bg-neutral-700'
										: 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700'}"
								>
									<slot name="item" {option} highlighted={highlightedIndex === index}>
										{option.label}
									</slot>
								</button>
							{:else}
								<DropdownItem
									label={option.label}
									selected={false}
									on:click={() => selectOption(option)}
								/>
							{/if}
						{/each}
					{:else}
						<div class="px-3 py-2 text-sm text-neutral-500 dark:text-neutral-400">
							No matches found
						</div>
					{/if}
				</div>
			</Dropdown>
		{/if}
	</div>
</div>
