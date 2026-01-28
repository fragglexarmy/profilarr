<script lang="ts">
	import { enhance } from '$app/forms';
	import { tick } from 'svelte';
	import { Save, Loader2, Trash2 } from 'lucide-svelte';
	import MarkdownInput from '$ui/form/MarkdownInput.svelte';
	import TagInput from '$ui/form/TagInput.svelte';
	import Modal from '$ui/modal/Modal.svelte';
	import SaveTargetModal from '$ui/modal/SaveTargetModal.svelte';
	import Button from '$ui/button/Button.svelte';
	import StickyCard from '$ui/card/StickyCard.svelte';
	import { alertStore } from '$alerts/store';
	import { current, isDirty, initEdit, initCreate, update } from '$lib/client/stores/dirty';

	// Form data shape
	interface GeneralFormData {
		name: string;
		tags: string[];
		description: string;
		language: string | null;
		[key: string]: unknown;
	}

	// Language option
	interface LanguageOption {
		id: number;
		name: string;
	}

	// Props
	export let mode: 'create' | 'edit';
	export let canWriteToBase: boolean = false;
	export let actionUrl: string = '';
	export let initialData: GeneralFormData;
	export let availableLanguages: LanguageOption[] = [];

	// Event handlers
	export let onCancel: (() => void) | undefined = undefined;

	const defaults: GeneralFormData = {
		name: '',
		tags: [],
		description: '',
		language: null
	};

	if (mode === 'create') {
		initCreate(initialData ?? defaults);
	} else {
		initEdit(initialData);
	}

	// Typed accessor for current form data
	$: formData = $current as GeneralFormData;

	// Loading states
	let saving = false;
	let deleting = false;

	// Layer selection
	let selectedLayer: 'user' | 'base' = 'user';
	let deleteLayer: 'user' | 'base' = 'user';

	// Modal state
	let showSaveTargetModal = false;
	let showDeleteConfirmModal = false;
	let showDeleteTargetModal = false;
	let mainFormElement: HTMLFormElement;
	let deleteFormElement: HTMLFormElement;

	// Display text based on mode
	$: title = mode === 'create' ? 'New Quality Profile' : 'General';
	$: description_ =
		mode === 'create'
			? `After saving, you'll be able to configure qualities, scoring, and languages.`
			: `Update quality profile settings`;
	$: submitButtonText = mode === 'create' ? 'Create' : 'Save Changes';

	// Reactive getters for current values
	$: name = ($current.name ?? '') as string;
	$: tags = ($current.tags ?? []) as string[];
	$: description = ($current.description ?? '') as string;
	$: selectedLanguageName = ($current.language ?? null) as string | null;

	// Language autocomplete state
	let languageSearchQuery = initialData.language || '';
	let showLanguageDropdown = false;

	$: filteredLanguages = availableLanguages.filter((lang) =>
		lang.name.toLowerCase().includes(languageSearchQuery.toLowerCase())
	);

	function selectLanguage(language: LanguageOption) {
		update('language', language.name);
		languageSearchQuery = language.name;
		showLanguageDropdown = false;
	}

	function clearLanguage() {
		update('language', null);
		languageSearchQuery = '';
		showLanguageDropdown = false;
	}

	function handleLanguageInput(e: Event) {
		const target = e.target as HTMLInputElement;
		languageSearchQuery = target.value;
		showLanguageDropdown = true;

		const exactMatch = availableLanguages.find(
			(l) => l.name.toLowerCase() === languageSearchQuery.toLowerCase()
		);
		if (!exactMatch) {
			update('language', null);
		} else {
			update('language', exactMatch.name);
		}
	}

	function handleLanguageFocus() {
		showLanguageDropdown = true;
	}

	function handleLanguageBlur() {
		setTimeout(() => {
			showLanguageDropdown = false;
			if (selectedLanguageName) {
				languageSearchQuery = selectedLanguageName;
			} else if (languageSearchQuery && !availableLanguages.find((l) => l.name === languageSearchQuery)) {
				languageSearchQuery = '';
			}
		}, 200);
	}

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

<div class="space-y-6">
	<!-- Header with actions -->
	<StickyCard position="top">
		<svelte:fragment slot="left">
			<h1 class="text-neutral-900 dark:text-neutral-50">{title}</h1>
			<p class="text-neutral-600 dark:text-neutral-400">{description_}</p>
		</svelte:fragment>
		<svelte:fragment slot="right">
			<div class="flex items-center gap-2">
				{#if mode === 'edit'}
					<Button
						disabled={deleting}
						icon={deleting ? Loader2 : Trash2}
						iconColor="text-red-600 dark:text-red-400"
						text={deleting ? 'Deleting...' : 'Delete'}
						on:click={handleDeleteClick}
					/>
				{/if}
				{#if onCancel}
					<Button text="Cancel" on:click={onCancel} />
				{/if}
				<Button
					disabled={saving || !isValid || !$isDirty}
					icon={saving ? Loader2 : Save}
					iconColor="text-blue-600 dark:text-blue-400"
					text={saving ? (mode === 'create' ? 'Creating...' : 'Saving...') : submitButtonText}
					on:click={handleSaveClick}
				/>
			</div>
		</svelte:fragment>
	</StickyCard>

	<form
		bind:this={mainFormElement}
		method="POST"
		action={actionUrl}
		class="md:px-4"
		use:enhance={() => {
			saving = true;
			return async ({ result, update: formUpdate }) => {
				if (result.type === 'failure' && result.data) {
					alertStore.add('error', (result.data as { error?: string }).error || 'Operation failed');
				} else if (result.type === 'redirect') {
					alertStore.add(
						'success',
						mode === 'create' ? 'Quality profile created!' : 'Quality profile updated!'
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
		<input type="hidden" name="description" value={description} />
		<input type="hidden" name="tags" value={JSON.stringify(tags)} />
		<input type="hidden" name="language" value={selectedLanguageName ?? ''} />
		<input type="hidden" name="layer" value={selectedLayer} />

		<div class="space-y-6">
			<!-- Name -->
			<div>
				<label for="name" class="block text-sm font-medium text-neutral-900 dark:text-neutral-100">
					Name <span class="text-red-500">*</span>
				</label>
				<p class="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
					The name of this quality profile
				</p>
				<input
					type="text"
					id="name"
					name="name"
					value={name}
					oninput={(e) => update('name', e.currentTarget.value)}
					placeholder="Enter quality profile name"
					class="mt-2 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-accent-500 focus:ring-1 focus:ring-accent-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
				/>
			</div>

			<!-- Description -->
			<MarkdownInput
				id="description"
				label="Description"
				description="Add any notes or details about this profile's purpose and configuration."
				value={description}
				onchange={(v) => update('description', v)}
			/>

			<!-- Tags -->
			<div class="space-y-2">
				<div class="block text-sm font-medium text-neutral-900 dark:text-neutral-100">Tags</div>
				<p class="text-xs text-neutral-600 dark:text-neutral-400">
					Add tags to organize and categorize this quality profile.
				</p>
				<TagInput {tags} onchange={(newTags) => update('tags', newTags)} />
			</div>

			<!-- Language -->
			{#if availableLanguages.length > 0}
				<div class="space-y-2">
					<div class="block text-sm font-medium text-neutral-900 dark:text-neutral-100">
						Language
					</div>
					<p class="text-xs text-neutral-600 dark:text-neutral-400">
						Set the preferred language for this profile. Leave empty for "Any". Radarr only. Sonarr uses custom formats for language filtering.
					</p>
					<div class="relative">
						<input
							type="text"
							bind:value={languageSearchQuery}
							oninput={handleLanguageInput}
							onfocus={handleLanguageFocus}
							onblur={handleLanguageBlur}
							placeholder="Search for a language..."
							class="block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 transition-colors focus:border-accent-500 focus:ring-1 focus:ring-accent-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
						/>

						{#if selectedLanguageName}
							<button
								type="button"
								onclick={clearLanguage}
								aria-label="Clear language"
								class="absolute top-1/2 right-3 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300"
							>
								<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						{/if}

						{#if showLanguageDropdown && filteredLanguages.length > 0}
							<div
								class="absolute top-full z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
							>
								{#each filteredLanguages as language}
									<button
										type="button"
										onmousedown={() => selectLanguage(language)}
										class="w-full px-3 py-2 text-left text-sm text-neutral-900 transition-colors hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-700"
									>
										{language.name}
									</button>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			{/if}

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
						alertStore.add(
							'error',
							(result.data as { error?: string }).error || 'Failed to delete'
						);
					} else if (result.type === 'redirect') {
						alertStore.add('success', 'Quality profile deleted');
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

<!-- Delete Confirmation Modal -->
{#if mode === 'edit'}
	<Modal
		open={showDeleteConfirmModal}
		header="Delete Quality Profile"
		bodyMessage={`Are you sure you want to delete "${name}"? This action cannot be undone.`}
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
