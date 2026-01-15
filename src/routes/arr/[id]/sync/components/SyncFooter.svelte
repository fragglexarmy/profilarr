<script lang="ts">
	import IconCheckbox from '$ui/form/IconCheckbox.svelte';
	import { Check, RefreshCw, Save, Loader2 } from 'lucide-svelte';
	import { createEventDispatcher } from 'svelte';

	export let syncTrigger: 'manual' | 'on_pull' | 'on_change' | 'schedule' = 'manual';
	export let cronExpression: string = '0 * * * *';
	export let saving: boolean = false;
	export let syncing: boolean = false;
	export let isDirty: boolean = false;

	const dispatch = createEventDispatcher<{ save: void; sync: void }>();

	const triggerOptions = [
		{ value: 'manual', label: 'Manual' },
		{ value: 'on_pull', label: 'On Pull' },
		{ value: 'on_change', label: 'On Change' },
		{ value: 'schedule', label: 'Schedule' }
	] as const;

	// Save disabled when not dirty, Sync disabled when dirty (unsaved changes)
	$: saveDisabled = saving || !isDirty;
	$: syncDisabled = syncing || isDirty;
</script>

<div class="border-t border-neutral-200 px-6 py-4 dark:border-neutral-800">
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
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

		<div class="flex items-center gap-2">
			<button
				type="button"
				disabled={syncDisabled}
				on:click={() => dispatch('sync')}
				title={isDirty ? 'Save changes before syncing' : ''}
				class="flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
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
				class="flex items-center gap-1.5 rounded-lg bg-accent-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
