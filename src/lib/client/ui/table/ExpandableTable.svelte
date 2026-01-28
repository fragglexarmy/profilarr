<script lang="ts" generics="T extends Record<string, any>">
	import { onMount, onDestroy } from 'svelte';
	import { ChevronDown, ChevronUp, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-svelte';
	import type { Column, SortState } from './types';

	export let columns: Column<T>[];
	export let data: T[];
	export let getRowId: (row: T) => string | number;
	export let compact: boolean = false;
	export let emptyMessage: string = 'No data available';
	export let defaultSort: SortState | null = null;
	export let flushExpanded: boolean = false;
	export let flushBottom: boolean = false;
	export let expandedRows: Set<string | number> = new Set();
	export let chevronPosition: 'left' | 'right' = 'left';
	// Mobile responsive mode - switches to card layout on small screens
	export let responsive: boolean = false;

	let isMobile = false;
	let mediaQuery: MediaQueryList | null = null;

	onMount(() => {
		if (responsive && typeof window !== 'undefined') {
			mediaQuery = window.matchMedia('(max-width: 767px)');
			isMobile = mediaQuery.matches;
			mediaQuery.addEventListener('change', handleMediaChange);
		}
	});

	onDestroy(() => {
		if (mediaQuery) {
			mediaQuery.removeEventListener('change', handleMediaChange);
		}
	});

	function handleMediaChange(e: MediaQueryListEvent) {
		isMobile = e.matches;
	}

	$: useMobileLayout = responsive && isMobile;

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

{#if useMobileLayout}
	<!-- Mobile Card Layout -->
	<div class="space-y-3">
		{#if sortedData.length === 0}
			<div
				class="rounded-lg border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400"
			>
				{emptyMessage}
			</div>
		{:else}
			{#each sortedData as row, index}
				{@const rowId = getRowId(row)}
				<div
					class="overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
				>
					<!-- Card Header - clickable to expand -->
					<button
						type="button"
						class="w-full text-left"
						on:click={() => toggleRow(rowId)}
					>
						<!-- Primary row: first column as title + actions + chevron -->
						<div class="flex items-center justify-between gap-3 px-4 py-3">
							<div class="min-w-0 flex-1 font-medium text-neutral-900 dark:text-neutral-100">
								<slot name="cell" {row} column={columns[0]} {index} expanded={expandedRows.has(rowId)}>
									{getCellValue(row, columns[0].key)}
								</slot>
							</div>
							<div class="flex shrink-0 items-center gap-2">
								{#if $$slots.actions}
									<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
									<div on:click|stopPropagation>
										<slot name="actions" {row} />
									</div>
								{/if}
								{#if expandedRows.has(rowId)}
									<ChevronUp size={18} class="text-neutral-400" />
								{:else}
									<ChevronDown size={18} class="text-neutral-400" />
								{/if}
							</div>
						</div>

						<!-- Secondary columns as label-value pairs -->
						{#if columns.length > 1}
							<div class="space-y-2 border-t border-neutral-100 px-4 py-3 dark:border-neutral-800">
								{#each columns.slice(1) as column, colIndex}
									<div class="flex items-center justify-between gap-4 text-sm">
										<span class="shrink-0 text-neutral-500 dark:text-neutral-400">{column.header}</span>
										<span class="min-w-0 text-right text-neutral-700 dark:text-neutral-300">
											<slot name="cell" {row} {column} index={colIndex + 1} expanded={expandedRows.has(rowId)}>
												{getCellValue(row, column.key)}
											</slot>
										</span>
									</div>
								{/each}
							</div>
						{/if}
					</button>

					<!-- Expanded Content -->
					{#if expandedRows.has(rowId)}
						<div class="border-t border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-800/30">
							<slot name="expanded" {row}>
								<div class="p-4 text-sm text-neutral-500 dark:text-neutral-400">
									No additional details
								</div>
							</slot>
						</div>
					{/if}
				</div>
			{/each}
		{/if}
	</div>
{:else}
	<!-- Desktop Table Layout -->
	<div
		class="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800 {flushBottom
			? 'rounded-b-none border-b-0'
			: ''}"
	>
		<table class="w-full">
			<thead
				class="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-800"
			>
				<tr>
					<!-- Expand column (left) -->
					{#if chevronPosition === 'left'}
						<th class="{compact ? 'px-2 py-2' : 'px-3 py-3'} w-8"></th>
					{/if}
					{#each columns as column}
						<th
							class="{compact
								? 'px-4 py-2'
								: 'px-6 py-3'} text-xs font-medium tracking-wider text-neutral-700 uppercase dark:text-neutral-300 {getAlignClass(
								column.align
							)} {column.width || ''}"
						>
							{#if column.sortable}
								<button
									type="button"
									on:click={() => handleSort(column)}
									class="inline-flex items-center gap-1 transition-colors hover:text-neutral-900 dark:hover:text-neutral-100 {column.align ===
									'right'
										? 'flex-row-reverse'
										: ''}"
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
					{#if $$slots.actions}
						<th
							class="{compact
								? 'px-4 py-2'
								: 'px-6 py-3'} w-20 text-right text-xs font-medium tracking-wider text-neutral-700 uppercase dark:text-neutral-300"
						>
							Actions
						</th>
					{/if}
					<!-- Expand column (right) -->
					{#if chevronPosition === 'right'}
						<th class="{compact ? 'px-2 py-2' : 'px-3 py-3'} w-8"></th>
					{/if}
				</tr>
			</thead>
			<tbody class="divide-y divide-neutral-200 bg-white dark:divide-neutral-800 dark:bg-neutral-900">
				{#if sortedData.length === 0}
					<tr>
						<td
							colspan={columns.length + 1 + ($$slots.actions ? 1 : 0)}
							class="px-6 py-8 text-center text-sm text-neutral-500 dark:text-neutral-400"
						>
							{emptyMessage}
						</td>
					</tr>
				{:else}
					{#each sortedData as row, index}
						{@const rowId = getRowId(row)}

						<!-- Main Row -->
						<tr
							class="cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
							on:click={() => toggleRow(rowId)}
						>
							<!-- Expand Icon (left) -->
							{#if chevronPosition === 'left'}
								<td class="{compact ? 'px-2 py-2' : 'px-3 py-3'} text-neutral-400">
									{#if expandedRows.has(rowId)}
										<ChevronUp size={16} />
									{:else}
										<ChevronDown size={16} />
									{/if}
								</td>
							{/if}

							{#each columns as column}
								<td
									class="{compact
										? 'px-4 py-2'
										: 'px-6 py-4'} text-sm text-neutral-900 dark:text-neutral-100 {getAlignClass(
										column.align
									)} {column.width || ''}"
								>
									<slot name="cell" {row} {column} {index} expanded={expandedRows.has(rowId)}>
										{getCellValue(row, column.key)}
									</slot>
								</td>
							{/each}
							{#if $$slots.actions}
								<td
									class="{compact ? 'px-4 py-2' : 'px-6 py-4'} text-right text-sm"
									on:click|stopPropagation
								>
									<slot name="actions" {row} />
								</td>
							{/if}

							<!-- Expand Icon (right) -->
							{#if chevronPosition === 'right'}
								<td class="{compact ? 'px-2 py-2' : 'px-3 py-3'} text-right text-neutral-400">
									{#if expandedRows.has(rowId)}
										<ChevronUp size={16} class="inline-block" />
									{:else}
										<ChevronDown size={16} class="inline-block" />
									{/if}
								</td>
							{/if}
						</tr>

						<!-- Expanded Row -->
						{#if expandedRows.has(rowId)}
							<tr class="bg-neutral-50 dark:bg-neutral-800/30">
								<td
									colspan={columns.length + 1 + ($$slots.actions ? 1 : 0)}
									class={flushExpanded ? '' : compact ? 'px-4 py-3' : 'px-6 py-4'}
								>
									<div class={flushExpanded ? '' : 'ml-6'}>
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
{/if}
