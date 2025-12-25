<script lang="ts">
	import { Server, Plus, Trash2, Pencil, Check, X } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import EmptyState from '$ui/state/EmptyState.svelte';
	import Table from '$ui/table/Table.svelte';
	import Modal from '$ui/modal/Modal.svelte';
	import { alertStore } from '$alerts/store';
	import type { PageData } from './$types';
	import type { Column } from '$ui/table/types';
	import type { ArrInstance } from '$db/queries/arrInstances.ts';

	export let data: PageData;

	// Modal state
	let showDeleteModal = false;
	let selectedInstance: ArrInstance | null = null;
	let deleteFormElement: HTMLFormElement;

	// Format type for display with proper casing
	function formatType(type: string): string {
		return type.charAt(0).toUpperCase() + type.slice(1);
	}

	// Get type badge color classes
	function getTypeBadgeClasses(type: string): string {
		const colors: Record<string, string> = {
			radarr: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
			sonarr: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
			lidarr: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
			chaptarr: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
		};
		return colors[type] || 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200';
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
		{ key: 'type', header: 'Type', align: 'left', width: 'w-32' },
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
		description="Add a Radarr, Sonarr, Lidarr, or Chaptarr instance to get started."
		buttonText="Add Instance"
		buttonHref="/arr/new"
		buttonIcon={Plus}
	/>
{:else}
	<div class="space-y-6 p-8">
		<!-- Header -->
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-3xl font-bold text-neutral-900 dark:text-neutral-50">Arr Instances</h1>
				<p class="mt-1 text-neutral-600 dark:text-neutral-400">
					Manage your Radarr, Sonarr, Lidarr, and Chaptarr instances
				</p>
			</div>
			<a
				href="/arr/new"
				class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
			>
				<Plus size={16} />
				Add Instance
			</a>
		</div>

		<!-- Instance Table -->
		<Table {columns} data={data.instances} hoverable={true} onRowClick={handleRowClick}>
			<svelte:fragment slot="cell" let:row let:column>
				{#if column.key === 'name'}
					<div class="font-medium text-neutral-900 dark:text-neutral-50">
						{row.name}
					</div>
				{:else if column.key === 'type'}
					<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {getTypeBadgeClasses(row.type)}">
						{formatType(row.type)}
					</span>
				{:else if column.key === 'url'}
					<code class="rounded bg-neutral-100 px-2 py-1 font-mono text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
						{row.url}
					</code>
				{:else if column.key === 'enabled'}
					<div class="flex justify-center">
						{#if row.enabled}
							<span class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
								<Check size={14} />
							</span>
						{:else}
							<span class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500">
								<X size={14} />
							</span>
						{/if}
					</div>
				{/if}
			</svelte:fragment>

			<svelte:fragment slot="actions" let:row>
				<div class="flex items-center justify-end gap-2">
					<!-- Edit Button -->
					<a
						href="/arr/{row.id}/edit"
						on:click={(e) => e.stopPropagation()}
						class="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-neutral-300 bg-white text-neutral-600 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
						title="Edit instance"
					>
						<Pencil size={14} />
					</a>

					<!-- Delete Button -->
					<button
						type="button"
						on:click={(e) => handleDeleteClick(e, row)}
						class="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-neutral-300 bg-white text-red-600 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-red-400 dark:hover:bg-neutral-700"
						title="Delete instance"
					>
						<Trash2 size={14} />
					</button>
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
