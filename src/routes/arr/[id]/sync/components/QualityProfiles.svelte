<script lang="ts">
	import type { QualityProfileTableRow } from '$pcd/queries/qualityProfiles/types.ts';
	import IconCheckbox from '$ui/form/IconCheckbox.svelte';
	import SyncFooter from './SyncFooter.svelte';
	import { Check } from 'lucide-svelte';
	import { alertStore } from '$lib/client/alerts/store.ts';

	interface DatabaseWithProfiles {
		id: number;
		name: string;
		qualityProfiles: QualityProfileTableRow[];
	}

	export let databases: DatabaseWithProfiles[];
	export let state: Record<number, Record<number, boolean>> = {};
	export let syncTrigger: 'manual' | 'on_pull' | 'on_change' | 'schedule' = 'manual';
	export let cronExpression: string = '0 * * * *';
	export let canSave: boolean = true;
	export let warning: string | null = null;

	let saving = false;
	let syncing = false;

	// Track saved state for dirty detection
	let savedState = JSON.stringify({ state, syncTrigger, cronExpression });
	$: currentState = JSON.stringify({ state, syncTrigger, cronExpression });
	export let isDirty = false;
	$: isDirty = currentState !== savedState;

	// Initialize state for all databases/profiles
	$: {
		for (const db of databases) {
			if (!state[db.id]) {
				state[db.id] = {};
			}
			for (const profile of db.qualityProfiles) {
				if (state[db.id][profile.id] === undefined) {
					state[db.id][profile.id] = false;
				}
			}
		}
	}

	// Reactive set of selected keys for checkbox state
	$: selectedKeys = new Set(
		Object.entries(state).flatMap(([dbId, profiles]) =>
			Object.entries(profiles)
				.filter(([, selected]) => selected)
				.map(([profileId]) => `${dbId}-${profileId}`)
		)
	);

	function isSelected(databaseId: number, profileId: number): boolean {
		return selectedKeys.has(`${databaseId}-${profileId}`);
	}

	function toggleProfile(databaseId: number, profileId: number) {
		state[databaseId][profileId] = !state[databaseId][profileId];
		state = { ...state }; // Reassign to trigger reactivity
	}

	function getSelections(): { databaseId: number; profileId: number }[] {
		const selections: { databaseId: number; profileId: number }[] = [];
		for (const [dbId, profiles] of Object.entries(state)) {
			for (const [profileId, selected] of Object.entries(profiles)) {
				if (selected) {
					selections.push({ databaseId: parseInt(dbId), profileId: parseInt(profileId) });
				}
			}
		}
		return selections;
	}

	async function handleSave() {
		saving = true;
		try {
			const formData = new FormData();
			formData.set('selections', JSON.stringify(getSelections()));
			formData.set('trigger', syncTrigger);
			formData.set('cron', cronExpression);

			const response = await fetch('?/saveQualityProfiles', {
				method: 'POST',
				body: formData
			});

			if (response.ok) {
				alertStore.add('success', 'Quality profiles sync config saved');
				// Update saved state to current
				savedState = JSON.stringify({ state, syncTrigger, cronExpression });
			} else {
				alertStore.add('error', 'Failed to save quality profiles sync config');
			}
		} catch {
			alertStore.add('error', 'Failed to save quality profiles sync config');
		} finally {
			saving = false;
		}
	}

	async function handleSync() {
		syncing = true;
		try {
			const response = await fetch('?/syncQualityProfiles', {
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
		<h2 class="text-xl font-semibold text-neutral-900 dark:text-neutral-50">Quality Profiles</h2>
		<p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
			Select quality profiles to sync to this instance
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

						{#if database.qualityProfiles.length === 0}
							<p class="text-sm text-neutral-500 dark:text-neutral-400">No quality profiles</p>
						{:else}
							<div class="grid grid-cols-5 gap-2">
								{#each database.qualityProfiles as profile}
									<button
										type="button"
										class="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-left transition-colors hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-600 dark:hover:bg-neutral-700"
										on:click={() => toggleProfile(database.id, profile.id)}
									>
										<code class="font-mono text-sm text-neutral-900 dark:text-neutral-50">
											{profile.name}
										</code>
										<IconCheckbox
											checked={selectedKeys.has(`${database.id}-${profile.id}`)}
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
		{canSave}
		{warning}
		on:save={handleSave}
		on:sync={handleSync}
	/>
</div>
