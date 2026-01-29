<script lang="ts">
	import { enhance } from '$app/forms';
	import { tick } from 'svelte';
	import StickyCard from '$ui/card/StickyCard.svelte';
	import Button from '$ui/button/Button.svelte';
	import IconCheckbox from '$ui/form/IconCheckbox.svelte';
	import { alertStore } from '$alerts/store';
	import { Check, Save, Trash2 } from 'lucide-svelte';
	import { current, isDirty, initEdit, initCreate, update } from '$lib/client/stores/dirty';
	import type { RadarrNamingRow } from '$shared/pcd/display.ts';
	import { RADARR_COLON_REPLACEMENT_OPTIONS, type RadarrColonReplacementFormat } from '$shared/pcd/mediaManagement.ts';

	interface RadarrNamingFormData {
		name: string;
		rename: boolean;
		movieFormat: string;
		movieFolderFormat: string;
		replaceIllegalCharacters: boolean;
		colonReplacementFormat: RadarrColonReplacementFormat;
		[key: string]: unknown;
	}

	export let mode: 'create' | 'edit';
	export let databaseName: string;
	export let canWriteToBase: boolean = false;
	export let actionUrl: string = '';
	export let initialData: RadarrNamingRow | null;

	const defaults: RadarrNamingFormData = {
		name: '',
		rename: true,
		movieFormat: '{Movie Title} ({Release Year}) {Quality Full}',
		movieFolderFormat: '{Movie Title} ({Release Year})',
		replaceIllegalCharacters: true,
		colonReplacementFormat: 'delete'
	};

	function mapToFormData(data: RadarrNamingRow | null): RadarrNamingFormData {
		if (!data) return defaults;
		return {
			name: data.name,
			rename: data.rename,
			movieFormat: data.movie_format,
			movieFolderFormat: data.movie_folder_format,
			replaceIllegalCharacters: data.replace_illegal_characters,
			colonReplacementFormat: data.colon_replacement_format
		};
	}

	if (mode === 'create') {
		initCreate(mapToFormData(initialData));
	} else {
		initEdit(mapToFormData(initialData));
	}

	$: formData = $current as RadarrNamingFormData;

	let saving = false;
	let deleting = false;
	let selectedLayer: 'user' | 'base' = canWriteToBase ? 'base' : 'user';
	let mainFormElement: HTMLFormElement;
	let deleteFormElement: HTMLFormElement;

	$: title = mode === 'create' ? 'New Radarr Naming Config' : 'Edit Radarr Naming Config';
	$: description =
		mode === 'create'
			? `Create a new Radarr naming configuration for ${databaseName}`
			: `Update Radarr naming configuration`;
	$: isValid = formData.name.trim() !== '';

	async function handleSaveClick() {
		if (saving) return;
		saving = true;
		selectedLayer = canWriteToBase ? 'base' : 'user';
		await tick();
		mainFormElement?.requestSubmit();
	}

	async function handleDeleteClick() {
		selectedLayer = canWriteToBase ? 'base' : 'user';
		await tick();
		deleteFormElement?.requestSubmit();
	}

</script>

<StickyCard position="top">
	<div slot="left">
		<h1 class="text-xl font-semibold text-neutral-900 dark:text-neutral-50">{title}</h1>
		<p class="text-sm text-neutral-500 dark:text-neutral-400">{description}</p>
	</div>
	<div slot="right" class="flex items-center gap-2">
		{#if mode === 'edit'}
			<Button
				text={deleting ? 'Deleting...' : 'Delete'}
				icon={Trash2}
				iconColor="text-red-600 dark:text-red-400"
				disabled={deleting || saving}
				on:click={handleDeleteClick}
			/>
		{/if}
		<Button
			text={saving ? 'Saving...' : mode === 'create' ? 'Create' : 'Save'}
			icon={Save}
			iconColor="text-blue-600 dark:text-blue-400"
			disabled={saving || !isValid || !$isDirty}
			on:click={handleSaveClick}
		/>
	</div>
</StickyCard>

<div class="mt-6 md:px-4">
	<div
		class="space-y-6 rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900"
	>
		<!-- Basic Info -->
		<div class="space-y-4">
			<h2 class="text-base font-semibold text-neutral-900 dark:text-neutral-100">Basic Info</h2>
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
					value={formData.name}
					oninput={(e) => update('name', e.currentTarget.value)}
					placeholder="e.g., default"
					class="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-accent-500 focus:ring-1 focus:ring-accent-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
				/>
			</div>

			<button
				type="button"
				onclick={() => update('rename', !formData.rename)}
				class="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-left transition-colors hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-600"
			>
				<IconCheckbox checked={formData.rename} icon={Check} on:click={() => update('rename', !formData.rename)} />
				<div>
					<div class="text-sm font-medium text-neutral-900 dark:text-neutral-100">
						Rename Movies
					</div>
					<div class="text-xs text-neutral-500 dark:text-neutral-400">
						Rename movie files to match the naming format
					</div>
				</div>
			</button>
		</div>

		<hr class="border-neutral-200 dark:border-neutral-700" />

		<!-- Naming Formats -->
		<div class="space-y-4">
			<h2 class="text-base font-semibold text-neutral-900 dark:text-neutral-100">Naming Formats</h2>
			<div>
				<label
					for="movieFormat"
					class="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
				>
					Movie Format
				</label>
				<input
					type="text"
					id="movieFormat"
					value={formData.movieFormat}
					oninput={(e) => update('movieFormat', e.currentTarget.value)}
					placeholder="e.g., Movie Title (Year) Quality"
					class="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 font-mono text-sm text-neutral-900 placeholder-neutral-400 focus:border-accent-500 focus:ring-1 focus:ring-accent-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
				/>
			</div>

			<div>
				<label
					for="movieFolderFormat"
					class="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
				>
					Movie Folder Format
				</label>
				<input
					type="text"
					id="movieFolderFormat"
					value={formData.movieFolderFormat}
					oninput={(e) => update('movieFolderFormat', e.currentTarget.value)}
					placeholder="e.g., Movie Title (Year)"
					class="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 font-mono text-sm text-neutral-900 placeholder-neutral-400 focus:border-accent-500 focus:ring-1 focus:ring-accent-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
				/>
			</div>
		</div>

		<hr class="border-neutral-200 dark:border-neutral-700" />

		<!-- Character Replacement -->
		<div class="space-y-4">
			<h2 class="text-base font-semibold text-neutral-900 dark:text-neutral-100">Character Replacement</h2>

			<button
				type="button"
				onclick={() => update('replaceIllegalCharacters', !formData.replaceIllegalCharacters)}
				class="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-left transition-colors hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-600"
			>
				<IconCheckbox checked={formData.replaceIllegalCharacters} icon={Check} on:click={() => update('replaceIllegalCharacters', !formData.replaceIllegalCharacters)} />
				<div>
					<div class="text-sm font-medium text-neutral-900 dark:text-neutral-100">
						Replace Illegal Characters
					</div>
					<div class="text-xs text-neutral-500 dark:text-neutral-400">
						Replace characters that are not allowed in file names
					</div>
				</div>
			</button>

			{#if formData.replaceIllegalCharacters}
				<div>
					<span class="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
						Colon Replacement
					</span>
					<div class="mt-2 grid gap-2">
						{#each RADARR_COLON_REPLACEMENT_OPTIONS as option}
							<button
								type="button"
								onclick={() => update('colonReplacementFormat', option.value)}
								class="flex items-center gap-3 rounded-lg border p-3 text-left transition-colors {formData.colonReplacementFormat ===
								option.value
									? 'border-accent-500 bg-accent-50 dark:border-accent-400 dark:bg-accent-950'
									: 'border-neutral-200 bg-neutral-50 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-600'}"
							>
								<div
									class="flex h-5 w-5 items-center justify-center rounded-full border-2 {formData.colonReplacementFormat ===
									option.value
										? 'border-accent-500 bg-accent-500 dark:border-accent-400 dark:bg-accent-400'
										: 'border-neutral-300 dark:border-neutral-600'}"
								>
									{#if formData.colonReplacementFormat === option.value}
										<Check size={12} class="text-white" />
									{/if}
								</div>
								<div class="text-sm font-medium text-neutral-900 dark:text-neutral-100">
									{option.label}
								</div>
							</button>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Hidden save form -->
<form
	bind:this={mainFormElement}
	method="POST"
	action={actionUrl}
	class="hidden"
	use:enhance={() => {
		saving = true;
		return async ({ result, update: formUpdate }) => {
			if (result.type === 'failure' && result.data) {
				alertStore.add('error', (result.data as { error?: string }).error || 'Operation failed');
			} else if (result.type === 'redirect') {
				alertStore.add(
					'success',
					mode === 'create' ? 'Naming config created!' : 'Naming config updated!'
				);
				initEdit(formData);
			}
			await formUpdate();
			saving = false;
		};
	}}
>
	<input type="hidden" name="arrType" value="radarr" />
	<input type="hidden" name="name" value={formData.name} />
	<input type="hidden" name="rename" value={formData.rename} />
	<input type="hidden" name="movieFormat" value={formData.movieFormat} />
	<input type="hidden" name="movieFolderFormat" value={formData.movieFolderFormat} />
	<input type="hidden" name="replaceIllegalCharacters" value={formData.replaceIllegalCharacters} />
	<input type="hidden" name="colonReplacementFormat" value={formData.colonReplacementFormat} />
	<input type="hidden" name="layer" value={selectedLayer} />
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
					alertStore.add('success', 'Naming config deleted');
				}
				await formUpdate();
				deleting = false;
			};
		}}
	>
		<input type="hidden" name="layer" value={selectedLayer} />
	</form>
{/if}
