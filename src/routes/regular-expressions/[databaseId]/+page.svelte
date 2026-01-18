<script lang="ts">
	import Tabs from '$ui/navigation/tabs/Tabs.svelte';
	import ActionsBar from '$ui/actions/ActionsBar.svelte';
	import ActionButton from '$ui/actions/ActionButton.svelte';
	import SearchAction from '$ui/actions/SearchAction.svelte';
	import ViewToggle from '$ui/actions/ViewToggle.svelte';
	import InfoModal from '$ui/modal/InfoModal.svelte';
	import Dropdown from '$ui/dropdown/Dropdown.svelte';
	import DropdownItem from '$ui/dropdown/DropdownItem.svelte';
	import TableView from './views/TableView.svelte';
	import CardView from './views/CardView.svelte';
	import SearchFilterAction from './components/SearchFilterAction.svelte';
	import { createDataPageStore } from '$lib/client/stores/dataPage';
	import { browser } from '$app/environment';
	import { Info, Plus, FileText, Users } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import type { RegularExpressionTableRow } from '$pcd/queries/regularExpressions';
	import type { PageData } from './$types';

	export let data: PageData;

	let infoModalOpen = false;

	const SEARCH_FILTER_STORAGE_KEY = 'regularExpressionsSearchFilter';

	// Default search filter options - everything except description
	const defaultSearchOptions = [
		{ key: 'name', label: 'Name', enabled: true },
		{ key: 'tags', label: 'Tags', enabled: true },
		{ key: 'pattern', label: 'Pattern', enabled: true },
		{ key: 'description', label: 'Description', enabled: false },
		{ key: 'regex101_id', label: 'Regex101 ID', enabled: true }
	];

	// Load saved preferences from localStorage or use defaults
	function loadSearchOptions() {
		if (!browser) return defaultSearchOptions;
		try {
			const saved = localStorage.getItem(SEARCH_FILTER_STORAGE_KEY);
			if (saved) {
				const savedMap = new Map(JSON.parse(saved) as [string, boolean][]);
				return defaultSearchOptions.map((opt) => ({
					...opt,
					enabled: savedMap.has(opt.key) ? savedMap.get(opt.key)! : opt.enabled
				}));
			}
		} catch {
			// Ignore parse errors, use defaults
		}
		return defaultSearchOptions;
	}

	let searchOptions = loadSearchOptions();

	// Save to localStorage when options change
	$: if (browser) {
		const enabledMap = searchOptions.map((opt) => [opt.key, opt.enabled] as [string, boolean]);
		localStorage.setItem(SEARCH_FILTER_STORAGE_KEY, JSON.stringify(enabledMap));
	}

	// Initialize data page store (we'll use search and view, but do our own filtering)
	const { search, view, setItems } = createDataPageStore(data.regularExpressions, {
		storageKey: 'regularExpressionsView',
		searchKeys: ['name'] // Placeholder, we do our own filtering
	});

	// Extract the debounced query store for reactive access
	const debouncedQuery = search.debouncedQuery;

	// Update items when data changes (e.g., switching databases)
	$: setItems(data.regularExpressions);

	// Custom filtering based on selected search options
	$: filtered = filterExpressions(data.regularExpressions, $debouncedQuery, searchOptions);

	function filterExpressions(
		items: RegularExpressionTableRow[],
		query: string,
		options: typeof searchOptions
	): RegularExpressionTableRow[] {
		if (!query) return items;

		const queryLower = query.toLowerCase();
		const enabledKeys = options.filter((o) => o.enabled).map((o) => o.key);

		return items.filter((item) => {
			return enabledKeys.some((key) => {
				if (key === 'tags') {
					// Search within tag names
					return item.tags.some((tag) => tag.name.toLowerCase().includes(queryLower));
				}
				const value = item[key as keyof RegularExpressionTableRow];
				if (value == null) return false;
				return String(value).toLowerCase().includes(queryLower);
			});
		});
	}

	// Map databases to tabs
	$: tabs = data.databases.map((db) => ({
		label: db.name,
		href: `/regular-expressions/${db.id}`,
		active: db.id === data.currentDatabase.id
	}));
</script>

<svelte:head>
	<title>Regular Expressions - {data.currentDatabase.name} - Profilarr</title>
</svelte:head>

<div class="space-y-6 px-8 pt-4 pb-8">
	<!-- Tabs -->
	<Tabs {tabs} />

	<!-- Actions Bar -->
	<ActionsBar>
		<SearchAction searchStore={search} placeholder="Search regular expressions..." />
		<ActionButton icon={Plus} hasDropdown={true} dropdownPosition="right">
			<svelte:fragment slot="dropdown">
				<Dropdown position="right">
					<DropdownItem
						icon={FileText}
						label="Blank"
						on:click={() => goto(`/regular-expressions/${data.currentDatabase.id}/new`)}
					/>
					<DropdownItem
						icon={Users}
						label="Release Group"
						on:click={() =>
							goto(`/regular-expressions/${data.currentDatabase.id}/new?preset=release-group`)}
					/>
				</Dropdown>
			</svelte:fragment>
		</ActionButton>
		<SearchFilterAction bind:options={searchOptions} />
		<ViewToggle bind:value={$view} />
		<ActionButton icon={Info} on:click={() => (infoModalOpen = true)} />
	</ActionsBar>

	<!-- Regular Expressions Content -->
	<div class="mt-6">
		{#if data.regularExpressions.length === 0}
			<div
				class="rounded-lg border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900"
			>
				<p class="text-neutral-600 dark:text-neutral-400">
					No regular expressions found for {data.currentDatabase.name}
				</p>
			</div>
		{:else if filtered.length === 0}
			<div
				class="rounded-lg border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900"
			>
				<p class="text-neutral-600 dark:text-neutral-400">
					No regular expressions match your search
				</p>
			</div>
		{:else if $view === 'table'}
			<TableView expressions={filtered} />
		{:else}
			<CardView expressions={filtered} />
		{/if}
	</div>
</div>

<!-- Info Modal -->
<InfoModal bind:open={infoModalOpen} header="About Regular Expressions">
	<div class="space-y-4 text-sm text-neutral-700 dark:text-neutral-300">
		<section>
			<h3 class="mb-2 font-semibold text-neutral-900 dark:text-neutral-100">How It Works</h3>
			<p>
				Regular expressions in Profilarr are separated from custom formats to make them reusable.
				When multiple custom formats share the same pattern, you only need to update it in one
				place.
			</p>
			<p class="mt-2">
				When custom formats are synced to your Arr instances, Profilarr compiles the referenced
				patterns into the format each Arr expects. The regular expressions themselves are
				<strong>not</strong> synced directly—only the compiled custom formats are.
			</p>
		</section>

		<section>
			<h3 class="mb-2 font-semibold text-neutral-900 dark:text-neutral-100">Regex Flavor</h3>
			<p>
				Radarr and Sonarr use the <strong>.NET regex engine</strong> (specifically .NET 6+). Patterns
				are matched case-insensitively by default.
			</p>
		</section>

		<section>
			<h3 class="mb-2 font-semibold text-neutral-900 dark:text-neutral-100">Testing Patterns</h3>
			<p>
				Use <a
					href="https://regex101.com"
					target="_blank"
					rel="noopener noreferrer"
					class="text-accent-600 hover:underline dark:text-accent-400">regex101.com</a
				>
				to test your patterns. Make sure to select the <strong>.NET</strong> flavor from the dropdown
				for accurate results.
			</p>
			<p class="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
				Tip: When saving a regex101 link, include the version number (e.g., <code
					class="rounded bg-neutral-100 px-1 dark:bg-neutral-800">ABC123/1</code
				>) to ensure it always points to your specific version.
			</p>
		</section>
	</div>
</InfoModal>
