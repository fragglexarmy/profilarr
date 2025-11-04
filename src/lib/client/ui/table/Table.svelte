<script lang="ts" generics="T extends Record<string, any>">
	import type { ComponentType } from 'svelte';

	/**
	 * Column definition for table
	 */
	export interface Column<T> {
		/** Unique key for the column */
		key: string;
		/** Header text to display */
		header: string;
		/** Optional icon component to display before header text */
		headerIcon?: ComponentType;
		/** Optional width class (e.g., 'w-32', 'w-1/4') */
		width?: string;
		/** Text alignment */
		align?: 'left' | 'center' | 'right';
		/** Whether column is sortable */
		sortable?: boolean;
		/** Custom cell renderer - receives the full row object */
		cell?: (row: T) => string | ComponentType | { html: string };
	}

	/**
	 * Props
	 */
	export let columns: Column<T>[];
	export let data: T[];
	export let hoverable: boolean = true;
	export let compact: boolean = false;
	export let emptyMessage: string = 'No data available';
	export let onRowClick: ((row: T) => void) | undefined = undefined;

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
</script>

<div class="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
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
						<div class="flex items-center gap-1.5 {column.align === 'center' ? 'justify-center' : column.align === 'right' ? 'justify-end' : ''}">
							{#if column.headerIcon}
								<svelte:component this={column.headerIcon} size={14} />
							{/if}
							{column.header}
						</div>
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
			{#if data.length === 0}
				<tr>
					<td
						colspan={columns.length + ($$slots.actions ? 1 : 0)}
						class="px-6 py-8 text-center text-sm text-neutral-500 dark:text-neutral-400"
					>
						{emptyMessage}
					</td>
				</tr>
			{:else}
				{#each data as row, rowIndex}
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
