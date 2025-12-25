<script lang="ts" generics="T extends Record<string, any>">
	import { ChevronDown, ChevronUp } from 'lucide-svelte';
	import type { Column } from './types';

	export let columns: Column<T>[];
	export let data: T[];
	export let getRowId: (row: T) => string | number;
	export let compact: boolean = false;
	export let emptyMessage: string = 'No data available';

	let expandedRows: Set<string | number> = new Set();

	function toggleRow(id: string | number) {
		if (expandedRows.has(id)) {
			expandedRows.delete(id);
		} else {
			expandedRows.add(id);
		}
		expandedRows = expandedRows;
	}

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
		return key.split('.').reduce((obj, k) => obj?.[k], row as Record<string, unknown>);
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
						{column.header}
					</th>
				{/each}
			</tr>
		</thead>
		<tbody class="divide-y divide-neutral-200 bg-white dark:divide-neutral-800 dark:bg-neutral-900">
			{#if data.length === 0}
				<tr>
					<td
						colspan={columns.length + 1}
						class="px-6 py-8 text-center text-sm text-neutral-500 dark:text-neutral-400"
					>
						{emptyMessage}
					</td>
				</tr>
			{:else}
				{#each data as row}
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
