<script lang="ts">
	import { onMount } from 'svelte';
	import { Info, Clapperboard, Film, Tv, Plus, AlertTriangle, Sliders, Check } from 'lucide-svelte';
	import Tabs from '$ui/navigation/tabs/Tabs.svelte';
	import ActionsBar from '$ui/actions/ActionsBar.svelte';
	import ActionButton from '$ui/actions/ActionButton.svelte';
	import SearchAction from '$ui/actions/SearchAction.svelte';
	import InfoModal from '$ui/modal/InfoModal.svelte';
	import Modal from '$ui/modal/Modal.svelte';
	import Dropdown from '$ui/dropdown/Dropdown.svelte';
	import DropdownItem from '$ui/dropdown/DropdownItem.svelte';
	import AddEntityModal from './components/AddEntityModal.svelte';
	import ReleaseModal from './components/ReleaseModal.svelte';
	import EntityTable from './components/EntityTable.svelte';
	import { createDataPageStore } from '$lib/client/stores/dataPage';
	import { alertStore } from '$lib/client/alerts/store';
	import type { PageData } from './$types';
	import type { TestEntity, TestRelease } from './components/types';

	export let data: PageData;

	// Show warning if parser is unavailable
	onMount(() => {
		if (!data.parserAvailable) {
			alertStore.add('warning', 'Parser service unavailable. Release scoring disabled.', 0);
		}

		// Restore selected profile from localStorage
		const stored = localStorage.getItem('entityTesting.selectedProfileId');
		if (stored) {
			const id = parseInt(stored, 10);
			// Verify profile exists in current database
			if (data.qualityProfiles.some((p) => p.id === id)) {
				selectedProfileId = id;
			}
		}
	});

	// Persist selected profile to localStorage
	function setSelectedProfile(id: number | null) {
		selectedProfileId = id;
		if (id !== null) {
			localStorage.setItem('entityTesting.selectedProfileId', String(id));
		} else {
			localStorage.removeItem('entityTesting.selectedProfileId');
		}
	}

	// Quality profile selection
	let selectedProfileId: number | null = null;

	// Calculate score for a release based on selected profile
	// Reactive so it updates when selectedProfileId changes
	$: calculateScore = (releaseId: number, entityType: 'movie' | 'series'): number | null => {
		if (!selectedProfileId) return null;

		const evaluation = data.evaluations[releaseId];
		if (!evaluation || !evaluation.cfMatches) return null;

		const profileScores = data.cfScoresData.profiles.find((p) => p.profileId === selectedProfileId);
		if (!profileScores) return null;

		const arrType = entityType === 'movie' ? 'radarr' : 'sonarr';
		let totalScore = 0;

		for (const [cfIdStr, matches] of Object.entries(evaluation.cfMatches)) {
			if (!matches) continue;

			const cfId = parseInt(cfIdStr, 10);
			const cfScore = profileScores.scores[cfId];
			if (cfScore) {
				const score = cfScore[arrType];
				if (score !== null) {
					totalScore += score;
				}
			}
		}

		return totalScore;
	};
	$: selectedProfile = selectedProfileId
		? data.qualityProfiles.find((p) => p.id === selectedProfileId)
		: null;

	// Modal state
	let showInfoModal = false;
	let showAddModal = false;

	// Entity delete modal state
	let showDeleteModal = false;
	let entityToDelete: TestEntity | null = null;
	let deleteFormRef: HTMLFormElement | null = null;

	// Release modal state
	let showReleaseModal = false;
	let releaseModalMode: 'create' | 'edit' = 'create';
	let releaseEntityId: number = 0;
	let currentRelease: TestRelease | null = null;

	// Release delete modal state
	let showDeleteReleaseModal = false;
	let releaseToDelete: TestRelease | null = null;
	let deleteReleaseFormRef: HTMLFormElement | null = null;

	// Entity type selection (both selected by default)
	let moviesSelected = true;
	let seriesSelected = true;

	// Prevent unchecking if it's the only one selected
	function toggleMovies() {
		if (moviesSelected && !seriesSelected) return;
		moviesSelected = !moviesSelected;
	}

	function toggleSeries() {
		if (seriesSelected && !moviesSelected) return;
		seriesSelected = !seriesSelected;
	}

	// Dynamic search placeholder based on selection
	$: searchPlaceholder = (() => {
		if (moviesSelected && seriesSelected) return 'Search movies, TV series...';
		if (moviesSelected) return 'Search movies...';
		if (seriesSelected) return 'Search TV series...';
		return 'Search...';
	})();

	// Initialize data page store
	const { search, filtered, setItems } = createDataPageStore(data.testEntities, {
		storageKey: 'entityTestingView',
		searchKeys: ['title']
	});

	// Update items when data changes (e.g., switching databases)
	$: setItems(data.testEntities);

	// Filter by type selection
	$: typeFilteredEntities = ($filtered as TestEntity[]).filter((entity) => {
		if (moviesSelected && seriesSelected) return true;
		if (moviesSelected) return entity.type === 'movie';
		if (seriesSelected) return entity.type === 'series';
		return true;
	});

	// Map databases to tabs
	$: tabs = data.databases.map((db) => ({
		label: db.name,
		href: `/quality-profiles/entity-testing/${db.id}`,
		active: db.id === data.currentDatabase.id
	}));

	// Entity delete handlers
	function handleConfirmDelete(e: CustomEvent<{ entity: TestEntity; formRef: HTMLFormElement }>) {
		entityToDelete = e.detail.entity;
		deleteFormRef = e.detail.formRef;
		showDeleteModal = true;
	}

	function handleDeleteConfirm() {
		if (deleteFormRef) {
			deleteFormRef.requestSubmit();
		}
		showDeleteModal = false;
		entityToDelete = null;
		deleteFormRef = null;
	}

	function handleDeleteCancel() {
		showDeleteModal = false;
		entityToDelete = null;
		deleteFormRef = null;
	}

	// Release modal handlers
	function handleAddRelease(e: CustomEvent<{ entityId: number }>) {
		releaseEntityId = e.detail.entityId;
		releaseModalMode = 'create';
		currentRelease = null;
		showReleaseModal = true;
	}

	function handleEditRelease(e: CustomEvent<{ entityId: number; release: TestRelease }>) {
		releaseEntityId = e.detail.entityId;
		releaseModalMode = 'edit';
		currentRelease = e.detail.release;
		showReleaseModal = true;
	}

	// Release delete handlers
	function handleConfirmDeleteRelease(e: CustomEvent<{ release: TestRelease; formRef: HTMLFormElement }>) {
		releaseToDelete = e.detail.release;
		deleteReleaseFormRef = e.detail.formRef;
		showDeleteReleaseModal = true;
	}

	function handleDeleteReleaseConfirm() {
		if (deleteReleaseFormRef) {
			deleteReleaseFormRef.requestSubmit();
		}
		showDeleteReleaseModal = false;
		releaseToDelete = null;
		deleteReleaseFormRef = null;
	}

	function handleDeleteReleaseCancel() {
		showDeleteReleaseModal = false;
		releaseToDelete = null;
		deleteReleaseFormRef = null;
	}
</script>

<svelte:head>
	<title>Entity Testing - {data.currentDatabase.name} - Profilarr</title>
</svelte:head>

<div class="space-y-6 p-8">
	<!-- Database Tabs -->
	<Tabs {tabs} />

	<!-- Actions Bar -->
	<ActionsBar>
		<SearchAction searchStore={search} placeholder={searchPlaceholder} />
		<ActionButton icon={Sliders} hasDropdown={true} dropdownPosition="right" square={!selectedProfile}>
			{#if selectedProfile}
				<span class="ml-2 text-sm text-neutral-700 dark:text-neutral-300">{selectedProfile.name}</span>
			{/if}
			<Dropdown slot="dropdown" position="right">
				<DropdownItem
					label="No Profile"
					selected={selectedProfileId === null}
					on:click={() => setSelectedProfile(null)}
				/>
				{#each data.qualityProfiles as profile}
					<DropdownItem
						label={profile.name}
						selected={selectedProfileId === profile.id}
						on:click={() => setSelectedProfile(profile.id)}
					/>
				{/each}
			</Dropdown>
		</ActionButton>
		<ActionButton icon={Clapperboard} hasDropdown={true} dropdownPosition="right">
			<Dropdown slot="dropdown" position="right">
				<DropdownItem
					icon={Film}
					label="Movies"
					selected={moviesSelected}
					on:click={toggleMovies}
				/>
				<DropdownItem
					icon={Tv}
					label="TV Series"
					selected={seriesSelected}
					on:click={toggleSeries}
				/>
			</Dropdown>
		</ActionButton>
		<ActionButton icon={Info} on:click={() => (showInfoModal = true)} />
		<ActionButton icon={Plus} on:click={() => (showAddModal = true)} />
	</ActionsBar>

	<!-- Entity Testing Content -->
	<div class="mt-6">
		{#if data.testEntities.length === 0}
			<div
				class="rounded-lg border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900"
			>
				{#if !data.tmdbConfigured}
					<div class="flex flex-col items-center gap-2">
						<AlertTriangle size={24} class="text-amber-500" />
						<p class="text-neutral-600 dark:text-neutral-400">
							TMDB API key not configured. <a
								href="/settings/general"
								class="text-accent-600 hover:underline dark:text-accent-400"
								>Configure in Settings</a
							>
						</p>
					</div>
				{:else}
					<p class="text-neutral-600 dark:text-neutral-400">
						No entity tests found for {data.currentDatabase.name}
					</p>
				{/if}
			</div>
		{:else}
			<EntityTable
				entities={typeFilteredEntities}
				evaluations={data.evaluations}
				{selectedProfileId}
				cfScoresData={data.cfScoresData}
				{calculateScore}
				on:confirmDelete={handleConfirmDelete}
				on:addRelease={handleAddRelease}
				on:editRelease={handleEditRelease}
				on:confirmDeleteRelease={handleConfirmDeleteRelease}
			/>
		{/if}
	</div>
</div>

<InfoModal bind:open={showInfoModal} header="How Entity Testing Works">
	<div class="space-y-4 text-sm text-neutral-600 dark:text-neutral-400">
		<div>
			<div class="font-medium text-neutral-900 dark:text-neutral-100">Test Quality Profiles</div>
			<p class="mt-1">
				Entity testing allows you to test your quality profiles against sample media to see how they
				would score and match.
			</p>
		</div>
	</div>
</InfoModal>

<AddEntityModal bind:open={showAddModal} existingEntities={data.testEntities} />

<Modal
	bind:open={showDeleteModal}
	header="Delete Entity"
	bodyMessage="Are you sure you want to delete {entityToDelete?.title}? This will also remove all associated test releases."
	confirmText="Delete"
	confirmDanger={true}
	size="sm"
	on:confirm={handleDeleteConfirm}
	on:cancel={handleDeleteCancel}
/>

<ReleaseModal
	bind:open={showReleaseModal}
	mode={releaseModalMode}
	entityId={releaseEntityId}
	release={currentRelease}
/>

<Modal
	bind:open={showDeleteReleaseModal}
	header="Delete Release"
	bodyMessage="Are you sure you want to delete this test release?"
	confirmText="Delete"
	confirmDanger={true}
	size="sm"
	on:confirm={handleDeleteReleaseConfirm}
	on:cancel={handleDeleteReleaseCancel}
/>
