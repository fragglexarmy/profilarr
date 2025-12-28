<script lang="ts">
	import {
		GitBranch,
		ArrowUp,
		ArrowDown,
		ExternalLink,
		Star,
		GitFork,
		CircleDot,
		ChevronDown,
		Check
	} from 'lucide-svelte';
	import { invalidateAll } from '$app/navigation';
	import type { GitStatus, RepoInfo } from '$utils/git/types';

	export let status: GitStatus;
	export let repoInfo: RepoInfo | null;
	export let branches: string[];

	let branchDropdownOpen = false;
	let switching = false;

	async function handleBranchSwitch(branch: string) {
		if (branch === status.branch || switching) return;

		switching = true;
		branchDropdownOpen = false;

		const formData = new FormData();
		formData.append('branch', branch);

		try {
			const response = await fetch('?/checkout', {
				method: 'POST',
				body: formData
			});

			if (response.ok) {
				await invalidateAll();
			}
		} finally {
			switching = false;
		}
	}

	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.branch-dropdown')) {
			branchDropdownOpen = false;
		}
	}
</script>

<svelte:window on:click={handleClickOutside} />

<div
	class="mt-6 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800"
>
	<div class="flex items-center justify-between">
		<!-- Left: Repo info -->
		<div class="flex items-center gap-4">
			{#if repoInfo}
				<img
					src={repoInfo.ownerAvatarUrl}
					alt={repoInfo.owner}
					class="h-8 w-8 rounded-lg"
				/>
				<div class="flex flex-col gap-1">
					<div class="flex items-center gap-2">
						<code class="font-mono text-sm text-neutral-700 dark:text-neutral-300">
							{repoInfo.owner}/{repoInfo.repo}
						</code>
						<a
							href={repoInfo.htmlUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="text-neutral-400 transition-colors hover:text-neutral-600 dark:hover:text-neutral-300"
						>
							<ExternalLink size={14} />
						</a>
					</div>
					<div class="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
						<span class="flex items-center gap-1">
							<Star size={12} />
							<code class="font-mono">{repoInfo.stars.toLocaleString()}</code>
						</span>
						<span class="flex items-center gap-1">
							<GitFork size={12} />
							<code class="font-mono">{repoInfo.forks.toLocaleString()}</code>
						</span>
						<span class="flex items-center gap-1">
							<CircleDot size={12} />
							<code class="font-mono">{repoInfo.openIssues.toLocaleString()}</code>
						</span>
					</div>
				</div>
			{/if}
		</div>

		<!-- Right: Branch, status, commits -->
		<div class="flex items-center gap-4">
			<!-- Ahead/Behind indicators -->
			{#if status.ahead > 0}
				<div class="flex items-center gap-1 text-sm text-yellow-600 dark:text-yellow-400">
					<ArrowUp size={14} />
					<code class="font-mono">{status.ahead}</code>
				</div>
			{/if}

			{#if status.behind > 0}
				<div class="flex items-center gap-1 text-sm text-orange-600 dark:text-orange-400">
					<ArrowDown size={14} />
					<code class="font-mono">{status.behind}</code>
				</div>
			{/if}

			<!-- Branch dropdown -->
			<div class="branch-dropdown relative">
				<button
					type="button"
					on:click|stopPropagation={() => (branchDropdownOpen = !branchDropdownOpen)}
					disabled={switching}
					class="flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm transition-colors hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700"
				>
					<GitBranch size={14} class="text-neutral-500 dark:text-neutral-400" />
					<code class="font-mono text-neutral-700 dark:text-neutral-300">{status.branch}</code>
					<ChevronDown
						size={14}
						class="text-neutral-400 transition-transform {branchDropdownOpen
							? 'rotate-180'
							: ''}"
					/>
				</button>

				{#if branchDropdownOpen}
					<div
						class="absolute right-0 top-full z-50 mt-1 max-h-60 w-48 overflow-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
					>
						{#each branches as branch}
							<button
								type="button"
								on:click={() => handleBranchSwitch(branch)}
								class="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700"
							>
								<code class="font-mono {branch === status.branch
									? 'text-blue-600 dark:text-blue-400'
									: 'text-neutral-700 dark:text-neutral-300'}">{branch}</code>
								{#if branch === status.branch}
									<Check size={14} class="text-blue-600 dark:text-blue-400" />
								{/if}
							</button>
						{/each}
					</div>
				{/if}
			</div>

		</div>
	</div>
</div>
