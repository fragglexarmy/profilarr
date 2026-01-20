<script lang="ts">
	import {
		Plus,
		Pencil,
		Check,
		Info,
		Power,
		Copy,
		ClipboardCopy,
		ClipboardPaste,
		Trash2
	} from 'lucide-svelte';
	import { createEmptyFilterConfig, type FilterConfig } from '$lib/shared/filters';
	import { uuid } from '$shared/uuid';
	import { selectors } from '$lib/shared/selectors';
	import { createSearchStore } from '$lib/client/stores/search';
	import FilterGroupComponent from './FilterGroup.svelte';
	import NumberInput from '$ui/form/NumberInput.svelte';
	import FiltersInfoModal from './FiltersInfoModal.svelte';
	import DropdownSelect from '$ui/dropdown/DropdownSelect.svelte';
	import ActionsBar from '$ui/actions/ActionsBar.svelte';
	import ActionButton from '$ui/actions/ActionButton.svelte';
	import SearchAction from '$ui/actions/SearchAction.svelte';
	import ExpandableTable from '$ui/table/ExpandableTable.svelte';
	import Button from '$ui/button/Button.svelte';
	import Modal from '$ui/modal/Modal.svelte';
	import type { Column } from '$ui/table/types';
	import { alertStore } from '$alerts/store';

	const searchStore = createSearchStore();
	const debouncedQuery = searchStore.debouncedQuery;

	export let filters: FilterConfig[] = [];
	export let onFiltersChange: ((filters: FilterConfig[]) => void) | undefined = undefined;

	function notifyChange() {
		onFiltersChange?.(filters);
	}

	let showInfoModal = false;

	// Filter the filters list based on search
	$: filteredFilters = filterByName(filters, $debouncedQuery);

	function filterByName(items: FilterConfig[], query: string): FilterConfig[] {
		if (!query) return items;
		const queryLower = query.toLowerCase();
		return items.filter((item) => item.name.toLowerCase().includes(queryLower));
	}

	let expandedIds: Set<string> = new Set();

	const columns: Column<FilterConfig>[] = [{ key: 'name', header: 'Name', sortable: true }];
	let editingId: string | null = null;
	let editingName: string = '';

	// Delete confirmation
	let deleteModalOpen = false;
	let filterToDelete: FilterConfig | null = null;

	function confirmDelete(filter: FilterConfig) {
		filterToDelete = filter;
		deleteModalOpen = true;
	}

	function handleDeleteConfirm() {
		if (filterToDelete) {
			filters = filters.filter((f) => f.id !== filterToDelete!.id);
			expandedIds.delete(filterToDelete.id);
			expandedIds = expandedIds;
			alertStore.add('success', `Deleted "${filterToDelete.name}"`);
			notifyChange();
		}
		deleteModalOpen = false;
		filterToDelete = null;
	}

	function handleDeleteCancel() {
		deleteModalOpen = false;
		filterToDelete = null;
	}

	function addFilter() {
		const newFilter = createEmptyFilterConfig(`Filter ${filters.length + 1}`);
		filters = [...filters, newFilter];
		expandedIds.add(newFilter.id);
		expandedIds = expandedIds;
		notifyChange();
	}

	function startEditing(filter: FilterConfig) {
		editingId = filter.id;
		editingName = filter.name;
	}

	function saveEditing() {
		if (editingId) {
			const filter = filters.find((f) => f.id === editingId);
			if (filter) {
				filter.name = editingName;
				filters = filters;
				notifyChange();
			}
		}
		editingId = null;
		editingName = '';
	}

	function handleChange() {
		filters = filters;
		notifyChange();
	}

	function toggleEnabled(id: string) {
		const filter = filters.find((f) => f.id === id);
		if (filter) {
			filter.enabled = !filter.enabled;
			filters = filters;
			notifyChange();
		}
	}

	function duplicateFilter(id: string) {
		const filter = filters.find((f) => f.id === id);
		if (filter) {
			const duplicate: FilterConfig = {
				...structuredClone(filter),
				id: uuid(),
				name: `${filter.name} (Copy)`
			};
			filters = [...filters, duplicate];
			expandedIds.add(duplicate.id);
			expandedIds = expandedIds;
			notifyChange();
		}
	}

	async function copyFilter(id: string) {
		const filter = filters.find((f) => f.id === id);
		if (!filter) return;

		const exportData = {
			...structuredClone(filter),
			id: undefined
		};

		try {
			await navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
			alertStore.add('success', 'Filter copied to clipboard');
		} catch {
			alertStore.add('error', 'Failed to copy to clipboard');
		}
	}

	async function pasteIntoFilter(id: string) {
		const filter = filters.find((f) => f.id === id);
		if (!filter) return;

		try {
			const text = await navigator.clipboard.readText();
			const imported = JSON.parse(text);

			if (!imported.group) {
				alertStore.add('error', 'Invalid filter format');
				return;
			}

			// Overwrite filter settings but keep id and name
			filter.group = imported.group;
			filter.selector = imported.selector ?? filter.selector;
			filter.count = imported.count ?? filter.count;
			filter.cutoff = imported.cutoff ?? filter.cutoff;
			filter.searchCooldown = imported.searchCooldown ?? filter.searchCooldown;
			filter.enabled = imported.enabled ?? filter.enabled;

			filters = filters;
			notifyChange();
			alertStore.add('success', `Pasted settings into "${filter.name}"`);
		} catch {
			alertStore.add('error', 'Failed to paste from clipboard');
		}
	}
</script>

<div class="-mx-8 bg-neutral-50 px-8 pt-2 pb-6 dark:bg-neutral-900">
	<div class="mb-4">
		<ActionsBar>
			<SearchAction {searchStore} placeholder="Search filters..." />
			<ActionButton icon={Info} title="Fields" on:click={() => (showInfoModal = true)} />
			<ActionButton icon={Plus} title="Add filter" on:click={addFilter} />
		</ActionsBar>
	</div>

	<ExpandableTable
		{columns}
		data={filteredFilters}
		getRowId={(row) => row.id}
		bind:expandedRows={expandedIds}
		chevronPosition="right"
		flushExpanded={true}
		emptyMessage="No filters configured. Add a filter to start."
	>
		<svelte:fragment slot="cell" let:row let:column>
			{#if column.key === 'name'}
				{#if editingId === row.id}
					<!-- svelte-ignore a11y_autofocus -->
					<input
						type="text"
						bind:value={editingName}
						on:click|stopPropagation
						on:keydown={(e) => e.key === 'Enter' && saveEditing()}
						on:blur={() => saveEditing()}
						class="w-40 rounded border border-neutral-300 bg-white px-2 py-1 text-sm font-medium text-neutral-900 focus:border-accent-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
						autofocus
					/>
				{:else}
					<span
						class={row.enabled
							? 'text-neutral-900 dark:text-neutral-100'
							: 'text-neutral-400 dark:text-neutral-500'}
					>
						{row.name}
					</span>
					{#if !row.enabled}
						<span
							class="ml-2 rounded bg-neutral-200 px-1.5 py-0.5 text-xs text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400"
						>
							Disabled
						</span>
					{/if}
				{/if}
			{/if}
		</svelte:fragment>

		<svelte:fragment slot="actions" let:row>
			<div class="flex items-center gap-1">
				{#if editingId === row.id}
					<Button
						text="Save"
						icon={Check}
						iconColor="text-green-600 dark:text-green-400"
						on:click={() => saveEditing()}
					/>
				{:else}
					<Button
						text={row.enabled ? 'Disable' : 'Enable'}
						icon={Power}
						iconColor={row.enabled
							? 'text-green-600 dark:text-green-400'
							: 'text-neutral-400 dark:text-neutral-500'}
						on:click={() => toggleEnabled(row.id)}
					/>
					<Button
						text="Rename"
						icon={Pencil}
						iconColor="text-blue-600 dark:text-blue-400"
						on:click={() => startEditing(row)}
					/>
					<Button
						text="Copy"
						icon={ClipboardCopy}
						iconColor="text-amber-600 dark:text-amber-400"
						on:click={() => copyFilter(row.id)}
					/>
					<Button
						text="Paste"
						icon={ClipboardPaste}
						iconColor="text-amber-600 dark:text-amber-400"
						on:click={() => pasteIntoFilter(row.id)}
					/>
					<Button
						text="Duplicate"
						icon={Copy}
						iconColor="text-violet-600 dark:text-violet-400"
						on:click={() => duplicateFilter(row.id)}
					/>
				{/if}
				<Button
					text="Delete"
					icon={Trash2}
					iconColor="text-red-600 dark:text-red-400"
					on:click={() => confirmDelete(row)}
				/>
			</div>
		</svelte:fragment>

		<svelte:fragment slot="expanded" let:row>
			<div class="space-y-4 p-6">
				<FilterGroupComponent group={row.group} on:change={handleChange} />

				<!-- Selection Settings -->
				<div
					class="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-800/50"
				>
					<h3 class="mb-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">Settings</h3>
					<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
						<div>
							<label
								for="cutoff-{row.id}"
								class="block text-sm font-medium text-neutral-600 dark:text-neutral-400"
							>
								Cutoff %
							</label>
							<div class="mt-1">
								<NumberInput
									name="cutoff-{row.id}"
									bind:value={row.cutoff}
									min={0}
									max={100}
									font="mono"
									responsive
									on:change={handleChange}
								/>
							</div>
							<p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
								Score threshold for "cutoff met"
							</p>
						</div>
						<div>
							<label
								for="cooldown-{row.id}"
								class="block text-sm font-medium text-neutral-600 dark:text-neutral-400"
							>
								Cooldown (hours)
							</label>
							<div class="mt-1">
								<NumberInput
									name="cooldown-{row.id}"
									bind:value={row.searchCooldown}
									min={24}
									font="mono"
									responsive
									on:change={handleChange}
								/>
							</div>
							<p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
								Skip if searched recently
							</p>
						</div>
						<div>
							<label
								for="selector-{row.id}"
								class="block mb-1 text-sm font-medium text-neutral-600 dark:text-neutral-400"
							>
								Method
							</label>
							<DropdownSelect
								value={row.selector}
								options={selectors.map((s) => ({
									value: s.id,
									label: `${s.label} - ${s.description}`
								}))}
								minWidth="14rem"
								responsiveButton
								compactDropdownThreshold={7}
								fullWidth
								fixed
								on:change={(e) => {
									row.selector = e.detail;
									handleChange();
								}}
							/>
						</div>
						<div>
							<label
								for="count-{row.id}"
								class="block text-sm font-medium text-neutral-600 dark:text-neutral-400"
							>
								Count
							</label>
							<div class="mt-1">
								<NumberInput
									name="count-{row.id}"
									bind:value={row.count}
									min={1}
									max={5}
									font="mono"
									responsive
									on:change={handleChange}
								/>
							</div>
							<p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
								Items to select per run
							</p>
						</div>
					</div>
				</div>
			</div>
		</svelte:fragment>
	</ExpandableTable>
</div>

<FiltersInfoModal bind:open={showInfoModal} />

<Modal
	bind:open={deleteModalOpen}
	header="Delete Filter"
	bodyMessage="Are you sure you want to delete &quot;{filterToDelete?.name}&quot;? This action cannot be undone."
	confirmText="Delete"
	confirmDanger={true}
	on:confirm={handleDeleteConfirm}
	on:cancel={handleDeleteCancel}
/>
