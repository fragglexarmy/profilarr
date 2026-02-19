<script lang="ts">
	import { onMount } from 'svelte';
	import { ExternalLink, Check, X, AlertCircle } from 'lucide-svelte';
	import type { Regex101UnitTest } from '../../../api/regex101/[id]/+server';
	import { alertStore } from '$alerts/store';
	import { sanitizeRegex101Id } from '$lib/client/utils/regex101';
	import Button from '$ui/button/Button.svelte';
	import Card from '$ui/card/Card.svelte';
	import Label from '$ui/label/Label.svelte';
	import FormInput from '$ui/form/FormInput.svelte';

	// Props
	export let pattern: string = '';
	export let regex101Id: string = '';
	export let onPatternChange: ((value: string) => void) | undefined = undefined;
	export let onRegex101IdChange: ((value: string) => void) | undefined = undefined;

	function handlePatternChange(value: string) {
		pattern = value;
		onPatternChange?.(value);
	}

	function handleRegex101IdChange(value: string) {
		const { value: sanitizedValue, sanitized } = sanitizeRegex101Id(value);
		if (sanitized) {
			alertStore.add('info', `Regex101 link detected. Saved ID as "${sanitizedValue}".`);
		}
		regex101Id = sanitizedValue;
		onRegex101IdChange?.(sanitizedValue);
	}

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
	<FormInput
		label="Regular Expression"
		name="pattern"
		required
		textarea
		rows={3}
		mono
		description="Uses .NET regex flavor (case-insensitive by default)"
		value={pattern}
		placeholder="e.g., \b(SPARKS)\b"
		on:input={(e) => handlePatternChange(e.detail)}
	/>

	<!-- Regex101 ID -->
	<div class="flex flex-col gap-2 sm:flex-row sm:items-end">
		<div class="flex-1">
			<FormInput
				label="Regex101 ID"
				name="regex101Id"
				mono
				description="Link to regex101.com for testing (include version, e.g., ABC123/1)"
				value={regex101Id}
				placeholder="e.g., GMV8jd/1"
				on:input={(e) => handleRegex101IdChange(e.detail)}
			/>
		</div>
		{#if regex101Url}
			<Button
				href={regex101Url}
				target="_blank"
				rel="noopener noreferrer"
				icon={ExternalLink}
				iconColor="text-blue-600 dark:text-blue-400"
				text="Test"
				variant="secondary"
			/>
		{/if}
	</div>

	<!-- Unit Tests Section -->
	{#if regex101Id}
		<Card padding="md" flush>
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
						<Card padding="sm" flush>
							<div class="flex items-center gap-3">
								<div class="h-5 w-5 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700"></div>
								<div class="flex-1 space-y-1.5">
									<div class="h-3 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700"></div>
									<div class="h-4 w-48 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800"></div>
								</div>
								<div class="h-5 w-16 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-700"></div>
							</div>
						</Card>
					{/each}
				</div>
			{:else if error}
				<!-- Error State -->
				<div
					class="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
				>
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
						<Card padding="sm" flush>
							<div class="flex items-start gap-3">
								<!-- Pass/Fail indicator -->
								<div class="mt-0.5 flex-shrink-0">
									{#if test.passed === undefined}
										<div
											class="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800"
										>
											<span class="text-xs font-medium text-neutral-400 dark:text-neutral-500">?</span>
										</div>
									{:else if test.passed}
										<div
											class="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 dark:bg-green-900"
										>
											<Check size={12} class="text-green-600 dark:text-green-400" />
										</div>
									{:else}
										<div
											class="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 dark:bg-red-900"
										>
											<X size={12} class="text-red-600 dark:text-red-400" />
										</div>
									{/if}
								</div>

								<!-- Test content -->
								<div class="min-w-0 flex-1">
									{#if test.description}
										<p class="text-xs text-neutral-500 dark:text-neutral-400">{test.description}</p>
									{/if}
									<code
										class="mt-1 block truncate font-mono text-xs text-neutral-900 dark:text-neutral-100"
									>
										{test.testString}
									</code>
								</div>

								<!-- Expected behavior badge -->
								<Label
									variant={test.criteria === 'DOES_MATCH' ? 'success' : 'danger'}
									size="sm"
									rounded="md"
								>
									{test.criteria === 'DOES_MATCH' ? 'Should Match' : "Shouldn't Match"}
								</Label>
							</div>
						</Card>
					{/each}
				</div>
			{/if}
		</Card>
	{/if}
</div>
