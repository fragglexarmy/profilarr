<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { filterModes, type FilterMode } from '$lib/shared/filters';
	import { parseUTC } from '$shared/dates';
	import { clickOutside } from '$lib/client/utils/clickOutside';
	import { ChevronDown } from 'lucide-svelte';
	import Toggle from '$ui/toggle/Toggle.svelte';
	import Button from '$ui/button/Button.svelte';
	import Dropdown from '$ui/dropdown/Dropdown.svelte';
	import DropdownItem from '$ui/dropdown/DropdownItem.svelte';

	export let enabled: boolean = true;
	export let dryRun: boolean = false;
	export let schedule: string = '360';
	export let filterMode: FilterMode = 'round_robin';
	export let lastRunAt: string | null = null;

	let scheduleOpen = false;
	let modeOpen = false;

	const scheduleOptions = [
		{ value: '30', label: '30 min' },
		{ value: '60', label: '1 hour' },
		{ value: '120', label: '2 hours' },
		{ value: '240', label: '4 hours' },
		{ value: '360', label: '6 hours' },
		{ value: '480', label: '8 hours' },
		{ value: '720', label: '12 hours' },
		{ value: '1440', label: '24 hours' }
	];

	$: currentScheduleLabel = scheduleOptions.find(o => o.value === schedule)?.label ?? '6 hours';
	$: currentModeLabel = filterModes.find(m => m.id === filterMode)?.label ?? 'Round Robin';

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

<div class="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
	<div class="flex flex-wrap items-center justify-between gap-y-3">
		<!-- Left: Settings -->
		<div class="flex flex-wrap items-center gap-x-6 gap-y-3">
			<!-- Enabled Toggle -->
			<label class="flex cursor-pointer items-center gap-2">
				<Toggle bind:checked={enabled} />
				<span class="text-sm font-medium text-neutral-700 dark:text-neutral-300">Enabled</span>
			</label>

			<!-- Dry Run Toggle -->
			<label class="flex cursor-pointer items-center gap-2">
				<Toggle bind:checked={dryRun} color="amber" />
				<span class="text-sm font-medium text-neutral-700 dark:text-neutral-300">Dry Run</span>
			</label>

			<!-- Divider -->
			<div class="hidden h-6 w-px bg-neutral-200 dark:bg-neutral-700 sm:block"></div>

			<!-- Schedule -->
			<div class="flex items-center gap-2">
				<span class="text-sm text-neutral-500 dark:text-neutral-400">Schedule:</span>
				<div class="relative" use:clickOutside={() => (scheduleOpen = false)}>
					<Button
						text={currentScheduleLabel}
						icon={ChevronDown}
						iconPosition="right"
						on:click={() => (scheduleOpen = !scheduleOpen)}
					/>
					{#if scheduleOpen}
						<Dropdown position="left" minWidth="8rem">
							{#each scheduleOptions as option}
								<DropdownItem
									label={option.label}
									selected={schedule === option.value}
									on:click={() => {
										schedule = option.value;
										scheduleOpen = false;
									}}
								/>
							{/each}
						</Dropdown>
					{/if}
				</div>
			</div>

			<!-- Filter Mode -->
			<div class="flex items-center gap-2">
				<span class="text-sm text-neutral-500 dark:text-neutral-400">Mode:</span>
				<div class="relative" use:clickOutside={() => (modeOpen = false)}>
					<Button
						text={currentModeLabel}
						icon={ChevronDown}
						iconPosition="right"
						on:click={() => (modeOpen = !modeOpen)}
					/>
					{#if modeOpen}
						<Dropdown position="left" minWidth="10rem">
							{#each filterModes as mode}
								<DropdownItem
									label={mode.label}
									selected={filterMode === mode.id}
									on:click={() => {
										filterMode = mode.id;
										modeOpen = false;
									}}
								/>
							{/each}
						</Dropdown>
					{/if}
				</div>
			</div>
		</div>

		<!-- Right: Status -->
		{#if lastRunAt}
			<div class="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
				{#if !enabled}
					<span class="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">Paused</span>
				{:else if timeUntilNext !== null && timeUntilNext <= 0}
					<span class="rounded bg-green-100 px-1.5 py-0.5 font-medium text-green-700 dark:bg-green-900/50 dark:text-green-400">Ready</span>
				{:else if timeUntilNext !== null}
					<span>
						Next: <span class="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">{formatTimeRemaining(timeUntilNext)}</span>
					</span>
				{/if}
				<span>
					Last: <span class="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">{formatLastRun(lastRunAt)}</span>
				</span>
			</div>
		{/if}
	</div>
</div>
