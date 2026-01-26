<script lang="ts">
	import { ChevronDown, Check } from 'lucide-svelte';
	import SyncFooter from './SyncFooter.svelte';
	import { alertStore } from '$lib/client/alerts/store.ts';

	interface ConfigOption {
		name: string;
	}

	interface Database {
		id: number;
		name: string;
		namingConfigs: ConfigOption[];
		qualityDefinitionsConfigs: ConfigOption[];
		mediaSettingsConfigs: ConfigOption[];
	}

	export let databases: Database[];
	export let state: {
		namingDatabaseId: number | null;
		namingConfigName: string | null;
		qualityDefinitionsDatabaseId: number | null;
		qualityDefinitionsConfigName: string | null;
		mediaSettingsDatabaseId: number | null;
		mediaSettingsConfigName: string | null;
	} = {
		namingDatabaseId: null,
		namingConfigName: null,
		qualityDefinitionsDatabaseId: null,
		qualityDefinitionsConfigName: null,
		mediaSettingsDatabaseId: null,
		mediaSettingsConfigName: null
	};

	let showNamingDropdown = false;
	let showQualityDropdown = false;
	let showMediaDropdown = false;

	// Build flat list of options: { databaseId, databaseName, configName }
	type SelectionOption = {
		databaseId: number;
		databaseName: string;
		configName: string;
	};

	function getNamingOptions(): SelectionOption[] {
		const options: SelectionOption[] = [];
		for (const db of databases) {
			for (const config of db.namingConfigs) {
				options.push({
					databaseId: db.id,
					databaseName: db.name,
					configName: config.name
				});
			}
		}
		return options;
	}

	function getQualityDefinitionsOptions(): SelectionOption[] {
		const options: SelectionOption[] = [];
		for (const db of databases) {
			for (const config of db.qualityDefinitionsConfigs) {
				options.push({
					databaseId: db.id,
					databaseName: db.name,
					configName: config.name
				});
			}
		}
		return options;
	}

	function getMediaSettingsOptions(): SelectionOption[] {
		const options: SelectionOption[] = [];
		for (const db of databases) {
			for (const config of db.mediaSettingsConfigs) {
				options.push({
					databaseId: db.id,
					databaseName: db.name,
					configName: config.name
				});
			}
		}
		return options;
	}

	$: namingOptions = getNamingOptions();
	$: qualityDefinitionsOptions = getQualityDefinitionsOptions();
	$: mediaSettingsOptions = getMediaSettingsOptions();

	function getSelectedLabel(databaseId: number | null, configName: string | null): string {
		if (databaseId === null || configName === null) return 'None';
		const db = databases.find((d) => d.id === databaseId);
		if (!db) return 'None';
		return `${db.name} / ${configName}`;
	}

	function selectNaming(databaseId: number | null, configName: string | null) {
		state.namingDatabaseId = databaseId;
		state.namingConfigName = configName;
		showNamingDropdown = false;
	}

	function selectQuality(databaseId: number | null, configName: string | null) {
		state.qualityDefinitionsDatabaseId = databaseId;
		state.qualityDefinitionsConfigName = configName;
		showQualityDropdown = false;
	}

	function selectMedia(databaseId: number | null, configName: string | null) {
		state.mediaSettingsDatabaseId = databaseId;
		state.mediaSettingsConfigName = configName;
		showMediaDropdown = false;
	}

	function isNamingSelected(databaseId: number, configName: string): boolean {
		return state.namingDatabaseId === databaseId && state.namingConfigName === configName;
	}

	function isQualitySelected(databaseId: number, configName: string): boolean {
		return state.qualityDefinitionsDatabaseId === databaseId && state.qualityDefinitionsConfigName === configName;
	}

	function isMediaSelected(databaseId: number, configName: string): boolean {
		return state.mediaSettingsDatabaseId === databaseId && state.mediaSettingsConfigName === configName;
	}

	export let syncTrigger: 'manual' | 'on_pull' | 'on_change' | 'schedule' = 'manual';
	export let cronExpression: string = '0 * * * *';

	let saving = false;
	let syncing = false;

	// Track saved state for dirty detection
	let savedState = JSON.stringify({ state, syncTrigger, cronExpression });
	$: currentState = JSON.stringify({ state, syncTrigger, cronExpression });
	export let isDirty = false;
	$: isDirty = currentState !== savedState;

	async function handleSave() {
		saving = true;
		try {
			const formData = new FormData();
			formData.set('namingDatabaseId', state.namingDatabaseId?.toString() ?? '');
			formData.set('namingConfigName', state.namingConfigName ?? '');
			formData.set(
				'qualityDefinitionsDatabaseId',
				state.qualityDefinitionsDatabaseId?.toString() ?? ''
			);
			formData.set('qualityDefinitionsConfigName', state.qualityDefinitionsConfigName ?? '');
			formData.set('mediaSettingsDatabaseId', state.mediaSettingsDatabaseId?.toString() ?? '');
			formData.set('mediaSettingsConfigName', state.mediaSettingsConfigName ?? '');
			formData.set('trigger', syncTrigger);
			formData.set('cron', cronExpression);

			const response = await fetch('?/saveMediaManagement', {
				method: 'POST',
				body: formData
			});

			if (response.ok) {
				alertStore.add('success', 'Media management sync config saved');
				// Update saved state to current
				savedState = JSON.stringify({ state, syncTrigger, cronExpression });
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

<div
	class="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
>
	<!-- Header -->
	<div class="border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
		<h2 class="text-xl font-semibold text-neutral-900 dark:text-neutral-50">Media Management</h2>
		<p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
			Select which database config to use for each media management setting
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
						<span class="truncate">{getSelectedLabel(state.namingDatabaseId, state.namingConfigName)}</span>
						<ChevronDown size={14} class="flex-shrink-0 ml-2" />
					</button>

					{#if showNamingDropdown}
						<div
							class="absolute top-full z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
						>
							<button
								type="button"
								on:click={() => selectNaming(null, null)}
								class="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-neutral-900 transition-colors hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-700"
							>
								<span>None</span>
								{#if state.namingDatabaseId === null}
									<Check size={14} class="text-accent-600 dark:text-accent-400" />
								{/if}
							</button>
							{#each namingOptions as option}
								<button
									type="button"
									on:click={() => selectNaming(option.databaseId, option.configName)}
									class="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-neutral-900 transition-colors hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-700"
								>
									<span class="truncate">{option.databaseName} / {option.configName}</span>
									{#if isNamingSelected(option.databaseId, option.configName)}
										<Check size={14} class="flex-shrink-0 ml-2 text-accent-600 dark:text-accent-400" />
									{/if}
								</button>
							{/each}
							{#if namingOptions.length === 0}
								<div class="px-3 py-2 text-sm text-neutral-500 dark:text-neutral-400">
									No naming configs available
								</div>
							{/if}
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
						<span class="truncate">{getSelectedLabel(state.qualityDefinitionsDatabaseId, state.qualityDefinitionsConfigName)}</span>
						<ChevronDown size={14} class="flex-shrink-0 ml-2" />
					</button>

					{#if showQualityDropdown}
						<div
							class="absolute top-full z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
						>
							<button
								type="button"
								on:click={() => selectQuality(null, null)}
								class="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-neutral-900 transition-colors hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-700"
							>
								<span>None</span>
								{#if state.qualityDefinitionsDatabaseId === null}
									<Check size={14} class="text-accent-600 dark:text-accent-400" />
								{/if}
							</button>
							{#each qualityDefinitionsOptions as option}
								<button
									type="button"
									on:click={() => selectQuality(option.databaseId, option.configName)}
									class="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-neutral-900 transition-colors hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-700"
								>
									<span class="truncate">{option.databaseName} / {option.configName}</span>
									{#if isQualitySelected(option.databaseId, option.configName)}
										<Check size={14} class="flex-shrink-0 ml-2 text-accent-600 dark:text-accent-400" />
									{/if}
								</button>
							{/each}
							{#if qualityDefinitionsOptions.length === 0}
								<div class="px-3 py-2 text-sm text-neutral-500 dark:text-neutral-400">
									No quality definitions configs available
								</div>
							{/if}
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
						<span class="truncate">{getSelectedLabel(state.mediaSettingsDatabaseId, state.mediaSettingsConfigName)}</span>
						<ChevronDown size={14} class="flex-shrink-0 ml-2" />
					</button>

					{#if showMediaDropdown}
						<div
							class="absolute top-full z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
						>
							<button
								type="button"
								on:click={() => selectMedia(null, null)}
								class="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-neutral-900 transition-colors hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-700"
							>
								<span>None</span>
								{#if state.mediaSettingsDatabaseId === null}
									<Check size={14} class="text-accent-600 dark:text-accent-400" />
								{/if}
							</button>
							{#each mediaSettingsOptions as option}
								<button
									type="button"
									on:click={() => selectMedia(option.databaseId, option.configName)}
									class="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-neutral-900 transition-colors hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-700"
								>
									<span class="truncate">{option.databaseName} / {option.configName}</span>
									{#if isMediaSelected(option.databaseId, option.configName)}
										<Check size={14} class="flex-shrink-0 ml-2 text-accent-600 dark:text-accent-400" />
									{/if}
								</button>
							{/each}
							{#if mediaSettingsOptions.length === 0}
								<div class="px-3 py-2 text-sm text-neutral-500 dark:text-neutral-400">
									No media settings configs available
								</div>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		</div>
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
