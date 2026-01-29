<script lang="ts">
	import { enhance } from '$app/forms';
	import { tick } from 'svelte';
	import StickyCard from '$ui/card/StickyCard.svelte';
	import Button from '$ui/button/Button.svelte';
	import IconCheckbox from '$ui/form/IconCheckbox.svelte';
	import { alertStore } from '$alerts/store';
	import { Check, Save, Trash2 } from 'lucide-svelte';
	import { current, isDirty, initEdit, initCreate, update } from '$lib/client/stores/dirty';
	import type { RadarrMediaSettingsRow } from '$shared/pcd/display.ts';
	import type { ArrType } from '$shared/pcd/types.ts';
	import { PROPERS_REPACKS_OPTIONS, type PropersRepacks } from '$shared/pcd/mediaManagement.ts';

	interface RadarrMediaSettingsRowFormData {
		name: string;
		propersRepacks: PropersRepacks;
		enableMediaInfo: boolean;
		[key: string]: unknown;
	}

	export let mode: 'create' | 'edit';
	export let arrType: ArrType;
	export let databaseName: string;
	export let canWriteToBase: boolean = false;
	export let actionUrl: string = '';
	export let initialData: RadarrMediaSettingsRow | null;

	const defaults: RadarrMediaSettingsRowFormData = {
		name: '',
		propersRepacks: 'doNotPrefer',
		enableMediaInfo: true
	};

	function mapToFormData(data: RadarrMediaSettingsRow | null): RadarrMediaSettingsRowFormData {
		if (!data) return defaults;
		return {
			name: data.name,
			propersRepacks: data.propers_repacks,
			enableMediaInfo: data.enable_media_info
		};
	}

	if (mode === 'create') {
		initCreate(mapToFormData(initialData));
	} else {
		initEdit(mapToFormData(initialData));
	}

	$: formData = $current as RadarrMediaSettingsRowFormData;

	let saving = false;
	let deleting = false;
	let selectedLayer: 'user' | 'base' = canWriteToBase ? 'base' : 'user';
	let mainFormElement: HTMLFormElement;
	let deleteFormElement: HTMLFormElement;

	$: arrLabel = arrType === 'radarr' ? 'Radarr' : 'Sonarr';
	$: title = mode === 'create' ? `New ${arrLabel} Media Settings` : `Edit ${arrLabel} Media Settings`;
	$: description =
		mode === 'create'
			? `Create a new ${arrLabel} media settings configuration for ${databaseName}`
			: `Update ${arrLabel} media settings configuration`;
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
		</div>

		<hr class="border-neutral-200 dark:border-neutral-700" />

		<!-- Propers and Repacks -->
		<div class="space-y-4">
			<h2 class="text-base font-semibold text-neutral-900 dark:text-neutral-100">Propers and Repacks</h2>
			<div class="grid gap-2">
				{#each PROPERS_REPACKS_OPTIONS as option}
					<button
						type="button"
						onclick={() => update('propersRepacks', option.value)}
						class="flex items-start gap-3 rounded-lg border p-3 text-left transition-colors {formData.propersRepacks ===
						option.value
							? 'border-accent-500 bg-accent-50 dark:border-accent-400 dark:bg-accent-950'
							: 'border-neutral-200 bg-neutral-50 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-600'}"
					>
						<div
							class="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 {formData.propersRepacks ===
							option.value
								? 'border-accent-500 bg-accent-500 dark:border-accent-400 dark:bg-accent-400'
								: 'border-neutral-300 dark:border-neutral-600'}"
						>
							{#if formData.propersRepacks === option.value}
								<Check size={12} class="text-white" />
							{/if}
						</div>
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

		<hr class="border-neutral-200 dark:border-neutral-700" />

		<!-- Media Info -->
		<div class="space-y-4">
			<h2 class="text-base font-semibold text-neutral-900 dark:text-neutral-100">File Analysis</h2>

			<button
				type="button"
				onclick={() => update('enableMediaInfo', !formData.enableMediaInfo)}
				class="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-left transition-colors hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-600"
			>
				<IconCheckbox checked={formData.enableMediaInfo} icon={Check} on:click={() => update('enableMediaInfo', !formData.enableMediaInfo)} />
				<div>
					<div class="text-sm font-medium text-neutral-900 dark:text-neutral-100">
						Enable Media Info
					</div>
					<div class="text-xs text-neutral-500 dark:text-neutral-400">
						Scan files to extract media information (codec, resolution, audio tracks, etc.)
					</div>
				</div>
			</button>
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
					mode === 'create' ? 'Media settings created!' : 'Media settings updated!'
				);
				initEdit(formData);
			}
			await formUpdate();
			saving = false;
		};
	}}
>
	<input type="hidden" name="arrType" value={arrType} />
	<input type="hidden" name="name" value={formData.name} />
	<input type="hidden" name="propersRepacks" value={formData.propersRepacks} />
	<input type="hidden" name="enableMediaInfo" value={formData.enableMediaInfo} />
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
					alertStore.add('success', 'Media settings deleted');
				}
				await formUpdate();
				deleting = false;
			};
		}}
	>
		<input type="hidden" name="layer" value={selectedLayer} />
	</form>
{/if}
