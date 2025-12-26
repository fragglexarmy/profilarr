<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import type { FilterConfig, FilterMode } from '$lib/shared/filters';
	import { enhance } from '$app/forms';
	import { alertStore } from '$lib/client/alerts/store';
	import { Info, Save, Pencil } from 'lucide-svelte';
	import CoreSettings from './components/CoreSettings.svelte';
	import FilterSettings from './components/FilterSettings.svelte';
	import UpgradesInfoModal from './components/UpgradesInfoModal.svelte';

	export let data: PageData;
	export let form: ActionData;

	// Initialize from existing config or defaults
	let enabled = data.config?.enabled ?? false;
	let schedule = String(data.config?.schedule ?? 360);
	let filterMode: FilterMode = data.config?.filterMode ?? 'round_robin';
	let filters: FilterConfig[] = data.config?.filters ?? [];

	// Track if config exists (determines save vs edit)
	$: isNewConfig = !data.config;

	let showInfoModal = false;
	let saving = false;

	// Handle form response
	$: if (form?.success) {
		alertStore.add('success', `Configuration ${isNewConfig ? 'saved' : 'updated'} successfully`);
	}
	$: if (form?.error) {
		alertStore.add('error', form.error);
	}
</script>

<svelte:head>
	<title>{data.instance.name} - Upgrades - Profilarr</title>
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
	<input type="hidden" name="schedule" value={schedule} />
	<input type="hidden" name="filterMode" value={filterMode} />
	<input type="hidden" name="filters" value={JSON.stringify(filters)} />

	<div class="mt-6 space-y-6">
		<!-- Header -->
		<div class="flex items-start justify-between">
			<div>
				<h1 class="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
					Upgrade Configuration
				</h1>
				<p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
					Automatically search for better quality releases for your library items.
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

		<CoreSettings bind:enabled bind:schedule bind:filterMode />
		<FilterSettings bind:filters />

		<!-- Save/Update Button -->
		<div class="flex justify-end">
			<button
				type="submit"
				disabled={saving}
				class="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 {isNewConfig
					? 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
					: 'bg-green-600 text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600'}"
			>
				{#if isNewConfig}
					<Save size={16} />
					{saving ? 'Saving...' : 'Save'}
				{:else}
					<Pencil size={16} />
					{saving ? 'Updating...' : 'Update'}
				{/if}
			</button>
		</div>
	</div>
</form>

<UpgradesInfoModal bind:open={showInfoModal} />
