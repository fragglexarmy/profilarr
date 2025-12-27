<script lang="ts">
	import { Film, ExternalLink, RefreshCw, HardDrive, CheckCircle, ArrowUpCircle, Pencil, Trash2 } from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import type { RadarrLibraryItem } from '$utils/arr/types.ts';

	export let instance: { id: number; name: string; type: string; url: string };
	export let library: RadarrLibraryItem[];
	export let allMoviesWithFiles: RadarrLibraryItem[];
	export let refreshing = false;
	export let loading = false;
	export let onRefresh: () => void;

	$: baseUrl = instance.url.replace(/\/$/, '');
</script>

<div class="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
	<div class="flex flex-col gap-2">
		<div class="flex items-center gap-3">
			<h2 class="text-lg font-semibold text-neutral-900 dark:text-neutral-50">{instance.name}</h2>
			<span class="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 capitalize">
				{instance.type}
			</span>
			<div class="hidden sm:flex items-center gap-2">
				{#if loading}
					<span class="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs dark:bg-neutral-800">
						<Film size={12} class="text-blue-500" />
						<span class="h-3 w-12 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse"></span>
					</span>
					<span class="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs dark:bg-neutral-800">
						<HardDrive size={12} class="text-purple-500" />
						<span class="h-3 w-14 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse"></span>
					</span>
					<span class="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs dark:bg-neutral-800">
						<CheckCircle size={12} class="text-green-500" />
						<span class="h-3 w-16 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse"></span>
					</span>
					<span class="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs dark:bg-neutral-800">
						<ArrowUpCircle size={12} class="text-orange-500" />
						<span class="h-3 w-16 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse"></span>
					</span>
				{:else}
					<span class="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300" title="Total movies in library">
						<Film size={12} class="text-blue-500" />
						{library.length} Total
					</span>
					<span class="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300" title="Movies with files on disk">
						<HardDrive size={12} class="text-purple-500" />
						{allMoviesWithFiles.length} On Disk
					</span>
					<span class="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300" title="Movies that have met the quality cutoff">
						<CheckCircle size={12} class="text-green-500" />
						{allMoviesWithFiles.filter((m) => m.cutoffMet).length} Cutoff Met
					</span>
					<span class="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300" title="Movies that can still be upgraded">
						<ArrowUpCircle size={12} class="text-orange-500" />
						{allMoviesWithFiles.filter((m) => !m.cutoffMet).length} Upgradeable
					</span>
				{/if}
			</div>
		</div>
		<code class="text-xs font-mono text-neutral-500 dark:text-neutral-400">{instance.url}</code>
	</div>
	<div class="flex items-center gap-2">
		<button
			type="button"
			disabled={refreshing}
			on:click={onRefresh}
			class="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
		>
			<RefreshCw size={14} class={refreshing ? 'animate-spin' : ''} />
			Refresh
		</button>
		<a
			href={baseUrl}
			target="_blank"
			rel="noopener noreferrer"
			class="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
		>
			Open Radarr
			<ExternalLink size={14} />
		</a>
		<a
			href="/arr/{instance.id}/edit"
			class="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
			title="Edit instance"
		>
			<Pencil size={14} />
		</a>
		<form
			method="POST"
			action="?/delete"
			use:enhance={({ cancel }) => {
				if (!confirm('Are you sure you want to delete this instance?')) {
					cancel();
					return;
				}
				return ({ update }) => update();
			}}
		>
			<button
				type="submit"
				class="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-red-200 bg-red-50 text-red-600 transition-colors hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
				title="Delete instance"
			>
				<Trash2 size={14} />
			</button>
		</form>
	</div>
</div>
