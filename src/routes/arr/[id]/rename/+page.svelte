<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import { alertStore } from '$lib/client/alerts/store';
	import { isDirty, initEdit, initCreate, update, clear } from '$lib/client/stores/dirty';
	import { Info, Save, Play, Settings, History } from 'lucide-svelte';
	import RenameSettings from './components/RenameSettings.svelte';
	import RenameRunHistory from './components/RenameRunHistory.svelte';
	import RenameInfoModal from './components/RenameInfoModal.svelte';
	import DirtyModal from '$lib/client/ui/modal/DirtyModal.svelte';
	import StickyCard from '$ui/card/StickyCard.svelte';
	import Button from '$ui/button/Button.svelte';

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

<StickyCard position="top">
	<div slot="left">
		<h1 class="text-xl font-semibold text-neutral-900 dark:text-neutral-50">Rename</h1>
		<p class="text-sm text-neutral-500 dark:text-neutral-400">
			Automatically rename files and folders to match your naming format.
		</p>
	</div>
	<div slot="right" class="flex items-center gap-2">
		<Button text="How it works" icon={Info} on:click={() => (showInfoModal = true)} />
		{#if !isNewConfig && data.settings?.dryRun}
			<Button
				text={running ? 'Running...' : 'Test Run'}
				icon={Play}
				iconColor="text-amber-600 dark:text-amber-400"
				disabled={running || saving || $isDirty}
				on:click={() => {
					const runForm = document.getElementById('run-form');
					if (runForm instanceof HTMLFormElement) {
						runForm.requestSubmit();
					}
				}}
			/>
		{/if}
		<Button
			text={saving ? 'Saving...' : 'Save'}
			icon={Save}
			iconColor="text-blue-600 dark:text-blue-400"
			disabled={saving || running || !$isDirty}
			on:click={() => {
				const saveForm = document.getElementById('save-form');
				if (saveForm instanceof HTMLFormElement) {
					saveForm.requestSubmit();
				}
			}}
		/>
	</div>
</StickyCard>

<div class="mt-6 space-y-6">
	<section>
		<h2
			class="mb-3 flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-neutral-100"
		>
			<Settings size={18} class="text-neutral-500 dark:text-neutral-400" />
			Settings
		</h2>
		<RenameSettings
			bind:enabled
			bind:dryRun
			bind:renameFolders
			bind:ignoreTag
			bind:schedule
			bind:summaryNotifications
			lastRunAt={data.settings?.lastRunAt ?? null}
		/>
	</section>
</div>

<section class="mt-6">
	<h2
		class="mb-3 flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-neutral-100"
	>
		<History size={18} class="text-neutral-500 dark:text-neutral-400" />
		Run History
	</h2>
	<RenameRunHistory runs={data.renameRuns} />
</section>

<!-- Hidden forms -->
<form
	id="save-form"
	method="POST"
	action={isNewConfig ? '?/save' : '?/update'}
	class="hidden"
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
</form>
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
	></form>
{/if}

<RenameInfoModal bind:open={showInfoModal} />
<DirtyModal />
