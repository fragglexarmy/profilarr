<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import { alertStore } from '$lib/client/alerts/store';
	import { isDirty, initEdit, initCreate, update, clear } from '$lib/client/stores/dirty';
	import { Info, Save, Play } from 'lucide-svelte';
	import RenameSettings from './components/RenameSettings.svelte';
	import RenameInfoModal from './components/RenameInfoModal.svelte';
	import CooldownTracker from './components/CooldownTracker.svelte';
	import DirtyModal from '$lib/client/ui/modal/DirtyModal.svelte';

	export let data: PageData;
	export let form: ActionData;

	// Initialize from existing settings or defaults
	let enabled = data.settings?.enabled ?? false;
	let dryRun = data.settings?.dryRun ?? true;
	let renameFolders = data.settings?.renameFolders ?? false;
	let ignoreTag = data.settings?.ignoreTag ?? '';
	let schedule = String(data.settings?.schedule ?? 1440);
	let summaryNotifications = data.settings?.summaryNotifications ?? true;

	// Track if settings exist (determines save vs edit)
	$: isNewConfig = !data.settings;

	let showInfoModal = false;
	let saving = false;
	let running = false;

	// Initialize dirty tracking
	onMount(() => {
		const formData = { enabled, dryRun, renameFolders, ignoreTag, schedule, summaryNotifications };
		if (isNewConfig) {
			initCreate(formData);
		} else {
			initEdit(formData);
		}
		return () => clear();
	});

	// Update dirty store when fields change
	$: update('enabled', enabled);
	$: update('dryRun', dryRun);
	$: update('renameFolders', renameFolders);
	$: update('ignoreTag', ignoreTag);
	$: update('schedule', schedule);
	$: update('summaryNotifications', summaryNotifications);

	// Handle form response - use a processed flag to avoid re-running on field changes
	let lastFormId: unknown = null;
	$: if (form && form !== lastFormId) {
		lastFormId = form;
		if (form.success && !form.runResult) {
			alertStore.add('success', 'Configuration saved successfully');
			initEdit({ enabled, dryRun, renameFolders, ignoreTag, schedule, summaryNotifications });
		}
		if (form.success && form.runResult) {
			const r = form.runResult;
			const msg = r.dryRun
				? `${r.filesNeedingRename} files would be renamed`
				: `${r.filesRenamed}/${r.filesNeedingRename} files renamed`;
			alertStore.add(
				r.status === 'success' ? 'success' : r.status === 'partial' ? 'warning' : 'error',
				msg
			);
		}
		if (form.error) {
			alertStore.add('error', form.error);
		}
	}
</script>

<svelte:head>
	<title>{data.instance.name} - Rename - Profilarr</title>
</svelte:head>

<form
	method="POST"
	action={isNewConfig ? '?/save' : '?/update'}
	use:enhance={() => {
		saving = true;
		return async ({ update }) => {
			await update({ reset: false });
			saving = false;
		};
	}}
>
	<input type="hidden" name="enabled" value={enabled} />
	<input type="hidden" name="dryRun" value={dryRun} />
	<input type="hidden" name="renameFolders" value={renameFolders} />
	<input type="hidden" name="ignoreTag" value={ignoreTag} />
	<input type="hidden" name="schedule" value={schedule} />
	<input type="hidden" name="summaryNotifications" value={summaryNotifications} />

	<div class="mt-6 space-y-6">
		<!-- Header -->
		<div class="flex items-start justify-between">
			<div>
				<h1 class="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
					Rename Configuration
				</h1>
				<p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
					Automatically rename files and folders to match your naming format.
				</p>
			</div>
			<button
				type="button"
				on:click={() => (showInfoModal = true)}
				class="flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
			>
				<Info size={14} />
				How it works
			</button>
		</div>

		{#if !isNewConfig && data.settings?.lastRunAt}
			<CooldownTracker
				enabled={data.settings.enabled}
				schedule={data.settings.schedule}
				lastRunAt={data.settings.lastRunAt}
			/>
		{/if}

		<RenameSettings bind:enabled bind:dryRun bind:renameFolders bind:ignoreTag bind:schedule bind:summaryNotifications />

		<!-- Action Buttons -->
		<div class="flex justify-end gap-3">
			{#if !isNewConfig}
				<button
					type="button"
					disabled={running || saving || $isDirty}
					title={$isDirty ? 'Save changes before running' : undefined}
					on:click={() => {
						const runForm = document.getElementById('run-form');
						if (runForm instanceof HTMLFormElement) {
							runForm.requestSubmit();
						}
					}}
					class="flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
				>
					<Play size={16} class="text-amber-600 dark:text-amber-400" />
					{running ? 'Running...' : 'Run Now'}
				</button>
			{/if}
			<button
				type="submit"
				disabled={saving || running || !$isDirty}
				class="flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
			>
				<Save size={16} class="text-blue-600 dark:text-blue-400" />
				{saving ? 'Saving...' : 'Save'}
			</button>
		</div>
	</div>
</form>

<!-- Hidden form for run now -->
{#if !isNewConfig}
	<form
		id="run-form"
		method="POST"
		action="?/run"
		class="hidden"
		use:enhance={() => {
			running = true;
			return async ({ update }) => {
				await update({ reset: false });
				running = false;
			};
		}}
	>
	</form>
{/if}

<RenameInfoModal bind:open={showInfoModal} />
<DirtyModal />
