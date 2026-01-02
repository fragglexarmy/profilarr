<script lang="ts">
	import { enhance } from '$app/forms';
	import { tick } from 'svelte';
	import { Check, Save, Loader2 } from 'lucide-svelte';
	import MarkdownInput from '$ui/form/MarkdownInput.svelte';
	import TagInput from '$ui/form/TagInput.svelte';
	import IconCheckbox from '$ui/form/IconCheckbox.svelte';
	import SaveTargetModal from '$ui/modal/SaveTargetModal.svelte';
	import { alertStore } from '$alerts/store';
	import {
		current,
		isDirty,
		initEdit,
		update
	} from '$lib/client/stores/dirty';
	import type { PageData } from './$types';

	export let data: PageData;

	// Form data shape
	interface GeneralFormData {
		name: string;
		tags: string[];
		description: string;
		includeInRename: boolean;
	}

	// Build initial data from server
	$: initialData = {
		name: data.format.name,
		tags: data.format.tags.map((t) => t.name),
		description: data.format.description ?? '',
		includeInRename: data.format.include_in_rename
	};

	// Initialize dirty tracking
	$: initEdit(initialData);

	// Loading state
	let saving = false;

	// Layer selection
	let selectedLayer: 'user' | 'base' = 'user';

	// Modal state
	let showSaveTargetModal = false;
	let mainFormElement: HTMLFormElement;

	// Validation
	$: isValid = ($current as GeneralFormData).name?.trim() !== '';

	async function handleSaveClick() {
		if (data.canWriteToBase) {
			showSaveTargetModal = true;
		} else {
			selectedLayer = 'user';
			await tick();
			mainFormElement?.requestSubmit();
		}
	}

	async function handleLayerSelect(event: CustomEvent<'user' | 'base'>) {
		selectedLayer = event.detail;
		showSaveTargetModal = false;
		await tick();
		mainFormElement?.requestSubmit();
	}
</script>

<svelte:head>
	<title>{data.format.name} - General - Profilarr</title>
</svelte:head>

<form
	bind:this={mainFormElement}
	method="POST"
	action="?/update"
	use:enhance={() => {
		saving = true;
		return async ({ result, update: formUpdate }) => {
			if (result.type === 'failure' && result.data) {
				alertStore.add('error', (result.data as { error?: string }).error || 'Operation failed');
			} else if (result.type === 'redirect') {
				alertStore.add('success', 'Custom format updated!');
				// Mark as clean so navigation guard doesn't trigger
				initEdit($current as GeneralFormData);
			}
			await formUpdate();
			saving = false;
		};
	}}
>
	<!-- Hidden fields for form data -->
	<input type="hidden" name="tags" value={JSON.stringify(($current as GeneralFormData).tags)} />
	<input type="hidden" name="layer" value={selectedLayer} />
	<input type="hidden" name="includeInRename" value={($current as GeneralFormData).includeInRename} />

	<div class="mt-6 space-y-6">
		<!-- Name -->
		<div>
			<label for="name" class="block text-sm font-medium text-neutral-900 dark:text-neutral-100">
				Name <span class="text-red-500">*</span>
			</label>
			<p class="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
				The name of this custom format
			</p>
			<input
				type="text"
				id="name"
				name="name"
				value={($current as GeneralFormData).name}
				oninput={(e) => update('name', e.currentTarget.value)}
				placeholder="Enter custom format name"
				class="mt-2 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
			/>
		</div>

		<!-- Description -->
		<MarkdownInput
			id="description"
			name="description"
			label="Description"
			description="Add any notes or details about this custom format's purpose and configuration."
			value={($current as GeneralFormData).description}
			onchange={(v) => update('description', v)}
		/>

		<!-- Tags -->
		<div class="space-y-2">
			<div class="block text-sm font-medium text-neutral-900 dark:text-neutral-100">Tags</div>
			<p class="text-xs text-neutral-600 dark:text-neutral-400">
				Add tags to organize and categorize this custom format.
			</p>
			<TagInput
				tags={($current as GeneralFormData).tags}
				onchange={(newTags) => update('tags', newTags)}
			/>
		</div>

		<!-- Include In Rename -->
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
					checked={($current as GeneralFormData).includeInRename}
					on:click={() => update('includeInRename', !($current as GeneralFormData).includeInRename)}
				/>
				<span class="text-sm text-neutral-700 dark:text-neutral-300">
					{($current as GeneralFormData).includeInRename ? 'Enabled' : 'Disabled'}
				</span>
			</div>
		</div>

		<!-- Save Button -->
		<div class="flex justify-end pt-4">
			<button
				type="button"
				disabled={saving || !isValid || !$isDirty}
				onclick={handleSaveClick}
				class="flex items-center gap-2 rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-accent-500 dark:hover:bg-accent-600"
			>
				{#if saving}
					<Loader2 size={14} class="animate-spin" />
					Saving...
				{:else}
					<Save size={14} />
					Save Changes
				{/if}
			</button>
		</div>
	</div>
</form>

<!-- Save Target Modal -->
{#if data.canWriteToBase}
	<SaveTargetModal
		open={showSaveTargetModal}
		mode="save"
		on:select={handleLayerSelect}
		on:cancel={() => (showSaveTargetModal = false)}
	/>
{/if}
