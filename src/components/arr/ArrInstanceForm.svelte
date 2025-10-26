<script lang="ts">
	import { Check, X, Loader2, Save, Wifi, Trash2 } from 'lucide-svelte';
	import { apiRequest } from '$api';
	import TagInput from '$components/form/TagInput.svelte';
	import Modal from '$components/modal/Modal.svelte';
	import { enhance } from '$app/forms';
	import { toastStore } from '$stores/toast';
	import type { ArrInstance } from '$db/queries/arrInstances.ts';

	// Props
	export let mode: 'create' | 'edit';
	export let instance: ArrInstance | undefined = undefined;
	export let initialType: string = '';
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	export let form: any = undefined;

	// Parse tags from JSON string
	const parseTags = (tagsJson: string | null): string[] => {
		if (!tagsJson) return [];
		try {
			return JSON.parse(tagsJson);
		} catch {
			return [];
		}
	};

	// Form values
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let name = (form as any)?.values?.name ?? (mode === 'edit' ? instance?.name : '') ?? '';
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let type = mode === 'edit' ? instance?.type : ((form as any)?.values?.type ?? initialType ?? '');
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let url = (form as any)?.values?.url ?? (mode === 'edit' ? instance?.url : '') ?? '';
	let apiKey = ''; // Never pre-populate API key for security
	let tags: string[] = mode === 'edit' && instance ? parseTags(instance.tags) : [];

	// Connection test state
	type ConnectionStatus = 'idle' | 'testing' | 'success' | 'error';
	let connectionStatus: ConnectionStatus = 'idle';
	let connectionError = '';

	// Delete modal state
	let showDeleteModal = false;
	let deleteFormElement: HTMLFormElement;

	// Test connection function
	async function testConnection() {
		// Validation
		if (!type || !url || !apiKey) {
			connectionError = 'Please fill in Type, URL, and API Key';
			connectionStatus = 'error';
			return;
		}

		connectionStatus = 'testing';
		connectionError = '';

		try {
			await apiRequest<{ success: boolean; error?: string }>('/arr/test', {
				method: 'POST',
				body: JSON.stringify({ type, url, apiKey }),
				showSuccessToast: true,
				successMessage: 'Connection successful!'
			});

			connectionStatus = 'success';
		} catch (error) {
			connectionStatus = 'error';
			connectionError = error instanceof Error ? error.message : 'Connection test failed';
		}
	}

	// Reset connection status when form fields change
	function resetConnectionStatus() {
		if (connectionStatus !== 'idle') {
			connectionStatus = 'idle';
			connectionError = '';
		}
	}

	$: canSubmit = connectionStatus === 'success';

	// Display text based on mode
	$: title = mode === 'create' ? 'Add Arr Instance' : 'Edit Instance';
	$: description =
		mode === 'create'
			? 'Configure a new Radarr, Sonarr, Lidarr, or Chaptarr instance'
			: `Update the configuration for ${instance?.name || 'this instance'}`;
	$: submitButtonText = mode === 'create' ? 'Save' : 'Save';
	$: successMessage =
		mode === 'create' ? 'Instance created successfully!' : 'Instance updated successfully!';
	$: errorMessage = mode === 'create' ? 'Failed to save instance' : 'Failed to update instance';
</script>

<div class="space-y-8 p-8">
	<div class="space-y-3">
		<h1 class="text-3xl font-bold text-neutral-900 dark:text-neutral-50">{title}</h1>
		<p class="text-lg text-neutral-600 dark:text-neutral-400">
			{description}
		</p>
	</div>

	<form
		method="POST"
		class="space-y-6"
		use:enhance={() => {
			return async ({ result, update }) => {
				if (result.type === 'failure' && result.data) {
					toastStore.add('error', (result.data as { error?: string }).error || errorMessage);
				} else if (result.type === 'redirect') {
					toastStore.add('success', successMessage);
				}
				await update();
			};
		}}
	>
		<!-- Instance Details -->
		<div
			class="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900"
		>
			<h2 class="mb-4 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
				Instance Details
			</h2>

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
						bind:value={name}
						required
						placeholder="e.g., Main Radarr, 4K Sonarr"
						class="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
					/>
				</div>

				<!-- Type -->
				<div>
					<label
						for="type"
						class="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
					>
						Type <span class="text-red-500">*</span>
					</label>
					{#if mode === 'edit'}
						<input
							type="text"
							id="type"
							name="type"
							value={type.charAt(0).toUpperCase() + type.slice(1)}
							disabled
							class="mt-1 block w-full rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm text-neutral-500 disabled:cursor-not-allowed dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400"
						/>
						<p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
							Type cannot be changed after creation
						</p>
						<input type="hidden" name="type" value={type} />
					{:else}
						<select
							id="type"
							name="type"
							bind:value={type}
							on:change={resetConnectionStatus}
							required
							class="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
						>
							<option value="">Select type...</option>
							<option value="radarr">Radarr</option>
							<option value="sonarr">Sonarr</option>
							<option value="lidarr">Lidarr</option>
							<option value="chaptarr">Chaptarr</option>
						</select>
					{/if}
				</div>
			</div>
		</div>

		<!-- Connection -->
		<div
			class="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900"
		>
			<h2 class="mb-4 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
				Connection Settings
			</h2>

			<div class="space-y-4">
				<!-- URL -->
				<div>
					<label
						for="url"
						class="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
					>
						URL <span class="text-red-500">*</span>
					</label>
					<input
						type="url"
						id="url"
						name="url"
						bind:value={url}
						on:input={resetConnectionStatus}
						required
						placeholder="http://localhost:7878"
						class="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
					/>
				</div>

				<!-- API Key -->
				<div>
					<label
						for="api_key"
						class="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
					>
						API Key <span class="text-red-500">*</span>
					</label>
					<input
						type="text"
						id="api_key"
						name="api_key"
						bind:value={apiKey}
						on:input={resetConnectionStatus}
						required
						placeholder={mode === 'edit' ? 'Enter API key to test connection' : 'Enter API key'}
						class="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-mono text-neutral-900 placeholder-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
					/>
					{#if mode === 'edit'}
						<p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
							Re-enter API key to update or test connection
						</p>
					{/if}
				</div>
			</div>

			<div class="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div class="space-y-1 text-sm">
					{#if connectionStatus === 'success'}
						<p class="text-green-600 dark:text-green-400">
							Connection test passed! You can now save this instance.
						</p>
					{/if}
					{#if connectionStatus === 'error'}
						<p class="text-red-600 dark:text-red-400">
							{connectionError}
						</p>
					{/if}
					{#if !canSubmit && connectionStatus !== 'success'}
						<p class="text-neutral-600 dark:text-neutral-400">
							Please test the connection before saving
						</p>
					{/if}
				</div>

				<button
					type="button"
					on:click={testConnection}
					disabled={connectionStatus === 'testing'}
					class="flex items-center gap-2 self-start rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
				>
					{#if connectionStatus === 'testing'}
						<Loader2 size={14} class="animate-spin" />
						Testing...
					{:else if connectionStatus === 'success'}
						<Check size={14} class="text-green-600 dark:text-green-400" />
						Connected
					{:else if connectionStatus === 'error'}
						<X size={14} class="text-red-600 dark:text-red-400" />
						Test Again
					{:else}
						<Wifi size={14} />
						Test Connection
					{/if}
				</button>
			</div>
		</div>

		<!-- Tags -->
		<div
			class="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900"
		>
			<h2 class="mb-4 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
				Tags
			</h2>

			<label
				for="tags-input"
				class="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
			>
				Optional Tags
			</label>
			<div class="mt-1">
				<TagInput bind:tags />
			</div>
			<p class="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
				Press Enter to add a tag, Backspace to remove.
			</p>
			<input type="hidden" name="tags" value={tags.length > 0 ? JSON.stringify(tags) : ''} />
		</div>

		<!-- Actions -->
		<div class="flex flex-wrap items-center justify-end gap-3">
			{#if mode === 'edit'}
				<a
					href="/arr/{type}/{instance?.id}"
					data-sveltekit-reload
					class="flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
				>
					Cancel
				</a>
			{/if}
			<button
				type="submit"
				disabled={!canSubmit}
				class="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
			>
				<Save size={14} />
				{submitButtonText}
			</button>
		</div>
	</form>

	<!-- Delete Section (Edit Mode Only) -->
	{#if mode === 'edit'}
		<div
			class="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-950/40"
		>
			<h2 class="text-lg font-semibold text-red-700 dark:text-red-300">Danger Zone</h2>
			<p class="mt-2 text-sm text-red-600 dark:text-red-400">
				Once you delete this instance, there is no going back. Please be certain.
			</p>
			<button
				type="button"
				on:click={() => (showDeleteModal = true)}
				class="mt-4 flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 dark:border-red-700 dark:bg-neutral-900 dark:text-red-300 dark:hover:bg-red-900"
			>
				<Trash2 size={14} />
				Delete Instance
			</button>

			<form
				bind:this={deleteFormElement}
				method="POST"
				action="?/delete"
				class="hidden"
				use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === 'failure' && result.data) {
							toastStore.add(
								'error',
								(result.data as { error?: string }).error || 'Failed to delete instance'
							);
						} else if (result.type === 'redirect') {
							toastStore.add('success', 'Instance deleted successfully');
						}
						await update();
					};
				}}
			>
				<!-- Empty form, just for submission -->
			</form>
		</div>
	{/if}
</div>

<!-- Delete Confirmation Modal -->
{#if mode === 'edit'}
	<Modal
		open={showDeleteModal}
		header="Delete Instance"
		bodyMessage={`Are you sure you want to delete "${instance?.name}"? This action cannot be undone and all data will be permanently lost.`}
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
