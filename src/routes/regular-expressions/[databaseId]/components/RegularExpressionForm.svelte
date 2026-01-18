<script lang="ts">
	import { enhance } from '$app/forms';
	import { tick } from 'svelte';
	import TagInput from '$ui/form/TagInput.svelte';
	import MarkdownInput from '$ui/form/MarkdownInput.svelte';
	import Modal from '$ui/modal/Modal.svelte';
	import SaveTargetModal from '$ui/modal/SaveTargetModal.svelte';
	import RegexPatternField from './RegexPatternField.svelte';
	import { alertStore } from '$alerts/store';
	import { Save, Trash2, Loader2 } from 'lucide-svelte';
	import { current, isDirty, initEdit, initCreate, update } from '$lib/client/stores/dirty';

	// Form data shape
	interface RegularExpressionFormData {
		name: string;
		tags: string[];
		pattern: string;
		description: string;
		regex101Id: string;
		[key: string]: unknown;
	}

	// Props
	export let mode: 'create' | 'edit';
	export let databaseName: string;
	export let canWriteToBase: boolean = false;
	export let actionUrl: string = '';
	export let initialData: RegularExpressionFormData;

	// Event handlers
	export let onCancel: () => void;

	const defaults: RegularExpressionFormData = {
		name: '',
		tags: [],
		pattern: '',
		description: '',
		regex101Id: ''
	};

	if (mode === 'create') {
		initCreate(initialData ?? defaults);
	} else {
		initEdit(initialData);
	}

	// Typed accessor for current form data
	$: formData = $current as RegularExpressionFormData;

	// Loading states
	let saving = false;
	let deleting = false;

	// Layer selection
	let selectedLayer: 'user' | 'base' = 'user';

	// Modal states
	let showSaveTargetModal = false;
	let showDeleteConfirmModal = false;
	let showDeleteTargetModal = false;
	let mainFormElement: HTMLFormElement;
	let deleteFormElement: HTMLFormElement;

	// Delete layer selection
	let deleteLayer: 'user' | 'base' = 'user';

	// Display text based on mode
	$: title = mode === 'create' ? 'New Regular Expression' : 'Edit Regular Expression';
	$: description_ =
		mode === 'create'
			? `Create a new regular expression for ${databaseName}`
			: `Update regular expression settings`;
	$: submitButtonText = mode === 'create' ? 'Create' : 'Save Changes';

	$: isValid = formData.name.trim() !== '' && formData.pattern.trim() !== '';

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

	function handleDeleteClick() {
		showDeleteConfirmModal = true;
	}

	async function handleDeleteConfirm() {
		showDeleteConfirmModal = false;
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

<div class="space-y-8 p-8">
	<!-- Header -->
	<div class="space-y-3">
		<h1 class="text-3xl font-bold text-neutral-900 dark:text-neutral-50">{title}</h1>
		<p class="text-lg text-neutral-600 dark:text-neutral-400">
			{description_}
		</p>
	</div>

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
					alertStore.add(
						'success',
						mode === 'create' ? 'Regular expression created!' : 'Regular expression updated!'
					);
					// Mark as clean so navigation guard doesn't trigger
					initEdit(formData);
				}
				await formUpdate();
				saving = false;
			};
		}}
	>
		<!-- Hidden fields for form data -->
		<input type="hidden" name="tags" value={JSON.stringify(formData.tags)} />
		<input type="hidden" name="layer" value={selectedLayer} />

		<!-- Basic Info Section -->
		<div
			class="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900"
		>
			<h2 class="mb-4 text-lg font-semibold text-neutral-900 dark:text-neutral-50">Basic Info</h2>

			<div class="space-y-4">
				<!-- Name -->
				<div>
					<label
						for="name"
						class="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
					>
						Name <span class="text-red-500">*</span>
					</label>
					<input
						type="text"
						id="name"
						name="name"
						value={formData.name}
						oninput={(e) => update('name', e.currentTarget.value)}
						placeholder="e.g., Release Group - SPARKS"
						class="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-accent-500 focus:ring-1 focus:ring-accent-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
					/>
				</div>

				<!-- Tags -->
				<div>
					<div class="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Tags</div>
					<p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
						Categorize this pattern for easier filtering
					</p>
					<div class="mt-2">
						<TagInput
							tags={formData.tags}
							onchange={(newTags) => update('tags', newTags)}
							placeholder="Add tags..."
						/>
					</div>
				</div>

				<!-- Description -->
				<div>
					<MarkdownInput
						id="description"
						name="description"
						label="Description"
						description="Describe what this pattern matches"
						value={formData.description}
						onchange={(v) => update('description', v)}
						rows={3}
						placeholder="What does this pattern match?"
					/>
				</div>
			</div>
		</div>

		<!-- Pattern Section -->
		<div
			class="mt-8 rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900"
		>
			<h2 class="mb-4 text-lg font-semibold text-neutral-900 dark:text-neutral-50">Pattern</h2>

			<RegexPatternField
				pattern={formData.pattern}
				regex101Id={formData.regex101Id}
				onPatternChange={(v) => update('pattern', v)}
				onRegex101IdChange={(v) => update('regex101Id', v)}
			/>
		</div>

		<!-- Actions -->
		<div class="mt-8 flex flex-wrap items-center justify-between gap-3">
			<!-- Left side: Delete (only in edit mode) -->
			<div>
				{#if mode === 'edit'}
					<button
						type="button"
						onclick={handleDeleteClick}
						class="flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 dark:border-red-700 dark:bg-neutral-900 dark:text-red-300 dark:hover:bg-red-900"
					>
						<Trash2 size={14} />
						Delete
					</button>
				{/if}
			</div>

			<!-- Right side: Cancel and Save -->
			<div class="flex gap-3">
				<button
					type="button"
					onclick={onCancel}
					class="flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
				>
					Cancel
				</button>
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
				return async ({ result, update }) => {
					if (result.type === 'failure' && result.data) {
						alertStore.add(
							'error',
							(result.data as { error?: string }).error || 'Failed to delete'
						);
					} else if (result.type === 'redirect') {
						alertStore.add('success', 'Regular expression deleted');
					}
					await update();
					deleting = false;
				};
			}}
		>
			<input type="hidden" name="layer" value={deleteLayer} />
		</form>
	{/if}
</div>

<!-- Delete Confirmation Modal -->
{#if mode === 'edit'}
	<Modal
		open={showDeleteConfirmModal}
		header="Delete Regular Expression"
		bodyMessage={`Are you sure you want to delete "${formData.name}"? This action cannot be undone.`}
		confirmText="Delete"
		cancelText="Cancel"
		confirmDanger={true}
		on:confirm={handleDeleteConfirm}
		on:cancel={() => (showDeleteConfirmModal = false)}
	/>
{/if}

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
