<script lang="ts">
	import { Eye, Copy } from 'lucide-svelte';
	import { alertStore } from '$alerts/store';
	import Modal from '$ui/modal/Modal.svelte';
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
		} catch (err) {
			alertStore.add('error', 'Failed to copy to clipboard');
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
</script>

<div class="p-8">
	<!-- Header -->
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-neutral-900 dark:text-neutral-50">Logs</h1>
		<p class="mt-3 text-lg text-neutral-600 dark:text-neutral-400">
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
	<div class="mt-6 mb-4 text-sm text-neutral-600 dark:text-neutral-400">
		Showing {filteredLogs.length} of {data.logs.length} logs
		{#if data.selectedFile}
			from {data.selectedFile}
		{/if}
	</div>

	<!-- Log Container -->
	<div
		class="overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900"
	>
		<table class="w-full text-sm">
			<thead class="bg-neutral-50 dark:bg-neutral-800">
				<tr>
					<th
						class="border-b border-neutral-200 px-4 py-3 text-left font-semibold text-neutral-900 dark:border-neutral-700 dark:text-neutral-50"
					>
						Timestamp
					</th>
					<th
						class="border-b border-neutral-200 px-4 py-3 text-left font-semibold text-neutral-900 dark:border-neutral-700 dark:text-neutral-50"
					>
						Level
					</th>
					<th
						class="border-b border-neutral-200 px-4 py-3 text-left font-semibold text-neutral-900 dark:border-neutral-700 dark:text-neutral-50"
					>
						Source
					</th>
					<th
						class="border-b border-neutral-200 px-4 py-3 text-left font-semibold text-neutral-900 dark:border-neutral-700 dark:text-neutral-50"
					>
						Message
					</th>
					<th
						class="border-b border-neutral-200 px-4 py-3 text-left font-semibold text-neutral-900 dark:border-neutral-700 dark:text-neutral-50"
					>
						Actions
					</th>
				</tr>
			</thead>
			<tbody class="[&_tr:last-child_td]:border-b-0">
				{#each filteredLogs as log, index (`${log.timestamp}-${log.level}-${log.source}-${log.message}-${index}`)}
					<tr class="hover:bg-neutral-50 dark:hover:bg-neutral-800">
						<td
							class="border-b border-neutral-200 px-4 py-2 font-mono text-xs text-neutral-600 dark:border-neutral-800 dark:text-neutral-400"
						>
							{new Date(log.timestamp).toLocaleString()}
						</td>
						<td
							class="border-b border-neutral-200 px-4 py-2 font-semibold dark:border-neutral-800 {levelColors[
								log.level
							] || 'text-neutral-600 dark:text-neutral-400'}"
						>
							{log.level}
						</td>
						<td
							class="border-b border-neutral-200 px-4 py-2 text-neutral-600 dark:border-neutral-800 dark:text-neutral-400"
						>
							{log.source || '-'}
						</td>
						<td
							class="border-b border-neutral-200 px-4 py-2 text-neutral-900 dark:border-neutral-800 dark:text-neutral-50"
						>
							{log.message}
						</td>
						<td class="border-b border-neutral-200 px-4 py-2 text-center dark:border-neutral-800">
							<div class="flex items-center justify-center gap-1">
								<button
									type="button"
									on:click={() => copyLog(log)}
									class="inline-flex h-7 w-7 items-center justify-center rounded border border-neutral-300 bg-white text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
									title="Copy log entry"
								>
									<Copy size={14} />
								</button>
								{#if log.meta}
									<button
										type="button"
										on:click={() => viewMeta(log.meta)}
										class="inline-flex h-7 w-7 items-center justify-center rounded border border-neutral-300 bg-white text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
										title="View metadata"
									>
										<Eye size={14} />
									</button>
								{/if}
							</div>
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan="5" class="px-4 py-8 text-center text-neutral-500 dark:text-neutral-400">
							No logs found
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

<!-- Meta Modal -->
<Modal
	open={showMetaModal}
	header="Log Metadata"
	bodyMessage=""
	confirmText="Close"
	cancelText="Close"
	on:confirm={closeMetaModal}
	on:cancel={closeMetaModal}
>
	<pre
		slot="body"
		class="max-h-[400px] overflow-auto rounded-lg bg-neutral-50 p-4 font-mono text-xs whitespace-pre-wrap text-neutral-900 dark:bg-neutral-800 dark:text-neutral-50">{JSON.stringify(
			selectedMeta,
			null,
			2
		)}</pre>
</Modal>
