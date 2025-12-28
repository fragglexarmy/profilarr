<script lang="ts">
	import Table from '$ui/table/Table.svelte';
	import type { Column } from '$ui/table/types';
	import ChangesActionsBar from './components/ChangesActionsBar.svelte';
	import StatusCard from './components/StatusCard.svelte';
	import { Check } from 'lucide-svelte';
	import { invalidateAll } from '$app/navigation';
	import { alertStore } from '$alerts/store';
	import type { PageData } from './$types';
	import type { OperationFile } from '$utils/git/types';

	export let data: PageData;

	let selected = new Set<string>();
	let commitMessage = '';

	$: allSelected = data.uncommittedOps.length > 0 && selected.size === data.uncommittedOps.length;

	function toggleAll() {
		if (allSelected) {
			selected = new Set();
		} else {
			selected = new Set(data.uncommittedOps.map((op) => op.filepath));
		}
	}

	function toggleRow(filepath: string) {
		const newSelected = new Set(selected);
		if (newSelected.has(filepath)) {
			newSelected.delete(filepath);
		} else {
			newSelected.add(filepath);
		}
		selected = newSelected;
	}

	async function handleDiscard() {
		const formData = new FormData();
		for (const filepath of selected) {
			formData.append('files', filepath);
		}

		const response = await fetch('?/discard', {
			method: 'POST',
			body: formData
		});

		const result = await response.json();

		if (result.type === 'success' && result.data?.success) {
			selected = new Set();
			alertStore.add('success', 'Changes discarded');
			await invalidateAll();
		} else {
			alertStore.add('error', result.data?.error || 'Failed to discard changes');
		}
	}

	async function handleAdd() {
		const formData = new FormData();
		for (const filepath of selected) {
			formData.append('files', filepath);
		}
		formData.append('message', commitMessage);

		const response = await fetch('?/add', {
			method: 'POST',
			body: formData
		});

		const result = await response.json();

		if (result.type === 'success' && result.data?.success) {
			commitMessage = '';
			alertStore.add('success', 'Changes committed and pushed');
		} else {
			alertStore.add('error', result.data?.error || 'Failed to add changes');
		}

		// Always refresh to keep UI in sync with file system
		selected = new Set();
		await invalidateAll();
	}

	function formatOperation(op: string | null): string {
		if (!op) return '-';
		return op.charAt(0).toUpperCase() + op.slice(1);
	}

	function getOperationClass(op: string | null): string {
		switch (op) {
			case 'create':
				return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
			case 'update':
				return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
			case 'delete':
				return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
			default:
				return 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200';
		}
	}

	const columns: Column<OperationFile>[] = [
		{
			key: 'operation',
			header: 'Operation',
			width: 'w-28',
			sortable: true,
			cell: (row: OperationFile) => {
				const op = formatOperation(row.operation);
				return {
					html: `<span class="inline-flex px-2 py-0.5 rounded text-xs font-mono ${getOperationClass(row.operation)}">${op}</span>`
				};
			}
		},
		{
			key: 'entity',
			header: 'Entity',
			width: 'w-36',
			sortable: true,
			cell: (row: OperationFile) => row.entity || '-'
		},
		{
			key: 'name',
			header: 'Name',
			sortable: true,
			cell: (row: OperationFile) => ({
				html:
					row.previousName && row.previousName !== row.name
						? `<div><span class="line-through text-neutral-400">${row.previousName}</span> → ${row.name || '-'}</div>`
						: row.name || '-'
			})
		},
		{
			key: 'filename',
			header: 'File',
			width: 'w-48',
			cell: (row: OperationFile) => ({
				html: `<span class="font-mono text-xs text-neutral-500 dark:text-neutral-400">${row.filename}</span>`
			})
		}
	];
</script>

<svelte:head>
	<title>Changes - {data.database.name} - Profilarr</title>
</svelte:head>

<div class="space-y-6">
	<StatusCard
		status={data.status}
		repoInfo={data.repoInfo}
		branches={data.branches}
	/>

	<!-- Actions Bar -->
	<ChangesActionsBar
		selectedCount={selected.size}
		bind:commitMessage
		onDiscard={handleDiscard}
		onAdd={handleAdd}
	/>

	<!-- Table -->
	{#if data.uncommittedOps.length === 0}
		<div
			class="rounded-lg border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900"
		>
			<p class="text-neutral-600 dark:text-neutral-400">No uncommitted changes</p>
		</div>
	{:else}
		<div class="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
			<table class="w-full">
				<thead
					class="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-800"
				>
					<tr>
						<th class="w-12 px-4 py-3 text-center">
							<button type="button" on:click={toggleAll} class="inline-flex">
								<div
									class="flex h-5 w-5 items-center justify-center rounded border-2 transition-all {allSelected
										? 'border-blue-600 bg-blue-600 dark:border-blue-500 dark:bg-blue-500'
										: 'border-neutral-300 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800'}"
								>
									{#if allSelected}
										<Check size={14} class="text-white" />
									{/if}
								</div>
							</button>
						</th>
						<th
							class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-700 dark:text-neutral-300"
						>
							Operation
						</th>
						<th
							class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-700 dark:text-neutral-300"
						>
							Entity
						</th>
						<th
							class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-700 dark:text-neutral-300"
						>
							Name
						</th>
						<th
							class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-700 dark:text-neutral-300"
						>
							File
						</th>
					</tr>
				</thead>
				<tbody
					class="divide-y divide-neutral-200 bg-white dark:divide-neutral-800 dark:bg-neutral-900"
				>
					{#each data.uncommittedOps as op}
						<tr
							class="cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
							on:click={() => toggleRow(op.filepath)}
						>
							<td class="px-4 py-3 text-center">
								<div
									class="mx-auto flex h-5 w-5 items-center justify-center rounded border-2 transition-all {selected.has(op.filepath)
										? 'border-blue-600 bg-blue-600 dark:border-blue-500 dark:bg-blue-500'
										: 'border-neutral-300 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800'}"
								>
									{#if selected.has(op.filepath)}
										<Check size={14} class="text-white" />
									{/if}
								</div>
							</td>
							<td class="px-4 py-3">
								<span
									class="inline-flex rounded px-2 py-0.5 font-mono text-xs {getOperationClass(
										op.operation
									)}"
								>
									{formatOperation(op.operation)}
								</span>
							</td>
							<td class="px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100">
								{op.entity || '-'}
							</td>
							<td class="px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100">
								{#if op.previousName && op.previousName !== op.name}
									<span class="text-neutral-400 line-through">{op.previousName}</span>
									→
									{op.name || '-'}
								{:else}
									{op.name || '-'}
								{/if}
							</td>
							<td class="px-4 py-3">
								<span class="font-mono text-xs text-neutral-500 dark:text-neutral-400">
									{op.filename}
								</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
