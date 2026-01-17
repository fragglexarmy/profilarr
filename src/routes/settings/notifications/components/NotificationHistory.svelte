<script lang="ts">
	import { Bell } from 'lucide-svelte';
	import { parseUTC } from '$shared/dates';
	import type { NotificationHistoryRecord } from '$db/queries/notificationHistory.ts';

	export let history: NotificationHistoryRecord[];
	export let services: Array<{ id: string; name: string }>;

	function formatDateTime(date: string): string {
		const d = parseUTC(date);
		return d ? d.toLocaleString() : '-';
	}

	function getServiceName(serviceId: string): string {
		const service = services.find((s) => s.id === serviceId);
		return service?.name || 'Unknown';
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
</script>

<div
	class="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
>
	<!-- Header -->
	<div class="border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
		<div class="flex items-center gap-2">
			<Bell size={18} class="text-neutral-600 dark:text-neutral-400" />
			<h2 class="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
				Recent Notifications
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
						Time
					</th>
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
						Title
					</th>
					<th
						class="border-b border-neutral-200 px-4 py-3 text-left font-semibold text-neutral-900 dark:border-neutral-800 dark:text-neutral-50"
					>
						Status
					</th>
				</tr>
			</thead>
			<tbody class="[&_tr:last-child_td]:border-b-0">
				{#each history as record (record.id)}
					<tr class="hover:bg-neutral-50 dark:hover:bg-neutral-800">
						<!-- Time -->
						<td
							class="border-b border-neutral-200 px-4 py-2 text-neutral-600 dark:border-neutral-800 dark:text-neutral-400"
						>
							{formatDateTime(record.sent_at)}
						</td>

						<!-- Service -->
						<td
							class="border-b border-neutral-200 px-4 py-2 text-neutral-900 dark:border-neutral-800 dark:text-neutral-50"
						>
							{getServiceName(record.service_id)}
						</td>

						<!-- Type -->
						<td
							class="border-b border-neutral-200 px-4 py-2 text-neutral-600 dark:border-neutral-800 dark:text-neutral-400"
						>
							<span
								class="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200"
							>
								{formatNotificationType(record.notification_type)}
							</span>
						</td>

						<!-- Title -->
						<td
							class="border-b border-neutral-200 px-4 py-2 text-neutral-900 dark:border-neutral-800 dark:text-neutral-50"
						>
							{record.title}
						</td>

						<!-- Status -->
						<td class="border-b border-neutral-200 px-4 py-2 dark:border-neutral-800">
							{#if record.status === 'success'}
								<span
									class="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200"
								>
									Success
								</span>
							{:else}
								<span
									class="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900 dark:text-red-200"
									title={record.error || 'Unknown error'}
								>
									Failed
								</span>
							{/if}
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan="5" class="px-4 py-8 text-center text-neutral-500 dark:text-neutral-400">
							No notification history available yet.
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
