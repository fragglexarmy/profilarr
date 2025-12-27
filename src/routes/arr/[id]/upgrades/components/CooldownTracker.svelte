<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Clock, Timer, CheckCircle, PauseCircle } from 'lucide-svelte';

	export let enabled: boolean;
	export let schedule: number; // minutes
	export let lastRunAt: string | null;

	let now = Date.now();
	let interval: ReturnType<typeof setInterval>;

	onMount(() => {
		interval = setInterval(() => {
			now = Date.now();
		}, 1000);
	});

	onDestroy(() => {
		if (interval) clearInterval(interval);
	});

	// Calculate times
	// Database stores timestamps without timezone - append Z to parse as UTC
	$: lastRunTime = lastRunAt ? new Date(lastRunAt.endsWith('Z') ? lastRunAt : lastRunAt + 'Z').getTime() : null;
	$: scheduleMs = schedule * 60 * 1000;
	$: nextRunTime = lastRunTime ? lastRunTime + scheduleMs : null;
	$: timeUntilNext = nextRunTime ? nextRunTime - now : null;
	$: isDue = timeUntilNext !== null && timeUntilNext <= 0;
	$: progress = lastRunTime && nextRunTime
		? Math.min(100, Math.max(0, ((now - lastRunTime) / scheduleMs) * 100))
		: 0;

	// Format relative time
	function formatTimeRemaining(ms: number): string {
		if (ms <= 0) return 'Due now';

		const seconds = Math.floor(ms / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);

		if (hours > 0) {
			const remainingMinutes = minutes % 60;
			return `${hours}h ${remainingMinutes}m`;
		}
		if (minutes > 0) {
			const remainingSeconds = seconds % 60;
			return `${minutes}m ${remainingSeconds}s`;
		}
		return `${seconds}s`;
	}

	// Parse timestamp - append Z if needed to treat as UTC
	function parseTimestamp(str: string): Date {
		return new Date(str.endsWith('Z') ? str : str + 'Z');
	}

	// Format absolute time
	function formatTime(isoString: string): string {
		const date = parseTimestamp(isoString);
		return date.toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true
		});
	}

	function formatDate(isoString: string): string {
		const date = parseTimestamp(isoString);
		const today = new Date();
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);

		if (date.toDateString() === today.toDateString()) {
			return 'Today';
		}
		if (date.toDateString() === yesterday.toDateString()) {
			return 'Yesterday';
		}
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	// Format schedule
	function formatSchedule(minutes: number): string {
		if (minutes < 60) return `${minutes} min`;
		if (minutes === 60) return '1 hour';
		if (minutes < 1440) return `${minutes / 60} hours`;
		return '24 hours';
	}
</script>

{#if lastRunAt}
	<div class="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
		<div class="flex items-center justify-between gap-4">
			<!-- Status -->
			<div class="flex items-center gap-3">
				{#if !enabled}
					<div class="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
						<PauseCircle size={20} class="text-neutral-400" />
					</div>
					<div>
						<div class="text-sm font-medium text-neutral-500 dark:text-neutral-400">Paused</div>
						<div class="text-xs text-neutral-400 dark:text-neutral-500">
							Enable to resume scheduled runs
						</div>
					</div>
				{:else if isDue}
					<div class="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
						<CheckCircle size={20} class="text-green-600 dark:text-green-400" />
					</div>
					<div>
						<div class="text-sm font-medium text-green-600 dark:text-green-400">Ready to run</div>
						<div class="text-xs text-neutral-500 dark:text-neutral-400">
							Will run on next job cycle
						</div>
					</div>
				{:else}
					<div class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
						<Timer size={20} class="text-blue-600 dark:text-blue-400" />
					</div>
					<div>
						<div class="text-sm font-medium text-neutral-900 dark:text-neutral-100">
							Next run in <span class="font-mono text-blue-600 dark:text-blue-400">{formatTimeRemaining(timeUntilNext ?? 0)}</span>
						</div>
						<div class="text-xs text-neutral-500 dark:text-neutral-400">
							Every {formatSchedule(schedule)}
						</div>
					</div>
				{/if}
			</div>

			<!-- Last run info -->
			<div class="text-right">
				<div class="flex items-center justify-end gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
					<Clock size={12} />
					Last run
				</div>
				<div class="text-sm font-medium text-neutral-700 dark:text-neutral-300">
					{formatDate(lastRunAt)} @ {formatTime(lastRunAt)}
				</div>
			</div>
		</div>

		<!-- Progress bar -->
		{#if enabled && !isDue}
			<div class="mt-3">
				<div class="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
					<div
						class="h-full rounded-full bg-blue-500 transition-all duration-1000 ease-linear"
						style="width: {progress}%"
					></div>
				</div>
			</div>
		{/if}
	</div>
{/if}
