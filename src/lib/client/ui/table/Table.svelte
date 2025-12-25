<script lang="ts" generics="T extends Record<string, any>">
	import type { Column, SortDirection, SortState } from './types';

	/**
	 * Props
	 */
	export let columns: Column<T>[];
	export let data: T[];
	export let hoverable: boolean = true;
	export let compact: boolean = false;
	export let emptyMessage: string = 'No data available';
	export let onRowClick: ((row: T) => void) | undefined = undefined;
	export let initialSort: SortState | null = null;
	export let onSortChange: ((sort: SortState | null) => void) | undefined = undefined;

	let sortKey: string | null = initialSort?.key ?? null;
	let sortDirection: SortDirection = initialSort?.direction ?? 'asc';
	let sortedData: T[] = data;

	/**
	 * Get cell value by key path (supports nested properties like 'user.name')
	 */
	function getCellValue(row: T, key: string): any {
		return key.split('.').reduce((obj, k) => obj?.[k], row);
	}

	/**
	 * Get alignment class
	 */
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

	function toggleSort(column: Column<T>) {
		if (!column.sortable) {
			return;
		}

		if (sortKey === column.key) {
			if (sortDirection === 'asc') {
				sortDirection = 'desc';
			} else {
				sortKey = null;
				onSortChange?.(null);
				return;
			}
		} else {
			sortKey = column.key;
			sortDirection = column.defaultSortDirection ?? 'asc';
		}

		onSortChange?.(sortKey ? { key: sortKey, direction: sortDirection } : null);
	}

	function compareValues(a: any, b: any): number {
		if (a == null && b == null) return 0;
		if (a == null) return -1;
		if (b == null) return 1;

		if (typeof a === 'number' && typeof b === 'number') {
			return a - b;
		}

		if (a instanceof Date && b instanceof Date) {
			return a.getTime() - b.getTime();
		}

		return String(a).localeCompare(String(b));
	}

	function getSortValue(row: T, column: Column<T>) {
		if (column.sortAccessor) {
			return column.sortAccessor(row);
		}
		return getCellValue(row, column.key);
	}

	function sortData(rows: T[]): T[] {
		if (!sortKey) {
			return rows;
		}

		const column = columns.find((col) => col.key === sortKey);
		if (!column) {
			return rows;
		}

		const sorted = [...rows].sort((a, b) => {
			if (column.sortComparator) {
				return column.sortComparator(a, b);
			}

			const aValue = getSortValue(a, column);
			const bValue = getSortValue(b, column);
			return compareValues(aValue, bValue);
		});

		return sortDirection === 'desc' ? sorted.reverse() : sorted;
	}

	$: sortedData = sortData(data);
</script>

<div class="overflow-x-auto rounded-lg border-2 border-neutral-200 dark:border-neutral-800">
	<table class="w-full">
		<!-- Header -->
		<thead
			class="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-800"
		>
			<tr>
				{#each columns as column}
					<th
						class={`${compact ? 'px-4 py-2' : 'px-6 py-3'} text-xs font-medium uppercase tracking-wider text-neutral-700 dark:text-neutral-300 ${getAlignClass(column.align)} ${column.width || ''}`}
					>
						{#if column.sortable}
							<button
								type="button"
								class={`group flex w-full items-center gap-1.5 text-xs font-medium uppercase tracking-wider ${column.align === 'center'
									? 'justify-center'
									: column.align === 'right'
										? 'justify-end'
										: 'justify-start'}`}
								on:click={() => toggleSort(column)}
							>
								{#if column.headerIcon}
									<svelte:component this={column.headerIcon} size={14} />
								{/if}
								<span>{column.header}</span>
								<span class="text-[0.6rem] text-neutral-400 transition-opacity group-hover:text-neutral-600 group-hover:dark:text-neutral-200">
									{#if sortKey === column.key}
										{sortDirection === 'asc' ? '▲' : '▼'}
									{:else}
										⇅
									{/if}
								</span>
							</button>
						{:else}
							<div class={`flex items-center gap-1.5 ${column.align === 'center'
								? 'justify-center'
								: column.align === 'right'
									? 'justify-end'
									: ''}`}>
								{#if column.headerIcon}
									<svelte:component this={column.headerIcon} size={14} />
								{/if}
								{column.header}
							</div>
						{/if}
					</th>
				{/each}
				<!-- Actions column slot -->
				{#if $$slots.actions}
					<th
						class={`${compact ? 'px-4 py-2' : 'px-6 py-3'} text-xs font-medium uppercase tracking-wider text-neutral-700 dark:text-neutral-300 text-right`}
					>
						Actions
					</th>
				{/if}
			</tr>
		</thead>

		<!-- Body -->
		<tbody class="divide-y divide-neutral-200 bg-white dark:divide-neutral-800 dark:bg-neutral-900">
			{#if sortedData.length === 0}
				<tr>
					<td
						colspan={columns.length + ($$slots.actions ? 1 : 0)}
						class="px-6 py-8 text-center text-sm text-neutral-500 dark:text-neutral-400"
					>
						{emptyMessage}
					</td>
				</tr>
			{:else}
				{#each sortedData as row, rowIndex}
					<tr
						class="{hoverable
							? 'transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900'
							: ''} {onRowClick ? 'cursor-pointer' : ''}"
						on:click={() => onRowClick && onRowClick(row)}
					>
						{#each columns as column}
							<td
								class={`${compact ? 'px-4 py-2' : 'px-6 py-4'} text-sm text-neutral-900 dark:text-neutral-100 ${getAlignClass(column.align)} ${column.width || ''}`}
							>
								{#if column.cell}
									{@const rendered = column.cell(row)}
									{#if typeof rendered === 'string'}
										{rendered}
									{:else if typeof rendered === 'object' && 'html' in rendered}
										{@html rendered.html}
									{:else}
										<svelte:component this={rendered} {row} />
									{/if}
								{:else}
									<slot name="cell" {row} {column} {rowIndex}>
										{getCellValue(row, column.key)}
									</slot>
								{/if}
							</td>
						{/each}

						<!-- Actions slot -->
						{#if $$slots.actions}
							<td class={`${compact ? 'px-4 py-2' : 'px-6 py-4'} text-sm text-right`}>
								<slot name="actions" {row} {rowIndex} />
							</td>
						{/if}
					</tr>
				{/each}
			{/if}
		</tbody>
	</table>
</div>

<style>
	td :global(ul) {
		list-style-type: disc;
		padding-left: 1.5rem;
		margin: 0.5rem 0;
	}

	td :global(ol) {
		list-style-type: decimal;
		padding-left: 1.5rem;
		margin: 0.5rem 0;
	}

	td :global(li) {
		margin: 0.25rem 0;
	}

	td :global(p) {
		margin: 0.5rem 0;
	}

	td :global(strong) {
		font-weight: 600;
	}
</style>
