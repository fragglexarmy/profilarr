<script lang="ts">
	import { CheckCircle, XCircle, Clock } from 'lucide-svelte';

	export let jobRuns: Array<{
		id: number;
		job_id: number;
		job_name: string;
		status: 'success' | 'failure';
		started_at: string;
		finished_at: string;
		duration_ms: number;
		error: string | null;
		output: string | null;
	}>;

	// Format duration in ms to human readable
	function formatDuration(ms: number): string {
		if (ms < 1000) return `${ms}ms`;
		if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
		return `${(ms / 60000).toFixed(1)}m`;
	}

	// Format date/time
	function formatDateTime(dateStr: string): string {
		return new Date(dateStr).toLocaleString();
	}

	// Format job name: sync_databases -> Sync Databases
	function formatJobName(name: string): string {
		return name
			.split('_')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	}

	// Get relative time (e.g., "5m ago", "2h ago")
	function getRelativeTime(dateStr: string): string {
		const date = new Date(dateStr);
		const now = new Date();
		const diff = now.getTime() - date.getTime();

		const seconds = Math.floor(diff / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);

		if (days > 0) return `${days}d ago`;
		if (hours > 0) return `${hours}h ago`;
		if (minutes > 0) return `${minutes}m ago`;
		return `${seconds}s ago`;
	}
</script>

<div
	class="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
>
	<!-- Header -->
	<div class="border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
		<div class="flex items-center gap-2">
			<Clock size={18} class="text-neutral-600 dark:text-neutral-400" />
			<h2 class="text-lg font-semibold text-neutral-900 dark:text-neutral-50">Recent Job Runs</h2>
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
						Job
					</th>
					<th
						class="border-b border-neutral-200 px-4 py-3 text-left font-semibold text-neutral-900 dark:border-neutral-800 dark:text-neutral-50"
					>
						Status
					</th>
					<th
						class="border-b border-neutral-200 px-4 py-3 text-left font-semibold text-neutral-900 dark:border-neutral-800 dark:text-neutral-50"
					>
						Started
					</th>
					<th
						class="border-b border-neutral-200 px-4 py-3 text-left font-semibold text-neutral-900 dark:border-neutral-800 dark:text-neutral-50"
					>
						Duration
					</th>
					<th
						class="border-b border-neutral-200 px-4 py-3 text-left font-semibold text-neutral-900 dark:border-neutral-800 dark:text-neutral-50"
					>
						Output
					</th>
				</tr>
			</thead>
			<tbody class="[&_tr:last-child_td]:border-b-0">
				{#each jobRuns as run (run.id)}
					<tr class="hover:bg-neutral-50 dark:hover:bg-neutral-800">
						<!-- Job Name -->
						<td
							class="border-b border-neutral-200 px-4 py-2 text-neutral-900 dark:border-neutral-800 dark:text-neutral-50"
						>
							{formatJobName(run.job_name)}
						</td>

						<!-- Status -->
						<td class="border-b border-neutral-200 px-4 py-2 dark:border-neutral-800">
							{#if run.status === 'success'}
								<span
									class="inline-flex items-center gap-1 rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-100"
								>
									<CheckCircle size={10} />
									Success
								</span>
							{:else}
								<span
									class="inline-flex items-center gap-1 rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/40 dark:text-red-100"
								>
									<XCircle size={10} />
									Failed
								</span>
							{/if}
						</td>

						<!-- Started At -->
						<td
							class="border-b border-neutral-200 px-4 py-2 text-neutral-600 dark:border-neutral-800 dark:text-neutral-400"
						>
							<div class="flex flex-col gap-0.5">
								<code
									class="rounded bg-neutral-100 px-1 py-0.5 font-mono text-xs text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
								>
									{getRelativeTime(run.started_at)}
								</code>
								<span class="text-xs text-neutral-500 dark:text-neutral-500">
									{formatDateTime(run.started_at)}
								</span>
							</div>
						</td>

						<!-- Duration -->
						<td
							class="border-b border-neutral-200 px-4 py-2 text-neutral-600 dark:border-neutral-800 dark:text-neutral-400"
						>
							<code
								class="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
							>
								{formatDuration(run.duration_ms)}
							</code>
						</td>

						<!-- Output/Error -->
						<td
							class="border-b border-neutral-200 px-4 py-2 text-neutral-600 dark:border-neutral-800 dark:text-neutral-400"
						>
							{#if run.error}
								<div class="flex items-start gap-1 text-xs text-red-600 dark:text-red-400">
									<span class="line-clamp-2">{run.error}</span>
								</div>
							{:else if run.output}
								<span class="line-clamp-2 text-xs">{run.output}</span>
							{:else}
								<span class="text-neutral-400">-</span>
							{/if}
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan="5" class="px-4 py-8 text-center text-neutral-500 dark:text-neutral-400">
							No job runs yet
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
