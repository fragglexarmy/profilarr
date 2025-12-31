<script lang="ts">
	import { ChevronDown } from 'lucide-svelte';
	import { createEventDispatcher } from 'svelte';

	type Option = {
		value: string;
		label: string;
	};

	export let options: Option[] = [];
	export let value: string = '';
	export let placeholder: string = 'Select...';
	export let mono: boolean = false;

	const dispatch = createEventDispatcher<{
		change: string;
	}>();

	let isOpen = false;
	let highlightedIndex = -1;
	let containerElement: HTMLDivElement;

	$: selectedOption = options.find((opt) => opt.value === value);
	$: if (isOpen) {
		highlightedIndex = options.findIndex((opt) => opt.value === value);
	}

	function toggle() {
		isOpen = !isOpen;
	}

	function handleBlur(event: FocusEvent) {
		// Check if focus moved outside the container
		setTimeout(() => {
			if (!containerElement?.contains(document.activeElement)) {
				isOpen = false;
			}
		}, 0);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (!isOpen) {
			if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
				event.preventDefault();
				isOpen = true;
			}
			return;
		}

		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				highlightedIndex = Math.min(highlightedIndex + 1, options.length - 1);
				break;
			case 'ArrowUp':
				event.preventDefault();
				highlightedIndex = Math.max(highlightedIndex - 1, 0);
				break;
			case 'Enter':
			case ' ':
				event.preventDefault();
				if (options[highlightedIndex]) {
					selectOption(options[highlightedIndex]);
				}
				break;
			case 'Escape':
				event.preventDefault();
				isOpen = false;
				break;
		}
	}

	function selectOption(option: Option) {
		value = option.value;
		dispatch('change', value);
		isOpen = false;
	}
</script>

<div class="relative" bind:this={containerElement}>
	<!-- Trigger button -->
	<button
		type="button"
		on:click={toggle}
		on:blur={handleBlur}
		on:keydown={handleKeydown}
		class="flex min-h-[2.25rem] w-full items-center justify-between gap-2 rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-left text-sm dark:border-neutral-700 dark:bg-neutral-800"
	>
		<span class="{mono ? 'font-mono' : ''} {selectedOption ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-400 dark:text-neutral-500'}">
			{selectedOption?.label ?? placeholder}
		</span>
		<ChevronDown
			size={16}
			class="text-neutral-400 transition-transform dark:text-neutral-500 {isOpen ? 'rotate-180' : ''}"
		/>
	</button>

	<!-- Dropdown -->
	{#if isOpen}
		<div
			class="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
		>
			{#each options as option, index (option.value)}
				<button
					type="button"
					on:mousedown|preventDefault={() => selectOption(option)}
					on:mouseenter={() => (highlightedIndex = index)}
					class="w-full px-3 py-2 text-left text-sm transition-colors {mono ? 'font-mono' : ''} {highlightedIndex === index
						? 'bg-accent-100 text-accent-900 dark:bg-accent-900/30 dark:text-accent-100'
						: 'text-neutral-900 hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-700'}"
				>
					{option.label}
				</button>
			{/each}
		</div>
	{/if}
</div>
