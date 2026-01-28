<script lang="ts">
	import type { DelayProfilesRow } from '$shared/pcd/display.ts';
	import IconCheckbox from '$ui/form/IconCheckbox.svelte';
	import SyncFooter from './SyncFooter.svelte';
	import { Check } from 'lucide-svelte';
	import { alertStore } from '$lib/client/alerts/store.ts';

	interface DatabaseWithProfiles {
		id: number;
		name: string;
		delayProfiles: DelayProfilesRow[];
	}

	export let databases: DatabaseWithProfiles[];
	export let state: {
		databaseId: number | null;
		profileId: number | null;
	} = {
		databaseId: null,
		profileId: null
	};
	export let syncTrigger: 'manual' | 'on_pull' | 'on_change' | 'schedule' = 'manual';
	export let cronExpression: string = '0 * * * *';

	let saving = false;
	let syncing = false;

	// Track saved state for dirty detection
	let savedState = JSON.stringify({ state, syncTrigger, cronExpression });
	$: currentState = JSON.stringify({ state, syncTrigger, cronExpression });
	export let isDirty = false;
	$: isDirty = currentState !== savedState;

	// Reactive selected key for checkbox state
	$: selectedKey =
		state.databaseId !== null && state.profileId !== null
			? `${state.databaseId}-${state.profileId}`
			: null;

	function isSelected(databaseId: number, profileId: number): boolean {
		return selectedKey === `${databaseId}-${profileId}`;
	}

	function toggleProfile(databaseId: number, profileId: number) {
		if (isSelected(databaseId, profileId)) {
			// Deselect
			state = { databaseId: null, profileId: null };
		} else {
			// Select this one (deselects any previous)
			state = { databaseId, profileId };
		}
	}

	async function handleSave() {
		saving = true;
		try {
			const formData = new FormData();
			formData.set('databaseId', state.databaseId?.toString() ?? '');
			formData.set('profileId', state.profileId?.toString() ?? '');
			formData.set('trigger', syncTrigger);
			formData.set('cron', cronExpression);

			const response = await fetch('?/saveDelayProfiles', {
				method: 'POST',
				body: formData
			});

			if (response.ok) {
				alertStore.add('success', 'Delay profile sync config saved');
				// Update saved state to current
				savedState = JSON.stringify({ state, syncTrigger, cronExpression });
			} else {
				alertStore.add('error', 'Failed to save delay profile sync config');
			}
		} catch {
			alertStore.add('error', 'Failed to save delay profile sync config');
		} finally {
			saving = false;
		}
	}

	async function handleSync() {
		syncing = true;
		try {
			const response = await fetch('?/syncDelayProfiles', {
				method: 'POST',
				body: new FormData()
			});

			if (response.ok) {
				alertStore.add('success', 'Sync completed successfully');
			} else {
				alertStore.add('error', 'Sync failed');
			}
		} catch {
			alertStore.add('error', 'Sync failed');
		} finally {
			syncing = false;
		}
	}
</script>

<div
	class="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
>
	<!-- Header -->
	<div class="border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
		<h2 class="text-xl font-semibold text-neutral-900 dark:text-neutral-50">Delay Profiles</h2>
		<p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
			Select delay profiles to sync to this instance
		</p>
	</div>

	<!-- Content -->
	<div class="p-6">
		{#if databases.length === 0}
			<p class="text-sm text-neutral-500 dark:text-neutral-400">No databases configured</p>
		{:else}
			<div class="space-y-6">
				{#each databases as database}
					<div class="space-y-3">
						<h3 class="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
							{database.name}
						</h3>

						{#if database.delayProfiles.length === 0}
							<p class="text-sm text-neutral-500 dark:text-neutral-400">No delay profiles</p>
						{:else}
							<div class="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
								{#each database.delayProfiles as profile}
									<button
										type="button"
										class="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-left transition-colors hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-600 dark:hover:bg-neutral-700"
										on:click={() => toggleProfile(database.id, profile.id)}
									>
										<code class="font-mono text-sm text-neutral-900 dark:text-neutral-50">
											{profile.name}
										</code>
										<IconCheckbox
											checked={selectedKey === `${database.id}-${profile.id}`}
											icon={Check}
											shape="rounded"
										/>
									</button>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<SyncFooter
		bind:syncTrigger
		bind:cronExpression
		{saving}
		{syncing}
		{isDirty}
		on:save={handleSave}
		on:sync={handleSync}
	/>
</div>
