<script lang="ts">
	import { Server, Plus, Trash2, Info, ExternalLink } from 'lucide-svelte';
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
	import type { PageData } from './$types';
	import type { Column } from '$ui/table/types';
	import type { ArrInstance } from '$db/queries/arrInstances.ts';
	import radarrLogo from '$lib/client/assets/Radarr.svg';
	import sonarrLogo from '$lib/client/assets/Sonarr.svg';

	// Logo lookup by type
	const logos: Record<string, string> = {
		radarr: radarrLogo,
		sonarr: sonarrLogo
	};

	export let data: PageData;

	// Search store
	const searchStore = createSearchStore();

	// Filter instances based on search
	$: filteredInstances = data.instances.filter((instance) => {
		const query = $searchStore.query.toLowerCase();
		if (!query) return true;
		return (
			instance.name.toLowerCase().includes(query) ||
			instance.url.toLowerCase().includes(query) ||
			instance.type.toLowerCase().includes(query)
		);
	});

	// Modal state
	let showDeleteModal = false;
	let showInfoModal = false;
	let selectedInstance: ArrInstance | null = null;
	let deleteFormElement: HTMLFormElement;

	// Track loaded images
	let loadedImages: Set<number> = new Set();

	// Get logo path based on arr type
	function getLogoPath(type: string): string {
		return logos[type] || '';
	}

	function handleImageLoad(id: number) {
		loadedImages.add(id);
		loadedImages = loadedImages;
	}

	// Format type for display with proper casing
	function formatType(type: string): string {
		return type.charAt(0).toUpperCase() + type.slice(1);
	}

	// Handle row click
	function handleRowClick(instance: ArrInstance) {
		goto(`/arr/${instance.id}`);
	}

	// Handle delete click
	function handleDeleteClick(e: MouseEvent, instance: ArrInstance) {
		e.stopPropagation();
		selectedInstance = instance;
		showDeleteModal = true;
	}

	// Define table columns
	const columns: Column<ArrInstance>[] = [
		{ key: 'name', header: 'Name', align: 'left' },
		{ key: 'url', header: 'URL', align: 'left' },
		{ key: 'enabled', header: 'Enabled', align: 'center', width: 'w-24' }
	];
</script>

<svelte:head>
	<title>Arr Instances - Profilarr</title>
</svelte:head>

{#if data.instances.length === 0}
	<EmptyState
		icon={Server}
		title="No Arr Instances"
		description="Add a Radarr or Sonarr instance to get started."
		buttonText="Add Instance"
		buttonHref="/arr/new"
		buttonIcon={Plus}
	/>
{:else}
	<div class="space-y-6 p-8">
		<!-- Actions Bar -->
		<ActionsBar>
			<SearchAction {searchStore} placeholder="Search instances..." />
			<ActionButton icon={Plus} title="Add Instance" on:click={() => goto('/arr/new')} />
			<ActionButton icon={Info} title="Info" on:click={() => (showInfoModal = true)} />
		</ActionsBar>

		<!-- Instance Table -->
		<Table {columns} data={filteredInstances} hoverable={true} onRowClick={handleRowClick}>
			<svelte:fragment slot="cell" let:row let:column>
				{#if column.key === 'name'}
					<div class="flex items-center gap-3">
						<div class="relative h-8 w-8">
							{#if !loadedImages.has(row.id)}
								<div
									class="absolute inset-0 animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-700"
								></div>
							{/if}
							<img
								src={getLogoPath(row.type)}
								alt="{formatType(row.type)} logo"
								class="h-8 w-8 rounded-lg {loadedImages.has(row.id) ? 'opacity-100' : 'opacity-0'}"
								on:load={() => handleImageLoad(row.id)}
							/>
						</div>
						<div class="flex items-center gap-2">
							<div class="font-medium text-neutral-900 dark:text-neutral-50">
								{row.name}
							</div>
						</div>
					</div>
				{:else if column.key === 'url'}
					<Badge variant="neutral" mono>{row.url}</Badge>
				{:else if column.key === 'enabled'}
					<div class="flex justify-center">
						{#if row.enabled}
							<Badge variant="success">Enabled</Badge>
						{:else}
							<Badge variant="neutral">Disabled</Badge>
						{/if}
					</div>
				{/if}
			</svelte:fragment>

			<svelte:fragment slot="actions" let:row>
				<div class="flex items-center justify-end gap-1">
					<a
						href={row.url}
						target="_blank"
						rel="noopener noreferrer"
						on:click={(e) => e.stopPropagation()}
					>
						<TableActionButton icon={ExternalLink} title="Open in {formatType(row.type)}" />
					</a>
					<TableActionButton
						icon={Trash2}
						title="Delete instance"
						variant="danger"
						on:click={(e) => handleDeleteClick(e, row)}
					/>
				</div>
			</svelte:fragment>
		</Table>
	</div>
{/if}

<!-- Delete Confirmation Modal -->
<Modal
	open={showDeleteModal}
	header="Delete Instance"
	bodyMessage={`Are you sure you want to delete "${selectedInstance?.name}"? This action cannot be undone.`}
	confirmText="Delete"
	cancelText="Cancel"
	confirmDanger={true}
	on:confirm={() => {
		showDeleteModal = false;
		if (selectedInstance) {
			deleteFormElement?.requestSubmit();
		}
	}}
	on:cancel={() => {
		showDeleteModal = false;
		selectedInstance = null;
	}}
/>

<!-- Hidden delete form -->
<form
	bind:this={deleteFormElement}
	method="POST"
	action="?/delete"
	class="hidden"
	use:enhance={() => {
		return async ({ result, update }) => {
			if (result.type === 'failure' && result.data) {
				alertStore.add(
					'error',
					(result.data as { error?: string }).error || 'Failed to delete instance'
				);
			} else if (result.type === 'redirect') {
				alertStore.add('success', 'Instance deleted successfully');
			}
			await update();
			selectedInstance = null;
		};
	}}
>
	<input type="hidden" name="id" value={selectedInstance?.id || ''} />
</form>

<!-- Info Modal -->
<InfoModal bind:open={showInfoModal} header="Arr Instances">
	<div class="space-y-4 text-sm text-neutral-600 dark:text-neutral-400">
		<div>
			<div class="font-medium text-neutral-900 dark:text-neutral-100">What are Arr Instances?</div>
			<div class="mt-1">
				Arr instances are your Radarr and Sonarr applications. Profilarr connects to these instances
				to sync quality profiles, custom formats, and other configurations.
			</div>
		</div>

		<div>
			<div class="font-medium text-neutral-900 dark:text-neutral-100">Adding an Instance</div>
			<div class="mt-1">
				To add an instance, you'll need the URL and API key from your Radarr or Sonarr application.
				You can find the API key in Settings → General → Security.
			</div>
		</div>

		<div>
			<div class="font-medium text-neutral-900 dark:text-neutral-100">Syncing</div>
			<div class="mt-1">
				Once connected, you can configure sync settings to push profiles and formats from your
				linked databases to each instance. Sync can be triggered manually, on a schedule, or
				automatically when changes are detected.
			</div>
		</div>

		<div>
			<div class="font-medium text-neutral-900 dark:text-neutral-100">Enabled/Disabled</div>
			<div class="mt-1">
				Disabled instances are excluded from sync operations but remain configured. This is useful
				for temporarily pausing sync without removing the instance.
			</div>
		</div>
	</div>
</InfoModal>
