<script lang="ts">
	import { page } from '$app/stores';
	import { Check, X, Loader2, Save, Wifi } from 'lucide-svelte';
	import { apiRequest } from '$api';
	import TagInput from '$components/form/TagInput.svelte';
	import { enhance } from '$app/forms';
	import { toastStore } from '$stores/toast';
	import type { ActionData } from './$types';

	export let form: ActionData;

	// Get type from URL params if provided
	const typeFromUrl = $page.url.searchParams.get('type') || '';

	// Form values (restore from form action if there was an error)
	let name = form?.values?.name ?? '';
	let type = form?.values?.type ?? typeFromUrl;
	let url = form?.values?.url ?? '';
	let apiKey = '';
	let tags: string[] = [];

	// Connection test state
	type ConnectionStatus = 'idle' | 'testing' | 'success' | 'error';
	let connectionStatus: ConnectionStatus = 'idle';
	let connectionError = '';

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
			const data = await apiRequest<{ success: boolean; error?: string }>('/arr/test', {
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
</script>

<div class="p-8">
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-neutral-900 dark:text-neutral-50">Add Arr Instance</h1>
		<p class="mt-3 text-lg text-neutral-600 dark:text-neutral-400">
			Configure a new Radarr, Sonarr, Lidarr, or Chaptarr instance
		</p>
	</div>

	<div class="max-w-2xl">
		<form
			method="POST"
			class="space-y-6"
			use:enhance={() => {
				return async ({ result, update }) => {
					if (result.type === 'failure' && result.data) {
						// Show error toast
						toastStore.add('error', (result.data as { error?: string }).error || 'Failed to save instance');
					} else if (result.type === 'redirect') {
						// Show success toast before redirect
						toastStore.add('success', 'Instance created successfully!');
					}
					await update();
				};
			}}
		>
			<!-- Name -->
			<div>
				<label for="name" class="block text-sm font-medium text-neutral-900 dark:text-neutral-50">
					Name <span class="text-red-500">*</span>
				</label>
				<input
					type="text"
					id="name"
					name="name"
					bind:value={name}
					required
					placeholder="e.g., Main Radarr, 4K Sonarr"
					class="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50 dark:placeholder-neutral-500"
				/>
			</div>

			<!-- Type -->
			<div>
				<label for="type" class="block text-sm font-medium text-neutral-900 dark:text-neutral-50">
					Type <span class="text-red-500">*</span>
				</label>
				<select
					id="type"
					name="type"
					bind:value={type}
					on:change={resetConnectionStatus}
					required
					class="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
				>
					<option value="">Select type...</option>
					<option value="radarr">Radarr</option>
					<option value="sonarr">Sonarr</option>
					<option value="lidarr">Lidarr</option>
					<option value="chaptarr">Chaptarr</option>
				</select>
			</div>

			<!-- URL -->
			<div>
				<label for="url" class="block text-sm font-medium text-neutral-900 dark:text-neutral-50">
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
					class="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50 dark:placeholder-neutral-500"
				/>
			</div>

			<!-- API Key -->
			<div>
				<label for="api_key" class="block text-sm font-medium text-neutral-900 dark:text-neutral-50">
					API Key <span class="text-red-500">*</span>
				</label>
				<input
					type="text"
					id="api_key"
					name="api_key"
					bind:value={apiKey}
					on:input={resetConnectionStatus}
					required
					placeholder="Enter API key"
					class="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 font-mono text-neutral-900 placeholder-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50 dark:placeholder-neutral-500"
				/>
			</div>

			<!-- Tags (optional) -->
			<div>
				<label for="tags-input" class="block text-sm font-medium text-neutral-900 dark:text-neutral-50">
					Tags
				</label>
				<div class="mt-1">
					<TagInput bind:tags />
				</div>
				<p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
					Optional. Press Enter to add a tag, Backspace to remove.
				</p>
				<!-- Hidden input to submit tags as JSON -->
				<input type="hidden" name="tags" value={tags.length > 0 ? JSON.stringify(tags) : ''} />
			</div>

			<!-- Buttons -->
			<div class="space-y-3">
				<div class="flex justify-between gap-3">
					<button
						type="button"
						on:click={testConnection}
						disabled={connectionStatus === 'testing'}
						class="flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
					>
						{#if connectionStatus === 'testing'}
							<Loader2 size={14} class="animate-spin" />
							Testing...
						{:else if connectionStatus === 'success'}
							<Check size={14} class="text-green-600 dark:text-green-400" />
							Connected
						{:else if connectionStatus === 'error'}
							<X size={14} class="text-red-600 dark:text-red-400" />
							Test
						{:else}
							<Wifi size={14} />
							Test
						{/if}
					</button>

					<button
						type="submit"
						disabled={!canSubmit}
						class="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
					>
						<Save size={14} />
						Save
					</button>
				</div>

				<!-- Connection Status Messages -->
				{#if connectionStatus === 'success'}
					<p class="text-sm text-green-600 dark:text-green-400">
						Connection test passed! You can now save this instance.
					</p>
				{/if}
				{#if connectionStatus === 'error'}
					<p class="text-sm text-red-600 dark:text-red-400">
						{connectionError}
					</p>
				{/if}
				{#if !canSubmit && connectionStatus !== 'success'}
					<p class="text-sm text-neutral-500 dark:text-neutral-400">
						Please test the connection before saving
					</p>
				{/if}
			</div>
		</form>
	</div>
</div>
