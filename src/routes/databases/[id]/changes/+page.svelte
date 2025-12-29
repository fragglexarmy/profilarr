<script lang="ts">
	import ChangesActionsBar from './components/ChangesActionsBar.svelte';
	import StatusCard from './components/StatusCard.svelte';
	import { Check } from 'lucide-svelte';
	import { afterNavigate } from '$app/navigation';
	import { alertStore } from '$alerts/store';
	import type { PageData } from './$types';
	import type { OperationFile, GitStatus, RepoInfo } from '$utils/git/types';

	export let data: PageData;

	let loading = true;
	let status: GitStatus | null = null;
	let uncommittedOps: OperationFile[] = [];
	let branches: string[] = [];
	let repoInfo: RepoInfo | null = null;
	let aiEnabled = false;

	let selected = new Set<string>();
	let commitMessage = '';

	$: allSelected = uncommittedOps.length > 0 && selected.size === uncommittedOps.length;
	$: selectedFiles = Array.from(selected);

	async function fetchChanges() {
		loading = true;
		try {
			const response = await fetch(`/api/databases/${data.database.id}/changes`);
			if (response.ok) {
				const result = await response.json();
				status = result.status;
				uncommittedOps = result.uncommittedOps;
				branches = result.branches;
				repoInfo = result.repoInfo;
			}
		} finally {
			loading = false;
		}
	}

	async function checkAiStatus() {
		try {
			const response = await fetch('/api/ai/status');
			if (response.ok) {
				const result = await response.json();
				aiEnabled = result.enabled;
			}
		} catch {
			aiEnabled = false;
		}
	}

	afterNavigate(() => {
		fetchChanges();
		checkAiStatus();
	});

	function toggleAll() {
		if (allSelected) {
			selected = new Set();
		} else {
			selected = new Set(uncommittedOps.map((op) => op.filepath));
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
			body: formData,
			headers: { 'Accept': 'application/json' }
		});

		const result = await response.json();

		// SvelteKit form action response types: 'success', 'redirect', 'failure', 'error'
		// Redirect is also considered success for our purposes
		const isSuccess = result.type === 'success' || result.type === 'redirect' || result.data?.success;
		const errorMsg = result.data?.error || result.error;

		if (isSuccess && !errorMsg) {
			alertStore.add('success', 'Changes discarded');
		} else {
			alertStore.add('error', errorMsg || 'Failed to discard changes');
		}

		selected = new Set();
		await fetchChanges();
	}

	async function handleAdd() {
		const formData = new FormData();
		for (const filepath of selected) {
			formData.append('files', filepath);
		}
		formData.append('message', commitMessage);

		const response = await fetch('?/add', {
			method: 'POST',
			body: formData,
			headers: { 'Accept': 'application/json' }
		});

		const result = await response.json();

		// SvelteKit form action response types: 'success', 'redirect', 'failure', 'error'
		const isSuccess = result.type === 'success' || result.type === 'redirect' || result.data?.success;
		const errorMsg = result.data?.error || result.error;

		if (isSuccess && !errorMsg) {
			alertStore.add('success', 'Changes committed and pushed');
		} else {
			alertStore.add('error', errorMsg || 'Failed to add changes');
		}

		// Always clear and refresh
		commitMessage = '';

		// Always refresh to keep UI in sync with file system
		selected = new Set();
		await fetchChanges();
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
</script>

<svelte:head>
	<title>Changes - {data.database.name} - Profilarr</title>
</svelte:head>

<div class="space-y-6">
	<!-- Status Card -->
	{#if loading || !status}
		<div class="mt-6 animate-pulse rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-4">
					<div class="h-8 w-8 rounded-lg bg-neutral-200 dark:bg-neutral-700"></div>
					<div class="flex flex-col gap-2">
						<div class="h-4 w-32 rounded bg-neutral-200 dark:bg-neutral-700"></div>
						<div class="h-3 w-24 rounded bg-neutral-200 dark:bg-neutral-700"></div>
					</div>
				</div>
				<div class="flex items-center gap-4">
					<div class="h-8 w-24 rounded-md bg-neutral-200 dark:bg-neutral-700"></div>
				</div>
			</div>
		</div>
	{:else}
		<StatusCard {status} {repoInfo} {branches} database={data.database} />
	{/if}

	<!-- Actions Bar -->
	{#if loading}
		<div class="animate-pulse rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
			<div class="flex items-center gap-4">
				<div class="h-9 w-48 rounded-md bg-neutral-200 dark:bg-neutral-700"></div>
				<div class="h-9 w-24 rounded-md bg-neutral-200 dark:bg-neutral-700"></div>
				<div class="h-9 w-24 rounded-md bg-neutral-200 dark:bg-neutral-700"></div>
			</div>
		</div>
	{:else}
		<ChangesActionsBar
			databaseId={data.database.id}
			selectedCount={selected.size}
			{selectedFiles}
			bind:commitMessage
			{aiEnabled}
			onDiscard={handleDiscard}
			onAdd={handleAdd}
		/>
	{/if}

	<!-- Table -->
	{#if loading}
		<div class="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
			<table class="w-full">
				<thead class="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-800">
					<tr>
						<th class="w-12 px-4 py-3"></th>
						<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-700 dark:text-neutral-300">Operation</th>
						<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-700 dark:text-neutral-300">Entity</th>
						<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-700 dark:text-neutral-300">Name</th>
						<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-700 dark:text-neutral-300">File</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-neutral-200 bg-white dark:divide-neutral-800 dark:bg-neutral-900">
					{#each Array(5) as _}
						<tr class="animate-pulse">
							<td class="px-4 py-3 text-center">
								<div class="mx-auto h-5 w-5 rounded border-2 border-neutral-300 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800"></div>
							</td>
							<td class="px-4 py-3"><div class="h-5 w-16 rounded bg-neutral-200 dark:bg-neutral-700"></div></td>
							<td class="px-4 py-3"><div class="h-4 w-20 rounded bg-neutral-200 dark:bg-neutral-700"></div></td>
							<td class="px-4 py-3"><div class="h-4 w-32 rounded bg-neutral-200 dark:bg-neutral-700"></div></td>
							<td class="px-4 py-3"><div class="h-4 w-28 rounded bg-neutral-200 dark:bg-neutral-700"></div></td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{:else if uncommittedOps.length === 0}
		<div class="rounded-lg border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
			<p class="text-neutral-600 dark:text-neutral-400">No uncommitted changes</p>
		</div>
	{:else}
		<div class="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
			<table class="w-full">
				<thead class="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-800">
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
						<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
							Operation
						</th>
						<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
							Entity
						</th>
						<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
							Name
						</th>
						<th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
							File
						</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-neutral-200 bg-white dark:divide-neutral-800 dark:bg-neutral-900">
					{#each uncommittedOps as op}
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
								<span class="inline-flex rounded px-2 py-0.5 font-mono text-xs {getOperationClass(op.operation)}">
									{formatOperation(op.operation)}
								</span>
							</td>
							<td class="px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100">
								{op.entity || '-'}
							</td>
							<td class="px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100">
								{#if op.previousName && op.previousName !== op.name}
									<span class="text-neutral-400 line-through">{op.previousName}</span>
									&rarr;
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
