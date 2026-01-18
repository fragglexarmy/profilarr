<script lang="ts">
	import { ChevronDown, Check, AlertTriangle, X, Zap } from 'lucide-svelte';
	import { slide } from 'svelte/transition';
	import type { UpgradeJobLog } from '$lib/server/upgrades/types.ts';
	import Score from '$ui/arr/Score.svelte';
	import Badge from '$ui/badge/Badge.svelte';

	export let run: UpgradeJobLog;
	export let runNumber: number;

	let expanded = false;

	// Status badge styling (card uses neutral bg)
	const statusBadges = {
		success: {
			badge: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400',
			icon: Check
		},
		partial: {
			badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400',
			icon: AlertTriangle
		},
		failed: {
			badge: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400',
			icon: X
		},
		skipped: {
			badge: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
			icon: X
		}
	};

	$: badgeStyle = statusBadges[run.status] || statusBadges.failed;
	$: StatusIcon = badgeStyle.icon;

	// Format schedule
	function formatSchedule(minutes: number): string {
		if (minutes < 60) return `Every ${minutes} minutes`;
		if (minutes === 60) return 'Every hour';
		if (minutes < 1440) return `Every ${minutes / 60} hours`;
		return 'Every day';
	}

	// Format date
	function formatDate(isoString: string): string {
		const date = new Date(isoString);
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function formatTime(isoString: string): string {
		const date = new Date(isoString);
		return date.toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true
		});
	}

	// Format duration
	function formatDuration(startedAt: string, completedAt: string): string {
		const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
		if (ms < 1000) return `${ms}ms`;
		if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
		return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
	}

	// Format filter mode
	function formatFilterMode(mode: string): string {
		return mode
			.split('_')
			.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
			.join(' ');
	}

	// Format selector method
	function formatMethod(method: string): string {
		return method
			.split('_')
			.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
			.join(' ');
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
	class="overflow-hidden rounded-lg border border-neutral-200 bg-white transition-shadow hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
>
	<!-- Header -->
	<div on:click={() => (expanded = !expanded)} class="flex cursor-pointer items-start justify-between gap-4 p-4">
		<div class="flex-1">
			<!-- Title row -->
			<div class="flex items-center gap-2">
				<span class="font-mono text-sm text-neutral-500 dark:text-neutral-500">#{runNumber}</span>
				<span class="text-sm font-medium text-neutral-900 dark:text-neutral-100">
					{run.config.selectedFilter || 'Unknown Filter'}
				</span>
				{#if run.config.dryRun}
					<span class="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">
						DRY RUN
					</span>
				{/if}
			</div>

			<!-- Subtitle -->
			<div class="mt-1 flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
				<span>{formatDate(run.startedAt)} @ {formatTime(run.startedAt)}</span>
				<span class="text-neutral-300 dark:text-neutral-600">|</span>
				<span class="font-mono text-xs">{formatDuration(run.startedAt, run.completedAt)}</span>
			</div>
		</div>

		<!-- Status + Chevron -->
		<div class="flex items-center gap-3">
			<span class="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium {badgeStyle.badge}">
				<svelte:component this={StatusIcon} size={12} />
				{run.status.charAt(0).toUpperCase() + run.status.slice(1)}
			</span>
			<ChevronDown
				size={18}
				class="text-neutral-400 transition-transform {expanded ? 'rotate-180' : ''}"
			/>
		</div>
	</div>

	<!-- Expanded Details -->
	{#if expanded}
		<div transition:slide={{ duration: 200 }} class="border-t border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
			<div class="space-y-3">
				<!-- Config -->
				<div class="flex">
					<span class="w-24 shrink-0 text-sm font-medium text-neutral-500 dark:text-neutral-400">Config</span>
					<span class="text-sm text-neutral-900 dark:text-neutral-100">
						Schedule: {formatSchedule(run.config.schedule)} | Mode: {formatFilterMode(run.config.filterMode)}
					</span>
				</div>

				<!-- Library -->
				<div class="flex">
					<span class="w-24 shrink-0 text-sm font-medium text-neutral-500 dark:text-neutral-400">Library</span>
					<span class="text-sm text-neutral-900 dark:text-neutral-100">
						{run.library.totalItems.toLocaleString()} items
						{#if run.library.fetchedFromCache}
							<span class="text-neutral-500 dark:text-neutral-400">(cached)</span>
						{/if}
						<span class="ml-1 font-mono text-xs text-neutral-500 dark:text-neutral-400">
							({run.library.fetchDurationMs}ms)
						</span>
					</span>
				</div>

				<!-- Filter -->
				<div class="flex">
					<span class="w-24 shrink-0 text-sm font-medium text-neutral-500 dark:text-neutral-400">Filter</span>
					<span class="text-sm text-neutral-900 dark:text-neutral-100">
						"{run.filter.name}"
						<span class="mx-1 text-neutral-400">→</span>
						<span class="font-medium">{run.filter.matchedCount}</span> matched
						<span class="mx-1 text-neutral-400">→</span>
						<span class="font-medium">{run.filter.afterCooldown}</span> after cooldown
					</span>
				</div>

				<!-- Selection -->
				<div class="flex">
					<span class="w-24 shrink-0 text-sm font-medium text-neutral-500 dark:text-neutral-400">Selection</span>
					<span class="text-sm text-neutral-900 dark:text-neutral-100">
						{formatMethod(run.selection.method)}
						<span class="font-medium">{run.selection.actualCount}</span> of {run.selection.requestedCount}
					</span>
				</div>

				<!-- Results -->
				<div class="flex">
					<span class="w-24 shrink-0 text-sm font-medium text-neutral-500 dark:text-neutral-400">Results</span>
					<span class="text-sm text-neutral-900 dark:text-neutral-100">
						{run.results.searchesTriggered} searches triggered,
						<span class="{run.results.successful > 0 ? 'text-green-600 dark:text-green-400' : ''}">{run.results.successful} successful</span>
						{#if run.results.failed > 0}
							<span class="text-red-600 dark:text-red-400">, {run.results.failed} failed</span>
						{/if}
					</span>
				</div>

				<!-- Errors -->
				{#if run.results.errors.length > 0}
					<div class="flex">
						<span class="w-24 shrink-0 text-sm font-medium text-neutral-500 dark:text-neutral-400">Notes</span>
						<div class="text-sm text-neutral-600 dark:text-neutral-400">
							{#each run.results.errors as error}
								<div class="italic">{error}</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Items Searched -->
				{#if run.selection.items.length > 0}
					<div class="mt-4 border-t border-neutral-200 pt-4 dark:border-neutral-700">
						<div class="mb-3 flex items-center gap-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300">
							<Zap size={14} />
							Items Searched
						</div>
						<div class="space-y-3">
							{#each run.selection.items as item}
								<div class="rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-800/50">
									<!-- Title and Score Delta -->
									<div class="flex items-center justify-between">
										<span class="font-medium text-neutral-900 dark:text-neutral-100">{item.title}</span>
										{#if item.upgrade}
											<Badge variant={item.scoreDelta && item.scoreDelta >= 0 ? 'success' : 'danger'}>
												<Score score={item.scoreDelta} size="sm" />
											</Badge>
										{:else}
											<Badge variant="neutral">No upgrade</Badge>
										{/if}
									</div>

									<!-- Original File -->
									<div class="mt-3">
										<div class="mb-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">Current File</div>
										<div class="rounded-md border border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-700 dark:bg-neutral-900">
											<div class="truncate font-mono text-[11px] text-neutral-700 dark:text-neutral-300" title={item.original.fileName}>
												{item.original.fileName}
											</div>
											<div class="mt-2 flex flex-wrap items-center gap-2">
												<span class="inline-flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
													Score: <Score score={item.original.score} size="sm" showSign={false} colored={false} />
												</span>
												{#if item.original.formats.length > 0}
													<span class="text-neutral-300 dark:text-neutral-600">|</span>
													<div class="flex flex-wrap gap-1">
														{#each item.original.formats as format}
															<Badge variant="neutral" size="sm">{format}</Badge>
														{/each}
													</div>
												{/if}
											</div>
										</div>
									</div>

									<!-- Upgrade (if found) -->
									{#if item.upgrade}
										<div class="mt-3">
											<div class="mb-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">Upgrade Available</div>
											<div class="rounded-md border border-emerald-200 bg-emerald-50 p-2 dark:border-emerald-800 dark:bg-emerald-900/20">
												<div class="truncate font-mono text-[11px] text-neutral-700 dark:text-neutral-300" title={item.upgrade.release}>
													{item.upgrade.release}
												</div>
												<div class="mt-2 flex flex-wrap items-center gap-2">
													<span class="inline-flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
														Score: <Score score={item.upgrade.score} size="sm" showSign={false} colored={false} />
													</span>
													{#if item.upgrade.formats.length > 0}
														<span class="text-neutral-300 dark:text-neutral-600">|</span>
														<div class="flex flex-wrap gap-1">
															{#each item.upgrade.formats as format}
																<Badge variant="success" size="sm">{format}</Badge>
															{/each}
														</div>
													{/if}
												</div>
											</div>
										</div>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
