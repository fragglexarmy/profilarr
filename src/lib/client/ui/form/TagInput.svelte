<script lang="ts">
	import { X } from 'lucide-svelte';
	import Badge from '$ui/badge/Badge.svelte';

	export let tags: string[] = [];
	export let placeholder = 'Type and press Enter to add tags';
	export let onchange: ((tags: string[]) => void) | undefined = undefined;

	let inputValue = '';

	function updateTags(newTags: string[]) {
		tags = newTags;
		onchange?.(newTags);
	}

	function addTag() {
		const trimmed = inputValue.trim();
		if (trimmed && !tags.includes(trimmed)) {
			updateTags([...tags, trimmed]);
			inputValue = '';
		}
	}

	function removeTag(index: number) {
		updateTags(tags.filter((_, i) => i !== index));
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
	class="flex min-h-[2.5rem] flex-wrap items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 transition-colors focus-within:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-800 dark:focus-within:border-neutral-500"
>
	{#each tags as tag, index (tag)}
		<span class="inline-flex items-center gap-1">
			<Badge variant="accent" size="md">{tag}</Badge>
			<button
				type="button"
				on:click={() => removeTag(index)}
				class="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
				aria-label="Remove tag"
			>
				<X size={14} />
			</button>
		</span>
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
