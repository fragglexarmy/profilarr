<script lang="ts">
	import { enhance } from '$app/forms';
	import { tick } from 'svelte';
	import NumberInput from '$ui/form/NumberInput.svelte';
	import SaveTargetModal from '$ui/modal/SaveTargetModal.svelte';
	import StickyCard from '$ui/card/StickyCard.svelte';
	import Button from '$ui/button/Button.svelte';
	import { alertStore } from '$alerts/store';
	import { Check, Save, Trash2, Loader2 } from 'lucide-svelte';
	import type { PreferredProtocol } from '$shared/pcd/display.ts';
	import { current, isDirty, initEdit, initCreate, update } from '$lib/client/stores/dirty';

	// Form data shape
	interface DelayProfileFormData {
		name: string;
		preferredProtocol: PreferredProtocol;
		usenetDelay: number;
		torrentDelay: number;
		bypassIfHighestQuality: boolean;
		bypassIfAboveCfScore: boolean;
		minimumCfScore: number;
		[key: string]: unknown;
	}

	// Props
	export let mode: 'create' | 'edit';
	export let databaseName: string;
	export let canWriteToBase: boolean = false;
	export let actionUrl: string = '';
	export let initialData: DelayProfileFormData;

	// Event handlers
	export let onCancel: () => void;

	const defaults: DelayProfileFormData = {
		name: '',
		preferredProtocol: 'prefer_usenet',
		usenetDelay: 0,
		torrentDelay: 0,
		bypassIfHighestQuality: false,
		bypassIfAboveCfScore: false,
		minimumCfScore: 0
	};

	if (mode === 'create') {
		initCreate(initialData ?? defaults);
	} else {
		initEdit(initialData);
	}

	// Typed accessor for current form data
	$: formData = $current as DelayProfileFormData;

	// Loading states
	let saving = false;
	let deleting = false;

	// Layer selection
	let selectedLayer: 'user' | 'base' = 'user';

	// Modal states
	let showSaveTargetModal = false;
	let showDeleteTargetModal = false;
	let mainFormElement: HTMLFormElement;
	let deleteFormElement: HTMLFormElement;

	// Delete layer selection
	let deleteLayer: 'user' | 'base' = 'user';

	// Display text based on mode
	$: title = mode === 'create' ? 'New Delay Profile' : 'Edit Delay Profile';
	$: description =
		mode === 'create'
			? `Create a new delay profile for ${databaseName}`
			: `Update delay profile settings`;
	$: submitButtonText = mode === 'create' ? 'Create Profile' : 'Save Changes';

	// Computed states based on protocol
	$: showUsenetDelay = formData.preferredProtocol !== 'only_torrent';
	$: showTorrentDelay = formData.preferredProtocol !== 'only_usenet';

	const protocolOptions: { value: PreferredProtocol; label: string; description: string }[] = [
		{
			value: 'prefer_usenet',
			label: 'Prefer Usenet',
			description: 'Try Usenet first, fall back to Torrent'
		},
		{
			value: 'prefer_torrent',
			label: 'Prefer Torrent',
			description: 'Try Torrent first, fall back to Usenet'
		},
		{ value: 'only_usenet', label: 'Only Usenet', description: 'Never use Torrent' },
		{ value: 'only_torrent', label: 'Only Torrent', description: 'Never use Usenet' }
	];

	$: isValid = formData.name.trim() !== '';

	async function handleSaveClick() {
		if (canWriteToBase) {
			// Show modal to ask where to save
			showSaveTargetModal = true;
		} else {
			// No choice, just submit with 'user' layer
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
	<StickyCard position="top">
		<svelte:fragment slot="left">
			<div>
				<h2 class="text-lg font-semibold text-neutral-900 dark:text-neutral-50">{title}</h2>
				<p class="text-sm text-neutral-600 dark:text-neutral-400">{description}</p>
			</div>
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
				<Button text="Cancel" on:click={onCancel} />
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
			return async ({ result, update }) => {
				if (result.type === 'failure' && result.data) {
					alertStore.add('error', (result.data as { error?: string }).error || 'Operation failed');
				} else if (result.type === 'redirect') {
					alertStore.add(
						'success',
						mode === 'create' ? 'Delay profile created!' : 'Delay profile updated!'
					);
					// Mark as clean so navigation guard doesn't trigger
					// Don't call clear() - component is still mounted and needs valid data
					initEdit(formData);
				}
				await update();
				saving = false;
			};
		}}
	>
		<!-- Hidden fields for form data -->
		<input type="hidden" name="preferredProtocol" value={formData.preferredProtocol} />
		<input type="hidden" name="usenetDelay" value={formData.usenetDelay} />
		<input type="hidden" name="torrentDelay" value={formData.torrentDelay} />
		<input type="hidden" name="bypassIfHighestQuality" value={formData.bypassIfHighestQuality} />
		<input type="hidden" name="bypassIfAboveCfScore" value={formData.bypassIfAboveCfScore} />
		<input type="hidden" name="minimumCfScore" value={formData.minimumCfScore} />
		<input type="hidden" name="layer" value={selectedLayer} />

		<div class="space-y-6 pb-12">
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
					placeholder="e.g., Standard Delay"
					class="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-accent-500 focus:ring-1 focus:ring-accent-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
				/>
			</div>

			<!-- Protocol Preference -->
			<div>
				<h3 class="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
					Protocol Preference
				</h3>
				<div class="mt-2 grid gap-2">
					{#each protocolOptions as option}
						<button
							type="button"
							onclick={() => update('preferredProtocol', option.value)}
							class="flex items-center gap-3 rounded-lg border p-3 text-left transition-colors {formData.preferredProtocol ===
							option.value
								? 'border-accent-500 bg-accent-50 dark:border-accent-400 dark:bg-accent-950'
								: 'border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-600'}"
						>
							<div
								class="flex h-5 w-5 items-center justify-center rounded-full border-2 {formData.preferredProtocol ===
								option.value
									? 'border-accent-500 bg-accent-500 dark:border-accent-400 dark:bg-accent-400'
									: 'border-neutral-300 dark:border-neutral-600'}"
							>
								{#if formData.preferredProtocol === option.value}
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

			<!-- Delays -->
			<div>
				<h3 class="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Delays</h3>
				<p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
					Time to wait before downloading from each source. Set to 0 for no delay.
				</p>
				<div class="mt-3 grid gap-4 sm:grid-cols-2">
					{#if showUsenetDelay}
						<div>
							<label
								for="usenet-delay"
								class="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
							>
								Usenet Delay (minutes)
							</label>
							<div class="mt-1">
								<NumberInput
									name="usenet-delay"
									id="usenet-delay"
									value={formData.usenetDelay}
									onchange={(v) => update('usenetDelay', v)}
									min={0}
									font="mono"
								/>
							</div>
						</div>
					{/if}

					{#if showTorrentDelay}
						<div>
							<label
								for="torrent-delay"
								class="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
							>
								Torrent Delay (minutes)
							</label>
							<div class="mt-1">
								<NumberInput
									name="torrent-delay"
									id="torrent-delay"
									value={formData.torrentDelay}
									onchange={(v) => update('torrentDelay', v)}
									min={0}
									font="mono"
								/>
							</div>
						</div>
					{/if}
				</div>
			</div>

			<!-- Bypass Conditions -->
			<div>
				<h3 class="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
					Bypass Conditions
				</h3>
				<p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
					Skip the delay when these conditions are met.
				</p>
				<div class="mt-3 space-y-3">
					<label
						class="flex cursor-pointer items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3 transition-colors hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-600"
					>
						<input
							type="checkbox"
							checked={formData.bypassIfHighestQuality}
							onchange={(e) => update('bypassIfHighestQuality', e.currentTarget.checked)}
							class="h-4 w-4 rounded border-neutral-300 text-accent-600 focus:ring-accent-500 dark:border-neutral-600 dark:bg-neutral-700"
						/>
						<div>
							<div class="text-sm font-medium text-neutral-900 dark:text-neutral-100">
								Bypass if Highest Quality
							</div>
							<div class="text-xs text-neutral-500 dark:text-neutral-400">
								Skip delay when release is already the highest quality in profile
							</div>
						</div>
					</label>

					<div
						class="rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-800"
					>
						<label class="flex cursor-pointer items-center gap-3">
							<input
								type="checkbox"
								checked={formData.bypassIfAboveCfScore}
								onchange={(e) => update('bypassIfAboveCfScore', e.currentTarget.checked)}
								class="h-4 w-4 rounded border-neutral-300 text-accent-600 focus:ring-accent-500 dark:border-neutral-600 dark:bg-neutral-700"
							/>
							<div>
								<div class="text-sm font-medium text-neutral-900 dark:text-neutral-100">
									Bypass if Above Custom Format Score
								</div>
								<div class="text-xs text-neutral-500 dark:text-neutral-400">
									Skip delay when release exceeds minimum score
								</div>
							</div>
						</label>

						{#if formData.bypassIfAboveCfScore}
							<div class="mt-3 pl-7">
								<label
									for="min-cf-score"
									class="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
								>
									Minimum Score
								</label>
								<div class="mt-1 w-32">
									<NumberInput
										name="min-cf-score"
										id="min-cf-score"
										value={formData.minimumCfScore}
										onchange={(v) => update('minimumCfScore', v)}
										font="mono"
									/>
								</div>
							</div>
						{/if}
					</div>
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
				return async ({ result, update }) => {
					if (result.type === 'failure' && result.data) {
						alertStore.add(
							'error',
							(result.data as { error?: string }).error || 'Failed to delete'
						);
					} else if (result.type === 'redirect') {
						alertStore.add('success', 'Delay profile deleted');
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
