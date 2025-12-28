<script lang="ts">
	import { X } from 'lucide-svelte';
	import IconCheckbox from '$ui/form/IconCheckbox.svelte';
	import { Check } from 'lucide-svelte';

	export let customGroups: Array<{ name: string; key: string; tags: string[]; custom: boolean }> = [];
	export let selectedGroups: Set<string>;
	export let onAdd: (name: string, tags: string[]) => void;
	export let onDelete: (key: string) => void;
	export let onToggle: (key: string) => void;

	let newGroupName = '';
	let newGroupTags = '';

	function handleSubmit() {
		if (newGroupName && newGroupTags) {
			const tags = newGroupTags.split(',').map(t => t.trim()).filter(t => t.length > 0);
			if (tags.length > 0) {
				onAdd(newGroupName, tags);
				newGroupName = '';
				newGroupTags = '';
			}
		}
	}
</script>

<!-- Add new group form -->
<div class="border-t border-neutral-200 px-4 py-3 dark:border-neutral-700">
	<div class="mb-2 text-xs font-medium text-neutral-700 dark:text-neutral-300">
		Add Custom Group
	</div>
	<form on:submit|preventDefault={handleSubmit} class="space-y-2">
		<input
			type="text"
			bind:value={newGroupName}
			placeholder="Group name"
			class="block w-full rounded border border-neutral-300 bg-white px-2 py-1.5 text-xs text-neutral-900 placeholder-neutral-400 focus:border-accent-500 focus:ring-1 focus:ring-accent-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50 dark:placeholder-neutral-500"
		/>
		<input
			type="text"
			bind:value={newGroupTags}
			placeholder="Tags (comma-separated)"
			class="block w-full rounded border border-neutral-300 bg-white px-2 py-1.5 text-xs text-neutral-900 placeholder-neutral-400 focus:border-accent-500 focus:ring-1 focus:ring-accent-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50 dark:placeholder-neutral-500"
		/>
		<button
			type="submit"
			class="w-full rounded bg-accent-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-accent-500 dark:hover:bg-accent-600"
			disabled={!newGroupName || !newGroupTags}
		>
			Add Group
		</button>
	</form>
</div>

<!-- Custom groups list -->
{#if customGroups.length > 0}
	<div class="border-t border-neutral-200 dark:border-neutral-700">
		{#each customGroups as group}
			<div class="group flex items-center justify-between gap-2 px-4 py-2 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700">
				<button
					type="button"
					on:click={() => onToggle(group.key)}
					class="flex flex-1 items-center justify-between gap-3"
				>
					<div class="flex-1 text-left">
						<div class="text-xs font-medium text-neutral-700 dark:text-neutral-300">{group.name}</div>
						<div class="text-xs text-neutral-500 dark:text-neutral-400">
							{group.tags.join(', ')}
						</div>
					</div>
					<IconCheckbox
						checked={selectedGroups.has(group.key)}
						icon={Check}
						color="blue"
						shape="circle"
					/>
				</button>
				<button
					type="button"
					on:click|stopPropagation={() => onDelete(group.key)}
					class="flex h-5 w-5 items-center justify-center rounded text-neutral-400 transition-colors hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
				>
					<X size={12} />
				</button>
			</div>
		{/each}
	</div>
{/if}
