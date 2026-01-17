<script lang="ts">
	export let enabled: boolean = false;
	export let dryRun: boolean = true;
	export let renameFolders: boolean = false;
	export let ignoreTag: string = '';
	export let schedule: string = '1440';

	const scheduleOptions = [
		{ value: '60', label: 'Every hour' },
		{ value: '120', label: 'Every 2 hours' },
		{ value: '240', label: 'Every 4 hours' },
		{ value: '360', label: 'Every 6 hours' },
		{ value: '480', label: 'Every 8 hours' },
		{ value: '720', label: 'Every 12 hours' },
		{ value: '1440', label: 'Every day' },
		{ value: '2880', label: 'Every 2 days' },
		{ value: '10080', label: 'Every week' }
	];
</script>

<div
	class="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900"
>
	<h2 class="mb-4 text-lg font-semibold text-neutral-900 dark:text-neutral-50">Rename Settings</h2>

	<div class="space-y-4">
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
			<p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
				How often to check for files that need renaming
			</p>
		</div>

		<!-- Ignore Tag -->
		<div>
			<label
				for="ignoreTag"
				class="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
			>
				Ignore Tag
			</label>
			<input
				type="text"
				id="ignoreTag"
				bind:value={ignoreTag}
				placeholder="no-rename"
				class="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500"
			/>
			<p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
				Items with this tag will be skipped during rename operations
			</p>
		</div>

		<!-- Toggles -->
		<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
			<!-- Enabled Toggle -->
			<div
				class="flex items-center justify-between rounded-lg border border-neutral-200 p-3 dark:border-neutral-700"
			>
				<div>
					<label
						for="enabled"
						class="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
					>
						Enabled
					</label>
					<p class="text-xs text-neutral-500 dark:text-neutral-400">Run on schedule</p>
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
			<div
				class="flex items-center justify-between rounded-lg border border-neutral-200 p-3 dark:border-neutral-700"
			>
				<div>
					<label
						for="dryRun"
						class="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
					>
						Dry Run
					</label>
					<p class="text-xs text-neutral-500 dark:text-neutral-400">Preview only</p>
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

			<!-- Rename Folders Toggle -->
			<div
				class="flex items-center justify-between rounded-lg border border-neutral-200 p-3 dark:border-neutral-700"
			>
				<div>
					<label
						for="renameFolders"
						class="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
					>
						Rename Folders
					</label>
					<p class="text-xs text-neutral-500 dark:text-neutral-400">Also rename folders</p>
				</div>
				<button
					type="button"
					role="switch"
					aria-checked={renameFolders}
					aria-label="Toggle rename folders"
					on:click={() => (renameFolders = !renameFolders)}
					class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 {renameFolders
						? 'bg-blue-600 dark:bg-blue-500'
						: 'bg-neutral-200 dark:bg-neutral-700'}"
				>
					<span
						class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out {renameFolders
							? 'translate-x-5'
							: 'translate-x-0'}"
					></span>
				</button>
			</div>
		</div>
	</div>
</div>
