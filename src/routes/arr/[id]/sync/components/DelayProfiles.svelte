<script lang="ts">
	import type { DelayProfileTableRow } from '$pcd/queries/delayProfiles/types.ts';
	import IconCheckbox from '$ui/form/IconCheckbox.svelte';
	import SyncFooter from './SyncFooter.svelte';
	import { Check } from 'lucide-svelte';
	import { alertStore } from '$lib/client/alerts/store.ts';

	interface DatabaseWithProfiles {
		id: number;
		name: string;
		delayProfiles: DelayProfileTableRow[];
	}

	export let databases: DatabaseWithProfiles[];
	export let state: Record<number, Record<number, boolean>> = {};
	export let syncTrigger: 'none' | 'manual' | 'on_pull' | 'on_change' | 'schedule' = 'none';
	export let cronExpression: string = '0 * * * *';

	let saving = false;
	let syncing = false;

	// Initialize state for all databases/profiles
	$: {
		for (const db of databases) {
			if (!state[db.id]) {
				state[db.id] = {};
			}
			for (const profile of db.delayProfiles) {
				if (state[db.id][profile.id] === undefined) {
					state[db.id][profile.id] = false;
				}
			}
		}
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

			const response = await fetch('?/saveDelayProfiles', {
				method: 'POST',
				body: formData
			});

			if (response.ok) {
				alertStore.add('success', 'Delay profiles sync config saved');
			} else {
				alertStore.add('error', 'Failed to save delay profiles sync config');
			}
		} catch {
			alertStore.add('error', 'Failed to save delay profiles sync config');
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

<div class="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
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
							<div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
								{#each database.delayProfiles as profile}
									<div class="flex items-center gap-2">
										<IconCheckbox
											checked={state[database.id]?.[profile.id] ?? false}
											icon={Check}
											shape="rounded"
											on:click={() => {
												state[database.id][profile.id] = !state[database.id][profile.id];
											}}
										/>
										<code class="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-sm text-neutral-900 dark:bg-neutral-800 dark:text-neutral-50">
											{profile.name}
										</code>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<SyncFooter bind:syncTrigger bind:cronExpression {saving} {syncing} on:save={handleSave} on:sync={handleSync} />
</div>
