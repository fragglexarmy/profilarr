<script lang="ts">
	import { enhance } from '$app/forms';
	import NumberInput from '$ui/form/NumberInput.svelte';
	import TagInput from '$ui/form/TagInput.svelte';
	import Modal from '$ui/modal/Modal.svelte';
	import SaveTargetModal from '$ui/modal/SaveTargetModal.svelte';
	import { alertStore } from '$alerts/store';
	import { Check, Save, Trash2, Loader2 } from 'lucide-svelte';
	import type { PreferredProtocol } from '$pcd/queries/delayProfiles';

	// Props
	export let mode: 'create' | 'edit';
	export let databaseName: string;
	export let canWriteToBase: boolean = false;
	export let actionUrl: string = '';

	// Form data
	export let name: string = '';
	export let tags: string[] = [];
	export let preferredProtocol: PreferredProtocol = 'prefer_usenet';
	export let usenetDelay: number = 0;
	export let torrentDelay: number = 0;
	export let bypassIfHighestQuality: boolean = false;
	export let bypassIfAboveCfScore: boolean = false;
	export let minimumCfScore: number = 0;

	// Event handlers
	export let onCancel: () => void;

	// Loading states
	let saving = false;
	let deleting = false;

	// Layer selection
	let selectedLayer: 'user' | 'base' = 'user';

	// Modal states
	let showSaveTargetModal = false;
	let showDeleteModal = false;
	let mainFormElement: HTMLFormElement;
	let deleteFormElement: HTMLFormElement;

	// Display text based on mode
	$: title = mode === 'create' ? 'New Delay Profile' : 'Edit Delay Profile';
	$: description =
		mode === 'create'
			? `Create a new delay profile for ${databaseName}`
			: `Update delay profile settings`;
	$: submitButtonText = mode === 'create' ? 'Create Profile' : 'Save Changes';

	// Computed states based on protocol
	$: showUsenetDelay = preferredProtocol !== 'only_torrent';
	$: showTorrentDelay = preferredProtocol !== 'only_usenet';

	const protocolOptions: { value: PreferredProtocol; label: string; description: string }[] = [
		{ value: 'prefer_usenet', label: 'Prefer Usenet', description: 'Try Usenet first, fall back to Torrent' },
		{ value: 'prefer_torrent', label: 'Prefer Torrent', description: 'Try Torrent first, fall back to Usenet' },
		{ value: 'only_usenet', label: 'Only Usenet', description: 'Never use Torrent' },
		{ value: 'only_torrent', label: 'Only Torrent', description: 'Never use Usenet' }
	];

	$: isValid = name.trim() !== '' && tags.length > 0;

	function handleSaveClick() {
		if (canWriteToBase) {
			// Show modal to ask where to save
			showSaveTargetModal = true;
		} else {
			// No choice, just submit with 'user' layer
			selectedLayer = 'user';
			mainFormElement?.requestSubmit();
		}
	}

	function handleLayerSelect(event: CustomEvent<'user' | 'base'>) {
		selectedLayer = event.detail;
		showSaveTargetModal = false;
		mainFormElement?.requestSubmit();
	}
</script>

<div class="space-y-8 p-8">
	<!-- Header -->
	<div class="space-y-3">
		<h1 class="text-3xl font-bold text-neutral-900 dark:text-neutral-50">{title}</h1>
		<p class="text-lg text-neutral-600 dark:text-neutral-400">
			{description}
		</p>
	</div>

	<form
		bind:this={mainFormElement}
		method="POST"
		action={actionUrl}
		use:enhance={() => {
			saving = true;
			return async ({ result, update }) => {
				if (result.type === 'failure' && result.data) {
					alertStore.add('error', (result.data as { error?: string }).error || 'Operation failed');
				} else if (result.type === 'redirect') {
					alertStore.add('success', mode === 'create' ? 'Delay profile created!' : 'Delay profile updated!');
				}
				await update();
				saving = false;
			};
		}}
	>
		<!-- Hidden fields for form data -->
		<input type="hidden" name="tags" value={JSON.stringify(tags)} />
		<input type="hidden" name="preferredProtocol" value={preferredProtocol} />
		<input type="hidden" name="usenetDelay" value={usenetDelay} />
		<input type="hidden" name="torrentDelay" value={torrentDelay} />
		<input type="hidden" name="bypassIfHighestQuality" value={bypassIfHighestQuality} />
		<input type="hidden" name="bypassIfAboveCfScore" value={bypassIfAboveCfScore} />
		<input type="hidden" name="minimumCfScore" value={minimumCfScore} />
		<input type="hidden" name="layer" value={selectedLayer} />

		<!-- Basic Info Section -->
		<div class="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
			<h2 class="mb-4 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
				Basic Info
			</h2>

			<div class="space-y-4">
				<!-- Name -->
				<div>
					<label for="name" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
						Name <span class="text-red-500">*</span>
					</label>
					<input
						type="text"
						id="name"
						name="name"
						bind:value={name}
						placeholder="e.g., Standard Delay"
						class="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
					/>
				</div>

				<!-- Tags -->
				<div>
					<label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
						Tags <span class="text-red-500">*</span>
					</label>
					<p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
						Delay profiles apply to items with matching tags
					</p>
					<div class="mt-2">
						<TagInput bind:tags placeholder="Add tags..." />
					</div>
				</div>
			</div>
		</div>

		<!-- Protocol Preference Section -->
		<div class="mt-8 rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
			<h2 class="mb-4 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
				Protocol Preference
			</h2>

			<div class="grid gap-2">
				{#each protocolOptions as option}
					<button
						type="button"
						on:click={() => (preferredProtocol = option.value)}
						class="flex items-center gap-3 rounded-lg border p-3 text-left transition-colors {preferredProtocol === option.value
							? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950'
							: 'border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-600'}"
					>
						<div class="flex h-5 w-5 items-center justify-center rounded-full border-2 {preferredProtocol === option.value
							? 'border-blue-500 bg-blue-500 dark:border-blue-400 dark:bg-blue-400'
							: 'border-neutral-300 dark:border-neutral-600'}">
							{#if preferredProtocol === option.value}
								<Check size={12} class="text-white" />
							{/if}
						</div>
						<div>
							<div class="text-sm font-medium text-neutral-900 dark:text-neutral-100">{option.label}</div>
							<div class="text-xs text-neutral-500 dark:text-neutral-400">{option.description}</div>
						</div>
					</button>
				{/each}
			</div>
		</div>

		<!-- Delays Section -->
		<div class="mt-8 rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
			<h2 class="mb-4 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
				Delays
			</h2>
			<p class="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
				Time to wait before downloading from each source. Set to 0 for no delay.
			</p>

			<div class="grid gap-4 sm:grid-cols-2">
				{#if showUsenetDelay}
					<div>
						<label for="usenet-delay" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
							Usenet Delay (minutes)
						</label>
						<div class="mt-1">
							<NumberInput
								name="usenet-delay"
								id="usenet-delay"
								bind:value={usenetDelay}
								min={0}
								font="mono"
							/>
						</div>
					</div>
				{/if}

				{#if showTorrentDelay}
					<div>
						<label for="torrent-delay" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
							Torrent Delay (minutes)
						</label>
						<div class="mt-1">
							<NumberInput
								name="torrent-delay"
								id="torrent-delay"
								bind:value={torrentDelay}
								min={0}
								font="mono"
							/>
						</div>
					</div>
				{/if}
			</div>
		</div>

		<!-- Bypass Conditions Section -->
		<div class="mt-8 rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
			<h2 class="mb-4 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
				Bypass Conditions
			</h2>
			<p class="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
				Skip the delay when these conditions are met.
			</p>

			<div class="space-y-3">
				<!-- Bypass if highest quality -->
				<label class="flex cursor-pointer items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3 transition-colors hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-600">
					<input
						type="checkbox"
						bind:checked={bypassIfHighestQuality}
						class="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-700"
					/>
					<div>
						<div class="text-sm font-medium text-neutral-900 dark:text-neutral-100">Bypass if Highest Quality</div>
						<div class="text-xs text-neutral-500 dark:text-neutral-400">Skip delay when release is already the highest quality in profile</div>
					</div>
				</label>

				<!-- Bypass if above CF score -->
				<div class="rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-800">
					<label class="flex cursor-pointer items-center gap-3">
						<input
							type="checkbox"
							bind:checked={bypassIfAboveCfScore}
							class="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-700"
						/>
						<div>
							<div class="text-sm font-medium text-neutral-900 dark:text-neutral-100">Bypass if Above Custom Format Score</div>
							<div class="text-xs text-neutral-500 dark:text-neutral-400">Skip delay when release exceeds minimum score</div>
						</div>
					</label>

					{#if bypassIfAboveCfScore}
						<div class="mt-3 pl-7">
							<label for="min-cf-score" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
								Minimum Score
							</label>
							<div class="mt-1 w-32">
								<NumberInput
									name="min-cf-score"
									id="min-cf-score"
									bind:value={minimumCfScore}
									font="mono"
								/>
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Actions -->
		<div class="mt-8 flex flex-wrap items-center justify-between gap-3">
			<!-- Left side: Delete (only in edit mode) -->
			<div>
				{#if mode === 'edit'}
					<button
						type="button"
						on:click={() => (showDeleteModal = true)}
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
					on:click={onCancel}
					class="flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
				>
					Cancel
				</button>
				<button
					type="button"
					disabled={saving || !isValid}
					on:click={handleSaveClick}
					class="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
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
						alertStore.add('error', (result.data as { error?: string }).error || 'Failed to delete');
					} else if (result.type === 'redirect') {
						alertStore.add('success', 'Delay profile deleted');
					}
					await update();
					deleting = false;
				};
			}}
		>
		</form>
	{/if}
</div>

<!-- Delete Confirmation Modal -->
{#if mode === 'edit'}
	<Modal
		open={showDeleteModal}
		header="Delete Delay Profile"
		bodyMessage={`Are you sure you want to delete "${name}"? This action cannot be undone.`}
		confirmText="Delete"
		cancelText="Cancel"
		confirmDanger={true}
		on:confirm={() => {
			showDeleteModal = false;
			deleteFormElement?.requestSubmit();
		}}
		on:cancel={() => (showDeleteModal = false)}
	/>
{/if}

<!-- Save Target Modal -->
{#if canWriteToBase}
	<SaveTargetModal
		open={showSaveTargetModal}
		on:select={handleLayerSelect}
		on:cancel={() => (showSaveTargetModal = false)}
	/>
{/if}
