<script lang="ts">
	import {
		Database,
		Plus,
		Lock,
		Code,
		Trash2,
		ExternalLink,
		ChevronRight,
		Info
	} from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import EmptyState from '$ui/state/EmptyState.svelte';
	import Table from '$ui/table/Table.svelte';
	import TableActionButton from '$ui/table/TableActionButton.svelte';
	import Badge from '$ui/badge/Badge.svelte';
	import Modal from '$ui/modal/Modal.svelte';
	import InfoModal from '$ui/modal/InfoModal.svelte';
	import ActionsBar from '$ui/actions/ActionsBar.svelte';
	import ActionButton from '$ui/actions/ActionButton.svelte';
	import SearchAction from '$ui/actions/SearchAction.svelte';
	import { createSearchStore } from '$stores/search';
	import { alertStore } from '$alerts/store';
	import { parseUTC } from '$shared/utils/dates';
	import type { PageData } from './$types';
	import type { Column } from '$ui/table/types';
	import type { DatabaseInstance } from '$db/queries/databaseInstances.ts';

	export let data: PageData;

	// Search store
	const searchStore = createSearchStore();

	// Filter databases based on search
	$: filteredDatabases = data.databases.filter((db) => {
		const query = $searchStore.query.toLowerCase();
		if (!query) return true;
		return db.name.toLowerCase().includes(query) || db.repository_url.toLowerCase().includes(query);
	});

	// Modal state
	let showUnlinkModal = false;
	let showInfoModal = false;
	let selectedDatabase: DatabaseInstance | null = null;
	let unlinkFormElement: HTMLFormElement;

	// Track loaded images
	let loadedImages: Set<number> = new Set();

	// Extract GitHub username/org from repository URL and use local proxy
	function getGitHubAvatar(repoUrl: string): string {
		const match = repoUrl.match(/github\.com\/([^\/]+)\//);
		if (match) {
			return `/api/github/avatar/${match[1]}`;
		}
		return '';
	}

	function handleImageLoad(id: number) {
		loadedImages.add(id);
		loadedImages = loadedImages;
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
		const d = parseUTC(date);
		if (!d) return 'Never';
		return d.toLocaleString(undefined, {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	// Handle row click - navigate to database details
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
		<!-- Actions Bar -->
		<ActionsBar>
			<SearchAction {searchStore} placeholder="Search databases..." />
			<ActionButton icon={Plus} title="Link Database" on:click={() => goto('/databases/new')} />
			<ActionButton icon={Info} title="Info" on:click={() => (showInfoModal = true)} />
		</ActionsBar>

		<!-- Database Table -->
		<Table {columns} data={filteredDatabases} hoverable={true}>
			<svelte:fragment slot="cell" let:row let:column>
				<div
					on:click={() => handleRowClick(row)}
					role="button"
					tabindex="0"
					on:keydown={(e) => e.key === 'Enter' && handleRowClick(row)}
					class="cursor-pointer"
				>
					{#if column.key === 'name'}
						<div class="flex items-center gap-3">
							<div class="relative h-8 w-8">
								{#if !loadedImages.has(row.id)}
									<div
										class="absolute inset-0 animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-700"
									></div>
								{/if}
								<img
									src={getGitHubAvatar(row.repository_url)}
									alt="{row.name} avatar"
									class="h-8 w-8 rounded-lg {loadedImages.has(row.id)
										? 'opacity-100'
										: 'opacity-0'}"
									on:load={() => handleImageLoad(row.id)}
								/>
							</div>
							<div class="flex items-center gap-2">
								<div class="font-medium text-neutral-900 dark:text-neutral-50">
									{row.name}
								</div>
								{#if row.is_private}
									<Badge variant="neutral" icon={Lock} mono>Private</Badge>
								{/if}
								{#if row.personal_access_token}
									<Badge variant="info" icon={Code} mono>Dev</Badge>
								{/if}
							</div>
						</div>
					{:else if column.key === 'repository_url'}
						<Badge variant="neutral" mono
							>{row.repository_url.replace('https://github.com/', '')}</Badge
						>
					{:else if column.key === 'sync_strategy'}
						<Badge variant="neutral" mono>{formatSyncStrategy(row.sync_strategy)}</Badge>
					{:else if column.key === 'last_synced_at'}
						<Badge variant="neutral" mono>{formatLastSynced(row.last_synced_at)}</Badge>
					{/if}
				</div>
			</svelte:fragment>

			<svelte:fragment slot="actions" let:row>
				<div class="flex items-center justify-end gap-1">
					<a
						href={row.repository_url}
						target="_blank"
						rel="noopener noreferrer"
						on:click={(e) => e.stopPropagation()}
					>
						<TableActionButton icon={ExternalLink} title="View on GitHub" />
					</a>
					<TableActionButton
						icon={Trash2}
						title="Unlink database"
						variant="danger"
						on:click={(e) => handleUnlinkClick(e, row)}
					/>
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

<!-- Info Modal -->
<InfoModal bind:open={showInfoModal} header="Databases">
	<div class="space-y-4 text-sm text-neutral-600 dark:text-neutral-400">
		<div>
			<div class="font-medium text-neutral-900 dark:text-neutral-100">What are Databases?</div>
			<div class="mt-1">
				Databases are Profilarr Compliant Database (PCD) repositories containing quality profiles,
				custom formats, and other configurations. Link a database to import and sync configurations
				to your Arr instances.
			</div>
		</div>

		<div>
			<div class="font-medium text-neutral-900 dark:text-neutral-100">Private & Dev Badges</div>
			<div class="mt-1">
				<strong>Private</strong> indicates the repository requires authentication.
				<strong>Dev</strong> means you have a personal access token configured, allowing you to push
				changes back to the repository.
			</div>
		</div>

		<div>
			<div class="font-medium text-neutral-900 dark:text-neutral-100">Sync Strategy</div>
			<div class="mt-1">
				Controls how often Profilarr checks for updates from the remote repository. Set to "Manual"
				to only sync when you explicitly trigger it, or choose an interval for automatic updates.
			</div>
		</div>

		<div>
			<div class="font-medium text-neutral-900 dark:text-neutral-100">Unlinking</div>
			<div class="mt-1">
				Unlinking a database removes all local data associated with it. Your Arr instances will keep
				any configurations that were already synced, but you won't be able to sync updates until you
				re-link the database.
			</div>
		</div>
	</div>
</InfoModal>
