<script lang="ts">
	import { enhance } from '$app/forms';
	import { tick } from 'svelte';
	import { Check, Pencil, X, Loader2 } from 'lucide-svelte';
	import { alertStore } from '$lib/client/alerts/store';
	import IconCheckbox from '$ui/form/IconCheckbox.svelte';
	import SaveTargetModal from '$ui/modal/SaveTargetModal.svelte';
	import type {
		RadarrNaming,
		SonarrNaming,
		ColonReplacementFormat,
		RadarrColonReplacementFormat,
		MultiEpisodeStyle
	} from '$lib/shared/mediaManagement';
	import {
		COLON_REPLACEMENT_OPTIONS,
		getColonReplacementLabel,
		RADARR_COLON_REPLACEMENT_OPTIONS,
		getRadarrColonReplacementLabel,
		MULTI_EPISODE_STYLE_OPTIONS,
		getMultiEpisodeStyleLabel
	} from '$lib/shared/mediaManagement';

	export let naming: RadarrNaming | SonarrNaming | null;
	export let arrType: 'radarr' | 'sonarr';
	export let canWriteToBase: boolean = false;

	// Edit mode state
	let isEditing = false;
	let isSaving = false;

	// Layer selection
	let selectedLayer: 'user' | 'base' = 'user';
	let showSaveTargetModal = false;
	let formElement: HTMLFormElement;

	// Type guards
	function isRadarrNaming(n: RadarrNaming | SonarrNaming): n is RadarrNaming {
		return 'movie_format' in n;
	}

	function isSonarrNaming(n: RadarrNaming | SonarrNaming): n is SonarrNaming {
		return 'standard_episode_format' in n;
	}

	// Form values for Sonarr (initialized from settings)
	let formRename: boolean = false;
	let formReplaceIllegalCharacters: boolean = false;
	let formColonReplacement: ColonReplacementFormat = 'delete';
	let formCustomColonReplacement: string = '';
	let formStandardEpisodeFormat: string = '';
	let formDailyEpisodeFormat: string = '';
	let formAnimeEpisodeFormat: string = '';
	let formSeriesFolderFormat: string = '';
	let formSeasonFolderFormat: string = '';
	let formMultiEpisodeStyle: MultiEpisodeStyle = 'extend';

	// Form values for Radarr
	let formRadarrColonReplacement: RadarrColonReplacementFormat = 'delete';
	let formMovieFormat: string = '';
	let formMovieFolderFormat: string = '';

	// Reset form to current settings
	function resetForm() {
		if (naming && isSonarrNaming(naming)) {
			formRename = naming.rename;
			formReplaceIllegalCharacters = naming.replace_illegal_characters;
			formColonReplacement = naming.colon_replacement_format;
			formCustomColonReplacement = naming.custom_colon_replacement_format ?? '';
			formStandardEpisodeFormat = naming.standard_episode_format;
			formDailyEpisodeFormat = naming.daily_episode_format;
			formAnimeEpisodeFormat = naming.anime_episode_format;
			formSeriesFolderFormat = naming.series_folder_format;
			formSeasonFolderFormat = naming.season_folder_format;
			formMultiEpisodeStyle = naming.multi_episode_style;
		} else if (naming && isRadarrNaming(naming)) {
			formRename = naming.rename;
			formReplaceIllegalCharacters = naming.replace_illegal_characters;
			formRadarrColonReplacement = naming.colon_replacement_format;
			formMovieFormat = naming.movie_format;
			formMovieFolderFormat = naming.movie_folder_format;
		}
	}

	function startEditing() {
		resetForm();
		isEditing = true;
	}

	function cancelEditing() {
		resetForm();
		isEditing = false;
	}

	async function handleSaveClick() {
		if (canWriteToBase) {
			showSaveTargetModal = true;
		} else {
			selectedLayer = 'user';
			await tick();
			formElement?.requestSubmit();
		}
	}

	async function handleLayerSelect(event: CustomEvent<'user' | 'base'>) {
		selectedLayer = event.detail;
		showSaveTargetModal = false;
		await tick();
		formElement?.requestSubmit();
	}
</script>

<section>
	<div class="mb-4 flex items-center justify-between">
		<h2 class="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
			Naming
		</h2>
		{#if naming && !isEditing}
			<button
				type="button"
				on:click={startEditing}
				class="flex cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
			>
				<Pencil size={14} />
				Edit
			</button>
		{/if}
	</div>

	{#if !naming}
		<div
			class="rounded-lg border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900"
		>
			<p class="text-neutral-600 dark:text-neutral-400">
				No naming settings configured for {arrType === 'radarr' ? 'Radarr' : 'Sonarr'}
			</p>
		</div>
	{:else if arrType === 'sonarr' && isSonarrNaming(naming) && isEditing}
		<!-- Sonarr Edit Mode -->
		<form
			bind:this={formElement}
			method="POST"
			action="?/updateNaming"
			use:enhance={() => {
				isSaving = true;
				return async ({ result, update }) => {
					if (result.type === 'failure' && result.data) {
						alertStore.add('error', (result.data as { error?: string }).error || 'Failed to save');
					} else if (result.type === 'success') {
						alertStore.add('success', 'Naming settings updated');
						isEditing = false;
					}
					await update();
					isSaving = false;
				};
			}}
		>
			<input type="hidden" name="layer" value={selectedLayer} />

			<div
				class="overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
			>
				<div class="space-y-6 p-4">
					<!-- Rename Episodes -->
					<div>
						<button
							type="button"
							on:click={() => (formRename = !formRename)}
							class="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3 text-left transition-colors hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-600"
						>
							<IconCheckbox icon={Check} checked={formRename} shape="rounded" />
							<div>
								<div class="text-sm font-medium text-neutral-900 dark:text-neutral-100">
									Rename Episodes
								</div>
								<div class="text-xs text-neutral-500 dark:text-neutral-400">
									Rename episode files when importing
								</div>
							</div>
						</button>
						<input type="hidden" name="rename" value={formRename ? 'on' : ''} />
					</div>

					<!-- Replace Illegal Characters -->
					<div>
						<button
							type="button"
							on:click={() => (formReplaceIllegalCharacters = !formReplaceIllegalCharacters)}
							class="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3 text-left transition-colors hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-600"
						>
							<IconCheckbox icon={Check} checked={formReplaceIllegalCharacters} shape="rounded" />
							<div>
								<div class="text-sm font-medium text-neutral-900 dark:text-neutral-100">
									Replace Illegal Characters
								</div>
								<div class="text-xs text-neutral-500 dark:text-neutral-400">
									Replace characters that are not allowed in file names
								</div>
							</div>
						</button>
						<input type="hidden" name="replaceIllegalCharacters" value={formReplaceIllegalCharacters ? 'on' : ''} />
					</div>

					<!-- Colon Replacement (only if Replace Illegal Characters is on) -->
					{#if formReplaceIllegalCharacters}
						<div>
							<span class="mb-3 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
								Colon Replacement
							</span>
							<div class="space-y-2">
								{#each COLON_REPLACEMENT_OPTIONS as option}
									<button
										type="button"
										on:click={() => (formColonReplacement = option.value)}
										class="flex w-full cursor-pointer items-center gap-3 rounded-lg border p-3 text-left transition-colors border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-600"
									>
										<IconCheckbox
											icon={Check}
											checked={formColonReplacement === option.value}
											shape="circle"
										/>
										<div class="text-sm font-medium text-neutral-900 dark:text-neutral-100">
											{option.label}
										</div>
									</button>
								{/each}
							</div>
							<input type="hidden" name="colonReplacement" value={formColonReplacement} />
						</div>

						<!-- Custom Colon Replacement (only if custom is selected) -->
						{#if formColonReplacement === 'custom'}
							<div>
								<label for="customColonReplacement" class="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
									Custom Colon Replacement
								</label>
								<input
									type="text"
									id="customColonReplacement"
									name="customColonReplacement"
									bind:value={formCustomColonReplacement}
									class="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
									placeholder="Enter custom replacement"
								/>
							</div>
						{/if}
					{/if}

					<!-- Standard Episode Format -->
					<div>
						<label for="standardEpisodeFormat" class="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
							Standard Episode Format
						</label>
						<input
							type="text"
							id="standardEpisodeFormat"
							name="standardEpisodeFormat"
							bind:value={formStandardEpisodeFormat}
							class="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 font-mono text-sm text-neutral-900 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
						/>
					</div>

					<!-- Daily Episode Format -->
					<div>
						<label for="dailyEpisodeFormat" class="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
							Daily Episode Format
						</label>
						<input
							type="text"
							id="dailyEpisodeFormat"
							name="dailyEpisodeFormat"
							bind:value={formDailyEpisodeFormat}
							class="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 font-mono text-sm text-neutral-900 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
						/>
					</div>

					<!-- Anime Episode Format -->
					<div>
						<label for="animeEpisodeFormat" class="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
							Anime Episode Format
						</label>
						<input
							type="text"
							id="animeEpisodeFormat"
							name="animeEpisodeFormat"
							bind:value={formAnimeEpisodeFormat}
							class="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 font-mono text-sm text-neutral-900 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
						/>
					</div>

					<!-- Series Folder Format -->
					<div>
						<label for="seriesFolderFormat" class="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
							Series Folder Format
						</label>
						<input
							type="text"
							id="seriesFolderFormat"
							name="seriesFolderFormat"
							bind:value={formSeriesFolderFormat}
							class="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 font-mono text-sm text-neutral-900 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
						/>
					</div>

					<!-- Season Folder Format -->
					<div>
						<label for="seasonFolderFormat" class="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
							Season Folder Format
						</label>
						<input
							type="text"
							id="seasonFolderFormat"
							name="seasonFolderFormat"
							bind:value={formSeasonFolderFormat}
							class="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 font-mono text-sm text-neutral-900 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
						/>
					</div>

					<!-- Multi Episode Style -->
					<div>
						<span class="mb-3 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
							Multi-Episode Style
						</span>
						<div class="space-y-2">
							{#each MULTI_EPISODE_STYLE_OPTIONS as option}
								<button
									type="button"
									on:click={() => (formMultiEpisodeStyle = option.value)}
									class="flex w-full cursor-pointer items-center gap-3 rounded-lg border p-3 text-left transition-colors border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-600"
								>
									<IconCheckbox
										icon={Check}
										checked={formMultiEpisodeStyle === option.value}
										shape="circle"
									/>
									<div class="text-sm font-medium text-neutral-900 dark:text-neutral-100">
										{option.label}
									</div>
								</button>
							{/each}
						</div>
						<input type="hidden" name="multiEpisodeStyle" value={formMultiEpisodeStyle} />
					</div>
				</div>

				<!-- Actions -->
				<div
					class="flex justify-end gap-2 border-t border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-800/50"
				>
					<button
						type="button"
						on:click={cancelEditing}
						disabled={isSaving}
						class="flex cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
					>
						<X size={14} />
						Cancel
					</button>
					<button
						type="button"
						on:click={handleSaveClick}
						disabled={isSaving}
						class="flex cursor-pointer items-center gap-1.5 rounded-lg bg-accent-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-700 disabled:opacity-50 dark:bg-accent-500 dark:hover:bg-accent-600"
					>
						{#if isSaving}
							<Loader2 size={14} class="animate-spin" />
							Saving...
						{:else}
							<Check size={14} />
							Save
						{/if}
					</button>
				</div>
			</div>
		</form>
	{:else if arrType === 'radarr' && naming && isRadarrNaming(naming) && isEditing}
		<!-- Radarr Edit Mode -->
		<form
			bind:this={formElement}
			method="POST"
			action="?/updateNaming"
			use:enhance={() => {
				isSaving = true;
				return async ({ result, update }) => {
					if (result.type === 'failure' && result.data) {
						alertStore.add('error', (result.data as { error?: string }).error || 'Failed to save');
					} else if (result.type === 'success') {
						alertStore.add('success', 'Naming settings updated');
						isEditing = false;
					}
					await update();
					isSaving = false;
				};
			}}
		>
			<input type="hidden" name="layer" value={selectedLayer} />

			<div
				class="overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
			>
				<div class="space-y-6 p-4">
					<!-- Rename Movies -->
					<div>
						<button
							type="button"
							on:click={() => (formRename = !formRename)}
							class="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3 text-left transition-colors hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-600"
						>
							<IconCheckbox icon={Check} checked={formRename} shape="rounded" />
							<div>
								<div class="text-sm font-medium text-neutral-900 dark:text-neutral-100">
									Rename Movies
								</div>
								<div class="text-xs text-neutral-500 dark:text-neutral-400">
									Rename movie files when importing
								</div>
							</div>
						</button>
						<input type="hidden" name="rename" value={formRename ? 'on' : ''} />
					</div>

					<!-- Replace Illegal Characters -->
					<div>
						<button
							type="button"
							on:click={() => (formReplaceIllegalCharacters = !formReplaceIllegalCharacters)}
							class="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3 text-left transition-colors hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-600"
						>
							<IconCheckbox icon={Check} checked={formReplaceIllegalCharacters} shape="rounded" />
							<div>
								<div class="text-sm font-medium text-neutral-900 dark:text-neutral-100">
									Replace Illegal Characters
								</div>
								<div class="text-xs text-neutral-500 dark:text-neutral-400">
									Replace characters that are not allowed in file names
								</div>
							</div>
						</button>
						<input type="hidden" name="replaceIllegalCharacters" value={formReplaceIllegalCharacters ? 'on' : ''} />
					</div>

					<!-- Colon Replacement (only if Replace Illegal Characters is on) -->
					{#if formReplaceIllegalCharacters}
						<div>
							<span class="mb-3 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
								Colon Replacement
							</span>
							<div class="space-y-2">
								{#each RADARR_COLON_REPLACEMENT_OPTIONS as option}
									<button
										type="button"
										on:click={() => (formRadarrColonReplacement = option.value)}
										class="flex w-full cursor-pointer items-center gap-3 rounded-lg border p-3 text-left transition-colors border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-600"
									>
										<IconCheckbox
											icon={Check}
											checked={formRadarrColonReplacement === option.value}
											shape="circle"
										/>
										<div class="text-sm font-medium text-neutral-900 dark:text-neutral-100">
											{option.label}
										</div>
									</button>
								{/each}
							</div>
							<input type="hidden" name="colonReplacement" value={formRadarrColonReplacement} />
						</div>
					{/if}

					<!-- Movie Format -->
					<div>
						<label for="movieFormat" class="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
							Movie Format
						</label>
						<input
							type="text"
							id="movieFormat"
							name="movieFormat"
							bind:value={formMovieFormat}
							class="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 font-mono text-sm text-neutral-900 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
						/>
					</div>

					<!-- Movie Folder Format -->
					<div>
						<label for="movieFolderFormat" class="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
							Movie Folder Format
						</label>
						<input
							type="text"
							id="movieFolderFormat"
							name="movieFolderFormat"
							bind:value={formMovieFolderFormat}
							class="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 font-mono text-sm text-neutral-900 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
						/>
					</div>
				</div>

				<!-- Actions -->
				<div
					class="flex justify-end gap-2 border-t border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-800/50"
				>
					<button
						type="button"
						on:click={cancelEditing}
						disabled={isSaving}
						class="flex cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
					>
						<X size={14} />
						Cancel
					</button>
					<button
						type="button"
						on:click={handleSaveClick}
						disabled={isSaving}
						class="flex cursor-pointer items-center gap-1.5 rounded-lg bg-accent-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-700 disabled:opacity-50 dark:bg-accent-500 dark:hover:bg-accent-600"
					>
						{#if isSaving}
							<Loader2 size={14} class="animate-spin" />
							Saving...
						{:else}
							<Check size={14} />
							Save
						{/if}
					</button>
				</div>
			</div>
		</form>
	{:else}
		<!-- Display Mode -->
		<div
			class="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
		>
			<div class="divide-y divide-neutral-100 dark:divide-neutral-800">
				<!-- Rename toggle -->
				<div class="flex items-center justify-between p-4">
					<div>
						<div class="text-sm font-medium text-neutral-900 dark:text-neutral-100">
							Rename {arrType === 'radarr' ? 'Movies' : 'Episodes'}
						</div>
						<div class="text-xs text-neutral-500 dark:text-neutral-400">
							Rename files when importing
						</div>
					</div>
					<span
						class="rounded-md px-2.5 py-1 text-sm font-medium {naming.rename
							? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
							: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'}"
					>
						{naming.rename ? 'Enabled' : 'Disabled'}
					</span>
				</div>

				<!-- Replace Illegal Characters -->
				<div class="flex items-center justify-between p-4">
					<div>
						<div class="text-sm font-medium text-neutral-900 dark:text-neutral-100">
							Replace Illegal Characters
						</div>
						<div class="text-xs text-neutral-500 dark:text-neutral-400">
							Replace characters not allowed in file names
						</div>
					</div>
					<span
						class="rounded-md px-2.5 py-1 text-sm font-medium {naming.replace_illegal_characters
							? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
							: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'}"
					>
						{naming.replace_illegal_characters ? 'Enabled' : 'Disabled'}
					</span>
				</div>

				{#if arrType === 'sonarr' && isSonarrNaming(naming)}
					<!-- Colon Replacement (only show if replace_illegal_characters is on) -->
					{#if naming.replace_illegal_characters}
						<div class="flex items-center justify-between p-4">
							<div>
								<div class="text-sm font-medium text-neutral-900 dark:text-neutral-100">
									Colon Replacement
								</div>
								<div class="text-xs text-neutral-500 dark:text-neutral-400">
									How to replace colons in file names
								</div>
							</div>
							<span
								class="rounded-md bg-neutral-100 px-2.5 py-1 text-sm font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
							>
								{getColonReplacementLabel(naming.colon_replacement_format)}
								{#if naming.colon_replacement_format === 'custom' && naming.custom_colon_replacement_format}
									<span class="text-neutral-500">({naming.custom_colon_replacement_format})</span>
								{/if}
							</span>
						</div>
					{/if}

					<!-- Standard Episode Format -->
					<div class="p-4">
						<div class="text-sm font-medium text-neutral-900 dark:text-neutral-100">
							Standard Episode Format
						</div>
						<code
							class="mt-2 block break-all rounded bg-neutral-100 px-3 py-2 text-xs text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
						>
							{naming.standard_episode_format}
						</code>
					</div>

					<!-- Daily Episode Format -->
					<div class="p-4">
						<div class="text-sm font-medium text-neutral-900 dark:text-neutral-100">
							Daily Episode Format
						</div>
						<code
							class="mt-2 block break-all rounded bg-neutral-100 px-3 py-2 text-xs text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
						>
							{naming.daily_episode_format}
						</code>
					</div>

					<!-- Anime Episode Format -->
					<div class="p-4">
						<div class="text-sm font-medium text-neutral-900 dark:text-neutral-100">
							Anime Episode Format
						</div>
						<code
							class="mt-2 block break-all rounded bg-neutral-100 px-3 py-2 text-xs text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
						>
							{naming.anime_episode_format}
						</code>
					</div>

					<!-- Series Folder Format -->
					<div class="p-4">
						<div class="text-sm font-medium text-neutral-900 dark:text-neutral-100">
							Series Folder Format
						</div>
						<code
							class="mt-2 block break-all rounded bg-neutral-100 px-3 py-2 text-xs text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
						>
							{naming.series_folder_format}
						</code>
					</div>

					<!-- Season Folder Format -->
					<div class="p-4">
						<div class="text-sm font-medium text-neutral-900 dark:text-neutral-100">
							Season Folder Format
						</div>
						<code
							class="mt-2 block break-all rounded bg-neutral-100 px-3 py-2 text-xs text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
						>
							{naming.season_folder_format}
						</code>
					</div>

					<!-- Multi-Episode Style -->
					<div class="flex items-center justify-between p-4">
						<div>
							<div class="text-sm font-medium text-neutral-900 dark:text-neutral-100">
								Multi-Episode Style
							</div>
							<div class="text-xs text-neutral-500 dark:text-neutral-400">
								How to format multi-episode files
							</div>
						</div>
						<span
							class="rounded-md bg-neutral-100 px-2.5 py-1 text-sm font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
						>
							{getMultiEpisodeStyleLabel(naming.multi_episode_style)}
						</span>
					</div>
				{:else if arrType === 'radarr' && isRadarrNaming(naming)}
					<!-- Radarr-specific fields -->
					<!-- Colon Replacement (only show if replace_illegal_characters is on) -->
					{#if naming.replace_illegal_characters}
						<div class="flex items-center justify-between p-4">
							<div>
								<div class="text-sm font-medium text-neutral-900 dark:text-neutral-100">
									Colon Replacement
								</div>
								<div class="text-xs text-neutral-500 dark:text-neutral-400">
									How to replace colons in file names
								</div>
							</div>
							<span
								class="rounded-md bg-neutral-100 px-2.5 py-1 text-sm font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
							>
								{getRadarrColonReplacementLabel(naming.colon_replacement_format)}
							</span>
						</div>
					{/if}

					<div class="p-4">
						<div class="text-sm font-medium text-neutral-900 dark:text-neutral-100">
							Movie Format
						</div>
						<code
							class="mt-2 block break-all rounded bg-neutral-100 px-3 py-2 text-xs text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
						>
							{naming.movie_format}
						</code>
					</div>

					<div class="p-4">
						<div class="text-sm font-medium text-neutral-900 dark:text-neutral-100">
							Movie Folder Format
						</div>
						<code
							class="mt-2 block break-all rounded bg-neutral-100 px-3 py-2 text-xs text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
						>
							{naming.movie_folder_format}
						</code>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</section>

<!-- Save Target Modal -->
{#if canWriteToBase}
	<SaveTargetModal
		open={showSaveTargetModal}
		mode="save"
		on:select={handleLayerSelect}
		on:cancel={() => (showSaveTargetModal = false)}
	/>
{/if}
