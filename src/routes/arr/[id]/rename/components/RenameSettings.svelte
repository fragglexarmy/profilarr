<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { parseUTC } from '$shared/dates';
	import Input from '$ui/form/Input.svelte';
	import DropdownSelect from '$ui/dropdown/DropdownSelect.svelte';

	export let enabled: boolean = false;
	export let dryRun: boolean = true;
	export let renameFolders: boolean = false;
	export let ignoreTag: string = '';
	export let schedule: string = '1440';
	export let summaryNotifications: boolean = true;
	export let lastRunAt: string | null = null;

	export let onEnabledChange: ((value: boolean) => void) | undefined = undefined;
	export let onDryRunChange: ((value: boolean) => void) | undefined = undefined;
	export let onRenameFoldersChange: ((value: boolean) => void) | undefined = undefined;
	export let onIgnoreTagChange: ((value: string) => void) | undefined = undefined;
	export let onScheduleChange: ((value: string) => void) | undefined = undefined;
	export let onSummaryNotificationsChange: ((value: boolean) => void) | undefined = undefined;

	const enabledOptions = [
		{ value: 'false', label: 'Disabled' },
		{ value: 'true', label: 'Enabled' }
	];

	const scheduleOptions = [
		{ value: '60', label: '1 hour' },
		{ value: '120', label: '2 hours' },
		{ value: '240', label: '4 hours' },
		{ value: '360', label: '6 hours' },
		{ value: '480', label: '8 hours' },
		{ value: '720', label: '12 hours' },
		{ value: '1440', label: '24 hours' },
		{ value: '2880', label: '2 days' },
		{ value: '10080', label: '1 week' }
	];

	// Cooldown tracking
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

	$: scheduleMinutes = parseInt(schedule, 10);
	$: lastRunTime = parseUTC(lastRunAt)?.getTime() ?? null;
	$: scheduleMs = scheduleMinutes * 60 * 1000;
	$: nextRunTime = lastRunTime ? lastRunTime + scheduleMs : null;
	$: timeUntilNext = nextRunTime ? nextRunTime - now : null;

	function formatTimeRemaining(ms: number): string {
		if (ms <= 0) return 'now';
		const seconds = Math.floor(ms / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);
		if (hours > 0) {
			const remainingMinutes = minutes % 60;
			return `${hours}h ${remainingMinutes}m`;
		}
		if (minutes > 0) {
			return `${minutes}m`;
		}
		return `${seconds}s`;
	}

	function formatLastRun(isoString: string): string {
		const date = parseUTC(isoString);
		if (!date) return '-';
		const today = new Date();
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);

		let dateStr: string;
		if (date.toDateString() === today.toDateString()) {
			dateStr = 'Today';
		} else if (date.toDateString() === yesterday.toDateString()) {
			dateStr = 'Yesterday';
		} else {
			dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
		}

		const timeStr = date.toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true
		});

		return `${dateStr}, ${timeStr}`;
	}
</script>

<div
	class="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
>
	<div class="flex flex-wrap items-center justify-between gap-y-3">
		<!-- Left: Settings -->
		<div class="flex flex-wrap items-center gap-x-6 gap-y-3">
			<!-- Status -->
			<DropdownSelect
				label="Status:"
				value={enabled ? 'true' : 'false'}
				options={enabledOptions}
				responsiveButton
				on:change={(e) => onEnabledChange?.(e.detail === 'true')}
			/>

			<!-- Dry Run -->
			<DropdownSelect
				label="Dry Run:"
				value={dryRun ? 'true' : 'false'}
				options={enabledOptions}
				responsiveButton
				on:change={(e) => onDryRunChange?.(e.detail === 'true')}
			/>

			<!-- Rename Folders -->
			<DropdownSelect
				label="Folders:"
				value={renameFolders ? 'true' : 'false'}
				options={enabledOptions}
				responsiveButton
				on:change={(e) => onRenameFoldersChange?.(e.detail === 'true')}
			/>

			<!-- Summary Notifications -->
			<DropdownSelect
				label="Summary:"
				value={summaryNotifications ? 'true' : 'false'}
				options={enabledOptions}
				responsiveButton
				on:change={(e) => onSummaryNotificationsChange?.(e.detail === 'true')}
			/>

			<!-- Divider -->
			<div class="hidden h-6 w-px bg-neutral-200 sm:block dark:bg-neutral-700"></div>

			<!-- Schedule -->
			<DropdownSelect
				label="Schedule:"
				value={schedule}
				options={scheduleOptions}
				responsiveButton
				on:change={(e) => onScheduleChange?.(e.detail)}
			/>

			<!-- Ignore Tag -->
			<div class="flex items-center gap-2">
				<span class="text-sm text-neutral-500 dark:text-neutral-400">Ignore Tag:</span>
				<Input value={ignoreTag} placeholder="no-rename" on:input={(e) => onIgnoreTagChange?.(e.detail)} />
			</div>
		</div>

		<!-- Right: Status -->
		{#if lastRunAt}
			<div class="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
				{#if !enabled}
					<span
						class="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-700 dark:bg-amber-900/50 dark:text-amber-400"
						>Paused</span
					>
				{:else if timeUntilNext !== null && timeUntilNext <= 0}
					<span
						class="rounded bg-green-100 px-1.5 py-0.5 font-medium text-green-700 dark:bg-green-900/50 dark:text-green-400"
						>Ready</span
					>
				{:else if timeUntilNext !== null}
					<span>
						Next Run: <span
							class="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
							>{formatTimeRemaining(timeUntilNext)}</span
						>
					</span>
				{/if}
				<span>
					Last Run: <span
						class="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
						>{formatLastRun(lastRunAt)}</span
					>
				</span>
			</div>
		{/if}
	</div>
</div>
