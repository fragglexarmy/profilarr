<script lang="ts" generics="T extends Record<string, any>">
	import { ChevronDown, ChevronUp, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-svelte';
	import type { Column, SortState } from './types';

	export let columns: Column<T>[];
	export let data: T[];
	export let getRowId: (row: T) => string | number;
	export let compact: boolean = false;
	export let emptyMessage: string = 'No data available';
	export let defaultSort: SortState | null = null;

	let expandedRows: Set<string | number> = new Set();
	let sortState: SortState | null = defaultSort;

	function toggleRow(id: string | number) {
		if (expandedRows.has(id)) {
			expandedRows.delete(id);
		} else {
			expandedRows.add(id);
		}
		expandedRows = expandedRows;
	}

	function handleSort(column: Column<T>) {
		if (!column.sortable) return;

		if (sortState?.key === column.key) {
			// Toggle direction or clear
			if (sortState.direction === 'asc') {
				sortState = { key: column.key, direction: 'desc' };
			} else {
				sortState = null; // Clear sort on third click
			}
		} else {
			// New column - use default direction or 'asc'
			sortState = {
				key: column.key,
				direction: column.defaultSortDirection ?? 'asc'
			};
		}
	}

	function getSortedData(items: T[], sort: SortState | null): T[] {
		if (!sort) return items;

		const column = columns.find((c) => c.key === sort.key);
		if (!column) return items;

		return [...items].sort((a, b) => {
			let comparison = 0;

			if (column.sortComparator) {
				comparison = column.sortComparator(a, b);
			} else {
				const aVal = column.sortAccessor ? column.sortAccessor(a) : getCellValue(a, column.key);
				const bVal = column.sortAccessor ? column.sortAccessor(b) : getCellValue(b, column.key);

				// Handle null/undefined
				if (aVal == null && bVal == null) comparison = 0;
				else if (aVal == null) comparison = 1;
				else if (bVal == null) comparison = -1;
				// String comparison (case-insensitive)
				else if (typeof aVal === 'string' && typeof bVal === 'string') {
					comparison = aVal.localeCompare(bVal, undefined, { sensitivity: 'base' });
				}
				// Number/Date comparison
				else if (typeof aVal === 'number' && typeof bVal === 'number') {
					comparison = aVal - bVal;
				}
				// Boolean
				else if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
					comparison = aVal === bVal ? 0 : aVal ? -1 : 1;
				}
				// Fallback to string
				else {
					comparison = String(aVal).localeCompare(String(bVal));
				}
			}

			return sort.direction === 'desc' ? -comparison : comparison;
		});
	}

	$: sortedData = getSortedData(data, sortState);

	function getAlignClass(align?: 'left' | 'center' | 'right'): string {
		switch (align) {
			case 'center':
				return 'text-center';
			case 'right':
				return 'text-right';
			default:
				return 'text-left';
		}
	}

	function getCellValue(row: T, key: string): unknown {
		return key.split('.').reduce<unknown>((obj, k) => (obj as Record<string, unknown>)?.[k], row);
	}
</script>

<div class="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
	<table class="w-full">
		<thead class="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-800">
			<tr>
				<!-- Expand column -->
				<th class="{compact ? 'px-2 py-2' : 'px-3 py-3'} w-8"></th>
				{#each columns as column}
					<th
						class="{compact ? 'px-4 py-2' : 'px-6 py-3'} text-xs font-medium uppercase tracking-wider text-neutral-700 dark:text-neutral-300 {getAlignClass(column.align)} {column.width || ''}"
					>
						{#if column.sortable}
							<button
								type="button"
								on:click={() => handleSort(column)}
								class="inline-flex items-center gap-1 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors {column.align === 'right' ? 'flex-row-reverse' : ''}"
							>
								{column.header}
								{#if sortState?.key === column.key}
									{#if sortState.direction === 'asc'}
										<ArrowUp size={12} class="text-accent-500" />
									{:else}
										<ArrowDown size={12} class="text-accent-500" />
									{/if}
								{:else}
									<ArrowUpDown size={12} class="opacity-30" />
								{/if}
							</button>
						{:else}
							{column.header}
						{/if}
					</th>
				{/each}
			</tr>
		</thead>
		<tbody class="divide-y divide-neutral-200 bg-white dark:divide-neutral-800 dark:bg-neutral-900">
			{#if sortedData.length === 0}
				<tr>
					<td
						colspan={columns.length + 1}
						class="px-6 py-8 text-center text-sm text-neutral-500 dark:text-neutral-400"
					>
						{emptyMessage}
					</td>
				</tr>
			{:else}
				{#each sortedData as row}
					{@const rowId = getRowId(row)}

					<!-- Main Row -->
					<tr
						class="cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
						on:click={() => toggleRow(rowId)}
					>
						<!-- Expand Icon -->
						<td class="{compact ? 'px-2 py-2' : 'px-3 py-3'} text-neutral-400">
							{#if expandedRows.has(rowId)}
								<ChevronUp size={16} />
							{:else}
								<ChevronDown size={16} />
							{/if}
						</td>

						{#each columns as column}
							<td
								class="{compact ? 'px-4 py-2' : 'px-6 py-4'} text-sm text-neutral-900 dark:text-neutral-100 {getAlignClass(column.align)} {column.width || ''}"
							>
								<slot name="cell" {row} {column} expanded={expandedRows.has(rowId)}>
									{getCellValue(row, column.key)}
								</slot>
							</td>
						{/each}
					</tr>

					<!-- Expanded Row -->
					{#if expandedRows.has(rowId)}
						<tr class="bg-neutral-50 dark:bg-neutral-800/30">
							<td colspan={columns.length + 1} class="{compact ? 'px-4 py-3' : 'px-6 py-4'}">
								<div class="ml-6">
									<slot name="expanded" {row}>
										<!-- Default expanded content -->
										<div class="text-sm text-neutral-500 dark:text-neutral-400">
											No additional details
										</div>
									</slot>
								</div>
							</td>
						</tr>
					{/if}
				{/each}
			{/if}
		</tbody>
	</table>
</div>
