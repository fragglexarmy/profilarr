

<script lang="ts">
	import { enhance } from '$app/forms';
	import { toastStore } from '$stores/toast';
	import { Plus, Trash2, Bell, BellOff, MessageSquare, Send, Loader2, Pencil } from 'lucide-svelte';
	import Modal from '$components/modal/Modal.svelte';
	import NotificationHistory from '$components/notifications/NotificationHistory.svelte';
	import { siDiscord } from 'simple-icons';
	import type { PageData } from './$types';

	export let data: PageData;

	// Modal state
	let showDeleteModal = false;
	let selectedService: string | null = null;
	let selectedServiceName: string | null = null;
	let deleteFormRef: HTMLFormElement | null = null;

	// Test notification loading state
	let testingServiceId: string | null = null;

	function openDeleteModal(id: string, name: string, formRef: HTMLFormElement) {
		selectedService = id;
		selectedServiceName = name;
		deleteFormRef = formRef;
		showDeleteModal = true;
	}

	function confirmDelete() {
		if (deleteFormRef) {
			deleteFormRef.requestSubmit();
		}
		showDeleteModal = false;
		selectedService = null;
		selectedServiceName = null;
		deleteFormRef = null;
	}

	function cancelDelete() {
		showDeleteModal = false;
		selectedService = null;
		selectedServiceName = null;
		deleteFormRef = null;
	}

	function getServiceIcon(serviceType: string) {
		switch (serviceType) {
			case 'discord':
				return MessageSquare;
			default:
				return Bell;
		}
	}

	function getServiceTypeName(serviceType: string): string {
		switch (serviceType) {
			case 'discord':
				return 'Discord';
			case 'slack':
				return 'Slack';
			case 'email':
				return 'Email';
			default:
				return serviceType;
		}
	}

	function formatSuccessRate(rate: number): string {
		return rate.toFixed(1) + '%';
	}

	function formatNotificationType(type: string): string {
		// Convert 'job.create_backup.success' to 'Backup Success'
		const parts = type.split('.');
		if (parts.length >= 3) {
			const action = parts[1].replace(/_/g, ' ');
			const status = parts[2];
			return `${action.charAt(0).toUpperCase() + action.slice(1)} ${status.charAt(0).toUpperCase() + status.slice(1)}`;
		}
		return type;
	}

	function getEnabledTypes(enabledTypesJson: string): string[] {
		try {
			return JSON.parse(enabledTypesJson);
		} catch {
			return [];
		}
	}
</script>

<div class="p-8">
	<!-- Header -->
	<div class="mb-8">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-3xl font-bold text-neutral-900 dark:text-neutral-50">Notifications</h1>
				<p class="mt-3 text-lg text-neutral-600 dark:text-neutral-400">
					Manage notification services and delivery settings
				</p>
			</div>

			<!-- Add Service Button -->
			<a
				href="/settings/notifications/new"
				class="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
			>
				<Plus size={16} />
				Add Service
			</a>
		</div>
	</div>

	<!-- Services List -->
	<div
		class="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
	>
		<!-- Header -->
		<div class="border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
			<div class="flex items-center gap-2">
				<Bell size={18} class="text-neutral-600 dark:text-neutral-400" />
				<h2 class="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
					Notification Services
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
							Service
						</th>
						<th
							class="border-b border-neutral-200 px-4 py-3 text-left font-semibold text-neutral-900 dark:border-neutral-800 dark:text-neutral-50"
						>
							Type
						</th>
						<th
							class="border-b border-neutral-200 px-4 py-3 text-left font-semibold text-neutral-900 dark:border-neutral-800 dark:text-neutral-50"
						>
							Status
						</th>
						<th
							class="border-b border-neutral-200 px-4 py-3 text-left font-semibold text-neutral-900 dark:border-neutral-800 dark:text-neutral-50"
						>
							Enabled Types
						</th>
						<th
							class="border-b border-neutral-200 px-4 py-3 text-left font-semibold text-neutral-900 dark:border-neutral-800 dark:text-neutral-50"
						>
							Statistics
						</th>
						<th
							class="border-b border-neutral-200 px-4 py-3 text-left font-semibold text-neutral-900 dark:border-neutral-800 dark:text-neutral-50"
						>
							Actions
						</th>
					</tr>
				</thead>
				<tbody class="[&_tr:last-child_td]:border-b-0">
					{#each data.services as service (service.id)}
						<tr class="hover:bg-neutral-50 dark:hover:bg-neutral-800">
							<!-- Service Name -->
							<td
								class="border-b border-neutral-200 px-4 py-2 text-neutral-900 dark:border-neutral-800 dark:text-neutral-50"
							>
								<span class="font-medium">{service.name}</span>
							</td>

							<!-- Type -->
							<td
								class="border-b border-neutral-200 px-4 py-2 text-neutral-600 dark:border-neutral-800 dark:text-neutral-400"
							>
								<div class="flex items-center gap-2">
									{#if service.service_type === 'discord'}
										<svg
											role="img"
											viewBox="0 0 24 24"
											class="h-4 w-4 text-neutral-600 dark:text-neutral-400"
											fill="currentColor"
										>
											<path d={siDiscord.path} />
										</svg>
									{:else}
										<svelte:component
											this={getServiceIcon(service.service_type)}
											size={16}
											class="text-neutral-600 dark:text-neutral-400"
										/>
									{/if}
									<span>{getServiceTypeName(service.service_type)}</span>
								</div>
							</td>

							<!-- Status -->
							<td class="border-b border-neutral-200 px-4 py-2 dark:border-neutral-800">
								<form
									method="POST"
									action="?/toggleEnabled"
									use:enhance={() => {
										return async ({ result, update }) => {
											if (result.type === 'failure' && result.data) {
												toastStore.add(
													'error',
													(result.data as { error?: string }).error || 'Failed to update service'
												);
											} else if (result.type === 'success') {
												toastStore.add('success', 'Service updated successfully');
											}
											await update();
										};
									}}
								>
									<input type="hidden" name="id" value={service.id} />
									<input type="hidden" name="enabled" value={service.enabled ? 'false' : 'true'} />
									<button
										type="submit"
										class="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors {service.enabled
											? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-200'
											: 'bg-neutral-100 text-neutral-800 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200'}"
									>
										<svelte:component
											this={service.enabled ? Bell : BellOff}
											size={12}
										/>
										{service.enabled ? 'Enabled' : 'Disabled'}
									</button>
								</form>
							</td>

							<!-- Enabled Types -->
							<td class="border-b border-neutral-200 px-4 py-2 dark:border-neutral-800">
								<div class="flex max-w-sm flex-wrap gap-1">
									{#each getEnabledTypes(service.enabled_types) as type}
										<span
											class="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200"
										>
											{formatNotificationType(type)}
										</span>
									{:else}
										<span class="text-xs text-neutral-400 dark:text-neutral-500">None</span>
									{/each}
								</div>
							</td>

							<!-- Statistics -->
							<td
								class="border-b border-neutral-200 px-4 py-2 text-neutral-600 dark:border-neutral-800 dark:text-neutral-400"
							>
								{#if service.successCount + service.failedCount > 0}
									<div class="text-xs">
										<span class="text-green-600 dark:text-green-400">{service.successCount} sent</span>
										•
										<span class="text-red-600 dark:text-red-400">{service.failedCount} failed</span>
										•
										<span>{formatSuccessRate(service.successRate)}</span>
									</div>
								{:else}
									<span class="text-neutral-400 dark:text-neutral-500">No notifications sent</span>
								{/if}
							</td>

							<!-- Actions -->
							<td class="border-b border-neutral-200 px-4 py-2 dark:border-neutral-800">
								<div class="flex items-center gap-2">
									<!-- Test Button -->
									<form
										method="POST"
										action="?/testNotification"
										use:enhance={() => {
											testingServiceId = service.id;
											return async ({ result, update }) => {
												if (result.type === 'failure' && result.data) {
													toastStore.add(
														'error',
														(result.data as { error?: string }).error || 'Failed to send test notification'
													);
												} else if (result.type === 'success') {
													toastStore.add('success', 'Test notification sent successfully');
												}
												testingServiceId = null;
												await update();
											};
										}}
									>
										<input type="hidden" name="id" value={service.id} />
										<button
											type="submit"
											disabled={testingServiceId === service.id}
											class="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-neutral-300 bg-white text-blue-600 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-blue-400 dark:hover:bg-neutral-700"
											title="Send test notification"
										>
											{#if testingServiceId === service.id}
												<Loader2 size={14} class="animate-spin" />
											{:else}
												<Send size={14} />
											{/if}
										</button>
									</form>

									<!-- Edit Button -->
									<a
										href="/settings/notifications/edit/{service.id}"
										class="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-neutral-300 bg-white text-neutral-600 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
										title="Edit service"
									>
										<Pencil size={14} />
									</a>

									<!-- Delete Button -->
									<form
										method="POST"
										action="?/delete"
										use:enhance={() => {
											return async ({ result, update }) => {
												if (result.type === 'failure' && result.data) {
													toastStore.add(
														'error',
														(result.data as { error?: string }).error || 'Failed to delete service'
													);
												} else if (result.type === 'success') {
													toastStore.add('success', 'Service deleted successfully');
												}
												await update();
											};
										}}
									>
										<input type="hidden" name="id" value={service.id} />
										<button
											type="button"
											on:click={(e) => {
												const form = e.currentTarget.closest('form');
												if (form) openDeleteModal(service.id, service.name, form);
											}}
											class="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-neutral-300 bg-white text-red-600 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-red-400 dark:hover:bg-neutral-700"
											title="Delete service"
										>
											<Trash2 size={14} />
										</button>
									</form>
								</div>
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="6" class="px-4 py-8 text-center text-neutral-500 dark:text-neutral-400">
								No notification services configured. Click "Add Service" to get started.
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<!-- Notification History Component -->
	<div class="mt-8">
		<NotificationHistory history={data.history} services={data.services} />
	</div>
</div>

<!-- Delete Confirmation Modal -->
<Modal
	open={showDeleteModal}
	header="Delete Service"
	bodyMessage="Are you sure you want to delete this notification service? This action cannot be undone.{selectedServiceName
		? `\n\nService: ${selectedServiceName}`
		: ''}"
	confirmText="Delete Service"
	cancelText="Cancel"
	confirmDanger={true}
	on:confirm={confirmDelete}
	on:cancel={cancelDelete}
/>
