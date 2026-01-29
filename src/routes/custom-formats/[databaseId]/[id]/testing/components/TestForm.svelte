<script lang="ts">
	import { enhance } from '$app/forms';
	import { tick, onMount } from 'svelte';
	import { alertStore } from '$alerts/store';
	import IconCheckbox from '$ui/form/IconCheckbox.svelte';
	import MarkdownInput from '$ui/form/MarkdownInput.svelte';
	import { Trash2, Loader2, Check, X } from 'lucide-svelte';
	import { isDirty, initEdit, initCreate, update, clear } from '$lib/client/stores/dirty';

	// Props
	export let mode: 'create' | 'edit';
	export let formatName: string;
	export let canWriteToBase: boolean = false;
	export let actionUrl: string = '';
	export let initialData: {
		title: string;
		type: 'movie' | 'series';
		shouldMatch: boolean;
		description: string;
	};

	// Event handlers
	export let onCancel: () => void;

	// Local form state
	let title = initialData.title;
	let type = initialData.type;
	let shouldMatch = initialData.shouldMatch;
	let description = initialData.description;
	const originalTitle = initialData.title;
	const originalType = initialData.type;

	// Initialize dirty tracking
	onMount(() => {
		const formData = { title, type, shouldMatch, description };
		if (mode === 'create') {
			initCreate(formData);
		} else {
			initEdit(formData);
		}
		return () => clear();
	});

	// Update dirty store when fields change
	$: update('title', title);
	$: update('type', type);
	$: update('shouldMatch', shouldMatch);
	$: update('description', description);

	// Loading states
	let saving = false;
	let deleting = false;

	// Layer selection
	let selectedLayer: 'user' | 'base' = canWriteToBase ? 'base' : 'user';
	let deleteLayer: 'user' | 'base' = canWriteToBase ? 'base' : 'user';

	// Modal states

	// Form reference
	let mainFormElement: HTMLFormElement;
	let deleteFormElement: HTMLFormElement;

	// Display text based on mode
	$: pageTitle = mode === 'create' ? 'New Test Case' : 'Edit Test Case';
	$: pageDescription =
		mode === 'create' ? `Add a test case for ${formatName}` : `Update test case settings`;
	$: submitButtonText = mode === 'create' ? 'Create' : 'Save Changes';

	$: isValid = title.trim() !== '';

	async function handleSaveClick() {
		selectedLayer = canWriteToBase ? 'base' : 'user';
		await tick();
		mainFormElement?.requestSubmit();
	}

	async function handleDeleteClick() {
		deleteLayer = canWriteToBase ? 'base' : 'user';
		await tick();
		deleteFormElement?.requestSubmit();
	}


	// Options
	const typeOptions = [
		{ value: 'movie' as const, label: 'Movie', description: 'Parse as a movie release' },
		{ value: 'series' as const, label: 'Series', description: 'Parse as a TV series release' }
	];

	const matchOptions = [
		{
			value: true,
			label: 'Should Match',
			description: 'This title should match the custom format'
		},
		{
			value: false,
			label: 'Should NOT Match',
			description: 'This title should not match the custom format'
		}
	];
</script>

<div class="mt-6 space-y-6">
	<!-- Header -->
	<div class="space-y-2">
		<h1 class="text-2xl font-bold text-neutral-900 dark:text-neutral-50">{pageTitle}</h1>
		<p class="text-sm text-neutral-600 dark:text-neutral-400">
			{pageDescription}
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
						mode === 'create' ? 'Test case created!' : 'Test case updated!'
					);
					// Clear dirty state before redirect so navigation guard doesn't trigger
					clear();
				}
				await formUpdate();
				saving = false;
			};
		}}
	>
		<!-- Hidden fields -->
		<input type="hidden" name="type" value={type} />
		<input type="hidden" name="shouldMatch" value={shouldMatch ? '1' : '0'} />
		<input type="hidden" name="formatName" value={formatName} />
		<input type="hidden" name="layer" value={selectedLayer} />
		<input type="hidden" name="description" value={description} />
		<input type="hidden" name="currentTitle" value={originalTitle} />
		<input type="hidden" name="currentType" value={originalType} />

		<div
			class="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
		>
			<div class="space-y-6 p-4">
				<!-- Title -->
				<div>
					<label
						for="title"
						class="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
					>
						Release Title <span class="text-red-500">*</span>
					</label>
					<input
						type="text"
						id="title"
						name="title"
						value={title}
						oninput={(e) => (title = e.currentTarget.value)}
						placeholder="e.g., Movie.Name.2024.1080p.BluRay.x264-GROUP"
						class="block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 font-mono text-sm text-neutral-900 placeholder-neutral-400 focus:border-accent-500 focus:ring-1 focus:ring-accent-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
					/>
				</div>

				<!-- Media Type -->
				<div>
					<div class="mb-3 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
						Media Type
					</div>
					<div class="flex gap-2">
						{#each typeOptions as option}
							<button
								type="button"
								onclick={() => (type = option.value)}
								class="flex flex-1 cursor-pointer items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3 text-left transition-colors hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-600"
							>
								<IconCheckbox icon={Check} checked={type === option.value} shape="circle" />
								<div>
									<div class="text-sm font-medium text-neutral-900 dark:text-neutral-100">
										{option.label}
									</div>
									<div class="text-xs text-neutral-500 dark:text-neutral-400">
										{option.description}
									</div>
								</div>
							</button>
						{/each}
					</div>
				</div>

				<!-- Expected Result -->
				<div>
					<div class="mb-3 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
						Expected Result
					</div>
					<div class="flex gap-2">
						{#each matchOptions as option}
							<button
								type="button"
								onclick={() => (shouldMatch = option.value)}
								class="flex flex-1 cursor-pointer items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3 text-left transition-colors hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-600"
							>
								<IconCheckbox
									icon={option.value ? Check : X}
									checked={shouldMatch === option.value}
									color={option.value ? 'green' : 'red'}
									shape="circle"
								/>
								<div>
									<div class="text-sm font-medium text-neutral-900 dark:text-neutral-100">
										{option.label}
									</div>
									<div class="text-xs text-neutral-500 dark:text-neutral-400">
										{option.description}
									</div>
								</div>
							</button>
						{/each}
					</div>
				</div>

				<!-- Description -->
				<MarkdownInput
					label="Description"
					placeholder="Why this test exists or what edge case it covers"
					value={description}
					onchange={(v) => (description = v)}
					minRows={2}
				/>
			</div>

			<!-- Actions -->
			<div
				class="flex justify-between gap-2 border-t border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-800/50"
			>
				<div>
					{#if mode === 'edit'}
						<button
							type="button"
							onclick={handleDeleteClick}
							disabled={deleting}
							class="flex cursor-pointer items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:bg-neutral-800 dark:text-red-300 dark:hover:bg-red-900"
						>
							{#if deleting}
								<Loader2 size={14} class="animate-spin" />
							{:else}
								<Trash2 size={14} />
							{/if}
							Delete
						</button>
					{/if}
				</div>
				<div class="flex gap-2">
					<button
						type="button"
						onclick={onCancel}
						class="flex cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
					>
						<X size={14} />
						Cancel
					</button>
					<button
						type="button"
						onclick={handleSaveClick}
						disabled={saving || !isValid || (mode === 'edit' && !$isDirty)}
						class="flex cursor-pointer items-center gap-1.5 rounded-lg bg-accent-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-accent-500 dark:hover:bg-accent-600"
					>
						{#if saving}
							<Loader2 size={14} class="animate-spin" />
							Saving...
						{:else}
							<Check size={14} />
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
						alertStore.add(
							'error',
							(result.data as { error?: string }).error || 'Failed to delete'
						);
					} else if (result.type === 'redirect') {
						alertStore.add('success', 'Test case deleted');
					}
					await formUpdate();
					deleting = false;
				};
			}}
		>
			<input type="hidden" name="formatName" value={formatName} />
			<input type="hidden" name="layer" value={deleteLayer} />
			<input type="hidden" name="testTitle" value={originalTitle} />
			<input type="hidden" name="testType" value={originalType} />
		</form>
	{/if}
</div>
