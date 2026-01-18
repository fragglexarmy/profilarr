<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import type { FilterConfig, FilterMode } from '$lib/shared/filters';
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import { alertStore } from '$lib/client/alerts/store';
	import { isDirty, initEdit, initCreate, update, clear } from '$lib/client/stores/dirty';
	import { Info, Save, Play, RotateCcw, Settings, SlidersHorizontal, History } from 'lucide-svelte';
	import CoreSettings from './components/CoreSettings.svelte';
	import FilterSettings from './components/FilterSettings.svelte';
	import RunHistory from './components/RunHistory.svelte';
	import UpgradesInfoModal from './components/UpgradesInfoModal.svelte';
	import DirtyModal from '$ui/modal/DirtyModal.svelte';
	import StickyCard from '$ui/card/StickyCard.svelte';
	import Button from '$ui/button/Button.svelte';

	export let data: PageData;
	export let form: ActionData;

	// Initialize from existing config or defaults
	let enabled = data.config?.enabled ?? false;
	let dryRun = data.config?.dryRun ?? true;
	let schedule = String(data.config?.schedule ?? 360);
	let filterMode: FilterMode = data.config?.filterMode ?? 'round_robin';
	let filters: FilterConfig[] = data.config?.filters ?? [];

	// Track if config exists
	$: isNewConfig = !data.config;

	let showInfoModal = false;
	let saving = false;
	let running = false;
	let clearing = false;

	// Initialize dirty tracking
	onMount(() => {
		const formData = { enabled, dryRun, schedule, filterMode, filters: JSON.stringify(filters) };
		if (data.config) {
			initEdit(formData);
		} else {
			initCreate(formData);
		}
		return () => clear();
	});

	// Update dirty store when fields change
	$: update('enabled', enabled);
	$: update('dryRun', dryRun);
	$: update('schedule', schedule);
	$: update('filterMode', filterMode);
	$: update('filters', JSON.stringify(filters));

	// Handle form response - use a processed flag to avoid re-running on field changes
	let lastFormId: unknown = null;
	$: if (form && form !== lastFormId) {
		lastFormId = form;
		if (form.success && !form.runResult && !form.cacheCleared) {
			alertStore.add('success', 'Configuration saved successfully');
			initEdit({ enabled, dryRun, schedule, filterMode, filters: JSON.stringify(filters) });
		}
		if (form.success && form.runResult) {
			const r = form.runResult;
			const dryLabel = r.dryRun ? '[DRY RUN] ' : '';
			alertStore.add(
				r.status === 'success' ? 'success' : r.status === 'partial' ? 'warning' : 'error',
				`${dryLabel}${r.filterName}: ${r.searched}/${r.matched} items searched (${r.afterCooldown} after cooldown)`
			);
		}
		if (form.success && form.cacheCleared) {
			alertStore.add('success', 'Dry run cache cleared');
		}
		if (form.error) {
			alertStore.add('error', form.error);
		}
	}
</script>

<svelte:head>
	<title>{data.instance.name} - Upgrades - Profilarr</title>
</svelte:head>

<StickyCard position="top">
	<div slot="left">
		<h1 class="text-xl font-semibold text-neutral-900 dark:text-neutral-50">Upgrades</h1>
		<p class="text-sm text-neutral-500 dark:text-neutral-400">
			Automatically search for better quality releases.
		</p>
	</div>
	<div slot="right" class="flex items-center gap-2">
		<Button text="How it works" icon={Info} on:click={() => (showInfoModal = true)} />
		{#if !isNewConfig && data.config?.dryRun}
			<Button
				text={clearing ? 'Clearing...' : 'Reset Cache'}
				icon={RotateCcw}
				disabled={clearing || running || saving}
				on:click={() => {
					const clearForm = document.getElementById('clear-cache-form');
					if (clearForm instanceof HTMLFormElement) {
						clearForm.requestSubmit();
					}
				}}
			/>
			<Button
				text={running ? 'Running...' : 'Test Run'}
				icon={Play}
				iconColor="text-amber-600 dark:text-amber-400"
				disabled={running || saving || clearing || $isDirty}
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
		<CoreSettings
			bind:enabled
			bind:dryRun
			bind:schedule
			bind:filterMode
			lastRunAt={data.config?.lastRunAt ?? null}
		/>
	</section>

	<section>
		<h2
			class="mb-3 flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-neutral-100"
		>
			<SlidersHorizontal size={18} class="text-neutral-500 dark:text-neutral-400" />
			Filters
		</h2>
		<FilterSettings bind:filters />
	</section>
</div>

<section class="mt-6">
	<h2
		class="mb-3 flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-neutral-100"
	>
		<History size={18} class="text-neutral-500 dark:text-neutral-400" />
		Run History
	</h2>
	<RunHistory runs={data.upgradeRuns} />
</section>

<!-- Hidden forms -->
<form
	id="save-form"
	method="POST"
	action="?/save"
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
	<input type="hidden" name="schedule" value={schedule} />
	<input type="hidden" name="filterMode" value={filterMode} />
	<input type="hidden" name="filters" value={JSON.stringify(filters)} />
</form>
{#if !isNewConfig && data.config?.dryRun}
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
	<form
		id="clear-cache-form"
		method="POST"
		action="?/clearCache"
		class="hidden"
		use:enhance={() => {
			clearing = true;
			return async ({ update }) => {
				await update({ reset: false });
				clearing = false;
			};
		}}
	></form>
{/if}

<UpgradesInfoModal bind:open={showInfoModal} />
<DirtyModal />
