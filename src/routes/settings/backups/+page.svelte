<script lang="ts">
	import { enhance } from '$app/forms';
	import { toastStore } from '$stores/toast';
	import { Download, Plus, Trash2, RotateCcw, Database, Upload } from 'lucide-svelte';
	import Modal from '$components/modal/Modal.svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	// Modal state
	let showDeleteModal = false;
	let showRestoreModal = false;
	let selectedBackup: string | null = null;
	let deleteFormRef: HTMLFormElement | null = null;
	let restoreFormRef: HTMLFormElement | null = null;

	// File upload
	let fileInput: HTMLInputElement;

	function downloadBackup(filename: string) {
		window.location.href = `/api/backups/download/${filename}`;
	}

	function triggerFileUpload() {
		fileInput?.click();
	}

	function formatDateTime(date: Date): string {
		return new Date(date).toLocaleString();
	}

	function openDeleteModal(filename: string, formRef: HTMLFormElement) {
		selectedBackup = filename;
		deleteFormRef = formRef;
		showDeleteModal = true;
	}

	function openRestoreModal(filename: string, formRef: HTMLFormElement) {
		selectedBackup = filename;
		restoreFormRef = formRef;
		showRestoreModal = true;
	}

	function confirmDelete() {
		if (deleteFormRef) {
			deleteFormRef.requestSubmit();
		}
		showDeleteModal = false;
		selectedBackup = null;
		deleteFormRef = null;
	}

	function confirmRestore() {
		if (restoreFormRef) {
			restoreFormRef.requestSubmit();
		}
		showRestoreModal = false;
		selectedBackup = null;
		restoreFormRef = null;
	}

	function cancelDelete() {
		showDeleteModal = false;
		selectedBackup = null;
		deleteFormRef = null;
	}

	function cancelRestore() {
		showRestoreModal = false;
		selectedBackup = null;
		restoreFormRef = null;
	}
</script>

<div class="p-8">
	<!-- Header -->
	<div class="mb-8">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-3xl font-bold text-neutral-900 dark:text-neutral-50">Backups</h1>
				<p class="mt-3 text-lg text-neutral-600 dark:text-neutral-400">
					Manage database and configuration backups
				</p>
			</div>

			<!-- Create Backup Button -->
			<div class="flex gap-2">
				<!-- Upload Backup Button -->
				<form
					method="POST"
					action="?/uploadBackup"
					enctype="multipart/form-data"
					use:enhance={() => {
						return async ({ result, update }) => {
							if (result.type === 'failure' && result.data) {
								toastStore.add(
									'error',
									(result.data as { error?: string }).error || 'Failed to upload backup'
								);
							} else if (result.type === 'success') {
								toastStore.add('success', 'Backup uploaded successfully');
								fileInput.value = ''; // Reset file input
							}
							await update();
						};
					}}
				>
					<input
						type="file"
						name="file"
						accept=".tar.gz"
						bind:this={fileInput}
						on:change={(e) => {
							const form = e.currentTarget.form;
							if (form && e.currentTarget.files?.length) {
								form.requestSubmit();
							}
						}}
						class="hidden"
					/>
					<button
						type="button"
						on:click={triggerFileUpload}
						class="flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
					>
						<Upload size={16} />
						Upload Backup
					</button>
				</form>

				<!-- Create Backup Button -->
				<form
					method="POST"
					action="?/createBackup"
					use:enhance={() => {
						return async ({ result, update }) => {
							if (result.type === 'failure' && result.data) {
								toastStore.add(
									'error',
									(result.data as { error?: string }).error || 'Failed to create backup'
								);
							} else if (result.type === 'success') {
								toastStore.add('success', 'Backup created successfully');
							}
							await update();
						};
					}}
				>
					<button
						type="submit"
						class="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
					>
						<Plus size={16} />
						Create Backup
					</button>
				</form>
			</div>
		</div>
	</div>

	<!-- Backups List -->
	<div
		class="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
	>
		<!-- Header -->
		<div class="border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
			<div class="flex items-center gap-2">
				<Database size={18} class="text-neutral-600 dark:text-neutral-400" />
				<h2 class="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
					Available Backups
				</h2>
			</div>
		</div>

		<!-- Table -->
		<div class="overflow-x-auto">
			<table class="w-full text-xs">
				<thead>
					<tr>
						<th
							class="border-b border-neutral-200 px-4 py-3 text-left font-semibold text-neutral-900 dark:border-neutral-800 dark:text-neutral-50"
						>
							Filename
						</th>
						<th
							class="border-b border-neutral-200 px-4 py-3 text-left font-semibold text-neutral-900 dark:border-neutral-800 dark:text-neutral-50"
						>
							Created
						</th>
						<th
							class="border-b border-neutral-200 px-4 py-3 text-left font-semibold text-neutral-900 dark:border-neutral-800 dark:text-neutral-50"
						>
							Size
						</th>
						<th
							class="border-b border-neutral-200 px-4 py-3 text-left font-semibold text-neutral-900 dark:border-neutral-800 dark:text-neutral-50"
						>
							Actions
						</th>
					</tr>
				</thead>
				<tbody class="[&_tr:last-child_td]:border-b-0">
					{#each data.backups as backup (backup.filename)}
						<tr class="hover:bg-neutral-50 dark:hover:bg-neutral-800">
							<!-- Filename -->
							<td
								class="border-b border-neutral-200 px-4 py-2 text-neutral-900 dark:border-neutral-800 dark:text-neutral-50"
							>
								<code
									class="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
								>
									{backup.filename}
								</code>
							</td>

							<!-- Created -->
							<td
								class="border-b border-neutral-200 px-4 py-2 text-neutral-600 dark:border-neutral-800 dark:text-neutral-400"
							>
								{formatDateTime(backup.created)}
							</td>

							<!-- Size -->
							<td
								class="border-b border-neutral-200 px-4 py-2 text-neutral-600 dark:border-neutral-800 dark:text-neutral-400"
							>
								{backup.sizeFormatted}
							</td>

							<!-- Actions -->
							<td class="border-b border-neutral-200 px-4 py-2 dark:border-neutral-800">
								<div class="flex items-center gap-2">
									<!-- Download Button -->
									<button
										type="button"
										on:click={() => downloadBackup(backup.filename)}
										class="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-300 bg-white text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
										title="Download backup"
									>
										<Download size={14} />
									</button>

									<!-- Restore Button -->
									<form
										method="POST"
										action="?/restoreBackup"
										use:enhance={() => {
											return async ({ result, update }) => {
												if (result.type === 'failure' && result.data) {
													toastStore.add(
														'error',
														(result.data as { error?: string }).error || 'Failed to restore backup'
													);
												} else if (result.type === 'success') {
													toastStore.add(
														'success',
														'Backup restored successfully. Please restart the application.'
													);
												}
												await update();
											};
										}}
									>
										<input type="hidden" name="filename" value={backup.filename} />
										<button
											type="button"
											on:click={(e) => {
												const form = e.currentTarget.closest('form');
												if (form) openRestoreModal(backup.filename, form);
											}}
											class="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-300 bg-white text-yellow-600 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-yellow-400 dark:hover:bg-neutral-700"
											title="Restore from backup"
										>
											<RotateCcw size={14} />
										</button>
									</form>

									<!-- Delete Button -->
									<form
										method="POST"
										action="?/deleteBackup"
										use:enhance={() => {
											return async ({ result, update }) => {
												if (result.type === 'failure' && result.data) {
													toastStore.add(
														'error',
														(result.data as { error?: string }).error || 'Failed to delete backup'
													);
												} else if (result.type === 'success') {
													toastStore.add('success', 'Backup deleted successfully');
												}
												await update();
											};
										}}
									>
										<input type="hidden" name="filename" value={backup.filename} />
										<button
											type="button"
											on:click={(e) => {
												const form = e.currentTarget.closest('form');
												if (form) openDeleteModal(backup.filename, form);
											}}
											class="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-300 bg-white text-red-600 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-red-400 dark:hover:bg-neutral-700"
											title="Delete backup"
										>
											<Trash2 size={14} />
										</button>
									</form>
								</div>
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="4" class="px-4 py-8 text-center text-neutral-500 dark:text-neutral-400">
								No backups found. Create your first backup to get started.
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>

<!-- Delete Confirmation Modal -->
<Modal
	open={showDeleteModal}
	header="Delete Backup"
	bodyMessage="Are you sure you want to delete this backup? This action cannot be undone.{selectedBackup
		? `\n\nBackup: ${selectedBackup}`
		: ''}"
	confirmText="Delete Backup"
	cancelText="Cancel"
	confirmDanger={true}
	on:confirm={confirmDelete}
	on:cancel={cancelDelete}
/>

<!-- Restore Confirmation Modal -->
<Modal
	open={showRestoreModal}
	header="Restore Backup"
	bodyMessage="Restoring this backup will replace all current data with the data from the backup. This action cannot be undone. You will need to restart the application after restoring.{selectedBackup
		? `\n\nBackup: ${selectedBackup}`
		: ''}"
	confirmText="Restore Backup"
	cancelText="Cancel"
	on:confirm={confirmRestore}
	on:cancel={cancelRestore}
/>
