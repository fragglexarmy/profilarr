<script lang="ts">
	import Table from '$ui/table/Table.svelte';
	import Badge from '$ui/badge/Badge.svelte';
	import { marked } from 'marked';
	import type { Column } from '$ui/table/types';
	import type { FieldRow, OperationType } from './types';

	export let rows: FieldRow[] = [];
	export let operation: OperationType = 'update';

	$: columns = getColumns(operation);

	function parseMarkdown(text: string): string {
		return marked.parse(text) as string;
	}

	function isMarkdownField(field: string): boolean {
		return ['description', 'readme', 'notes'].includes(field);
	}

	function formatValue(value: unknown): string {
		if (value === null) return 'null';
		if (value === undefined) return '—';
		if (Array.isArray(value)) return value.length === 0 ? '—' : value.join(', ');
		if (typeof value === 'object') return JSON.stringify(value);
		return String(value);
	}

	function getFieldBefore(row: FieldRow): unknown {
		if (row.before !== undefined) return row.before;
		if (row.remove && row.remove.length > 0) return row.remove;
		return undefined;
	}

	function getFieldAfter(row: FieldRow): unknown {
		if (row.after !== undefined) return row.after;
		if (row.add && row.add.length > 0) return row.add;
		return undefined;
	}

	function getColumns(nextOperation: OperationType): Column<FieldRow>[] {
		switch (nextOperation) {
			case 'create':
				return [
					{ key: 'label', header: 'Field' },
					{ key: 'after', header: 'Value' }
				];
			case 'delete':
				return [
					{ key: 'label', header: 'Field' },
					{ key: 'before', header: 'Value' }
				];
			default:
				return [
					{ key: 'label', header: 'Field' },
					{ key: 'before', header: 'Before' },
					{ key: 'after', header: 'After' }
				];
		}
	}
</script>

<Table {columns} data={rows} compact hoverable={false} responsive>
	<svelte:fragment slot="cell" let:row let:column>
		{#if column.key === 'label'}
			<span class="text-sm text-neutral-700 dark:text-neutral-200">
				{row.label}
			</span>
		{:else if column.key === 'before'}
			{@const beforeValue = getFieldBefore(row)}
			{#if row.field === 'language' && typeof beforeValue === 'string'}
				<Badge variant="info" size="md">{beforeValue}</Badge>
			{:else if typeof beforeValue === 'boolean'}
				<Badge variant={beforeValue ? 'success' : 'neutral'} size="md">
					{beforeValue ? 'Yes' : 'No'}
				</Badge>
			{:else if isMarkdownField(row.field) && typeof beforeValue === 'string'}
				<div class="prose prose-sm text-sm prose-neutral dark:prose-invert">
					{@html parseMarkdown(beforeValue)}
				</div>
			{:else if typeof beforeValue === 'number'}
				<Badge variant="neutral" size="md" mono>
					{beforeValue}
				</Badge>
			{:else}
				<span class="text-sm text-neutral-600 dark:text-neutral-400">
					{formatValue(beforeValue)}
				</span>
			{/if}
		{:else if column.key === 'after'}
			{@const afterValue = getFieldAfter(row)}
			{#if row.field === 'language' && typeof afterValue === 'string'}
				<Badge variant="info" size="md">{afterValue}</Badge>
			{:else if typeof afterValue === 'boolean'}
				<Badge variant={afterValue ? 'success' : 'neutral'} size="md">
					{afterValue ? 'Yes' : 'No'}
				</Badge>
			{:else if isMarkdownField(row.field) && typeof afterValue === 'string'}
				<div class="prose prose-sm text-sm prose-neutral dark:prose-invert">
					{@html parseMarkdown(afterValue)}
				</div>
			{:else if typeof afterValue === 'number'}
				<Badge variant="neutral" size="md" mono>
					{afterValue}
				</Badge>
			{:else}
				<span class="text-sm text-neutral-700 dark:text-neutral-200">
					{formatValue(afterValue)}
				</span>
			{/if}
		{/if}
	</svelte:fragment>
</Table>
