<script lang="ts">
	import { onMount } from 'svelte';
	import { ExternalLink, Check, X, AlertCircle } from 'lucide-svelte';
	import type { Regex101UnitTest } from '../../../api/regex101/[id]/+server';

	// Props
	export let pattern: string = '';
	export let regex101Id: string = '';

	// Internal state
	let unitTests: Regex101UnitTest[] = [];
	let loading = false;
	let error: string | null = null;
	let lastFetchedId: string | null = null;

	// Build regex101 URL
	$: regex101Url = regex101Id ? `https://regex101.com/r/${regex101Id}` : '';

	// Fetch unit tests when regex101Id changes
	$: if (regex101Id && regex101Id !== lastFetchedId) {
		fetchUnitTests(regex101Id);
	} else if (!regex101Id) {
		unitTests = [];
		error = null;
		lastFetchedId = null;
	}

	async function fetchUnitTests(id: string) {
		if (!id.trim()) {
			unitTests = [];
			error = null;
			return;
		}

		loading = true;
		error = null;

		try {
			const response = await fetch(`/api/regex101/${encodeURIComponent(id)}`);

			if (!response.ok) {
				const data = await response.json().catch(() => ({}));
				throw new Error(data.message || `Failed to fetch: ${response.statusText}`);
			}

			const data = await response.json();
			unitTests = data.unitTests || [];
			lastFetchedId = id;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to fetch unit tests';
			unitTests = [];
		} finally {
			loading = false;
		}
	}

	// Skeleton data for loading state
	const skeletonTests = Array.from({ length: 3 }, (_, i) => ({ id: i }));
</script>

<div class="space-y-4">
	<!-- Regex Pattern -->
	<div>
		<label for="pattern" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
			Regular Expression <span class="text-red-500">*</span>
		</label>
		<p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
			Uses .NET regex flavor (case-insensitive by default)
		</p>
		<textarea
			id="pattern"
			name="pattern"
			bind:value={pattern}
			rows="3"
			placeholder="e.g., \b(SPARKS)\b"
			class="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 font-mono text-sm text-neutral-900 placeholder-neutral-400 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
		></textarea>
	</div>

	<!-- Regex101 ID -->
	<div>
		<label for="regex101Id" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
			Regex101 ID
		</label>
		<p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
			Link to regex101.com for testing (include version, e.g., ABC123/1)
		</p>
		<div class="mt-1 flex gap-2">
			<input
				type="text"
				id="regex101Id"
				name="regex101Id"
				bind:value={regex101Id}
				placeholder="e.g., GMV8jd/1"
				class="block flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 font-mono text-sm text-neutral-900 placeholder-neutral-400 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
			/>
			{#if regex101Url}
				<a
					href={regex101Url}
					target="_blank"
					rel="noopener noreferrer"
					class="flex items-center gap-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-accent-600 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-accent-400 dark:hover:bg-neutral-700"
				>
					<ExternalLink size={14} />
					Test
				</a>
			{/if}
		</div>
	</div>

	<!-- Unit Tests Section -->
	{#if regex101Id}
		<div class="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/50">
			<h4 class="mb-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">
				Unit Tests
				{#if !loading && unitTests.length > 0}
					<span class="ml-1 text-xs font-normal text-neutral-500">({unitTests.length})</span>
				{/if}
			</h4>

			{#if loading}
				<!-- Skeleton Loading -->
				<div class="space-y-2">
					{#each skeletonTests as skeleton (skeleton.id)}
						<div class="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-900">
							<div class="h-5 w-5 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse"></div>
							<div class="flex-1 space-y-1.5">
								<div class="h-3 w-24 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse"></div>
								<div class="h-4 w-48 rounded bg-neutral-100 dark:bg-neutral-800 animate-pulse"></div>
							</div>
							<div class="h-5 w-16 rounded-full bg-neutral-200 dark:bg-neutral-700 animate-pulse"></div>
						</div>
					{/each}
				</div>
			{:else if error}
				<!-- Error State -->
				<div class="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
					<AlertCircle size={16} />
					<span>{error}</span>
				</div>
			{:else if unitTests.length === 0}
				<!-- No Tests -->
				<p class="text-sm text-neutral-500 dark:text-neutral-400">
					No unit tests found for this regex.
				</p>
			{:else}
				<!-- Unit Tests List -->
				<div class="space-y-2">
					{#each unitTests as test, idx (idx)}
						<div class="flex items-start gap-3 rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-900">
							<!-- Pass/Fail indicator -->
							<div class="mt-0.5 flex-shrink-0">
								{#if test.passed === undefined}
									<!-- No test result yet -->
									<div class="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
										<span class="text-xs font-medium text-neutral-400 dark:text-neutral-500">?</span>
									</div>
								{:else if test.passed}
									<div class="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
										<Check size={12} class="text-green-600 dark:text-green-400" />
									</div>
								{:else}
									<div class="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
										<X size={12} class="text-red-600 dark:text-red-400" />
									</div>
								{/if}
							</div>

							<!-- Test content -->
							<div class="min-w-0 flex-1">
								{#if test.description}
									<p class="text-xs text-neutral-500 dark:text-neutral-400">{test.description}</p>
								{/if}
								<code class="mt-1 block truncate font-mono text-xs text-neutral-900 dark:text-neutral-100">
									{test.testString}
								</code>
							</div>

							<!-- Expected behavior badge -->
							<span class="flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium
								{test.criteria === 'DOES_MATCH'
									? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
									: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'}">
								{test.criteria === 'DOES_MATCH' ? 'Should Match' : "Shouldn't Match"}
							</span>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
