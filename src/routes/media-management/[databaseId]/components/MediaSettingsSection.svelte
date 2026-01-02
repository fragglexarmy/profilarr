<script lang="ts">
	import { enhance } from '$app/forms';
	import { tick } from 'svelte';
	import { Check, Pencil, X, Loader2 } from 'lucide-svelte';
	import { alertStore } from '$lib/client/alerts/store';
	import IconCheckbox from '$ui/form/IconCheckbox.svelte';
	import SaveTargetModal from '$ui/modal/SaveTargetModal.svelte';
	import {
		PROPERS_REPACKS_OPTIONS,
		getPropersRepacksLabel,
		type PropersRepacks,
		type MediaSettings
	} from '$lib/shared/mediaManagement';

	export let settings: MediaSettings | null;
	export let arrType: 'radarr' | 'sonarr';
	export let canWriteToBase: boolean = false;

	// Edit mode state
	let isEditing = false;
	let isSaving = false;

	// Layer selection
	let selectedLayer: 'user' | 'base' = 'user';
	let showSaveTargetModal = false;
	let formElement: HTMLFormElement;

	// Form values (initialized from settings)
	let formPropersRepacks: PropersRepacks = settings?.propers_repacks ?? 'doNotPrefer';
	let formEnableMediaInfo: boolean = settings?.enable_media_info ?? true;

	// Reset form to current settings
	function resetForm() {
		formPropersRepacks = settings?.propers_repacks ?? 'doNotPrefer';
		formEnableMediaInfo = settings?.enable_media_info ?? true;
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
			Media Settings
		</h2>
		{#if settings && !isEditing}
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

	{#if !settings}
		<div
			class="rounded-lg border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900"
		>
			<p class="text-neutral-600 dark:text-neutral-400">
				No media settings configured for {arrType === 'radarr' ? 'Radarr' : 'Sonarr'}
			</p>
		</div>
	{:else if isEditing}
		<!-- Edit Mode -->
		<form
			bind:this={formElement}
			method="POST"
			action="?/updateMediaSettings"
			use:enhance={() => {
				isSaving = true;
				return async ({ result, update }) => {
					if (result.type === 'failure' && result.data) {
						alertStore.add('error', (result.data as { error?: string }).error || 'Failed to save');
					} else if (result.type === 'success') {
						alertStore.add('success', 'Media settings updated');
						isEditing = false;
					}
					await update();
					isSaving = false;
				};
			}}
		>
			<input type="hidden" name="arrType" value={arrType} />
			<input type="hidden" name="layer" value={selectedLayer} />

			<div
				class="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
			>
				<div class="space-y-6 p-4">
					<!-- Propers and Repacks -->
					<div>
						<p class="mb-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">
							Propers and Repacks
						</p>
						<div class="space-y-2">
							{#each PROPERS_REPACKS_OPTIONS as option}
								<button
									type="button"
									on:click={() => (formPropersRepacks = option.value)}
									class="flex w-full cursor-pointer items-center gap-3 rounded-lg border p-3 text-left transition-colors border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-600"
								>
									<IconCheckbox
										icon={Check}
										checked={formPropersRepacks === option.value}
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
						<input type="hidden" name="propersRepacks" value={formPropersRepacks} />
					</div>

					<!-- Enable Media Info -->
					<div>
						<button
							type="button"
							on:click={() => (formEnableMediaInfo = !formEnableMediaInfo)}
							class="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3 text-left transition-colors hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-600"
						>
							<IconCheckbox
								icon={Check}
								checked={formEnableMediaInfo}
								shape="rounded"
							/>
							<div>
								<div class="text-sm font-medium text-neutral-900 dark:text-neutral-100">
									Analyse video files
								</div>
								<div class="text-xs text-neutral-500 dark:text-neutral-400">
									Extract media information like resolution, runtime, and codecs from video files
								</div>
							</div>
						</button>
						<input type="hidden" name="enableMediaInfo" value={formEnableMediaInfo ? 'on' : ''} />
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
				<!-- Propers and Repacks -->
				<div class="flex items-center justify-between p-4">
					<div>
						<div class="text-sm font-medium text-neutral-900 dark:text-neutral-100">
							Propers and Repacks
						</div>
						<div class="text-xs text-neutral-500 dark:text-neutral-400">
							How to handle proper and repack releases
						</div>
					</div>
					<span
						class="rounded-md bg-neutral-100 px-2.5 py-1 text-sm font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
					>
						{getPropersRepacksLabel(settings.propers_repacks)}
					</span>
				</div>

				<!-- Enable Media Info -->
				<div class="flex items-center justify-between p-4">
					<div>
						<div class="text-sm font-medium text-neutral-900 dark:text-neutral-100">
							Analyse video files
						</div>
						<div class="text-xs text-neutral-500 dark:text-neutral-400">
							Extract media information from video files
						</div>
					</div>
					<span
						class="rounded-md px-2.5 py-1 text-sm font-medium {settings.enable_media_info
							? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
							: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'}"
					>
						{settings.enable_media_info ? 'Enabled' : 'Disabled'}
					</span>
				</div>
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
