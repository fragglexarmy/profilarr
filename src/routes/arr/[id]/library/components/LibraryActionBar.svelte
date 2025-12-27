<script lang="ts">
	import { Check, Columns, Filter, FolderSync, Database } from 'lucide-svelte';
	import ActionsBar from '$ui/actions/ActionsBar.svelte';
	import SearchAction from '$ui/actions/SearchAction.svelte';
	import ActionButton from '$ui/actions/ActionButton.svelte';
	import Dropdown from '$ui/dropdown/Dropdown.svelte';
	import IconCheckbox from '$ui/form/IconCheckbox.svelte';
	import { type SearchStore } from '$stores/search';

	type FilterOperator = 'eq' | 'neq';
	type FilterField = 'qualityName' | 'qualityProfileName';

	interface ActiveFilter {
		field: FilterField;
		operator: FilterOperator;
		value: string | number | boolean;
		label: string;
	}

	interface DatabaseProfiles {
		databaseId: number;
		databaseName: string;
		profiles: string[];
	}

	export let searchStore: SearchStore;
	export let visibleColumns: Set<string>;
	export let toggleableColumns: readonly string[];
	export let columnLabels: Record<string, string>;
	export let activeFilters: ActiveFilter[];
	export let uniqueQualities: string[];
	export let uniqueProfiles: string[];
	export let profilesByDatabase: DatabaseProfiles[];
	export let filteredCount: number;

	export let onToggleColumn: (key: string) => void;
	export let onToggleFilter: (field: FilterField, operator: FilterOperator, value: string | number | boolean, label: string) => void;
	export let onChangeProfile: (databaseName: string, profileName: string) => void;
</script>

<ActionsBar>
	<SearchAction {searchStore} placeholder="Search movies..." />
	<ActionButton icon={Columns} hasDropdown={true} dropdownPosition="right">
		<svelte:fragment slot="dropdown" let:dropdownPosition let:open>
			<Dropdown position={dropdownPosition} {open} minWidth="10rem">
				<div class="py-1">
					{#each toggleableColumns as colKey}
						<button
							type="button"
							on:click={() => onToggleColumn(colKey)}
							class="flex w-full items-center justify-between gap-3 px-4 py-2 text-sm transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700 {visibleColumns.has(colKey) ? 'bg-neutral-50 dark:bg-neutral-700' : ''}"
						>
							<span class="text-neutral-700 dark:text-neutral-300">{columnLabels[colKey]}</span>
							<IconCheckbox
								checked={visibleColumns.has(colKey)}
								icon={Check}
								color="blue"
								shape="circle"
							/>
						</button>
					{/each}
				</div>
			</Dropdown>
		</svelte:fragment>
	</ActionButton>
	<ActionButton icon={Filter} hasDropdown={true} dropdownPosition="right">
		<svelte:fragment slot="dropdown" let:dropdownPosition let:open>
			<Dropdown position={dropdownPosition} {open} minWidth="14rem">
				<div class="max-h-96 overflow-y-auto">
					<!-- Quality Filter -->
					<div class="border-b border-neutral-100 dark:border-neutral-700">
						<div class="px-3 py-2 bg-neutral-50 dark:bg-neutral-800">
							<span class="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Quality</span>
						</div>
						{#each uniqueQualities as quality}
							<button
								type="button"
								on:click={() => onToggleFilter('qualityName', 'eq', quality, quality)}
								class="flex w-full items-center justify-between gap-3 px-4 py-2 text-sm transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700 {activeFilters.find(f => f.field === 'qualityName' && f.value === quality) ? 'bg-neutral-50 dark:bg-neutral-700' : ''}"
							>
								<span class="text-neutral-700 dark:text-neutral-300">{quality}</span>
								<IconCheckbox
									checked={!!activeFilters.find(f => f.field === 'qualityName' && f.value === quality)}
									icon={Check}
									color="blue"
									shape="circle"
								/>
							</button>
						{/each}
					</div>

					<!-- Profile Filter -->
					<div>
						<div class="px-3 py-2 bg-neutral-50 dark:bg-neutral-800">
							<span class="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Profile</span>
						</div>
						{#each uniqueProfiles as profile}
							<button
								type="button"
								on:click={() => onToggleFilter('qualityProfileName', 'eq', profile, profile)}
								class="flex w-full items-center justify-between gap-3 px-4 py-2 text-sm transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700 {activeFilters.find(f => f.field === 'qualityProfileName' && f.value === profile) ? 'bg-neutral-50 dark:bg-neutral-700' : ''}"
							>
								<span class="text-neutral-700 dark:text-neutral-300">{profile}</span>
								<IconCheckbox
									checked={!!activeFilters.find(f => f.field === 'qualityProfileName' && f.value === profile)}
									icon={Check}
									color="blue"
									shape="circle"
								/>
							</button>
						{/each}
					</div>
				</div>
			</Dropdown>
		</svelte:fragment>
	</ActionButton>
	<ActionButton icon={FolderSync} hasDropdown={true} dropdownPosition="right" square={false}>
		<span class="ml-2 text-sm text-neutral-700 dark:text-neutral-300">Change Profile</span>
		<span class="ml-1 text-xs text-neutral-500 dark:text-neutral-400">({filteredCount})</span>
		<svelte:fragment slot="dropdown" let:dropdownPosition let:open>
			<Dropdown position={dropdownPosition} {open} minWidth="16rem">
				<div class="max-h-80 overflow-y-auto py-1">
					{#if profilesByDatabase.length === 0}
						<div class="px-4 py-3 text-sm text-neutral-500 dark:text-neutral-400">
							No databases configured
						</div>
					{:else}
						{#each profilesByDatabase as db}
							<div class="border-b border-neutral-100 dark:border-neutral-700 last:border-b-0">
								<div class="px-3 py-2 bg-neutral-50 dark:bg-neutral-900 flex items-center gap-2">
									<Database size={12} class="text-neutral-400" />
									<span class="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
										{db.databaseName}
									</span>
								</div>
								{#each db.profiles as profile}
									<button
										type="button"
										on:click={() => onChangeProfile(db.databaseName, profile)}
										class="w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700"
									>
										{profile}
									</button>
								{/each}
							</div>
						{/each}
					{/if}
				</div>
			</Dropdown>
		</svelte:fragment>
	</ActionButton>
</ActionsBar>
