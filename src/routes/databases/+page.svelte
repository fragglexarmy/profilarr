<script lang="ts">
	import { Database, Plus, Lock, Code, Trash2, Pencil, ExternalLink } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import EmptyState from '$ui/state/EmptyState.svelte';
	import Table from '$ui/table/Table.svelte';
	import Modal from '$ui/modal/Modal.svelte';
	import { alertStore } from '$alerts/store';
	import type { PageData } from './$types';
	import type { Column } from '$ui/table/types';
	import type { DatabaseInstance } from '$db/queries/databaseInstances.ts';

	export let data: PageData;

	// Modal state
	let showUnlinkModal = false;
	let selectedDatabase: DatabaseInstance | null = null;
	let unlinkFormElement: HTMLFormElement;

	// Extract GitHub username/org from repository URL
	function getGitHubAvatar(repoUrl: string): string {
		const match = repoUrl.match(/github\.com\/([^\/]+)\//);
		if (match) {
			return `https://github.com/${match[1]}.png?size=40`;
		}
		return '';
	}

	// Format sync strategy for display
	function formatSyncStrategy(minutes: number): string {
		if (minutes === 0) return 'Manual';
		if (minutes < 60) return `Every ${minutes} min`;
		if (minutes === 60) return 'Hourly';
		if (minutes < 1440) return `Every ${minutes / 60}h`;
		return `Every ${minutes / 1440}d`;
	}

	// Format last synced date
	function formatLastSynced(date: string | null): string {
		if (!date) return 'Never';
		return new Date(date).toLocaleDateString();
	}

	// Handle row click
	function handleRowClick(database: DatabaseInstance) {
		goto(`/databases/${database.id}`);
	}

	// Handle unlink click
	function handleUnlinkClick(e: MouseEvent, database: DatabaseInstance) {
		e.stopPropagation(); // Prevent row click
		selectedDatabase = database;
		showUnlinkModal = true;
	}

	// Define table columns
	const columns: Column<DatabaseInstance>[] = [
		{ key: 'name', header: 'Name', align: 'left' },
		{ key: 'repository_url', header: 'Repository', align: 'left' },
		{ key: 'sync_strategy', header: 'Sync', align: 'left', width: 'w-32' },
		{ key: 'last_synced_at', header: 'Last Synced', align: 'left', width: 'w-40' }
	];
</script>

<svelte:head>
	<title>Databases - Profilarr</title>
</svelte:head>

{#if data.databases.length === 0}
	<EmptyState
		icon={Database}
		title="No Databases Linked"
		description="Link a Profilarr Compliant Database to get started with profile management."
		buttonText="Link Database"
		buttonHref="/databases/new"
		buttonIcon={Plus}
	/>
{:else}
	<div class="space-y-6 p-8">
		<!-- Header -->
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-3xl font-bold text-neutral-900 dark:text-neutral-50">Databases</h1>
				<p class="mt-1 text-neutral-600 dark:text-neutral-400">
					Manage your linked Profilarr Compliant Databases
				</p>
			</div>
			<a
				href="/databases/new"
				class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
			>
				<Plus size={16} />
				Link Database
			</a>
		</div>

		<!-- Database Table -->
		<Table {columns} data={data.databases} hoverable={true}>
			<svelte:fragment slot="cell" let:row let:column>
				<div on:click={() => handleRowClick(row)} role="button" tabindex="0" on:keydown={(e) => e.key === 'Enter' && handleRowClick(row)} class="cursor-pointer">
					{#if column.key === 'name'}
						<div class="flex items-center gap-3">
							<img
								src={getGitHubAvatar(row.repository_url)}
								alt="{row.name} avatar"
								class="h-8 w-8 rounded-lg"
							/>
							<div class="flex items-center gap-2">
								<div class="font-medium text-neutral-900 dark:text-neutral-50">
									{row.name}
								</div>
								{#if row.is_private}
									<span class="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
										<Lock size={10} />
										Private
									</span>
								{/if}
								{#if row.personal_access_token}
									<span class="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
										<Code size={10} />
										Dev
									</span>
								{/if}
							</div>
						</div>
					{:else if column.key === 'repository_url'}
						<code class="rounded bg-neutral-100 px-2 py-1 font-mono text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
							{row.repository_url.replace('https://github.com/', '')}
						</code>
					{:else if column.key === 'sync_strategy'}
						<code class="rounded bg-neutral-100 px-2 py-1 font-mono text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
							{formatSyncStrategy(row.sync_strategy)}
						</code>
					{:else if column.key === 'last_synced_at'}
						<code class="rounded bg-neutral-100 px-2 py-1 font-mono text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
							{formatLastSynced(row.last_synced_at)}
						</code>
					{/if}
				</div>
			</svelte:fragment>

			<svelte:fragment slot="actions" let:row>
				<div class="flex items-center justify-end gap-2">
					<!-- GitHub Link Button -->
					<a
						href={row.repository_url}
						target="_blank"
						rel="noopener noreferrer"
						on:click={(e) => e.stopPropagation()}
						class="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-neutral-300 bg-white text-blue-600 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-blue-400 dark:hover:bg-neutral-700"
						title="View on GitHub"
					>
						<ExternalLink size={14} />
					</a>

					<!-- Edit Button -->
					<a
						href="/databases/{row.id}/edit"
						on:click={(e) => e.stopPropagation()}
						class="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-neutral-300 bg-white text-neutral-600 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
						title="Edit database"
					>
						<Pencil size={14} />
					</a>

					<!-- Unlink Button -->
					<button
						type="button"
						on:click={(e) => handleUnlinkClick(e, row)}
						class="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-neutral-300 bg-white text-red-600 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-red-400 dark:hover:bg-neutral-700"
						title="Unlink database"
					>
						<Trash2 size={14} />
					</button>
				</div>
			</svelte:fragment>
		</Table>
	</div>
{/if}

<!-- Unlink Confirmation Modal -->
<Modal
	open={showUnlinkModal}
	header="Unlink Database"
	bodyMessage={`Are you sure you want to unlink "${selectedDatabase?.name}"? This action cannot be undone and all local data will be permanently removed.`}
	confirmText="Unlink"
	cancelText="Cancel"
	confirmDanger={true}
	on:confirm={() => {
		showUnlinkModal = false;
		if (selectedDatabase) {
			unlinkFormElement?.requestSubmit();
		}
	}}
	on:cancel={() => {
		showUnlinkModal = false;
		selectedDatabase = null;
	}}
/>

<!-- Hidden unlink form -->
<form
	bind:this={unlinkFormElement}
	method="POST"
	action="?/delete"
	class="hidden"
	use:enhance={() => {
		return async ({ result, update }) => {
			if (result.type === 'failure' && result.data) {
				alertStore.add(
					'error',
					(result.data as { error?: string }).error || 'Failed to unlink database'
				);
			} else if (result.type === 'redirect') {
				alertStore.add('success', 'Database unlinked successfully');
			}
			await update();
			selectedDatabase = null;
		};
	}}
>
	<input type="hidden" name="id" value={selectedDatabase?.id || ''} />
</form>
