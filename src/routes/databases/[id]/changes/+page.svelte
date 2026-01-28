<script lang="ts">
	import ChangesActionsBar from './components/ChangesActionsBar.svelte';
	import StatusCard from './components/StatusCard.svelte';
	import ExpandableTable from '$ui/table/ExpandableTable.svelte';
	import { Check, ArrowDown, ExternalLink, FileText } from 'lucide-svelte';
	import IconCheckbox from '$ui/form/IconCheckbox.svelte';
	import { afterNavigate } from '$app/navigation';
	import { alertStore } from '$alerts/store';
	import type { PageData } from './$types';
	import type {
		OperationFile,
		GitStatus,
		RepoInfo,
		IncomingChanges,
		Commit
	} from '$utils/git/types';
	import type { Column } from '$ui/table/types';

	export let data: PageData;

	let loading = true;
	let pulling = false;
	let adding = false;
	let discarding = false;
	let status: GitStatus | null = null;
	let incomingChanges: IncomingChanges | null = null;
	let uncommittedOps: OperationFile[] = [];
	let branches: string[] = [];
	let repoInfo: RepoInfo | null = null;
	let aiEnabled = false;

	let selected = new Set<string>();
	let commitMessage = '';

	$: isDeveloper = data.isDeveloper;
	$: hasIncomingChanges = incomingChanges?.hasUpdates ?? false;
	$: allSelected = uncommittedOps.length > 0 && selected.size === uncommittedOps.length;
	$: selectedFiles = Array.from(selected);

	async function fetchChanges() {
		loading = true;
		try {
			const response = await fetch(`/api/databases/${data.database.id}/changes`);
			if (response.ok) {
				const result = await response.json();
				status = result.status;
				incomingChanges = result.incomingChanges;
				uncommittedOps = result.uncommittedOps || [];
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

	async function handlePull() {
		pulling = true;
		try {
			const response = await fetch('?/pull', {
				method: 'POST',
				body: new FormData(),
				headers: { Accept: 'application/json' }
			});

			const result = await response.json();
			const isSuccess =
				result.type === 'success' || result.type === 'redirect' || result.data?.success;
			const errorMsg = result.data?.error || result.error;

			if (isSuccess && !errorMsg) {
				const commits = result.data?.commitsBehind || incomingChanges?.commitsBehind || 0;
				alertStore.add('success', `Pulled ${commits} commit${commits === 1 ? '' : 's'}`);
			} else {
				alertStore.add('error', errorMsg || 'Failed to pull changes');
			}

			await fetchChanges();
		} finally {
			pulling = false;
		}
	}

	async function handleDiscard() {
		discarding = true;
		try {
			const formData = new FormData();
			for (const filepath of selected) {
				formData.append('files', filepath);
			}

			const response = await fetch('?/discard', {
				method: 'POST',
				body: formData,
				headers: { Accept: 'application/json' }
			});

			const result = await response.json();
			const isSuccess =
				result.type === 'success' || result.type === 'redirect' || result.data?.success;
			const errorMsg = result.data?.error || result.error;

			if (isSuccess && !errorMsg) {
				alertStore.add('success', 'Changes discarded');
			} else {
				alertStore.add('error', errorMsg || 'Failed to discard changes');
			}

			selected = new Set();
			await fetchChanges();
		} finally {
			discarding = false;
		}
	}

	async function handleAdd() {
		adding = true;
		try {
			const formData = new FormData();
			for (const filepath of selected) {
				formData.append('files', filepath);
			}
			formData.append('message', commitMessage);

			const response = await fetch('?/add', {
				method: 'POST',
				body: formData,
				headers: { Accept: 'application/json' }
			});

			const result = await response.json();
			const isSuccess =
				result.type === 'success' || result.type === 'redirect' || result.data?.success;
			const errorMsg = result.data?.error || result.error;

			if (isSuccess && !errorMsg) {
				alertStore.add('success', 'Changes committed and pushed');
			} else {
				alertStore.add('error', errorMsg || 'Failed to add changes');
			}

			commitMessage = '';
			selected = new Set();
			await fetchChanges();
		} finally {
			adding = false;
		}
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

	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

		if (diffDays === 0) {
			const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
			if (diffHours === 0) {
				const diffMins = Math.floor(diffMs / (1000 * 60));
				return `${diffMins}m ago`;
			}
			return `${diffHours}h ago`;
		}
		if (diffDays === 1) return 'Yesterday';
		if (diffDays < 7) return `${diffDays}d ago`;

		return date.toLocaleDateString();
	}

	function getCommitUrl(hash: string): string {
		return `${data.database.repository_url}/commit/${hash}`;
	}

	const incomingColumns: Column<Commit>[] = [
		{ key: 'shortHash', header: 'Commit', width: 'w-24' },
		{ key: 'message', header: 'Message' },
		{ key: 'author', header: 'Author', width: 'w-40' },
		{ key: 'date', header: 'Date', width: 'w-28', align: 'right' }
	];
</script>

<svelte:head>
	<title>Changes - {data.database.name} - Profilarr</title>
</svelte:head>

<div class="space-y-6">
	<!-- Status Card -->
	{#if loading || !status}
		<div
			class="mt-6 animate-pulse rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800"
		>
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
		<StatusCard {status} {repoInfo} {branches} database={data.database} onSync={fetchChanges} />
	{/if}

	<!-- Incoming Changes Section -->
	<section>
		<div class="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<h2
				class="flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-neutral-100"
			>
				<ArrowDown size={20} />
				Incoming Changes
			</h2>
			{#if incomingChanges?.hasUpdates}
				<button
					type="button"
					on:click={handlePull}
					disabled={pulling}
					class="inline-flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
				>
					{#if pulling}
						<div
							class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
						></div>
						Pulling...
					{:else}
						Pull {incomingChanges.commitsBehind} commit{incomingChanges.commitsBehind === 1
							? ''
							: 's'}
					{/if}
				</button>
			{/if}
		</div>

		{#if loading}
			<div class="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
				<div class="animate-pulse p-8">
					<div class="h-4 w-48 rounded bg-neutral-200 dark:bg-neutral-700"></div>
				</div>
			</div>
		{:else if !incomingChanges?.hasUpdates}
			<div
				class="rounded-lg border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900"
			>
				<p class="text-neutral-600 dark:text-neutral-400">
					{#if data.database.auto_pull}
						Up to date — updates are pulled automatically
					{:else}
						Up to date
					{/if}
				</p>
			</div>
		{:else}
			<ExpandableTable
				columns={incomingColumns}
				data={incomingChanges.commits}
				getRowId={(row) => row.hash}
				emptyMessage="No incoming changes"
				responsive
			>
				<svelte:fragment slot="cell" let:row let:column>
					{#if column.key === 'shortHash'}
						<a
							href={getCommitUrl(row.hash)}
							target="_blank"
							rel="noopener noreferrer"
							on:click|stopPropagation
							class="inline-flex items-center gap-1.5 font-mono text-xs text-accent-600 hover:underline dark:text-accent-400"
						>
							{row.shortHash}
							<ExternalLink size={12} />
						</a>
					{:else if column.key === 'message'}
						<span class="line-clamp-1 text-sm text-neutral-900 dark:text-neutral-100">
							{row.message}
						</span>
					{:else if column.key === 'author'}
						<span class="text-sm text-neutral-600 dark:text-neutral-400">
							{row.author}
						</span>
					{:else if column.key === 'date'}
						<span class="font-mono text-xs text-neutral-500 dark:text-neutral-400">
							{formatDate(row.date)}
						</span>
					{/if}
				</svelte:fragment>

				<svelte:fragment slot="expanded" let:row>
					<div class="space-y-2">
						<div class="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
							<FileText size={14} />
							<span>{row.files.length} file{row.files.length !== 1 ? 's' : ''} changed</span>
						</div>
						{#if row.files.length > 0}
							<div class="grid gap-1">
								{#each row.files as file}
									<code
										class="block rounded bg-neutral-100 px-2 py-1 font-mono text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
									>
										{file}
									</code>
								{/each}
							</div>
						{/if}
					</div>
				</svelte:fragment>
			</ExpandableTable>
		{/if}
	</section>

	<!-- Outgoing Changes Section (Developers Only) -->
	{#if isDeveloper}
		<section>
			<h2
				class="mb-3 flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-neutral-100"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"
					></polyline></svg
				>
				Outgoing Changes
			</h2>

			<!-- Actions Bar -->
			{#if loading}
				<div
					class="mb-4 animate-pulse rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800"
				>
					<div class="flex items-center gap-4">
						<div class="h-9 w-48 rounded-md bg-neutral-200 dark:bg-neutral-700"></div>
						<div class="h-9 w-24 rounded-md bg-neutral-200 dark:bg-neutral-700"></div>
						<div class="h-9 w-24 rounded-md bg-neutral-200 dark:bg-neutral-700"></div>
					</div>
				</div>
			{:else}
				<div class="mb-4">
					<ChangesActionsBar
						databaseId={data.database.id}
						selectedCount={selected.size}
						{selectedFiles}
						bind:commitMessage
						{aiEnabled}
						{hasIncomingChanges}
						{adding}
						{discarding}
						onDiscard={handleDiscard}
						onAdd={handleAdd}
					/>
				</div>
			{/if}

			<!-- Outgoing Table -->
			{#if loading}
				<div class="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
					<table class="w-full">
						<thead
							class="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-800"
						>
							<tr>
								<th class="w-12 px-4 py-3"></th>
								<th
									class="px-4 py-3 text-left text-xs font-medium tracking-wider text-neutral-700 uppercase dark:text-neutral-300"
									>Operation</th
								>
								<th
									class="px-4 py-3 text-left text-xs font-medium tracking-wider text-neutral-700 uppercase dark:text-neutral-300"
									>Entity</th
								>
								<th
									class="px-4 py-3 text-left text-xs font-medium tracking-wider text-neutral-700 uppercase dark:text-neutral-300"
									>Name</th
								>
								<th
									class="px-4 py-3 text-left text-xs font-medium tracking-wider text-neutral-700 uppercase dark:text-neutral-300"
									>File</th
								>
							</tr>
						</thead>
						<tbody
							class="divide-y divide-neutral-200 bg-white dark:divide-neutral-800 dark:bg-neutral-900"
						>
							{#each Array(5) as _}
								<tr class="animate-pulse">
									<td class="px-4 py-3 text-center">
										<div
											class="mx-auto h-5 w-5 rounded border-2 border-neutral-300 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800"
										></div>
									</td>
									<td class="px-4 py-3"
										><div class="h-5 w-16 rounded bg-neutral-200 dark:bg-neutral-700"></div></td
									>
									<td class="px-4 py-3"
										><div class="h-4 w-20 rounded bg-neutral-200 dark:bg-neutral-700"></div></td
									>
									<td class="px-4 py-3"
										><div class="h-4 w-32 rounded bg-neutral-200 dark:bg-neutral-700"></div></td
									>
									<td class="px-4 py-3"
										><div class="h-4 w-28 rounded bg-neutral-200 dark:bg-neutral-700"></div></td
									>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else if uncommittedOps.length === 0}
				<div
					class="rounded-lg border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900"
				>
					<p class="text-neutral-600 dark:text-neutral-400">No uncommitted changes</p>
				</div>
			{:else}
				<!-- Mobile: Card view -->
				<div class="space-y-2 md:hidden">
					<!-- Select all header -->
					<button
						type="button"
						on:click={toggleAll}
						class="flex w-full items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-800"
					>
						<IconCheckbox checked={allSelected} icon={Check} color="blue" />
						<span class="text-sm font-medium text-neutral-700 dark:text-neutral-300">
							Select all ({uncommittedOps.length})
						</span>
					</button>

					<!-- Cards -->
					{#each uncommittedOps as op}
						<button
							type="button"
							on:click={() => toggleRow(op.filepath)}
							class="w-full rounded-lg border border-neutral-200 bg-white p-4 text-left transition-colors dark:border-neutral-800 dark:bg-neutral-900"
						>
							<div class="flex items-start gap-3">
								<div class="mt-0.5 shrink-0">
									<IconCheckbox checked={selected.has(op.filepath)} icon={Check} color="blue" />
								</div>
								<div class="min-w-0 flex-1">
									<div class="flex items-center gap-2">
										<span
											class="inline-flex rounded px-2 py-0.5 font-mono text-xs {getOperationClass(op.operation)}"
										>
											{formatOperation(op.operation)}
										</span>
										<span class="text-xs text-neutral-500 dark:text-neutral-400">
											{op.entity || '-'}
										</span>
									</div>
									<div class="mt-1 text-sm font-medium text-neutral-900 dark:text-neutral-100">
										{#if op.previousName && op.previousName !== op.name}
											<span class="text-neutral-400 line-through">{op.previousName}</span>
											→
											{op.name || '-'}
										{:else}
											{op.name || '-'}
										{/if}
									</div>
									<div class="mt-1 truncate font-mono text-xs text-neutral-500 dark:text-neutral-400">
										{op.filename}
									</div>
								</div>
							</div>
						</button>
					{/each}
				</div>

				<!-- Desktop: Table view -->
				<div class="hidden overflow-x-auto rounded-lg border border-neutral-200 md:block dark:border-neutral-800">
					<table class="w-full">
						<thead
							class="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-800"
						>
							<tr>
								<th class="w-12 px-4 py-3 text-center">
									<IconCheckbox checked={allSelected} icon={Check} color="blue" on:click={toggleAll} />
								</th>
								<th
									class="px-4 py-3 text-left text-xs font-medium tracking-wider text-neutral-700 uppercase dark:text-neutral-300"
								>
									Operation
								</th>
								<th
									class="px-4 py-3 text-left text-xs font-medium tracking-wider text-neutral-700 uppercase dark:text-neutral-300"
								>
									Entity
								</th>
								<th
									class="px-4 py-3 text-left text-xs font-medium tracking-wider text-neutral-700 uppercase dark:text-neutral-300"
								>
									Name
								</th>
								<th
									class="px-4 py-3 text-left text-xs font-medium tracking-wider text-neutral-700 uppercase dark:text-neutral-300"
								>
									File
								</th>
							</tr>
						</thead>
						<tbody
							class="divide-y divide-neutral-200 bg-white dark:divide-neutral-800 dark:bg-neutral-900"
						>
							{#each uncommittedOps as op}
								<tr
									class="cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
									on:click={() => toggleRow(op.filepath)}
								>
									<td class="px-4 py-3 text-center">
										<IconCheckbox checked={selected.has(op.filepath)} icon={Check} color="blue" />
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
		</section>
	{/if}
</div>
