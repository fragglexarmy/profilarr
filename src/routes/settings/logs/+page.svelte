<script lang="ts">
	import { Search, Download, RefreshCw, Eye, Copy } from 'lucide-svelte';
	import { toastStore } from '$stores/toast';
	import Modal from '$components/modal/Modal.svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	interface LogEntry {
		timestamp: string;
		level: string;
		message: string;
		source?: string;
		meta?: unknown;
	}

	// Filter state
	let selectedLevel: 'ALL' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' = 'ALL';
	let searchQuery = '';

	// Available log levels for filtering
	const logLevels = ['ALL', 'DEBUG', 'INFO', 'WARN', 'ERROR'] as const;

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

	// Refresh page to reload logs
	function refreshLogs() {
		window.location.reload();
	}

	// Change log file
	function changeLogFile(filename: string) {
		const url = new URL(window.location.href);
		url.searchParams.set('file', filename);
		window.location.href = url.toString();
	}

	// Format file size
	function formatFileSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	// Copy log entry to clipboard
	async function copyLog(log: LogEntry) {
		const logText = `[${log.timestamp}] ${log.level} - ${log.message}${log.source ? ` [${log.source}]` : ''}${log.meta ? `\nMeta: ${JSON.stringify(log.meta, null, 2)}` : ''}`;

		try {
			await navigator.clipboard.writeText(logText);
			toastStore.add('success', 'Log entry copied to clipboard');
		} catch (err) {
			toastStore.add('error', 'Failed to copy to clipboard');
		}
	}

	// Reactive filtering - use data.logs directly
	$: filteredLogs = data.logs.filter((log) => {
		// Level filter
		if (selectedLevel !== 'ALL' && log.level !== selectedLevel) {
			return false;
		}

		// Search filter
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			const matchMessage = log.message.toLowerCase().includes(query);
			const matchSource = log.source?.toLowerCase().includes(query);
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

	<!-- Controls -->
	<div class="mb-6 flex flex-wrap items-center gap-4">
		<!-- Log File Selector -->
		<div class="flex items-center gap-2">
			<label
				for="log-file-select"
				class="text-sm font-medium text-neutral-700 dark:text-neutral-300"
			>
				Log File:
			</label>
			<select
				id="log-file-select"
				value={data.selectedFile}
				on:change={(e) => changeLogFile(e.currentTarget.value)}
				class="min-w-64 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
			>
				{#each data.logFiles as file (file.filename)}
					<option value={file.filename}>
						{file.filename} ({formatFileSize(file.size)})
					</option>
				{/each}
			</select>
		</div>

		<!-- Level Filter Buttons -->
		<div class="flex gap-2">
			{#each logLevels as level (level)}
				<button
					type="button"
					on:click={() => (selectedLevel = level)}
					class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors {selectedLevel ===
					level
						? 'bg-blue-600 text-white dark:bg-blue-500'
						: 'border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800'}"
				>
					{level}
				</button>
			{/each}
		</div>

		<!-- Search Input -->
		<div class="flex flex-1 items-center gap-2">
			<div class="relative max-w-md flex-1">
				<Search size={18} class="absolute top-1/2 left-3 -translate-y-1/2 text-neutral-400" />
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Search logs..."
					class="w-full rounded-lg border border-neutral-300 bg-white py-1.5 pr-3 pl-10 text-sm text-neutral-900 placeholder-neutral-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50 dark:placeholder-neutral-500"
				/>
			</div>
		</div>

		<!-- Action Buttons -->
		<div class="flex gap-2">
			<button
				type="button"
				on:click={refreshLogs}
				class="flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
			>
				<RefreshCw size={16} />
				Refresh
			</button>

			<button
				type="button"
				on:click={downloadLogs}
				class="flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
			>
				<Download size={16} />
				Download
			</button>
		</div>
	</div>

	<!-- Stats -->
	<div class="mb-4 text-sm text-neutral-600 dark:text-neutral-400">
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
