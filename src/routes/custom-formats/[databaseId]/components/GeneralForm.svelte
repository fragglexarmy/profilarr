<script lang="ts">
	import { enhance } from '$app/forms';
	import { tick } from 'svelte';
	import { Check, Save, Loader2, Trash2 } from 'lucide-svelte';
	import MarkdownInput from '$ui/form/MarkdownInput.svelte';
	import TagInput from '$ui/form/TagInput.svelte';
	import IconCheckbox from '$ui/form/IconCheckbox.svelte';
	import SaveTargetModal from '$ui/modal/SaveTargetModal.svelte';
	import { alertStore } from '$alerts/store';
	import {
		current,
		isDirty,
		initEdit,
		initCreate,
		update
	} from '$lib/client/stores/dirty';

	// Form data shape
	interface GeneralFormData {
		name: string;
		tags: string[];
		description: string;
		includeInRename: boolean;
	}

	// Props
	export let mode: 'create' | 'edit';
	export let databaseName: string;
	export let canWriteToBase: boolean = false;
	export let actionUrl: string = '';
	export let initialData: GeneralFormData;

	// Event handlers
	export let onCancel: (() => void) | undefined = undefined;

	const defaults: GeneralFormData = {
		name: '',
		tags: [],
		description: '',
		includeInRename: false
	};

	if (mode === 'create') {
		initCreate(initialData ?? defaults);
	} else {
		initEdit(initialData);
	}

	// Loading states
	let saving = false;
	let deleting = false;

	// Layer selection
	let selectedLayer: 'user' | 'base' = 'user';
	let deleteLayer: 'user' | 'base' = 'user';

	// Modal state
	let showSaveTargetModal = false;
	let showDeleteTargetModal = false;
	let mainFormElement: HTMLFormElement;
	let deleteFormElement: HTMLFormElement;

	// Display text based on mode
	$: title = mode === 'create' ? 'New Custom Format' : 'General';
	$: description_ =
		mode === 'create'
			? `After saving, you'll be able to add conditions and tests.`
			: `Update custom format settings`;
	$: submitButtonText = mode === 'create' ? 'Create' : 'Save Changes';

	// Reactive getters for current values
	$: name = ($current.name ?? '') as string;
	$: tags = ($current.tags ?? []) as string[];
	$: description = ($current.description ?? '') as string;
	$: includeInRename = ($current.includeInRename ?? false) as boolean;

	// Validation
	$: isValid = name.trim() !== '';

	async function handleSaveClick() {
		if (canWriteToBase) {
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

	async function handleDeleteClick() {
		if (canWriteToBase) {
			showDeleteTargetModal = true;
		} else {
			deleteLayer = 'user';
			await tick();
			deleteFormElement?.requestSubmit();
		}
	}

	async function handleDeleteLayerSelect(event: CustomEvent<'user' | 'base'>) {
		deleteLayer = event.detail;
		showDeleteTargetModal = false;
		await tick();
		deleteFormElement?.requestSubmit();
	}
</script>

<div class="space-y-6">
	<!-- Header (only shown in create mode, edit mode uses layout tabs) -->
	{#if mode === 'create'}
		<div class="space-y-2">
			<h1 class="text-2xl font-bold text-neutral-900 dark:text-neutral-50">{title}</h1>
			<p class="text-sm text-neutral-600 dark:text-neutral-400">
				{description_}
			</p>
		</div>
	{/if}

	<form
		bind:this={mainFormElement}
		method="POST"
		action={actionUrl}
		use:enhance={() => {
			saving = true;
			return async ({ result, update: formUpdate }) => {
				if (result.type === 'failure' && result.data) {
					alertStore.add('error', (result.data as { error?: string }).error || 'Operation failed');
				} else if (result.type === 'redirect') {
					alertStore.add('success', mode === 'create' ? 'Custom format created!' : 'Custom format updated!');
					// Mark as clean so navigation guard doesn't trigger
					initEdit($current as GeneralFormData);
				}
				await formUpdate();
				saving = false;
			};
		}}
	>
		<!-- Hidden fields for form data -->
		<input type="hidden" name="tags" value={JSON.stringify(tags)} />
		<input type="hidden" name="layer" value={selectedLayer} />
		<input type="hidden" name="includeInRename" value={includeInRename} />

		<div class="space-y-6">
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
					value={name}
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
				value={description}
				onchange={(v) => update('description', v)}
			/>

			<!-- Tags -->
			<div class="space-y-2">
				<div class="block text-sm font-medium text-neutral-900 dark:text-neutral-100">Tags</div>
				<p class="text-xs text-neutral-600 dark:text-neutral-400">
					Add tags to organize and categorize this custom format.
				</p>
				<TagInput
					{tags}
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
						checked={includeInRename}
						on:click={() => update('includeInRename', !includeInRename)}
					/>
					<span class="text-sm text-neutral-700 dark:text-neutral-300">
						{includeInRename ? 'Enabled' : 'Disabled'}
					</span>
				</div>
			</div>

			<!-- Actions -->
			<div class="flex items-center justify-between pt-4">
				<!-- Left side: Delete (only in edit mode) -->
				<div>
					{#if mode === 'edit'}
						<button
							type="button"
							disabled={deleting}
							onclick={handleDeleteClick}
							class="flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-700 dark:bg-neutral-900 dark:text-red-300 dark:hover:bg-red-900/20"
						>
							{#if deleting}
								<Loader2 size={14} class="animate-spin" />
								Deleting...
							{:else}
								<Trash2 size={14} />
								Delete
							{/if}
						</button>
					{/if}
				</div>

				<!-- Right side: Cancel and Save -->
				<div class="flex gap-3">
					{#if onCancel}
						<button
							type="button"
							onclick={onCancel}
							class="flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
						>
							Cancel
						</button>
					{/if}
					<button
						type="button"
						disabled={saving || !isValid || !$isDirty}
						onclick={handleSaveClick}
						class="flex items-center gap-2 rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-accent-500 dark:hover:bg-accent-600"
					>
						{#if saving}
							<Loader2 size={14} class="animate-spin" />
							{mode === 'create' ? 'Creating...' : 'Saving...'}
						{:else}
							<Save size={14} />
							{submitButtonText}
						{/if}
					</button>
				</div>
			</div>
		</div>
	</form>

	<!-- Hidden delete form -->
	{#if mode === 'edit'}
		<form
			bind:this={deleteFormElement}
			method="POST"
			action="?/delete"
			class="hidden"
			use:enhance={() => {
				deleting = true;
				return async ({ result, update: formUpdate }) => {
					if (result.type === 'failure' && result.data) {
						alertStore.add('error', (result.data as { error?: string }).error || 'Failed to delete');
					} else if (result.type === 'redirect') {
						alertStore.add('success', 'Custom format deleted');
					}
					await formUpdate();
					deleting = false;
				};
			}}
		>
			<input type="hidden" name="layer" value={deleteLayer} />
		</form>
	{/if}
</div>

<!-- Save Target Modal -->
{#if canWriteToBase}
	<SaveTargetModal
		open={showSaveTargetModal}
		mode="save"
		on:select={handleLayerSelect}
		on:cancel={() => (showSaveTargetModal = false)}
	/>

	<!-- Delete Target Modal -->
	<SaveTargetModal
		open={showDeleteTargetModal}
		mode="delete"
		on:select={handleDeleteLayerSelect}
		on:cancel={() => (showDeleteTargetModal = false)}
	/>
{/if}
