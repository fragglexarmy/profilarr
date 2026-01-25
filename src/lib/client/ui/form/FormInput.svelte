<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { Eye, EyeOff } from 'lucide-svelte';

	export let label: string;
	export let description: string = '';
	export let placeholder: string = '';
	export let value: string = '';
	export let textarea: boolean = false;
	export let type: 'text' | 'number' | 'email' | 'password' | 'url' = 'text';
	export let required: boolean = false;
	export let name: string = '';
	export let autocomplete: string = '';
	export let private_: boolean = false;
	export let readonly: boolean = false;
	export let mono: boolean = false;

	const dispatch = createEventDispatcher<{ input: string }>();

	$: fontClass = mono ? 'font-mono' : '';

	let showPassword = false;

	$: inputType = private_ ? (showPassword ? 'text' : 'password') : type;

	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement | HTMLTextAreaElement;
		value = target.value;
		dispatch('input', value);
	}
</script>

<div class="space-y-2">
	<label for={name} class="block text-sm font-medium text-neutral-900 dark:text-neutral-100">
		{label}{#if required}<span class="text-red-500">*</span>{/if}
	</label>

	{#if description}
		<p class="text-xs text-neutral-600 dark:text-neutral-400">
			{description}
		</p>
	{/if}

	{#if textarea}
		<textarea
			id={name}
			{name}
			{value}
			{placeholder}
			rows="6"
			oninput={handleInput}
			class="block w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder-neutral-400 transition-colors focus:border-neutral-300 focus:outline-none dark:border-neutral-700/60 dark:bg-neutral-800/50 dark:text-neutral-50 dark:placeholder-neutral-500 dark:focus:border-neutral-600 {fontClass}"
		></textarea>
	{:else if private_}
		<div class="relative">
			<input
				id={name}
				{name}
				type={inputType}
				{value}
				{placeholder}
				{required}
				readonly={readonly}
				oninput={handleInput}
				autocomplete={autocomplete ? (autocomplete as typeof HTMLInputElement.prototype.autocomplete) : undefined}
				class="block w-full rounded-xl border border-neutral-300 px-3 py-2 pr-10 text-neutral-900 placeholder-neutral-400 transition-colors focus:outline-none dark:border-neutral-700/60 dark:text-neutral-50 dark:placeholder-neutral-500 {fontClass} {readonly ? 'bg-white cursor-default dark:bg-neutral-800/50' : 'bg-white focus:border-neutral-400 dark:bg-neutral-800/50 dark:focus:border-neutral-600'}"
			/>
			<button
				type="button"
				class="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300"
				onclick={() => (showPassword = !showPassword)}
			>
				{#if showPassword}
					<EyeOff size={18} />
				{:else}
					<Eye size={18} />
				{/if}
			</button>
		</div>
	{:else}
		<input
			id={name}
			{name}
			{type}
			{value}
			{placeholder}
			{required}
			readonly={readonly}
			oninput={handleInput}
			autocomplete={autocomplete ? (autocomplete as typeof HTMLInputElement.prototype.autocomplete) : undefined}
			class="block w-full rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900 placeholder-neutral-400 transition-colors focus:outline-none dark:border-neutral-700/60 dark:text-neutral-50 dark:placeholder-neutral-500 {fontClass} {readonly ? 'bg-white cursor-default dark:bg-neutral-800/50' : 'bg-white focus:border-neutral-400 dark:bg-neutral-800/50 dark:focus:border-neutral-600'}"
		/>
	{/if}
</div>
