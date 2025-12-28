<script lang="ts">
	import { enhance } from '$app/forms';
	import { alertStore } from '$alerts/store';
	import { Play, CheckCircle, XCircle, AlertCircle, Edit2, Power } from 'lucide-svelte';

	export let job: {
		id: number;
		name: string;
		description: string | null;
		schedule: string;
		scheduleDisplay: string;
		enabled: boolean;
		last_run_at: string | null;
		next_run_at: string | null;
		last_run_status: string | null;
		last_run_duration: number | null;
		last_run_error: string | null;
	};

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

	// Format job name: sync_databases -> Sync Databases
	function formatJobName(name: string): string {
		return name
			.split('_')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	}

	// Get relative time (e.g., "in 5 minutes", "2 hours ago")
	function getRelativeTime(dateStr: string | null): string {
		if (!dateStr) return 'Not scheduled';

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

<div
	class="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
>
	<!-- Job Header -->
	<div class="border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
		<div class="flex items-start justify-between gap-4">
			<div class="flex-1">
				<div class="flex items-center gap-3">
					<h3 class="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
						{formatJobName(job.name)}
					</h3>

					<!-- Enabled/Disabled Badge -->
					<span
						class="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium {job.enabled
							? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-100'
							: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-100'}"
					>
						{job.enabled ? 'Enabled' : 'Disabled'}
					</span>
				</div>

				{#if job.description}
					<p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
						{job.description}
					</p>
				{/if}
			</div>

			<!-- Action Buttons -->
			<div class="flex items-center gap-2">
				<!-- Edit Button -->
				<a
					href="/settings/jobs/{job.id}/edit"
					class="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-300 bg-white text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
					title="Edit job"
				>
					<Edit2 size={14} />
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
								alertStore.add('success', `Job "${formatJobName(job.name)}" triggered successfully`);
							}
							await update();
						};
					}}
				>
					<input type="hidden" name="job_name" value={job.name} />
					<button
						type="submit"
						disabled={!job.enabled}
						class="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-300 bg-white text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
						title="Run now"
					>
						<Play size={14} />
					</button>
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
								alertStore.add('success', `Job ${job.enabled ? 'disabled' : 'enabled'}`);
							}
							await update();
						};
					}}
				>
					<input type="hidden" name="job_id" value={job.id} />
					<input type="hidden" name="enabled" value={!job.enabled} />
					<button
						type="submit"
						class="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-300 bg-white transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700 {job.enabled
							? 'text-green-600 dark:text-green-400'
							: 'text-red-600 dark:text-red-400'}"
						title={job.enabled ? 'Disable job' : 'Enable job'}
					>
						<Power size={14} />
					</button>
				</form>
			</div>
		</div>
	</div>

	<!-- Job Details Table -->
	<div class="overflow-x-auto">
		<table class="w-full text-xs">
			<thead>
				<tr>
					<th class="px-4 py-2 text-left font-semibold text-neutral-900 dark:text-neutral-50">
						Schedule
					</th>
					<th class="px-4 py-2 text-left font-semibold text-neutral-900 dark:text-neutral-50">
						Last Run
					</th>
					<th class="px-4 py-2 text-left font-semibold text-neutral-900 dark:text-neutral-50">
						Next Run
					</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<!-- Schedule -->
					<td class="border-t border-neutral-200 px-4 py-3 align-top dark:border-neutral-800">
						<code
							class="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
						>
							{job.scheduleDisplay}
						</code>
					</td>

					<!-- Last Run -->
					<td class="border-t border-neutral-200 px-4 py-3 align-top dark:border-neutral-800">
						<div class="flex flex-col gap-1">
							<div class="flex items-center gap-2">
								<code
									class="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
								>
									{formatDateTime(job.last_run_at)}
								</code>
								{#if job.last_run_status === 'success'}
									<span
										class="inline-flex items-center gap-1 rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-100"
									>
										<CheckCircle size={10} />
										Success
									</span>
								{:else if job.last_run_status === 'failure'}
									<span
										class="inline-flex items-center gap-1 rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/40 dark:text-red-100"
									>
										<XCircle size={10} />
										Failed
									</span>
								{/if}
							</div>
							{#if job.last_run_duration}
								<div class="text-xs text-neutral-500 dark:text-neutral-400">
									Duration: <code
										class="rounded bg-neutral-100 px-1 py-0.5 font-mono text-xs text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
										>{formatDuration(job.last_run_duration)}</code
									>
								</div>
							{/if}
							{#if job.last_run_error}
								<div class="flex items-start gap-1 text-xs text-red-600 dark:text-red-400">
									<AlertCircle size={12} class="mt-0.5 flex-shrink-0" />
									<span class="line-clamp-2">{job.last_run_error}</span>
								</div>
							{/if}
						</div>
					</td>

					<!-- Next Run -->
					<td class="border-t border-neutral-200 px-4 py-3 align-top dark:border-neutral-800">
						<div class="flex flex-col gap-1">
							<code
								class="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
							>
								{getRelativeTime(job.next_run_at)}
							</code>
							<div class="text-xs text-neutral-500 dark:text-neutral-400">
								{formatDateTime(job.next_run_at)}
							</div>
						</div>
					</td>
				</tr>
			</tbody>
		</table>
	</div>
</div>
