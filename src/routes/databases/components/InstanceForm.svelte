<script lang="ts">
	import { Save, Trash2, Loader2 } from 'lucide-svelte';
	import Modal from '$ui/modal/Modal.svelte';
	import { enhance } from '$app/forms';
	import { alertStore } from '$alerts/store';
	import type { DatabaseInstance } from '$db/queries/databaseInstances.ts';

	// Props
	export let mode: 'create' | 'edit';
	export let instance: DatabaseInstance | undefined = undefined;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	export let form: any = undefined;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	export let data: any = undefined;

	// Loading state
	let isLoading = false;

	// Form values
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let name = (form as any)?.values?.name ?? (mode === 'edit' ? instance?.name : data?.formData?.name) ?? '';
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let repositoryUrl =
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(form as any)?.values?.repository_url ??
		(mode === 'edit' ? instance?.repository_url : '') ??
		'';
	let branch = (form as any)?.values?.branch ?? (mode === 'create' ? data?.formData?.branch : '') ?? '';
	let personalAccessToken = (form as any)?.values?.personal_access_token ?? (mode === 'edit' ? instance?.personal_access_token : data?.formData?.personalAccessToken) ?? '';
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let syncStrategy =
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(form as any)?.values?.sync_strategy ??
		(mode === 'edit' ? instance?.sync_strategy : (data?.formData?.syncStrategy ? parseInt(data.formData.syncStrategy) : 60)) ??
		60;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let autoPull = (form as any)?.values?.auto_pull ?? (mode === 'edit' ? instance?.auto_pull : (data?.formData?.autoPull === '1' ? 1 : (data?.formData?.autoPull === '0' ? 0 : 1))) ?? 1;

	// Delete modal state
	let showDeleteModal = false;
	let deleteFormElement: HTMLFormElement;

	// Display text based on mode
	$: title = mode === 'create' ? 'Link Database' : 'Edit Database';
	$: description =
		mode === 'create'
			? 'Link a Profilarr Compliant Database from a Git repository'
			: `Update the configuration for ${instance?.name || 'this database'}`;
	$: submitButtonText = mode === 'create' ? 'Link Database' : 'Save Changes';
	$: successMessage =
		mode === 'create' ? 'Database linked successfully!' : 'Database updated successfully!';
	$: errorMessage = mode === 'create' ? 'Failed to link database' : 'Failed to update database';
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
		action={mode === 'edit' ? '?/update' : undefined}
		class="space-y-6"
		use:enhance={() => {
			isLoading = true;
			return async ({ result, update }) => {
				if (result.type === 'failure' && result.data) {
					alertStore.add('error', (result.data as { error?: string }).error || errorMessage);
				} else if (result.type === 'redirect') {
					// Don't show success message if redirecting to bruh page
					if (result.location && !result.location.includes('/databases/bruh')) {
						alertStore.add('success', successMessage);
					}
				}
				await update();
				isLoading = false;
			};
		}}
	>
		<!-- Database Details -->
		<div
			class="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900"
		>
			<h2 class="mb-4 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
				Database Details
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
						placeholder="e.g., Main Database, 4K Profiles"
						class="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
					/>
					<p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
						A friendly name to identify this database
					</p>
				</div>

				<!-- Repository URL -->
				<div>
					<label
						for="repository_url"
						class="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
					>
						Repository URL <span class="text-red-500">*</span>
					</label>
					<input
						type="url"
						id="repository_url"
						name="repository_url"
						bind:value={repositoryUrl}
						required
						disabled={mode === 'edit'}
						placeholder="https://github.com/username/database"
						class="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500 dark:disabled:bg-neutral-900"
					/>
					{#if mode === 'edit'}
						<p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
							Repository URL cannot be changed after linking
						</p>
					{:else}
						<p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
							Git repository URL containing the PCD manifest
						</p>
					{/if}
				</div>

				<!-- Branch -->
				{#if mode === 'create'}
					<div>
						<label
							for="branch"
							class="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
						>
							Branch
						</label>
						<input
							type="text"
							id="branch"
							name="branch"
							bind:value={branch}
							placeholder="main"
							class="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
						/>
						<p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
							Branch to checkout on link. Leave empty to use the default branch. You can change this later.
						</p>
					</div>
				{/if}

				<!-- Personal Access Token -->
				<div>
					<label
						for="personal_access_token"
						class="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
					>
						Personal Access Token (Optional)
					</label>
					<input
						type="password"
						id="personal_access_token"
						name="personal_access_token"
						bind:value={personalAccessToken}
						placeholder="ghp_..."
						class="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
					/>
					<p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
						Required for private repositories to clone and for developers to push back to GitHub.
					</p>
				</div>
			</div>
		</div>

		<!-- Sync Settings -->
		<div
			class="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900"
		>
			<h2 class="mb-4 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
				Sync Settings
			</h2>

			<div class="space-y-4">
				<!-- Sync Strategy -->
				<div>
					<label
						for="sync_strategy"
						class="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
					>
						Sync Strategy
					</label>
					<select
						id="sync_strategy"
						name="sync_strategy"
						bind:value={syncStrategy}
						class="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
					>
						<option value={0}>Manual (no auto-sync)</option>
						<option value={5}>Every 5 minutes</option>
						<option value={15}>Every 15 minutes</option>
						<option value={30}>Every 30 minutes</option>
						<option value={60}>Every hour</option>
						<option value={360}>Every 6 hours</option>
						<option value={720}>Every 12 hours</option>
						<option value={1440}>Every 24 hours</option>
					</select>
					<p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
						How often to check for updates from the remote repository
					</p>
				</div>

				<!-- Auto Pull -->
				<div class="flex items-start gap-3">
					<input
						type="checkbox"
						id="auto_pull"
						name="auto_pull"
						bind:checked={autoPull}
						value="1"
						class="mt-0.5 h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800"
					/>
					<div>
						<label
							for="auto_pull"
							class="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
						>
							Automatically pull updates
						</label>
						<p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
							If enabled, updates will be pulled automatically. If disabled, you'll only receive
							notifications when updates are available.
						</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Actions -->
		<div class="flex flex-wrap items-center justify-end gap-3">
			{#if mode === 'edit'}
				<a
					href="/databases/{instance?.id}"
					class="flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
				>
					Cancel
				</a>
			{/if}
			<button
				type="submit"
				disabled={isLoading}
				class="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
			>
				{#if isLoading}
					<Loader2 size={14} class="animate-spin" />
					{mode === 'create' ? 'Linking...' : 'Saving...'}
				{:else}
					<Save size={14} />
					{submitButtonText}
				{/if}
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
				Once you unlink this database, there is no going back. All local data will be removed.
			</p>
			<button
				type="button"
				on:click={() => (showDeleteModal = true)}
				class="mt-4 flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 dark:border-red-700 dark:bg-neutral-900 dark:text-red-300 dark:hover:bg-red-900"
			>
				<Trash2 size={14} />
				Unlink Database
			</button>

			<form
				bind:this={deleteFormElement}
				method="POST"
				action="?/delete"
				class="hidden"
				use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === 'failure' && result.data) {
							alertStore.add(
								'error',
								(result.data as { error?: string }).error || 'Failed to unlink database'
							);
						} else if (result.type === 'redirect') {
							alertStore.add('success', 'Database unlinked successfully');
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
		header="Unlink Database"
		bodyMessage={`Are you sure you want to unlink "${instance?.name}"? This action cannot be undone and all local data will be permanently removed.`}
		confirmText="Unlink"
		cancelText="Cancel"
		confirmDanger={true}
		on:confirm={() => {
			showDeleteModal = false;
			deleteFormElement?.requestSubmit();
		}}
		on:cancel={() => (showDeleteModal = false)}
	/>
{/if}
