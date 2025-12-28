<script lang="ts">
	import { Trash2, Upload } from 'lucide-svelte';
	import ActionsBar from '$ui/actions/ActionsBar.svelte';
	import ActionButton from '$ui/actions/ActionButton.svelte';
	import Dropdown from '$ui/dropdown/Dropdown.svelte';

	export let selectedCount: number;
	export let commitMessage: string;

	export let onDiscard: () => void;
	export let onAdd: () => void;

	$: canDiscard = selectedCount > 0;
	$: canAdd = selectedCount > 0 && commitMessage.trim().length > 0;
</script>

<ActionsBar className="w-full">
	<div class="relative flex flex-1">
		<div
			class="flex h-10 w-full items-center border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800"
		>
			<input
				type="text"
				bind:value={commitMessage}
				placeholder="Commit message..."
				class="h-full w-full bg-transparent px-3 font-mono text-sm text-neutral-700 placeholder-neutral-400 outline-none dark:text-neutral-300 dark:placeholder-neutral-500"
			/>
		</div>
	</div>

	<ActionButton
		icon={Upload}
		hasDropdown={true}
		dropdownPosition="right"
		on:click={canAdd ? onAdd : undefined}
	>
		<svelte:fragment slot="dropdown" let:dropdownPosition let:open>
			<Dropdown position={dropdownPosition} {open} minWidth="12rem">
				<div class="px-3 py-2 text-sm text-neutral-600 dark:text-neutral-400">
					{#if !selectedCount}
						Select changes to add
					{:else if !commitMessage.trim()}
						Enter a commit message
					{:else}
						Add {selectedCount} change{selectedCount === 1 ? '' : 's'}
					{/if}
				</div>
			</Dropdown>
		</svelte:fragment>
	</ActionButton>

	<ActionButton
		icon={Trash2}
		hasDropdown={true}
		dropdownPosition="right"
		on:click={canDiscard ? onDiscard : undefined}
	>
		<svelte:fragment slot="dropdown" let:dropdownPosition let:open>
			<Dropdown position={dropdownPosition} {open} minWidth="10rem">
				<div class="px-3 py-2 text-sm text-neutral-600 dark:text-neutral-400">
					{#if canDiscard}
						Discard {selectedCount} change{selectedCount === 1 ? '' : 's'}
					{:else}
						Select changes to discard
					{/if}
				</div>
			</Dropdown>
		</svelte:fragment>
	</ActionButton>
</ActionsBar>
