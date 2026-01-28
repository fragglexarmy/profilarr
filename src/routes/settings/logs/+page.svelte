<script lang="ts">
	import { Eye, Copy, ChevronLeft, ChevronRight } from 'lucide-svelte';
	import { alertStore } from '$alerts/store';
	import Modal from '$ui/modal/Modal.svelte';
	import JsonView from '$ui/meta/JsonView.svelte';
	import Table from '$ui/table/Table.svelte';
	import TableActionButton from '$ui/table/TableActionButton.svelte';
	import NumberInput from '$ui/form/NumberInput.svelte';
	import type { Column } from '$ui/table/types';
	import LogsActionsBar from './components/LogsActionsBar.svelte';
	import { createSearchStore } from '$lib/client/stores/search';
	import { invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';

	export let data: PageData;

	interface LogEntry {
		timestamp: string;
		level: string;
		message: string;
		source?: string;
		meta?: unknown;
	}

	// Initialize search store
	const searchStore = createSearchStore({ debounceMs: 300 });

	// Filter state
	let selectedLevel: 'ALL' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' = 'ALL';
	let selectedSources: Set<string> = new Set();
	let isRefreshing = false;

	// Pagination state
	let currentPage = 1;
	let itemsPerPage = 100;

	// Extract unique sources from logs (excluding 'ALL' since empty set means all)
	$: uniqueSources = [...new Set(data.logs.map((log) => log.source).filter(Boolean))] as string[];

	function toggleSource(source: string) {
		selectedSources = new Set(selectedSources);
		if (selectedSources.has(source)) {
			selectedSources.delete(source);
		} else {
			selectedSources.add(source);
		}
	}

	// Level colors
	const levelColors: Record<string, string> = {
		DEBUG: 'text-cyan-600 dark:text-cyan-400',
		INFO: 'text-green-600 dark:text-green-400',
		WARN: 'text-yellow-600 dark:text-yellow-400',
		ERROR: 'text-red-600 dark:text-red-400'
	};

	// Table columns
	const columns: Column<LogEntry>[] = [
		{
			key: 'timestamp',
			header: 'Timestamp',
			sortable: true,
			sortAccessor: (row) => new Date(row.timestamp).getTime(),
			cell: (row) => ({
				html: `<span class="font-mono text-xs text-neutral-600 dark:text-neutral-400">${new Date(row.timestamp).toLocaleString()}</span>`
			})
		},
		{
			key: 'level',
			header: 'Level',
			sortable: true,
			cell: (row) => ({
				html: `<span class="font-semibold ${levelColors[row.level] || 'text-neutral-600 dark:text-neutral-400'}">${row.level}</span>`
			})
		},
		{
			key: 'source',
			header: 'Source',
			sortable: true,
			cell: (row) => row.source || '-'
		},
		{
			key: 'message',
			header: 'Message',
			cell: (row) => row.message
		}
	];

	// Meta modal state
	let showMetaModal = false;
	let selectedMeta: unknown = null;

	function viewMeta(meta: unknown) {
		selectedMeta = meta;
		showMetaModal = true;
	}

	function closeMetaModal() {
		showMetaModal = false;
		selectedMeta = null;
	}

	// Download logs as JSON
	function downloadLogs() {
		const dataStr = JSON.stringify(filteredLogs, null, 2);
		const dataBlob = new Blob([dataStr], { type: 'application/json' });
		const url = URL.createObjectURL(dataBlob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `profilarr-logs-${new Date().toISOString()}.json`;
		link.click();
		URL.revokeObjectURL(url);
	}

	// Refresh logs by refetching data
	async function refreshLogs() {
		isRefreshing = true;
		await invalidateAll();
		isRefreshing = false;
	}

	// Change log file
	function changeLogFile(filename: string) {
		const url = new URL(window.location.href);
		url.searchParams.set('file', filename);
		window.location.href = url.toString();
	}

	// Copy log entry to clipboard
	async function copyLog(log: LogEntry) {
		const logText = `[${log.timestamp}] ${log.level} - ${log.message}${log.source ? ` [${log.source}]` : ''}${log.meta ? `\nMeta: ${JSON.stringify(log.meta, null, 2)}` : ''}`;

		try {
			await navigator.clipboard.writeText(logText);
			alertStore.add('success', 'Log entry copied to clipboard');
		} catch {
			// Fallback for non-secure contexts (HTTP + non-localhost)
			const textArea = document.createElement('textarea');
			textArea.value = logText;
			textArea.style.position = 'fixed';
			textArea.style.left = '-9999px';
			document.body.appendChild(textArea);
			textArea.select();
			try {
				document.execCommand('copy');
				alertStore.add('success', 'Log entry copied to clipboard');
			} catch {
				alertStore.add('error', 'Failed to copy to clipboard');
			}
			document.body.removeChild(textArea);
		}
	}

	// Reactive filtering
	$: filteredLogs = data.logs.filter((log) => {
		// Level filter
		if (selectedLevel !== 'ALL' && log.level !== selectedLevel) {
			return false;
		}

		// Source filter (empty set means show all)
		if (selectedSources.size > 0 && !selectedSources.has(log.source || '')) {
			return false;
		}

		// Search filter
		const query = $searchStore.query;
		if (query) {
			const searchLower = query.toLowerCase();
			const matchMessage = log.message.toLowerCase().includes(searchLower);
			const matchSource = log.source?.toLowerCase().includes(searchLower);
			return matchMessage || matchSource;
		}

		return true;
	});

	// Reset to page 1 when filters change
	$: if (selectedLevel || selectedSources || $searchStore.query) {
		currentPage = 1;
	}

	// Pagination computed values
	$: totalPages = Math.max(1, Math.ceil(filteredLogs.length / itemsPerPage));
	$: startIndex = (currentPage - 1) * itemsPerPage;
	$: endIndex = Math.min(startIndex + itemsPerPage, filteredLogs.length);
	$: paginatedLogs = filteredLogs.slice(startIndex, endIndex);

	// Ensure currentPage stays within bounds when itemsPerPage changes
	$: if (currentPage > totalPages) {
		currentPage = totalPages;
	}

	function goToPreviousPage() {
		if (currentPage > 1) {
			currentPage--;
		}
	}

	function goToNextPage() {
		if (currentPage < totalPages) {
			currentPage++;
		}
	}
</script>

<div class="p-4 md:p-8">
	<!-- Header -->
	<div class="mb-8">
		<h1 class="text-2xl font-bold text-neutral-900 md:text-3xl dark:text-neutral-50">Logs</h1>
		<p class="mt-3 text-base text-neutral-600 md:text-lg dark:text-neutral-400">
			Application logs with filtering and search
		</p>
	</div>

	<!-- Actions Bar -->
	<LogsActionsBar
		{searchStore}
		logFiles={data.logFiles}
		selectedFile={data.selectedFile}
		{selectedLevel}
		{selectedSources}
		{uniqueSources}
		{isRefreshing}
		onChangeFile={changeLogFile}
		onChangeLevel={(level) => (selectedLevel = level)}
		onToggleSource={toggleSource}
		onRefresh={refreshLogs}
		onDownload={downloadLogs}
	/>

	<!-- Stats -->
	<div
		class="mt-6 mb-4 flex items-center justify-between text-sm text-neutral-600 dark:text-neutral-400"
	>
		<span>
			Showing {startIndex + 1}-{endIndex} of {filteredLogs.length} logs
			{#if filteredLogs.length !== data.logs.length}
				(filtered from {data.logs.length})
			{/if}
		</span>

		<!-- Pagination -->
		{#if totalPages > 1}
			<div class="flex items-center gap-2">
				<button
					type="button"
					disabled={currentPage <= 1}
					on:click={goToPreviousPage}
					class="rounded p-1 transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-neutral-700"
				>
					<ChevronLeft size={20} />
				</button>
				<span class="text-sm">
					Page {currentPage} of {totalPages}
				</span>
				<button
					type="button"
					disabled={currentPage >= totalPages}
					on:click={goToNextPage}
					class="rounded p-1 transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-neutral-700"
				>
					<ChevronRight size={20} />
				</button>
			</div>
		{/if}
	</div>

	<!-- Log Table -->
	<Table
		data={paginatedLogs}
		{columns}
		emptyMessage="No logs found"
		hoverable={true}
		compact={true}
		responsive
		initialSort={{ key: 'timestamp', direction: 'desc' }}
	>
		<svelte:fragment slot="actions" let:row>
			<div class="flex items-center justify-end gap-1">
				<TableActionButton icon={Copy} title="Copy log entry" on:click={() => copyLog(row)} />
				{#if row.meta}
					<TableActionButton icon={Eye} title="View metadata" on:click={() => viewMeta(row.meta)} />
				{/if}
			</div>
		</svelte:fragment>
	</Table>

	<!-- Bottom Pagination -->
	{#if totalPages > 1}
		<div class="mt-4 flex items-center justify-center gap-2">
			<button
				type="button"
				disabled={currentPage <= 1}
				on:click={goToPreviousPage}
				class="rounded px-3 py-1.5 text-sm transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-neutral-700"
			>
				Previous
			</button>
			<span class="text-sm text-neutral-600 dark:text-neutral-400">
				Page {currentPage} of {totalPages}
			</span>
			<button
				type="button"
				disabled={currentPage >= totalPages}
				on:click={goToNextPage}
				class="rounded px-3 py-1.5 text-sm transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-neutral-700"
			>
				Next
			</button>
		</div>
	{/if}
</div>

<!-- Meta Modal -->
<Modal
	open={showMetaModal}
	header="Log Metadata"
	bodyMessage=""
	confirmText="Close"
	cancelText="Close"
	size="2xl"
	on:confirm={closeMetaModal}
	on:cancel={closeMetaModal}
>
	<div
		slot="body"
		class="max-h-[70vh] overflow-auto rounded-lg bg-neutral-50 p-4 font-mono text-sm dark:bg-neutral-800"
	>
		<JsonView data={selectedMeta} />
	</div>
</Modal>
