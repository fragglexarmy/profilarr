<script lang="ts">
	import { onMount } from 'svelte';
	import { AlertTriangle, Film, ExternalLink } from 'lucide-svelte';
	import { browser } from '$app/environment';
	import { goto, invalidateAll } from '$app/navigation';
	import ExpandableTable from '$ui/table/ExpandableTable.svelte';
	import type { Column, SortState } from '$ui/table/types';
	import type { PageData } from './$types';
	import type { RadarrLibraryItem, SonarrLibraryItem, SonarrEpisodeItem } from '$utils/arr/types.ts';
	import { getPersistentSearchStore, type SearchStore } from '$stores/search';
	import { libraryCache } from '$stores/libraryCache';

	import LibraryActionBar from './components/LibraryActionBar.svelte';
	import MovieRow from './components/MovieRow.svelte';
	import MovieRowSkeleton from './components/MovieRowSkeleton.svelte';
	import SeriesRow from './components/SeriesRow.svelte';
	import SeriesRowSkeleton from './components/SeriesRowSkeleton.svelte';
	import SeasonTable from './components/SeasonTable.svelte';

	export let data: PageData;

	$: isRadarr = data.instance.type === 'radarr';
	$: isSonarr = data.instance.type === 'sonarr';
	$: isSupported = isRadarr || isSonarr;

	let searchStore: SearchStore;
	$: searchStore = getPersistentSearchStore(`arrLibrarySearch:${data.instance.id}`, {
		debounceMs: 150
	});

	// ==========================================================================
	// Library Data State
	// ==========================================================================

	let library: RadarrLibraryItem[] | SonarrLibraryItem[] = [];
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
				await fetch(`/api/v1/arr/library?instanceId=${instanceId}`, { method: 'DELETE' });
			}

			const response = await fetch(`/api/v1/arr/library?instanceId=${instanceId}`);
			if (!response.ok) {
				throw new Error(`Failed to fetch library: ${response.statusText}`);
			}

			const result = await response.json();
			library = result.items;
			libraryError = null;
			profilesByDatabase = result.profilesByDatabase;

			// Cache the result
			libraryCache.set(instanceId, result.items, result.profilesByDatabase);
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
		// Clear episode cache on refresh too
		if (isSonarr) {
			episodeCache = new Map();
			episodeLoadingSet = new Set();
		}
		await fetchLibrary(true);
	}

	function handleOpen() {
		const baseUrl = data.instance.url.replace(/\/$/, '');
		window.open(baseUrl, '_blank', 'noopener,noreferrer');
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
		episodeCache = new Map();
		episodeLoadingSet = new Set();
		fetchLibrary();
	}

	// ==========================================================================
	// Column Visibility (Radarr)
	// ==========================================================================

	const RADARR_STORAGE_KEY = 'profilarr-library-columns';
	const RADARR_TOGGLEABLE_COLUMNS = [
		'qualityName',
		'customFormatScore',
		'progress',
		'popularity',
		'dateAdded'
	] as const;
	type RadarrToggleableColumn = (typeof RADARR_TOGGLEABLE_COLUMNS)[number];

	function loadRadarrColumnVisibility(): Set<RadarrToggleableColumn> {
		if (!browser) return new Set(RADARR_TOGGLEABLE_COLUMNS);
		try {
			const stored = localStorage.getItem(RADARR_STORAGE_KEY);
			if (stored) {
				const parsed = JSON.parse(stored) as RadarrToggleableColumn[];
				return new Set(parsed);
			}
		} catch {}
		return new Set(RADARR_TOGGLEABLE_COLUMNS);
	}

	function saveRadarrColumnVisibility(visible: Set<RadarrToggleableColumn>) {
		if (!browser) return;
		localStorage.setItem(RADARR_STORAGE_KEY, JSON.stringify([...visible]));
	}

	let radarrVisibleColumns = loadRadarrColumnVisibility();

	function toggleRadarrColumn(key: string) {
		const colKey = key as RadarrToggleableColumn;
		if (radarrVisibleColumns.has(colKey)) {
			radarrVisibleColumns.delete(colKey);
		} else {
			radarrVisibleColumns.add(colKey);
		}
		radarrVisibleColumns = radarrVisibleColumns;
		saveRadarrColumnVisibility(radarrVisibleColumns);
	}

	const radarrColumnLabels: Record<RadarrToggleableColumn, string> = {
		qualityName: 'Quality',
		customFormatScore: 'Score',
		progress: 'Progress',
		popularity: 'Popularity',
		dateAdded: 'Added'
	};

	// ==========================================================================
	// Column Visibility (Sonarr)
	// ==========================================================================

	const SONARR_STORAGE_KEY = 'profilarr-library-sonarr-columns';
	const SONARR_TOGGLEABLE_COLUMNS = ['episodes', 'sizeOnDisk', 'dateAdded'] as const;
	type SonarrToggleableColumn = (typeof SONARR_TOGGLEABLE_COLUMNS)[number];

	function loadSonarrColumnVisibility(): Set<SonarrToggleableColumn> {
		if (!browser) return new Set(SONARR_TOGGLEABLE_COLUMNS);
		try {
			const stored = localStorage.getItem(SONARR_STORAGE_KEY);
			if (stored) {
				const parsed = JSON.parse(stored) as SonarrToggleableColumn[];
				return new Set(parsed);
			}
		} catch {}
		return new Set(SONARR_TOGGLEABLE_COLUMNS);
	}

	function saveSonarrColumnVisibility(visible: Set<SonarrToggleableColumn>) {
		if (!browser) return;
		localStorage.setItem(SONARR_STORAGE_KEY, JSON.stringify([...visible]));
	}

	let sonarrVisibleColumns = loadSonarrColumnVisibility();

	function toggleSonarrColumn(key: string) {
		const colKey = key as SonarrToggleableColumn;
		if (sonarrVisibleColumns.has(colKey)) {
			sonarrVisibleColumns.delete(colKey);
		} else {
			sonarrVisibleColumns.add(colKey);
		}
		sonarrVisibleColumns = sonarrVisibleColumns;
		saveSonarrColumnVisibility(sonarrVisibleColumns);
	}

	const sonarrColumnLabels: Record<SonarrToggleableColumn, string> = {
		episodes: 'Episodes',
		sizeOnDisk: 'Size',
		dateAdded: 'Added'
	};

	// ==========================================================================
	// Unified column toggle (delegates based on type)
	// ==========================================================================

	$: activeToggleableColumns = isRadarr ? RADARR_TOGGLEABLE_COLUMNS : SONARR_TOGGLEABLE_COLUMNS;
	$: activeColumnLabels = isRadarr ? radarrColumnLabels : sonarrColumnLabels;
	$: activeVisibleColumns = isRadarr
		? new Set([...radarrVisibleColumns])
		: new Set([...sonarrVisibleColumns]);

	function toggleColumn(key: string) {
		if (isRadarr) {
			toggleRadarrColumn(key);
		} else {
			toggleSonarrColumn(key);
		}
	}

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

	// Radarr filters
	$: radarrLibrary = library as RadarrLibraryItem[];
	$: uniqueQualities = isRadarr
		? [...new Set(radarrLibrary.filter((m) => m.qualityName).map((m) => m.qualityName!))].sort()
		: [];
	$: uniqueProfiles = [
		...new Set((library as Array<{ qualityProfileName: string }>).map((m) => m.qualityProfileName))
	].sort();

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

	function applyFilters<T extends { [key: string]: any }>(items: T[]): T[] {
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
	// Radarr Data & Columns
	// ==========================================================================

	$: baseUrl = data.instance.url.replace(/\/$/, '');
	$: debouncedQuery = $searchStore.query;

	// Radarr
	$: allMoviesWithFiles = isRadarr ? radarrLibrary.filter((m) => m.hasFile) : [];

	$: moviesWithFiles = (() => {
		if (!isRadarr) return [];
		const filters = activeFilters;
		let result = allMoviesWithFiles.filter(
			(m) => !debouncedQuery || m.title.toLowerCase().includes(debouncedQuery.toLowerCase())
		);
		return applyFilters(result);
	})();

	const allRadarrColumns: Column<RadarrLibraryItem>[] = [
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
		}
	];

	$: radarrColumns = allRadarrColumns.filter(
		(col) =>
			col.key === 'title' ||
			col.key === 'qualityProfileName' ||
			radarrVisibleColumns.has(col.key as RadarrToggleableColumn)
	);

	const radarrDefaultSort: SortState = { key: 'title', direction: 'asc' };

	const radarrSkeletonData: RadarrLibraryItem[] = Array.from({ length: 12 }, (_, i) => ({
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

	// ==========================================================================
	// Sonarr Data & Columns
	// ==========================================================================

	$: sonarrLibrary = library as SonarrLibraryItem[];

	$: filteredSeries = (() => {
		if (!isSonarr) return [];
		let result = sonarrLibrary.filter(
			(s) => !debouncedQuery || s.title.toLowerCase().includes(debouncedQuery.toLowerCase())
		);
		return applyFilters(result);
	})();

	const allSonarrColumns: Column<SonarrLibraryItem>[] = [
		{ key: 'title', header: 'Title', align: 'left', sortable: true },
		{ key: 'qualityProfileName', header: 'Profile', align: 'left', width: 'w-40', sortable: true },
		{
			key: 'episodes',
			header: 'Episodes',
			align: 'center',
			width: 'w-28',
			sortable: true,
			sortAccessor: (row) => row.percentOfEpisodes,
			defaultSortDirection: 'desc'
		},
		{
			key: 'sizeOnDisk',
			header: 'Size',
			align: 'right',
			width: 'w-24',
			sortable: true,
			sortAccessor: (row) => row.sizeOnDisk,
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
		}
	];

	$: sonarrColumns = allSonarrColumns.filter(
		(col) =>
			col.key === 'title' ||
			col.key === 'qualityProfileName' ||
			sonarrVisibleColumns.has(col.key as SonarrToggleableColumn)
	);

	const sonarrDefaultSort: SortState = { key: 'title', direction: 'asc' };

	const sonarrSkeletonData: SonarrLibraryItem[] = Array.from({ length: 12 }, (_, i) => ({
		id: i,
		title: '',
		year: 0,
		qualityProfileId: 0,
		qualityProfileName: '',
		monitored: true,
		seasonCount: 0,
		episodeCount: 0,
		episodeFileCount: 0,
		totalEpisodeCount: 0,
		sizeOnDisk: 0,
		percentOfEpisodes: 0,
		dateAdded: '',
		seasons: [],
		isProfilarrProfile: false
	})) as unknown as SonarrLibraryItem[];

	// ==========================================================================
	// Sonarr Episode Lazy Loading
	// ==========================================================================

	let episodeCache: Map<number, SonarrEpisodeItem[]> = new Map();
	let episodeLoadingSet: Set<number> = new Set();

	async function loadEpisodes(seriesId: number) {
		if (episodeCache.has(seriesId) || episodeLoadingSet.has(seriesId)) return;

		episodeLoadingSet.add(seriesId);
		episodeLoadingSet = episodeLoadingSet;

		try {
			const response = await fetch(
				`/api/v1/arr/library/episodes?instanceId=${data.instance.id}&seriesId=${seriesId}`
			);
			if (!response.ok) throw new Error('Failed to fetch episodes');
			const result = await response.json();
			episodeCache.set(seriesId, result.episodes);
			episodeCache = episodeCache;
		} catch (err) {
			console.error(`Failed to load episodes for series ${seriesId}:`, err);
		} finally {
			episodeLoadingSet.delete(seriesId);
			episodeLoadingSet = episodeLoadingSet;
		}
	}

	// Reactive episode grouping - Svelte tracks episodeCache dependency
	$: episodesBySeriesAndSeason = (() => {
		const result = new Map<number, Map<number, SonarrEpisodeItem[]>>();
		for (const [seriesId, episodes] of episodeCache) {
			const seasonMap = new Map<number, SonarrEpisodeItem[]>();
			for (const ep of episodes) {
				const existing = seasonMap.get(ep.seasonNumber) ?? [];
				existing.push(ep);
				seasonMap.set(ep.seasonNumber, existing);
			}
			result.set(seriesId, seasonMap);
		}
		return result;
	})();

	let sonarrExpandedRows: Set<string | number> = new Set();

	// Watch for expansion changes to trigger lazy loading
	$: if (isSonarr && sonarrExpandedRows.size > 0) {
		for (const id of sonarrExpandedRows) {
			const numId = typeof id === 'string' ? parseInt(id) : id;
			loadEpisodes(numId);
		}
	}
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
	{:else if !isSupported}
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
						Library view is currently only supported for Radarr and Sonarr instances.
					</p>
				</div>
			</div>
		</div>
	{:else}
		<LibraryActionBar
			{searchStore}
			visibleColumns={activeVisibleColumns}
			toggleableColumns={activeToggleableColumns}
			columnLabels={activeColumnLabels}
			{activeFilters}
			uniqueQualities={loading ? [] : uniqueQualities}
			uniqueProfiles={loading ? [] : uniqueProfiles}
			onToggleColumn={toggleColumn}
			onToggleFilter={toggleFilter}
			onRefresh={handleRefresh}
			onOpen={handleOpen}
			instanceType={data.instance.type}
		/>

		{#if isRadarr}
			<!-- ============================================================ -->
			<!-- Radarr Library -->
			<!-- ============================================================ -->
			{#if allMoviesWithFiles.length === 0 && !loading}
				<div
					class="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900"
				>
					<div class="flex items-center gap-3">
						<Film class="h-5 w-5 text-neutral-400" />
						<div>
							<h3 class="font-medium text-neutral-900 dark:text-neutral-50">
								No movies with files
							</h3>
							<p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
								This library has {library.length} movies but none have downloaded files yet.
							</p>
						</div>
					</div>
				</div>
			{:else}
				<div class="transition-all duration-300 {loading ? 'opacity-60' : 'opacity-100'}">
					<ExpandableTable
						columns={radarrColumns}
						data={loading ? radarrSkeletonData : moviesWithFiles}
						getRowId={(row) => row.id}
						compact={true}
						defaultSort={radarrDefaultSort}
						responsive
						emptyMessage={activeFilters.length > 0 || debouncedQuery
							? 'No movies match the current filters'
							: 'No movies with files'}
					>
						<svelte:fragment slot="cell" let:row let:column>
							{#if loading}
								<MovieRowSkeleton {column} />
							{:else}
								<MovieRow {row} {column} mode="cell" />
							{/if}
						</svelte:fragment>

						<svelte:fragment slot="actions" let:row>
							{#if !loading && row.tmdbId}
								<a
									href="{baseUrl}/movie/{row.tmdbId}"
									target="_blank"
									rel="noopener noreferrer"
									class="inline-flex h-7 w-7 items-center justify-center rounded border border-neutral-300 bg-white text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
									title="Open in Radarr"
									on:click|stopPropagation
								>
									<ExternalLink size={14} />
								</a>
							{/if}
						</svelte:fragment>

						<svelte:fragment slot="expanded" let:row>
							{#if !loading}
								<MovieRow {row} column={allRadarrColumns[0]} mode="expanded" />
							{/if}
						</svelte:fragment>
					</ExpandableTable>
				</div>
			{/if}
		{:else if isSonarr}
			<!-- ============================================================ -->
			<!-- Sonarr Library -->
			<!-- ============================================================ -->
			{#if sonarrLibrary.length === 0 && !loading}
				<div
					class="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900"
				>
					<div class="flex items-center gap-3">
						<Film class="h-5 w-5 text-neutral-400" />
						<div>
							<h3 class="font-medium text-neutral-900 dark:text-neutral-50">No series found</h3>
							<p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
								This Sonarr instance has no series in its library.
							</p>
						</div>
					</div>
				</div>
			{:else}
				<div class="transition-all duration-300 {loading ? 'opacity-60' : 'opacity-100'}">
					<ExpandableTable
						columns={sonarrColumns}
						data={loading ? sonarrSkeletonData : filteredSeries}
						getRowId={(row) => row.id}
						compact={true}
						defaultSort={sonarrDefaultSort}
						responsive
						flushExpanded
						bind:expandedRows={sonarrExpandedRows}
						emptyMessage={activeFilters.length > 0 || debouncedQuery
							? 'No series match the current filters'
							: 'No series found'}
					>
						<svelte:fragment slot="cell" let:row let:column>
							{#if loading}
								<SeriesRowSkeleton {column} />
							{:else}
								<SeriesRow {row} {column} />
							{/if}
						</svelte:fragment>

						<svelte:fragment slot="actions" let:row>
							{#if !loading && row.tvdbId}
								<a
									href="{baseUrl}/series/{row.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}"
									target="_blank"
									rel="noopener noreferrer"
									class="inline-flex h-7 w-7 items-center justify-center rounded border border-neutral-300 bg-white text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
									title="Open in Sonarr"
									on:click|stopPropagation
								>
									<ExternalLink size={14} />
								</a>
							{/if}
						</svelte:fragment>

						<svelte:fragment slot="expanded" let:row>
							{#if !loading}
								{@const seriesId = row.id}
								{@const isEpisodeLoading = episodeLoadingSet.has(seriesId)}
								{@const episodesBySeasonNumber = episodesBySeriesAndSeason.get(seriesId) ?? new Map()}

								{#if isEpisodeLoading}
									<div class="flex items-center gap-2 p-4 text-sm text-neutral-500 dark:text-neutral-400">
										<div class="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-accent-500"></div>
										Loading episodes...
									</div>
								{:else}
									<div class="p-4">
										<SeasonTable
											seasons={row.seasons}
											{episodesBySeasonNumber}
										/>
									</div>
								{/if}
							{/if}
						</svelte:fragment>
					</ExpandableTable>
				</div>
			{/if}
		{/if}
	{/if}
</div>
