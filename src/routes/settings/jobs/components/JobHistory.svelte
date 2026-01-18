<script lang="ts">
	import type { Column } from '$lib/client/ui/table/types';
	import Table from '$lib/client/ui/table/Table.svelte';
	import Badge from '$lib/client/ui/badge/Badge.svelte';
	import { CheckCircle, XCircle, Clock } from 'lucide-svelte';

	type JobRun = {
		id: number;
		job_id: number;
		job_name: string;
		status: 'success' | 'failure';
		started_at: string;
		finished_at: string;
		duration_ms: number;
		error: string | null;
		output: string | null;
	};

	export let jobRuns: JobRun[];

	const columns: Column<JobRun>[] = [
		{ key: 'job_name', header: 'Job', sortable: true },
		{ key: 'status', header: 'Status', sortable: true, width: 'w-28' },
		{ key: 'started_at', header: 'Started', sortable: true },
		{ key: 'duration_ms', header: 'Duration', sortable: true, width: 'w-28' },
		{ key: 'output', header: 'Output' }
	];

	// Format duration in ms to human readable
	function formatDuration(ms: number): string {
		if (ms < 1000) return `${ms}ms`;
		if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
		return `${(ms / 60000).toFixed(1)}m`;
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

<div class="space-y-4">
	<div class="flex items-center gap-2">
		<Clock size={18} class="text-neutral-600 dark:text-neutral-400" />
		<h2 class="text-lg font-semibold text-neutral-900 dark:text-neutral-50">Recent Job Runs</h2>
	</div>

	<Table {columns} data={jobRuns} emptyMessage="No job runs yet" compact>
		<svelte:fragment slot="cell" let:row let:column>
			{#if column.key === 'job_name'}
				<span class="text-xs font-medium">{formatJobName(row.job_name)}</span>
			{:else if column.key === 'status'}
				{#if row.status === 'success'}
					<Badge variant="success" icon={CheckCircle}>Success</Badge>
				{:else}
					<Badge variant="danger" icon={XCircle}>Failed</Badge>
				{/if}
			{:else if column.key === 'started_at'}
				<Badge variant="neutral" mono>{getRelativeTime(row.started_at)}</Badge>
			{:else if column.key === 'duration_ms'}
				<Badge variant="neutral" mono>{formatDuration(row.duration_ms)}</Badge>
			{:else if column.key === 'output'}
				{#if row.error}
					<span class="line-clamp-1 font-mono text-xs text-red-600 dark:text-red-400"
						>{row.error}</span
					>
				{:else if row.output}
					<span class="line-clamp-1 font-mono text-xs text-neutral-600 dark:text-neutral-400"
						>{row.output}</span
					>
				{:else}
					<span class="text-neutral-400 dark:text-neutral-600">-</span>
				{/if}
			{/if}
		</svelte:fragment>
	</Table>
</div>
