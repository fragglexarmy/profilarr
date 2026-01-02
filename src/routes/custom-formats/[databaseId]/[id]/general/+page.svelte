<script lang="ts">
	import { Check } from 'lucide-svelte';
	import FormInput from '$ui/form/FormInput.svelte';
	import MarkdownInput from '$ui/form/MarkdownInput.svelte';
	import TagInput from '$ui/form/TagInput.svelte';
	import IconCheckbox from '$ui/form/IconCheckbox.svelte';
	import UnsavedChangesModal from '$ui/modal/UnsavedChangesModal.svelte';
	import { useUnsavedChanges } from '$lib/client/utils/unsavedChanges.svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	const unsavedChanges = useUnsavedChanges();

	let name = data.format.name;
	let description = data.format.description;
	let tags: string[] = data.format.tags.map((t) => t.name);
	let includeInRename = data.format.include_in_rename;

	// Mark as dirty when any field changes
	$: if (
		name !== data.format.name ||
		description !== data.format.description ||
		includeInRename !== data.format.include_in_rename
	) {
		unsavedChanges.markDirty();
	}
</script>

<svelte:head>
	<title>{data.format.name} - General - Profilarr</title>
</svelte:head>

<UnsavedChangesModal />

<div class="mt-6 space-y-6">
	<FormInput
		label="Name"
		description="The name of this custom format"
		placeholder="Enter custom format name"
		bind:value={name}
	/>

	<MarkdownInput
		label="Description"
		description="Add any notes or details about this custom format's purpose and configuration."
		bind:value={description}
	/>

	<div class="space-y-2">
		<div class="block text-sm font-medium text-neutral-900 dark:text-neutral-100">Tags</div>
		<p class="text-xs text-neutral-600 dark:text-neutral-400">
			Add tags to organize and categorize this custom format.
		</p>
		<TagInput bind:tags />
		<input type="hidden" name="tags" value={tags.length > 0 ? JSON.stringify(tags) : ''} />
	</div>

	<div class="space-y-2">
		<div class="block text-sm font-medium text-neutral-900 dark:text-neutral-100">
			Include In Rename
		</div>
		<p class="text-xs text-neutral-600 dark:text-neutral-400">
			When enabled, this custom format's name will be included in the renamed filename.
		</p>
		<div class="flex items-center gap-2">
			<IconCheckbox
				icon={Check}
				bind:checked={includeInRename}
				on:click={() => (includeInRename = !includeInRename)}
			/>
			<span class="text-sm text-neutral-700 dark:text-neutral-300">
				{includeInRename ? 'Enabled' : 'Disabled'}
			</span>
		</div>
	</div>
</div>
