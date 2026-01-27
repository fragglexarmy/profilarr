<script lang="ts">
	import { enhance } from '$app/forms';
	import { tick } from 'svelte';
	import SaveTargetModal from '$ui/modal/SaveTargetModal.svelte';
	import StickyCard from '$ui/card/StickyCard.svelte';
	import Button from '$ui/button/Button.svelte';
	import IconCheckbox from '$ui/form/IconCheckbox.svelte';
	import { alertStore } from '$alerts/store';
	import { Check, Save, Trash2 } from 'lucide-svelte';
	import { current, isDirty, initEdit, initCreate, update } from '$lib/client/stores/dirty';
	import type { SonarrNamingRow } from '$shared/pcd/display.ts';
	import { SONARR_COLON_REPLACEMENT_OPTIONS, MULTI_EPISODE_STYLE_OPTIONS, type SonarrColonReplacementFormat, type MultiEpisodeStyle } from '$shared/pcd/conversions.ts';

	interface SonarrNamingFormData {
		name: string;
		rename: boolean;
		standardEpisodeFormat: string;
		dailyEpisodeFormat: string;
		animeEpisodeFormat: string;
		seriesFolderFormat: string;
		seasonFolderFormat: string;
		replaceIllegalCharacters: boolean;
		colonReplacementFormat: SonarrColonReplacementFormat;
		customColonReplacementFormat: string;
		multiEpisodeStyle: MultiEpisodeStyle;
		[key: string]: unknown;
	}

	export let mode: 'create' | 'edit';
	export let databaseName: string;
	export let canWriteToBase: boolean = false;
	export let actionUrl: string = '';
	export let initialData: SonarrNamingRow | null;

	const defaults: SonarrNamingFormData = {
		name: '',
		rename: true,
		standardEpisodeFormat: '{Series Title} - S{season:00}E{episode:00} - {Episode Title} {Quality Full}',
		dailyEpisodeFormat: '{Series Title} - {Air-Date} - {Episode Title} {Quality Full}',
		animeEpisodeFormat: '{Series Title} - S{season:00}E{episode:00} - {Episode Title} {Quality Full}',
		seriesFolderFormat: '{Series Title}',
		seasonFolderFormat: 'Season {season}',
		replaceIllegalCharacters: true,
		colonReplacementFormat: 'delete',
		customColonReplacementFormat: '',
		multiEpisodeStyle: 'extend'
	};

	function mapToFormData(data: SonarrNamingRow | null): SonarrNamingFormData {
		if (!data) return defaults;
		return {
			name: data.name,
			rename: data.rename,
			standardEpisodeFormat: data.standard_episode_format,
			dailyEpisodeFormat: data.daily_episode_format,
			animeEpisodeFormat: data.anime_episode_format,
			seriesFolderFormat: data.series_folder_format,
			seasonFolderFormat: data.season_folder_format,
			replaceIllegalCharacters: data.replace_illegal_characters,
			colonReplacementFormat: data.colon_replacement_format,
			customColonReplacementFormat: data.custom_colon_replacement_format || '',
			multiEpisodeStyle: data.multi_episode_style
		};
	}

	if (mode === 'create') {
		initCreate(mapToFormData(initialData));
	} else {
		initEdit(mapToFormData(initialData));
	}

	$: formData = $current as SonarrNamingFormData;

	let saving = false;
	let deleting = false;
	let selectedLayer: 'user' | 'base' = 'user';
	let showSaveTargetModal = false;
	let showDeleteTargetModal = false;
	let mainFormElement: HTMLFormElement;
	let deleteFormElement: HTMLFormElement;

	$: title = mode === 'create' ? 'New Sonarr Naming Config' : 'Edit Sonarr Naming Config';
	$: description =
		mode === 'create'
			? `Create a new Sonarr naming configuration for ${databaseName}`
			: `Update Sonarr naming configuration`;
	$: isValid = formData.name.trim() !== '';
	$: showCustomColonInput = formData.colonReplacementFormat === 'custom';

	async function handleSaveClick() {
		if (saving) return;
		if (canWriteToBase) {
			showSaveTargetModal = true;
		} else {
			saving = true;
			selectedLayer = 'user';
			await tick();
			mainFormElement?.requestSubmit();
		}
	}

	async function handleLayerSelect(event: CustomEvent<'user' | 'base'>) {
		if (saving) return;
		saving = true;
		selectedLayer = event.detail;
		showSaveTargetModal = false;
		await tick();
		mainFormElement?.requestSubmit();
	}

	async function handleDeleteClick() {
		if (canWriteToBase) {
			showDeleteTargetModal = true;
		} else {
			selectedLayer = 'user';
			await tick();
			deleteFormElement?.requestSubmit();
		}
	}

	async function handleDeleteLayerSelect(event: CustomEvent<'user' | 'base'>) {
		selectedLayer = event.detail;
		showDeleteTargetModal = false;
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

<div class="mt-6 px-4">
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
						Rename Episodes
					</div>
					<div class="text-xs text-neutral-500 dark:text-neutral-400">
						Rename episode files to match the naming format
					</div>
				</div>
			</button>
		</div>

		<hr class="border-neutral-200 dark:border-neutral-700" />

		<!-- Episode Formats -->
		<div class="space-y-4">
			<h2 class="text-base font-semibold text-neutral-900 dark:text-neutral-100">Episode Formats</h2>
			<div>
				<label
					for="standardEpisodeFormat"
					class="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
				>
					Standard Episode Format
				</label>
				<input
					type="text"
					id="standardEpisodeFormat"
					value={formData.standardEpisodeFormat}
					oninput={(e) => update('standardEpisodeFormat', e.currentTarget.value)}
					class="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 font-mono text-sm text-neutral-900 placeholder-neutral-400 focus:border-accent-500 focus:ring-1 focus:ring-accent-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
				/>
			</div>

			<div>
				<label
					for="dailyEpisodeFormat"
					class="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
				>
					Daily Episode Format
				</label>
				<input
					type="text"
					id="dailyEpisodeFormat"
					value={formData.dailyEpisodeFormat}
					oninput={(e) => update('dailyEpisodeFormat', e.currentTarget.value)}
					class="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 font-mono text-sm text-neutral-900 placeholder-neutral-400 focus:border-accent-500 focus:ring-1 focus:ring-accent-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
				/>
			</div>

			<div>
				<label
					for="animeEpisodeFormat"
					class="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
				>
					Anime Episode Format
				</label>
				<input
					type="text"
					id="animeEpisodeFormat"
					value={formData.animeEpisodeFormat}
					oninput={(e) => update('animeEpisodeFormat', e.currentTarget.value)}
					class="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 font-mono text-sm text-neutral-900 placeholder-neutral-400 focus:border-accent-500 focus:ring-1 focus:ring-accent-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
				/>
			</div>
		</div>

		<hr class="border-neutral-200 dark:border-neutral-700" />

		<!-- Folder Formats -->
		<div class="space-y-4">
			<h2 class="text-base font-semibold text-neutral-900 dark:text-neutral-100">Folder Formats</h2>
			<div>
				<label
					for="seriesFolderFormat"
					class="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
				>
					Series Folder Format
				</label>
				<input
					type="text"
					id="seriesFolderFormat"
					value={formData.seriesFolderFormat}
					oninput={(e) => update('seriesFolderFormat', e.currentTarget.value)}
					class="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 font-mono text-sm text-neutral-900 placeholder-neutral-400 focus:border-accent-500 focus:ring-1 focus:ring-accent-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
				/>
			</div>

			<div>
				<label
					for="seasonFolderFormat"
					class="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
				>
					Season Folder Format
				</label>
				<input
					type="text"
					id="seasonFolderFormat"
					value={formData.seasonFolderFormat}
					oninput={(e) => update('seasonFolderFormat', e.currentTarget.value)}
					class="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 font-mono text-sm text-neutral-900 placeholder-neutral-400 focus:border-accent-500 focus:ring-1 focus:ring-accent-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
				/>
			</div>
		</div>

		<hr class="border-neutral-200 dark:border-neutral-700" />

		<!-- Multi-Episode Style -->
		<div class="space-y-4">
			<h2 class="text-base font-semibold text-neutral-900 dark:text-neutral-100">Multi-Episode Style</h2>
			<div class="grid gap-2">
				{#each MULTI_EPISODE_STYLE_OPTIONS as option}
					<button
						type="button"
						onclick={() => update('multiEpisodeStyle', option.value)}
						class="flex items-center gap-3 rounded-lg border p-3 text-left transition-colors {formData.multiEpisodeStyle ===
						option.value
							? 'border-accent-500 bg-accent-50 dark:border-accent-400 dark:bg-accent-950'
							: 'border-neutral-200 bg-neutral-50 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-600'}"
					>
						<div
							class="flex h-5 w-5 items-center justify-center rounded-full border-2 {formData.multiEpisodeStyle ===
							option.value
								? 'border-accent-500 bg-accent-500 dark:border-accent-400 dark:bg-accent-400'
								: 'border-neutral-300 dark:border-neutral-600'}"
						>
							{#if formData.multiEpisodeStyle === option.value}
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
						{#each SONARR_COLON_REPLACEMENT_OPTIONS as option}
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

				{#if showCustomColonInput}
					<div>
						<label
							for="customColonReplacementFormat"
							class="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
						>
							Custom Replacement
						</label>
						<input
							type="text"
							id="customColonReplacementFormat"
							value={formData.customColonReplacementFormat}
							oninput={(e) => update('customColonReplacementFormat', e.currentTarget.value)}
							placeholder="Enter custom replacement character(s)"
							class="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-accent-500 focus:ring-1 focus:ring-accent-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
						/>
					</div>
				{/if}
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
	<input type="hidden" name="arrType" value="sonarr" />
	<input type="hidden" name="name" value={formData.name} />
	<input type="hidden" name="rename" value={formData.rename} />
	<input type="hidden" name="standardEpisodeFormat" value={formData.standardEpisodeFormat} />
	<input type="hidden" name="dailyEpisodeFormat" value={formData.dailyEpisodeFormat} />
	<input type="hidden" name="animeEpisodeFormat" value={formData.animeEpisodeFormat} />
	<input type="hidden" name="seriesFolderFormat" value={formData.seriesFolderFormat} />
	<input type="hidden" name="seasonFolderFormat" value={formData.seasonFolderFormat} />
	<input type="hidden" name="replaceIllegalCharacters" value={formData.replaceIllegalCharacters} />
	<input type="hidden" name="colonReplacementFormat" value={formData.colonReplacementFormat} />
	<input type="hidden" name="customColonReplacementFormat" value={formData.customColonReplacementFormat} />
	<input type="hidden" name="multiEpisodeStyle" value={formData.multiEpisodeStyle} />
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

{#if canWriteToBase}
	<SaveTargetModal
		open={showSaveTargetModal}
		mode="save"
		on:select={handleLayerSelect}
		on:cancel={() => (showSaveTargetModal = false)}
	/>

	<SaveTargetModal
		open={showDeleteTargetModal}
		mode="delete"
		on:select={handleDeleteLayerSelect}
		on:cancel={() => (showDeleteTargetModal = false)}
	/>
{/if}
