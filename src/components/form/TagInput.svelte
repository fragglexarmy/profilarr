<script lang="ts">
	import { X } from 'lucide-svelte';

	export let tags: string[] = [];
	export let placeholder = 'Type and press Enter to add tags';

	let inputValue = '';

	function addTag() {
		const trimmed = inputValue.trim();
		if (trimmed && !tags.includes(trimmed)) {
			tags = [...tags, trimmed];
			inputValue = '';
		}
	}

	function removeTag(index: number) {
		tags = tags.filter((_, i) => i !== index);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			addTag();
		} else if (event.key === 'Backspace' && inputValue === '' && tags.length > 0) {
			// Remove last tag when backspace is pressed on empty input
			removeTag(tags.length - 1);
		}
	}
</script>

<div
	class="flex min-h-[2.5rem] flex-wrap gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
>
	{#each tags as tag, index (tag)}
		<div
			class="flex items-center gap-1 rounded bg-blue-100 px-2 py-1 text-sm text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
		>
			<span>{tag}</span>
			<button
				type="button"
				on:click={() => removeTag(index)}
				class="hover:text-blue-900 dark:hover:text-blue-100"
				aria-label="Remove tag"
			>
				<X size={14} />
			</button>
		</div>
	{/each}

	<input
		type="text"
		id="tags-input"
		bind:value={inputValue}
		on:keydown={handleKeydown}
		{placeholder}
		class="min-w-[120px] flex-1 border-0 bg-transparent text-neutral-900 outline-none placeholder:text-neutral-400 focus:ring-0 dark:text-neutral-50 dark:placeholder:text-neutral-500"
	/>
</div>
