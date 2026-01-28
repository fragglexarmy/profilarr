<script lang="ts">
	import { enhance } from '$app/forms';
	import { alertStore } from '$alerts/store';
	import type { PageData } from './$types';
	import type { Column } from '$lib/client/ui/table/types';
	import ExpandableTable from '$lib/client/ui/table/ExpandableTable.svelte';
	import TableActionButton from '$lib/client/ui/table/TableActionButton.svelte';
	import Badge from '$lib/client/ui/badge/Badge.svelte';
	import JobHistory from './components/JobHistory.svelte';
	import { Play, Edit2, Power, CheckCircle, XCircle, AlertCircle, MinusCircle } from 'lucide-svelte';

	export let data: PageData;

	type Job = (typeof data.jobs)[0];

	const columns: Column<Job>[] = [
		{ key: 'name', header: 'Name', sortable: true },
		{ key: 'enabled', header: 'Status', sortable: true, width: 'w-24' },
		{ key: 'scheduleDisplay', header: 'Schedule', sortable: true },
		{ key: 'last_run_at', header: 'Last Run', sortable: true },
		{ key: 'next_run_at', header: 'Next Run', sortable: true }
	];

	// Format job name: sync_databases -> Sync Databases
	function formatJobName(name: string): string {
		return name
			.split('_')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	}

	// Format duration in ms to human readable
	function formatDuration(ms: number | null): string {
		if (!ms) return '-';
		if (ms < 1000) return `${ms}ms`;
		if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
		return `${(ms / 60000).toFixed(1)}m`;
	}

	// Format date/time
	function formatDateTime(dateStr: string | null): string {
		if (!dateStr) return 'Never';
		return new Date(dateStr).toLocaleString();
	}

	// Get relative time (e.g., "in 5 minutes", "2 hours ago")
	function getRelativeTime(dateStr: string | null): string {
		if (!dateStr) return '-';

		const date = new Date(dateStr);
		const now = new Date();
		const diff = date.getTime() - now.getTime();
		const absDiff = Math.abs(diff);

		const seconds = Math.floor(absDiff / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);

		const isPast = diff < 0;

		if (days > 0) {
			return isPast ? `${days}d ago` : `in ${days}d`;
		}
		if (hours > 0) {
			return isPast ? `${hours}h ago` : `in ${hours}h`;
		}
		if (minutes > 0) {
			return isPast ? `${minutes}m ago` : `in ${minutes}m`;
		}
		return isPast ? `${seconds}s ago` : `in ${seconds}s`;
	}
</script>

<div class="p-4 md:p-8">
	<!-- Header -->
	<div class="mb-8">
		<h1 class="text-2xl font-bold text-neutral-900 md:text-3xl dark:text-neutral-50">Background Jobs</h1>
		<p class="mt-3 text-base text-neutral-600 md:text-lg dark:text-neutral-400">
			Manage scheduled tasks and automation workflows
		</p>
	</div>

	<!-- Jobs Table -->
	<div class="mb-8">
		<ExpandableTable
			{columns}
			data={data.jobs}
			getRowId={(job) => job.id}
			emptyMessage="No background jobs configured"
			flushExpanded
			chevronPosition="right"
			responsive
		>
			<svelte:fragment slot="cell" let:row let:column>
				{#if column.key === 'name'}
					<span class="font-medium">{formatJobName(row.name)}</span>
				{:else if column.key === 'enabled'}
					<Badge variant={row.enabled ? 'accent' : 'neutral'}>
						{row.enabled ? 'Enabled' : 'Disabled'}
					</Badge>
				{:else if column.key === 'scheduleDisplay'}
					<Badge variant="neutral" mono>{row.scheduleDisplay}</Badge>
				{:else if column.key === 'last_run_at'}
					<div class="flex items-center gap-2">
						<Badge variant="neutral" mono>{getRelativeTime(row.last_run_at)}</Badge>
						{#if row.last_run_status === 'success'}
							<Badge variant="success" icon={CheckCircle}>Success</Badge>
						{:else if row.last_run_status === 'skipped'}
							<Badge variant="neutral" icon={MinusCircle}>Skipped</Badge>
						{:else if row.last_run_status === 'failure'}
							<Badge variant="danger" icon={XCircle}>Failed</Badge>
						{/if}
					</div>
				{:else if column.key === 'next_run_at'}
					{#if row.enabled}
						<Badge variant="neutral" mono>{getRelativeTime(row.next_run_at)}</Badge>
					{:else}
						<span class="text-neutral-400 dark:text-neutral-600">-</span>
					{/if}
				{/if}
			</svelte:fragment>

			<svelte:fragment slot="actions" let:row>
				<div class="flex items-center justify-end gap-1">
					<!-- Edit Button -->
					<a href="/settings/jobs/{row.id}/edit">
						<TableActionButton icon={Edit2} title="Edit job" variant="neutral" size="sm" />
					</a>

					<!-- Run Now Button -->
					<form
						method="POST"
						action="?/trigger"
						use:enhance={() => {
							return async ({ result, update }) => {
								if (result.type === 'failure' && result.data) {
									alertStore.add(
										'error',
										(result.data as { error?: string }).error || 'Failed to trigger job'
									);
								} else if (result.type === 'success') {
									alertStore.add('success', `Job "${formatJobName(row.name)}" triggered`);
								}
								await update();
							};
						}}
					>
						<input type="hidden" name="job_name" value={row.name} />
						<TableActionButton
							icon={Play}
							title="Run now"
							variant="accent"
							size="sm"
							type="submit"
							disabled={!row.enabled}
						/>
					</form>

					<!-- Enable/Disable Button -->
					<form
						method="POST"
						action="?/toggleEnabled"
						use:enhance={() => {
							return async ({ result, update }) => {
								if (result.type === 'failure' && result.data) {
									alertStore.add(
										'error',
										(result.data as { error?: string }).error || 'Failed to update job'
									);
								} else if (result.type === 'success') {
									alertStore.add('success', `Job ${row.enabled ? 'disabled' : 'enabled'}`);
								}
								await update();
							};
						}}
					>
						<input type="hidden" name="job_id" value={row.id} />
						<input type="hidden" name="enabled" value={!row.enabled} />
						<button
							type="submit"
							class="inline-flex h-6 w-6 items-center justify-center rounded border transition-colors
								{row.enabled
								? 'border-emerald-300 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/40'
								: 'border-neutral-300 bg-white text-neutral-400 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-500 dark:hover:border-emerald-700 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400'}"
							title={row.enabled ? 'Disable job' : 'Enable job'}
						>
							<Power size={12} />
						</button>
					</form>
				</div>
			</svelte:fragment>

			<svelte:fragment slot="expanded" let:row>
				<div class="space-y-3 px-6 py-4 text-sm">
					<!-- Description -->
					{#if row.description}
						<p class="text-neutral-600 dark:text-neutral-400">{row.description}</p>
					{/if}

					<div class="grid grid-cols-3 gap-4">
						<!-- Last Run Details -->
						<div>
							<div
								class="text-xs font-medium tracking-wider text-neutral-500 uppercase dark:text-neutral-500"
							>
								Last Run
							</div>
							<div class="mt-1">
								<Badge variant="neutral" mono>{formatDateTime(row.last_run_at)}</Badge>
							</div>
						</div>

						<!-- Duration -->
						<div>
							<div
								class="text-xs font-medium tracking-wider text-neutral-500 uppercase dark:text-neutral-500"
							>
								Duration
							</div>
							<div class="mt-1">
								<Badge variant="neutral" mono>{formatDuration(row.last_run_duration)}</Badge>
							</div>
						</div>

						<!-- Next Run Details -->
						<div>
							<div
								class="text-xs font-medium tracking-wider text-neutral-500 uppercase dark:text-neutral-500"
							>
								Next Run
							</div>
							<div class="mt-1">
								{#if row.enabled}
									<Badge variant="neutral" mono>{formatDateTime(row.next_run_at)}</Badge>
								{:else}
									<Badge variant="neutral">Disabled</Badge>
								{/if}
							</div>
						</div>
					</div>

					<!-- Error Message -->
					{#if row.last_run_error}
						<div
							class="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20"
						>
							<AlertCircle size={16} class="mt-0.5 flex-shrink-0 text-red-600 dark:text-red-400" />
							<div>
								<div class="text-xs font-medium text-red-800 dark:text-red-200">Last Run Error</div>
								<div class="mt-1 text-sm text-red-700 dark:text-red-300">{row.last_run_error}</div>
							</div>
						</div>
					{/if}
				</div>
			</svelte:fragment>
		</ExpandableTable>
	</div>

	<!-- Job History -->
	<JobHistory jobRuns={data.jobRuns} />
</div>
