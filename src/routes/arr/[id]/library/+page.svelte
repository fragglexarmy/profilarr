<script lang="ts">
	import { onMount } from 'svelte';
	import { AlertTriangle, Film } from 'lucide-svelte';
	import { alertStore } from '$alerts/store';
	import { browser } from '$app/environment';
	import { goto, invalidateAll } from '$app/navigation';
	import ExpandableTable from '$ui/table/ExpandableTable.svelte';
	import type { Column, SortState } from '$ui/table/types';
	import type { PageData } from './$types';
	import type { RadarrLibraryItem } from '$utils/arr/types.ts';
	import { createSearchStore } from '$stores/search';
	import { libraryCache } from '$stores/libraryCache';

	import LibraryActionBar from './components/LibraryActionBar.svelte';
	import MovieRow from './components/MovieRow.svelte';
	import MovieRowSkeleton from './components/MovieRowSkeleton.svelte';
	import InfoModal from '$ui/modal/InfoModal.svelte';

	export let data: PageData;

	const searchStore = createSearchStore({ debounceMs: 150 });

	// ==========================================================================
	// Library Data State
	// ==========================================================================

	let library: RadarrLibraryItem[] = [];
	let libraryError: string | null = null;
	let profilesByDatabase: { databaseId: number; databaseName: string; profiles: string[] }[] = [];
	let loading = true;
	let refreshing = false;

	async function fetchLibrary(force = false) {
		const instanceId = data.instance.id;

		// Check client cache first (unless forcing refresh)
		if (!force && libraryCache.has(instanceId)) {
			const cached = libraryCache.get(instanceId)!;
			library = cached.data;
			profilesByDatabase = cached.profilesByDatabase;
			libraryError = null;
			loading = false;
			return;
		}

		// Fetch from API
		try {
			if (force) {
				// Clear server cache first
				await fetch(`/api/arr/${instanceId}/library`, { method: 'DELETE' });
			}

			const response = await fetch(`/api/arr/${instanceId}/library`);
			if (!response.ok) {
				throw new Error(`Failed to fetch library: ${response.statusText}`);
			}

			const result = await response.json();
			library = result.library;
			libraryError = result.libraryError;
			profilesByDatabase = result.profilesByDatabase;

			// Cache the result
			if (!result.libraryError) {
				libraryCache.set(instanceId, result.library, result.profilesByDatabase);
			}
		} catch (err) {
			libraryError = err instanceof Error ? err.message : 'Failed to fetch library';
		} finally {
			loading = false;
			refreshing = false;
		}
	}

	async function handleRefresh() {
		refreshing = true;
		libraryCache.invalidate(data.instance.id);
		await fetchLibrary(true);
	}

	function handleOpen() {
		const baseUrl = data.instance.url.replace(/\/$/, '');
		window.open(baseUrl, '_blank', 'noopener,noreferrer');
	}

	function handleEdit() {
		goto(`/arr/${data.instance.id}/edit`);
	}

	async function handleDelete() {
		if (!confirm('Are you sure you want to delete this instance?')) return;

		const response = await fetch(`/api/arr/${data.instance.id}`, { method: 'DELETE' });
		if (response.ok) {
			goto('/arr');
		} else {
			alertStore.add('error', 'Failed to delete instance');
		}
	}

	let infoModalOpen = false;

	function handleInfo() {
		infoModalOpen = true;
	}

	let currentInstanceId: number | null = null;

	onMount(() => {
		currentInstanceId = data.instance.id;
		fetchLibrary();
	});

	// Refetch if instance changes (navigation between instances)
	$: if (browser && data.instance.id && data.instance.id !== currentInstanceId) {
		currentInstanceId = data.instance.id;
		loading = true;
		fetchLibrary();
	}

	// ==========================================================================
	// Column Visibility
	// ==========================================================================

	const STORAGE_KEY = 'profilarr-library-columns';
	const TOGGLEABLE_COLUMNS = [
		'qualityName',
		'customFormatScore',
		'progress',
		'popularity',
		'dateAdded'
	] as const;
	type ToggleableColumn = (typeof TOGGLEABLE_COLUMNS)[number];

	function loadColumnVisibility(): Set<ToggleableColumn> {
		if (!browser) return new Set(TOGGLEABLE_COLUMNS);
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored) {
				const parsed = JSON.parse(stored) as ToggleableColumn[];
				return new Set(parsed);
			}
		} catch {}
		return new Set(TOGGLEABLE_COLUMNS);
	}

	function saveColumnVisibility(visible: Set<ToggleableColumn>) {
		if (!browser) return;
		localStorage.setItem(STORAGE_KEY, JSON.stringify([...visible]));
	}

	let visibleColumns = loadColumnVisibility();

	function toggleColumn(key: string) {
		const colKey = key as ToggleableColumn;
		if (visibleColumns.has(colKey)) {
			visibleColumns.delete(colKey);
		} else {
			visibleColumns.add(colKey);
		}
		visibleColumns = visibleColumns;
		saveColumnVisibility(visibleColumns);
	}

	const columnLabels: Record<ToggleableColumn, string> = {
		qualityName: 'Quality',
		customFormatScore: 'Score',
		progress: 'Progress',
		popularity: 'Popularity',
		dateAdded: 'Added'
	};

	// ==========================================================================
	// Filter System
	// ==========================================================================

	type FilterOperator = 'eq' | 'neq';
	type FilterField = 'qualityName' | 'qualityProfileName';

	interface ActiveFilter {
		field: FilterField;
		operator: FilterOperator;
		value: string | number | boolean;
		label: string;
	}

	let activeFilters: ActiveFilter[] = [];

	$: uniqueQualities = [
		...new Set(library.filter((m) => m.qualityName).map((m) => m.qualityName!))
	].sort();
	$: uniqueProfiles = [...new Set(library.map((m) => m.qualityProfileName))].sort();

	function toggleFilter(
		field: FilterField,
		operator: FilterOperator,
		value: string | number | boolean,
		label: string
	) {
		const existingIndex = activeFilters.findIndex((f) => f.field === field && f.value === value);
		if (existingIndex >= 0) {
			activeFilters = activeFilters.filter((_, i) => i !== existingIndex);
		} else {
			activeFilters = [...activeFilters, { field, operator, value, label }];
		}
	}

	function applyFilters(items: RadarrLibraryItem[]): RadarrLibraryItem[] {
		if (activeFilters.length === 0) return items;

		const filtersByField = new Map<FilterField, ActiveFilter[]>();
		for (const filter of activeFilters) {
			const existing = filtersByField.get(filter.field) || [];
			existing.push(filter);
			filtersByField.set(filter.field, existing);
		}

		return items.filter((item) => {
			return [...filtersByField.entries()].every(([field, filters]) => {
				const itemValue = item[field];
				return filters.some((filter) => {
					if (filter.operator === 'eq') return itemValue === filter.value;
					if (filter.operator === 'neq') return itemValue !== filter.value;
					return true;
				});
			});
		});
	}

	// ==========================================================================
	// Data & Columns
	// ==========================================================================

	$: baseUrl = data.instance.url.replace(/\/$/, '');
	$: debouncedQuery = $searchStore.query;
	$: allMoviesWithFiles = library.filter((m) => m.hasFile);

	$: moviesWithFiles = (() => {
		const filters = activeFilters;
		let result = allMoviesWithFiles.filter(
			(m) => !debouncedQuery || m.title.toLowerCase().includes(debouncedQuery.toLowerCase())
		);
		return applyFilters(result);
	})();

	const allColumns: Column<RadarrLibraryItem>[] = [
		{ key: 'title', header: 'Title', align: 'left', sortable: true },
		{ key: 'qualityProfileName', header: 'Profile', align: 'left', width: 'w-40', sortable: true },
		{ key: 'qualityName', header: 'Quality', align: 'left', width: 'w-32', sortable: true },
		{
			key: 'customFormatScore',
			header: 'Score',
			align: 'right',
			width: 'w-28',
			sortable: true,
			defaultSortDirection: 'desc'
		},
		{
			key: 'progress',
			header: 'Progress',
			align: 'center',
			width: 'w-40',
			sortable: true,
			sortAccessor: (row) => row.progress,
			defaultSortDirection: 'desc'
		},
		{
			key: 'popularity',
			header: 'Popularity',
			align: 'right',
			width: 'w-24',
			sortable: true,
			defaultSortDirection: 'desc'
		},
		{
			key: 'dateAdded',
			header: 'Added',
			align: 'right',
			width: 'w-28',
			sortable: true,
			sortAccessor: (row) => (row.dateAdded ? new Date(row.dateAdded).getTime() : 0),
			defaultSortDirection: 'desc'
		},
		{ key: 'actions', header: '', align: 'center', width: 'w-12' }
	];

	$: columns = allColumns.filter(
		(col) =>
			col.key === 'title' ||
			col.key === 'qualityProfileName' ||
			col.key === 'actions' ||
			visibleColumns.has(col.key as ToggleableColumn)
	);

	const defaultSort: SortState = { key: 'title', direction: 'asc' };

	// Skeleton placeholder data for loading state
	const skeletonData: RadarrLibraryItem[] = Array.from({ length: 12 }, (_, i) => ({
		id: `skeleton-${i}`,
		title: '',
		year: 0,
		tmdbId: 0,
		hasFile: true,
		qualityProfileId: 0,
		qualityProfileName: '',
		isProfilarrProfile: false,
		qualityName: null,
		customFormatScore: 0,
		cutoffScore: 0,
		cutoffMet: false,
		progress: 0,
		popularity: 0,
		dateAdded: '',
		fileName: null,
		scoreBreakdown: []
	})) as unknown as RadarrLibraryItem[];
</script>

<svelte:head>
	<title>{data.instance.name} - Library - Profilarr</title>
</svelte:head>

<div class="mt-6 space-y-6">
	{#if libraryError && !loading}
		<div
			class="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-950/40"
		>
			<div class="flex items-center gap-3">
				<AlertTriangle class="h-5 w-5 text-red-600 dark:text-red-400" />
				<div>
					<h3 class="font-medium text-red-800 dark:text-red-200">Failed to load library</h3>
					<p class="mt-1 text-sm text-red-600 dark:text-red-400">{libraryError}</p>
				</div>
			</div>
		</div>
	{:else if data.instance.type !== 'radarr'}
		<div
			class="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900"
		>
			<div class="flex items-center gap-3">
				<Film class="h-5 w-5 text-neutral-400" />
				<div>
					<h3 class="font-medium text-neutral-900 dark:text-neutral-50">
						Library view not yet available
					</h3>
					<p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
						Library view is currently only supported for Radarr instances.
					</p>
				</div>
			</div>
		</div>
	{:else}
		<LibraryActionBar
			{searchStore}
			visibleColumns={new Set([...visibleColumns])}
			toggleableColumns={TOGGLEABLE_COLUMNS}
			{columnLabels}
			{activeFilters}
			uniqueQualities={loading ? [] : uniqueQualities}
			uniqueProfiles={loading ? [] : uniqueProfiles}
			instanceName={data.instance.name}
			onToggleColumn={toggleColumn}
			onToggleFilter={toggleFilter}
			onRefresh={handleRefresh}
			onOpen={handleOpen}
			onEdit={handleEdit}
			onDelete={handleDelete}
			onInfo={handleInfo}
		/>

		{#if allMoviesWithFiles.length === 0 && !loading}
			<div
				class="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900"
			>
				<div class="flex items-center gap-3">
					<Film class="h-5 w-5 text-neutral-400" />
					<div>
						<h3 class="font-medium text-neutral-900 dark:text-neutral-50">No movies with files</h3>
						<p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
							This library has {library.length} movies but none have downloaded files yet.
						</p>
					</div>
				</div>
			</div>
		{:else}
			<div class="transition-all duration-300 {loading ? 'opacity-60' : 'opacity-100'}">
				<ExpandableTable
					{columns}
					data={loading ? skeletonData : moviesWithFiles}
					getRowId={(row) => row.id}
					compact={true}
					{defaultSort}
					emptyMessage={activeFilters.length > 0 || debouncedQuery
						? 'No movies match the current filters'
						: 'No movies with files'}
				>
					<svelte:fragment slot="cell" let:row let:column>
						{#if loading}
							<MovieRowSkeleton {column} />
						{:else}
							<MovieRow {row} {column} {baseUrl} mode="cell" />
						{/if}
					</svelte:fragment>

					<svelte:fragment slot="expanded" let:row>
						{#if !loading}
							<MovieRow {row} column={allColumns[0]} {baseUrl} mode="expanded" />
						{/if}
					</svelte:fragment>
				</ExpandableTable>
			</div>
		{/if}
	{/if}
</div>

<InfoModal bind:open={infoModalOpen} header="Library">
	<p class="text-sm text-neutral-600 dark:text-neutral-400">
		Placeholder content. More information coming soon.
	</p>
</InfoModal>
