<script lang="ts">
	import { ChevronDown, Check } from 'lucide-svelte';
	import SyncFooter from './SyncFooter.svelte';
	import { alertStore } from '$lib/client/alerts/store.ts';

	interface Database {
		id: number;
		name: string;
	}

	export let databases: Database[];
	export let state: {
		namingDatabaseId: number | null;
		qualityDefinitionsDatabaseId: number | null;
		mediaSettingsDatabaseId: number | null;
	} = {
		namingDatabaseId: null,
		qualityDefinitionsDatabaseId: null,
		mediaSettingsDatabaseId: null
	};

	let showNamingDropdown = false;
	let showQualityDropdown = false;
	let showMediaDropdown = false;

	function getSelectedName(id: number | null): string {
		if (id === null) return 'None';
		return databases.find((db) => db.id === id)?.name ?? 'None';
	}

	function selectNaming(id: number | null) {
		state.namingDatabaseId = id;
		showNamingDropdown = false;
	}

	function selectQuality(id: number | null) {
		state.qualityDefinitionsDatabaseId = id;
		showQualityDropdown = false;
	}

	function selectMedia(id: number | null) {
		state.mediaSettingsDatabaseId = id;
		showMediaDropdown = false;
	}

	export let syncTrigger: 'none' | 'manual' | 'on_pull' | 'on_change' | 'schedule' = 'none';
	export let cronExpression: string = '0 * * * *';

	let saving = false;
	let syncing = false;

	async function handleSave() {
		saving = true;
		try {
			const formData = new FormData();
			formData.set('namingDatabaseId', state.namingDatabaseId?.toString() ?? '');
			formData.set('qualityDefinitionsDatabaseId', state.qualityDefinitionsDatabaseId?.toString() ?? '');
			formData.set('mediaSettingsDatabaseId', state.mediaSettingsDatabaseId?.toString() ?? '');
			formData.set('trigger', syncTrigger);
			formData.set('cron', cronExpression);

			const response = await fetch('?/saveMediaManagement', {
				method: 'POST',
				body: formData
			});

			if (response.ok) {
				alertStore.add('success', 'Media management sync config saved');
			} else {
				alertStore.add('error', 'Failed to save media management sync config');
			}
		} catch {
			alertStore.add('error', 'Failed to save media management sync config');
		} finally {
			saving = false;
		}
	}

	async function handleSync() {
		syncing = true;
		try {
			const response = await fetch('?/syncMediaManagement', {
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
		<h2 class="text-xl font-semibold text-neutral-900 dark:text-neutral-50">Media Management</h2>
		<p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
			Select which database to use for each media management setting
		</p>
	</div>

	<!-- Content -->
	<div class="p-6">
		<div class="grid gap-6 sm:grid-cols-3">
			<!-- Naming -->
			<div class="space-y-2">
				<span class="block text-sm font-medium text-neutral-900 dark:text-neutral-50">
					Naming
				</span>
				<div class="relative">
					<button
						type="button"
						on:click={() => (showNamingDropdown = !showNamingDropdown)}
						on:blur={() => setTimeout(() => (showNamingDropdown = false), 200)}
						class="flex w-full items-center justify-between rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700"
					>
						<span>{getSelectedName(state.namingDatabaseId)}</span>
						<ChevronDown size={14} />
					</button>

					{#if showNamingDropdown}
						<div class="absolute top-full z-50 mt-1 w-full rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
							<button
								type="button"
								on:click={() => selectNaming(null)}
								class="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-neutral-900 transition-colors hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-700"
							>
								<span>None</span>
								{#if state.namingDatabaseId === null}
									<Check size={14} class="text-accent-600 dark:text-accent-400" />
								{/if}
							</button>
							{#each databases as database}
								<button
									type="button"
									on:click={() => selectNaming(database.id)}
									class="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-neutral-900 transition-colors hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-700"
								>
									<span>{database.name}</span>
									{#if state.namingDatabaseId === database.id}
										<Check size={14} class="text-accent-600 dark:text-accent-400" />
									{/if}
								</button>
							{/each}
						</div>
					{/if}
				</div>
			</div>

			<!-- Quality Definitions -->
			<div class="space-y-2">
				<span class="block text-sm font-medium text-neutral-900 dark:text-neutral-50">
					Quality Definitions
				</span>
				<div class="relative">
					<button
						type="button"
						on:click={() => (showQualityDropdown = !showQualityDropdown)}
						on:blur={() => setTimeout(() => (showQualityDropdown = false), 200)}
						class="flex w-full items-center justify-between rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700"
					>
						<span>{getSelectedName(state.qualityDefinitionsDatabaseId)}</span>
						<ChevronDown size={14} />
					</button>

					{#if showQualityDropdown}
						<div class="absolute top-full z-50 mt-1 w-full rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
							<button
								type="button"
								on:click={() => selectQuality(null)}
								class="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-neutral-900 transition-colors hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-700"
							>
								<span>None</span>
								{#if state.qualityDefinitionsDatabaseId === null}
									<Check size={14} class="text-accent-600 dark:text-accent-400" />
								{/if}
							</button>
							{#each databases as database}
								<button
									type="button"
									on:click={() => selectQuality(database.id)}
									class="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-neutral-900 transition-colors hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-700"
								>
									<span>{database.name}</span>
									{#if state.qualityDefinitionsDatabaseId === database.id}
										<Check size={14} class="text-accent-600 dark:text-accent-400" />
									{/if}
								</button>
							{/each}
						</div>
					{/if}
				</div>
			</div>

			<!-- Media Settings -->
			<div class="space-y-2">
				<span class="block text-sm font-medium text-neutral-900 dark:text-neutral-50">
					Media Settings
				</span>
				<div class="relative">
					<button
						type="button"
						on:click={() => (showMediaDropdown = !showMediaDropdown)}
						on:blur={() => setTimeout(() => (showMediaDropdown = false), 200)}
						class="flex w-full items-center justify-between rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700"
					>
						<span>{getSelectedName(state.mediaSettingsDatabaseId)}</span>
						<ChevronDown size={14} />
					</button>

					{#if showMediaDropdown}
						<div class="absolute top-full z-50 mt-1 w-full rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
							<button
								type="button"
								on:click={() => selectMedia(null)}
								class="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-neutral-900 transition-colors hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-700"
							>
								<span>None</span>
								{#if state.mediaSettingsDatabaseId === null}
									<Check size={14} class="text-accent-600 dark:text-accent-400" />
								{/if}
							</button>
							{#each databases as database}
								<button
									type="button"
									on:click={() => selectMedia(database.id)}
									class="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-neutral-900 transition-colors hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-700"
								>
									<span>{database.name}</span>
									{#if state.mediaSettingsDatabaseId === database.id}
										<Check size={14} class="text-accent-600 dark:text-accent-400" />
									{/if}
								</button>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<SyncFooter bind:syncTrigger bind:cronExpression {saving} {syncing} on:save={handleSave} on:sync={handleSync} />
</div>
