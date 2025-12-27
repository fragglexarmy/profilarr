<script lang="ts">
	import { filterModes, type FilterMode } from '$lib/shared/filters';

	export let enabled: boolean = true;
	export let dryRun: boolean = false;
	export let schedule: string = '360';
	export let filterMode: FilterMode = 'round_robin';

	const scheduleOptions = [
		{ value: '30', label: 'Every 30 minutes' },
		{ value: '60', label: 'Every hour' },
		{ value: '120', label: 'Every 2 hours' },
		{ value: '240', label: 'Every 4 hours' },
		{ value: '360', label: 'Every 6 hours' },
		{ value: '480', label: 'Every 8 hours' },
		{ value: '720', label: 'Every 12 hours' },
		{ value: '1440', label: 'Every day' }
	];
</script>

<div
	class="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900"
>
	<h2 class="mb-4 text-lg font-semibold text-neutral-900 dark:text-neutral-50">Core Settings</h2>

	<div class="space-y-4">
		<!-- Schedule, Filter Mode Row -->
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<!-- Schedule -->
			<div>
				<label
					for="schedule"
					class="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
				>
					Schedule <span class="text-red-500">*</span>
				</label>
				<select
					id="schedule"
					bind:value={schedule}
					class="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
				>
					{#each scheduleOptions as option}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</div>

			<!-- Filter Mode -->
			<div>
				<label
					for="filterMode"
					class="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
				>
					Filter Mode
				</label>
				<select
					id="filterMode"
					bind:value={filterMode}
					class="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
				>
					{#each filterModes as mode}
						<option value={mode.id}>{mode.label} - {mode.description}</option>
					{/each}
				</select>
			</div>
		</div>

		<!-- Toggles Row -->
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<!-- Enabled Toggle -->
			<div class="flex items-center justify-between rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
				<div>
					<label
						for="enabled"
						class="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
					>
						Enabled
					</label>
					<p class="text-xs text-neutral-500 dark:text-neutral-400">
						Run upgrade jobs on schedule
					</p>
				</div>
				<button
					type="button"
					role="switch"
					aria-checked={enabled}
					aria-label="Toggle enabled status"
					on:click={() => (enabled = !enabled)}
					class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 {enabled
						? 'bg-blue-600 dark:bg-blue-500'
						: 'bg-neutral-200 dark:bg-neutral-700'}"
				>
					<span
						class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out {enabled
							? 'translate-x-5'
							: 'translate-x-0'}"
					></span>
				</button>
			</div>

			<!-- Dry Run Toggle -->
			<div class="flex items-center justify-between rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
				<div>
					<label
						for="dryRun"
						class="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
					>
						Dry Run
					</label>
					<p class="text-xs text-neutral-500 dark:text-neutral-400">
						Log actions without triggering searches
					</p>
				</div>
				<button
					type="button"
					role="switch"
					aria-checked={dryRun}
					aria-label="Toggle dry run mode"
					on:click={() => (dryRun = !dryRun)}
					class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 {dryRun
						? 'bg-amber-500 dark:bg-amber-500'
						: 'bg-neutral-200 dark:bg-neutral-700'}"
				>
					<span
						class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out {dryRun
							? 'translate-x-5'
							: 'translate-x-0'}"
					></span>
				</button>
			</div>
		</div>
	</div>
</div>
