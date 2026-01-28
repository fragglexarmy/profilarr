<script lang="ts">
	import IconCheckbox from '$ui/form/IconCheckbox.svelte';
	import { Check, RefreshCw, Save, Loader2, AlertTriangle } from 'lucide-svelte';
	import { createEventDispatcher } from 'svelte';

	export let syncTrigger: 'manual' | 'on_pull' | 'on_change' | 'schedule' = 'manual';
	export let cronExpression: string = '0 * * * *';
	export let saving: boolean = false;
	export let syncing: boolean = false;
	export let isDirty: boolean = false;
	export let canSave: boolean = true;
	export let warning: string | null = null;

	const dispatch = createEventDispatcher<{ save: void; sync: void }>();

	const triggerOptions = [
		{ value: 'manual', label: 'Manual' },
		{ value: 'on_pull', label: 'On Pull' },
		{ value: 'on_change', label: 'On Change' },
		{ value: 'schedule', label: 'Schedule' }
	] as const;

	// Save disabled when not dirty or can't save, Sync disabled when dirty (unsaved changes)
	$: saveDisabled = saving || !isDirty || !canSave;
	$: syncDisabled = syncing || isDirty;
</script>

<div class="border-t border-neutral-200 px-4 py-4 md:px-6 dark:border-neutral-800">
	<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
		<!-- Trigger options -->
		<div class="flex flex-wrap items-center gap-3 md:gap-4">
			<span class="text-sm text-neutral-500 dark:text-neutral-400">Trigger</span>
			{#each triggerOptions as option}
				<div class="flex items-center gap-2">
					<IconCheckbox
						checked={syncTrigger === option.value}
						icon={Check}
						shape="rounded"
						on:click={() => (syncTrigger = option.value)}
					/>
					<span class="text-sm text-neutral-700 dark:text-neutral-300">{option.label}</span>
				</div>
			{/each}

			{#if syncTrigger === 'schedule'}
				<input
					type="text"
					bind:value={cronExpression}
					placeholder="0 * * * *"
					class="w-32 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 font-mono text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
				/>
			{/if}
		</div>

		<!-- Warning + Buttons -->
		<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
			{#if warning}
				<div class="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
					<AlertTriangle size={14} class="flex-shrink-0" />
					<span>{warning}</span>
				</div>
			{/if}
			<div class="flex items-center gap-3">
				<button
					type="button"
					disabled={syncDisabled}
					on:click={() => dispatch('sync')}
					title={isDirty ? 'Save changes before syncing' : ''}
					class="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
				>
					{#if syncing}
						<Loader2 size={14} class="animate-spin" />
					{:else}
						<RefreshCw size={14} />
					{/if}
					Sync Now
				</button>
				<button
					type="button"
					disabled={saveDisabled}
					on:click={() => dispatch('save')}
					class="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
				>
					{#if saving}
						<Loader2 size={14} class="animate-spin" />
					{:else}
						<Save size={14} />
					{/if}
					Save
				</button>
			</div>
		</div>
	</div>
</div>
