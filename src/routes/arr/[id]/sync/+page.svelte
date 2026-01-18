<script lang="ts">
	import type { PageData } from './$types';
	import { onMount } from 'svelte';
	import { Info } from 'lucide-svelte';
	import InfoModal from '$ui/modal/InfoModal.svelte';
	import DirtyModal from '$ui/modal/DirtyModal.svelte';
	import QualityProfiles from './components/QualityProfiles.svelte';
	import DelayProfiles from './components/DelayProfiles.svelte';
	import MediaManagement from './components/MediaManagement.svelte';
	import type { SyncTrigger } from '$db/queries/arrSync.ts';
	import { initEdit, update, clear } from '$lib/client/stores/dirty';

	export let data: PageData;

	let showInfoModal = false;

	// Initialize state from loaded sync data
	function buildProfileState(
		selections: { databaseId: number; profileId: number }[]
	): Record<number, Record<number, boolean>> {
		const state: Record<number, Record<number, boolean>> = {};
		for (const sel of selections) {
			if (!state[sel.databaseId]) {
				state[sel.databaseId] = {};
			}
			state[sel.databaseId][sel.profileId] = true;
		}
		return state;
	}

	let qualityProfileState = buildProfileState(data.syncData.qualityProfiles.selections);
	let qualityProfileTrigger: SyncTrigger = data.syncData.qualityProfiles.config.trigger;
	let qualityProfileCron: string = data.syncData.qualityProfiles.config.cron || '0 * * * *';

	let delayProfileState = buildProfileState(data.syncData.delayProfiles.selections);
	let delayProfileTrigger: SyncTrigger = data.syncData.delayProfiles.config.trigger;
	let delayProfileCron: string = data.syncData.delayProfiles.config.cron || '0 * * * *';

	let mediaManagementState = {
		namingDatabaseId: data.syncData.mediaManagement.namingDatabaseId,
		qualityDefinitionsDatabaseId: data.syncData.mediaManagement.qualityDefinitionsDatabaseId,
		mediaSettingsDatabaseId: data.syncData.mediaManagement.mediaSettingsDatabaseId
	};
	let mediaManagementTrigger: SyncTrigger = data.syncData.mediaManagement.trigger;
	let mediaManagementCron: string = data.syncData.mediaManagement.cron || '0 * * * *';

	// Track dirty state from each component
	let qualityProfilesDirty = false;
	let delayProfilesDirty = false;
	let mediaManagementDirty = false;

	// Initialize dirty tracking on mount
	onMount(() => {
		initEdit({ anyDirty: false });
		return () => clear();
	});

	// Sync combined dirty state to global dirty store for DirtyModal
	$: anyDirty = qualityProfilesDirty || delayProfilesDirty || mediaManagementDirty;
	$: update('anyDirty', anyDirty);

	// Validation: Quality profiles require media management settings (saved, not dirty)
	$: hasQualityProfilesSelected = Object.values(qualityProfileState).some((db) =>
		Object.values(db).some((selected) => selected)
	);

	$: hasMediaManagement =
		mediaManagementState.namingDatabaseId !== null &&
		mediaManagementState.qualityDefinitionsDatabaseId !== null &&
		mediaManagementState.mediaSettingsDatabaseId !== null;

	$: qualityProfilesCanSave =
		!hasQualityProfilesSelected || (hasMediaManagement && !mediaManagementDirty);

	$: qualityProfilesWarning = !hasQualityProfilesSelected
		? null
		: !hasMediaManagement
			? 'Quality profiles require media management settings. Configure media management settings above.'
			: mediaManagementDirty
				? 'Save your media management settings before saving quality profiles.'
				: null;
</script>

<svelte:head>
	<title>{data.instance.name} - Sync - Profilarr</title>
</svelte:head>

<div class="mt-6 space-y-6 pb-32">
	<!-- Header -->
	<div class="flex items-start justify-between">
		<div>
			<h1 class="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
				Sync Configuration
			</h1>
			<p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
				Configure which profiles and settings to sync to this instance.
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

	<MediaManagement
		databases={data.databases}
		bind:state={mediaManagementState}
		bind:syncTrigger={mediaManagementTrigger}
		bind:cronExpression={mediaManagementCron}
		bind:isDirty={mediaManagementDirty}
	/>
	<QualityProfiles
		databases={data.databases}
		bind:state={qualityProfileState}
		bind:syncTrigger={qualityProfileTrigger}
		bind:cronExpression={qualityProfileCron}
		bind:isDirty={qualityProfilesDirty}
		canSave={qualityProfilesCanSave}
		warning={qualityProfilesWarning}
	/>
	<DelayProfiles
		databases={data.databases}
		bind:state={delayProfileState}
		bind:syncTrigger={delayProfileTrigger}
		bind:cronExpression={delayProfileCron}
		bind:isDirty={delayProfilesDirty}
	/>
</div>

<InfoModal bind:open={showInfoModal} header="How Sync Works">
	<div class="space-y-4 text-sm text-neutral-600 dark:text-neutral-400">
		<div>
			<div class="font-medium text-neutral-900 dark:text-neutral-100">Automatic Dependencies</div>
			<p class="mt-1">
				Quality Profiles will automatically sync the custom formats they need - you don't need to select them separately.
			</p>
		</div>

		<div>
			<div class="font-medium text-neutral-900 dark:text-neutral-100">Namespacing</div>
			<p class="mt-1">
				Similarly named items from different databases will include invisible namespaces to ensure they don't override each other.
			</p>
		</div>

		<div>
			<div class="font-medium text-neutral-900 dark:text-neutral-100">Media Management First</div>
			<p class="mt-1">
				Quality profiles require all media management settings (naming, quality definitions, and media settings) to be configured and saved first. This ensures your files are named consistently with what the profile expects.
			</p>
		</div>

		<div class="border-t border-neutral-200 pt-4 dark:border-neutral-700">
			<div class="font-medium text-neutral-900 dark:text-neutral-100 mb-3">Sync Methods</div>

			<div class="space-y-3">
				<div>
					<div class="font-medium text-neutral-800 dark:text-neutral-200">Manual</div>
					<p class="mt-0.5">You manually click the sync button. Useful for media management settings that rarely get updates.</p>
				</div>

				<div>
					<div class="font-medium text-neutral-800 dark:text-neutral-200">Schedule</div>
					<p class="mt-0.5">Syncs on a defined schedule using cron expressions.</p>
				</div>

				<div>
					<div class="font-medium text-neutral-800 dark:text-neutral-200">On Pull</div>
					<p class="mt-0.5">Syncs when the upstream database gets a change (when you pull from remote).</p>
				</div>

				<div>
					<div class="font-medium text-neutral-800 dark:text-neutral-200">On Change</div>
					<p class="mt-0.5">Syncs when anything changes - whether you pull from upstream or change something yourself.</p>
				</div>
			</div>
		</div>

		<div class="border-t border-neutral-200 pt-4 dark:border-neutral-700">
			<div class="font-medium text-neutral-900 dark:text-neutral-100 mb-3">Cron Expressions</div>
			<p class="mb-3">Schedule uses standard cron syntax: <code class="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs dark:bg-neutral-800">minute hour day month weekday</code></p>
			<div class="space-y-1.5 font-mono text-xs">
				<div class="flex gap-3">
					<code class="rounded bg-neutral-100 px-1.5 py-0.5 dark:bg-neutral-800">0 * * * *</code>
					<span class="font-sans">Every hour</span>
				</div>
				<div class="flex gap-3">
					<code class="rounded bg-neutral-100 px-1.5 py-0.5 dark:bg-neutral-800">*/15 * * * *</code>
					<span class="font-sans">Every 15 minutes</span>
				</div>
				<div class="flex gap-3">
					<code class="rounded bg-neutral-100 px-1.5 py-0.5 dark:bg-neutral-800">0 0 * * *</code>
					<span class="font-sans">Daily at midnight</span>
				</div>
				<div class="flex gap-3">
					<code class="rounded bg-neutral-100 px-1.5 py-0.5 dark:bg-neutral-800">0 6 * * 1</code>
					<span class="font-sans">Every Monday at 6am</span>
				</div>
			</div>
		</div>
	</div>
</InfoModal>

<DirtyModal />
