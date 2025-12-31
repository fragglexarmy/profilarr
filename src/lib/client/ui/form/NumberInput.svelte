<script lang="ts">
	import { ChevronUp, ChevronDown } from 'lucide-svelte';

	// Props
	export let name: string;
	export let id: string = name;
	export let value: number;
	export let min: number | undefined = undefined;
	export let max: number | undefined = undefined;
	export let step: number = 1;
	export let required: boolean = false;
	export let disabled: boolean = false;
	export let font: 'mono' | 'sans' | undefined = undefined;
	export let onchange: ((value: number) => void) | undefined = undefined;

	$: fontClass = font === 'mono' ? 'font-mono' : font === 'sans' ? 'font-sans' : '';

	function updateValue(newValue: number) {
		value = newValue;
		onchange?.(newValue);
	}

	// Increment/decrement handlers
	function increment() {
		if (max !== undefined && value >= max) return;
		updateValue(value + step);
	}

	function decrement() {
		if (min !== undefined && value <= min) return;
		updateValue(value - step);
	}

	// Validate on input
	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		let newValue = parseInt(target.value);

		if (isNaN(newValue)) {
			newValue = min ?? 0;
		}

		if (min !== undefined && newValue < min) {
			newValue = min;
		}

		if (max !== undefined && newValue > max) {
			newValue = max;
		}

		updateValue(newValue);
	}
</script>

<div class="relative">
	<input
		type="number"
		{id}
		{name}
		bind:value
		on:input={handleInput}
		{min}
		{max}
		{step}
		{required}
		{disabled}
		class="block w-full [appearance:textfield] rounded-lg border border-neutral-300 bg-white px-3 py-2 pr-10 text-neutral-900 placeholder-neutral-400 focus:border-accent-500 focus:ring-1 focus:ring-accent-500 focus:outline-none disabled:bg-neutral-100 disabled:text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50 dark:placeholder-neutral-500 dark:disabled:bg-neutral-900 dark:disabled:text-neutral-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none {fontClass}"
	/>

	<!-- Custom increment/decrement buttons -->
	<div class="absolute top-1/2 right-1 flex -translate-y-1/2 flex-col">
		<button
			type="button"
			on:click={increment}
			disabled={disabled || (max !== undefined && value >= max)}
			class="flex h-4 w-6 items-center justify-center rounded-t border border-neutral-300 bg-white text-neutral-600 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-600"
		>
			<ChevronUp size={12} />
		</button>
		<button
			type="button"
			on:click={decrement}
			disabled={disabled || (min !== undefined && value <= min)}
			class="flex h-4 w-6 items-center justify-center rounded-b border border-t-0 border-neutral-300 bg-white text-neutral-600 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-600"
		>
			<ChevronDown size={12} />
		</button>
	</div>
</div>
