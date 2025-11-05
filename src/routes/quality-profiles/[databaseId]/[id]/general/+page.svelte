<script lang="ts">
	import FormInput from '$ui/form/FormInput.svelte';
	import TagInput from '$ui/form/TagInput.svelte';
	import UnsavedChangesModal from '$ui/modal/UnsavedChangesModal.svelte';
	import { useUnsavedChanges } from '$lib/client/utils/unsavedChanges.svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	const unsavedChanges = useUnsavedChanges();

	let name = data.profile.name;
	let description = data.profile.description;
	let tags: string[] = data.profile.tags.map(t => t.name);

	// Mark as dirty when any field changes
	$: if (name !== data.profile.name || description !== data.profile.description) {
		unsavedChanges.markDirty();
	}
</script>

<svelte:head>
	<title>{data.profile.name} - General - Profilarr</title>
</svelte:head>

<UnsavedChangesModal />

<div class="mt-6 space-y-6">
	<FormInput
		label="Name"
		description="The name of this quality profile"
		placeholder="Enter profile name"
		bind:value={name}
	/>

	<FormInput
		label="Description"
		description="Add any notes or details about this profile's purpose and configuration. Use markdown to format your description."
		placeholder=""
		bind:value={description}
		textarea={true}
	/>

	<div class="space-y-2">
		<div class="block text-sm font-medium text-neutral-900 dark:text-neutral-100">
			Tags
		</div>
		<p class="text-xs text-neutral-600 dark:text-neutral-400">
			Add tags to organize and categorize this profile.
		</p>
		<TagInput bind:tags />
		<input type="hidden" name="tags" value={tags.length > 0 ? JSON.stringify(tags) : ''} />
	</div>
</div>
