<script lang="ts">
	import { tick, onMount, onDestroy } from 'svelte';
	import { X, Check, ArrowUp, Info, Save, Loader2, Layers, ChevronUp, ChevronDown } from 'lucide-svelte';
	import IconCheckbox from '$lib/client/ui/form/IconCheckbox.svelte';
	import InfoModal from '$ui/modal/InfoModal.svelte';
	import Modal from '$ui/modal/Modal.svelte';
	import StickyCard from '$ui/card/StickyCard.svelte';
	import Button from '$ui/button/Button.svelte';
	import { alertStore } from '$lib/client/alerts/store';
	import { enhance } from '$app/forms';
	import { current, isDirty, initEdit, update } from '$lib/client/stores/dirty';
	import type { PageData } from './$types';

	export let data: PageData;

	let showInfoModal = false;

	type OrderedItem = PageData['qualities']['orderedItems'][number];
	// Form data shape
	interface QualitiesFormData {
		orderedItems: OrderedItem[];
		[key: string]: unknown;
	}

	// Build initial data from server
	$: initialData = buildInitialData(data.qualities);

	function buildInitialData(qualities: typeof data.qualities): QualitiesFormData {
		return {
			orderedItems: structuredClone(qualities.orderedItems)
		};
	}

	function buildMergedOrderedItems(qualities: typeof data.qualities): OrderedItem[] {
		const orderedItems = structuredClone(qualities.orderedItems);
		const additional = qualities.availableQualities.map((quality, index) => ({
			type: 'quality' as const,
			name: quality.name,
			position: orderedItems.length + index,
			enabled: false,
			upgradeUntil: false
		}));

		const merged = [...orderedItems, ...additional];
		merged.forEach((item, index) => {
			item.position = index;
		});

		return merged;
	}

	// Initialize dirty tracking
	$: initEdit(initialData);

	let lastAutoMergeKey = '';
	let lastQualitiesRef: typeof data.qualities | null = null;
	$: if (data.qualities) {
		if (data.qualities !== lastQualitiesRef) {
			lastAutoMergeKey = '';
			lastQualitiesRef = data.qualities;
		}
		const availableNames = data.qualities.availableQualities.map((q) => q.name).join('|');
		if (availableNames && availableNames !== lastAutoMergeKey) {
			update('orderedItems', buildMergedOrderedItems(data.qualities));
		}
		lastAutoMergeKey = availableNames;
	}

	// Reactive getters for current values
	$: mainBucket = ($current.orderedItems ?? []) as OrderedItem[];

	// Save state
	let isSaving = false;
	let selectedLayer: 'user' | 'base' = data.canWriteToBase ? 'base' : 'user';
	let formElement: HTMLFormElement;

	// Mobile detection
	let isMobile = false;
	let mediaQuery: MediaQueryList | null = null;

	// Drag state (local, not tracked for dirty)
	let draggedQualityFromMain: { item: OrderedItem; index: number } | null = null;
	let lastTargetIndex: number | null = null;
	let hoverTargetIndex: number | null = null;
	let willCreateGroup: boolean = false;
	let willAddToGroup: boolean = false;
	let editingGroupIndex: number | null = null;
	let editingGroupName: string = '';
	let groupingMode: boolean = false;

	// Group creation modal state
	let showGroupModal = false;
	let groupNameInput = '';
	let selectedGroupNames = new Set<string>();

	$: groupableItems = mainBucket.filter((item) => item.type === 'quality');
	$: selectedGroupCount = selectedGroupNames.size;
	$: canCreateGroup = selectedGroupCount >= 2;

	onMount(() => {
		if (typeof window !== 'undefined') {
			mediaQuery = window.matchMedia('(max-width: 767px)');
			isMobile = mediaQuery.matches;
			mediaQuery.addEventListener('change', handleMediaChange);
		}
	});

	onDestroy(() => {
		if (mediaQuery) {
			mediaQuery.removeEventListener('change', handleMediaChange);
		}
	});

	function handleMediaChange(e: MediaQueryListEvent) {
		isMobile = e.matches;
	}

	// Helper to update mainBucket in the store
	function updateMainBucket(newBucket: OrderedItem[]) {
		update('orderedItems', newBucket);
	}

	function handleQualityDragStart(item: OrderedItem, index: number) {
		draggedQualityFromMain = { item, index };
	}

	function handleQualityDragOver(e: DragEvent, targetItem: OrderedItem, targetIndex: number) {
		e.preventDefault();

		if (!draggedQualityFromMain || draggedQualityFromMain.index === targetIndex) {
			hoverTargetIndex = null;
			willCreateGroup = false;
			willAddToGroup = false;
			return;
		}

		const draggedItem = draggedQualityFromMain.item;
		const isGroupingMode = e.ctrlKey || e.metaKey || groupingMode;

		hoverTargetIndex = targetIndex;

		if (isGroupingMode && draggedItem.type === 'quality') {
			if (targetItem.type === 'quality') {
				willCreateGroup = true;
				willAddToGroup = false;
			} else if (targetItem.type === 'group') {
				willCreateGroup = false;
				willAddToGroup = true;
			} else {
				willCreateGroup = false;
				willAddToGroup = false;
			}
		} else {
			willCreateGroup = false;
			willAddToGroup = false;

			if (lastTargetIndex === targetIndex) return;
			lastTargetIndex = targetIndex;

			const newBucket = [...mainBucket];
			const sourceIndex = draggedQualityFromMain.index;
			const [movedItem] = newBucket.splice(sourceIndex, 1);
			newBucket.splice(targetIndex, 0, movedItem);

			newBucket.forEach((item, index) => {
				item.position = index;
			});

			updateMainBucket(newBucket);
			draggedQualityFromMain.index = targetIndex;
		}
	}

	function handleQualityDragLeave() {
		hoverTargetIndex = null;
		willCreateGroup = false;
		willAddToGroup = false;
	}

	function handleQualityDrop(e: DragEvent, targetItem: OrderedItem, targetIndex: number) {
		e.preventDefault();
		e.stopPropagation();

		if (!draggedQualityFromMain || draggedQualityFromMain.index === targetIndex) {
			resetDragState();
			return;
		}

		const draggedItem = draggedQualityFromMain.item;
		const sourceIndex = draggedQualityFromMain.index;
		const isGroupingMode = e.ctrlKey || e.metaKey || groupingMode;

		if (isGroupingMode && draggedItem.type === 'quality') {
			if (targetItem.type === 'quality') {
				const newGroup: OrderedItem = {
					type: 'group',
					name: `${draggedItem.name} + ${targetItem.name}`,
					position: targetIndex,
					enabled: draggedItem.enabled && targetItem.enabled,
					upgradeUntil: draggedItem.upgradeUntil || targetItem.upgradeUntil,
					members: [{ name: draggedItem.name }, { name: targetItem.name }]
				};

				const newBucket = [...mainBucket];
				const indicesToRemove = [sourceIndex, targetIndex].sort((a, b) => b - a);
				indicesToRemove.forEach((idx) => newBucket.splice(idx, 1));
				const insertPos = Math.min(sourceIndex, targetIndex);
				newBucket.splice(insertPos, 0, newGroup);

				newBucket.forEach((item, index) => {
					item.position = index;
				});
				updateMainBucket(newBucket);
			} else if (targetItem.type === 'group') {
				const newBucket = [...mainBucket];
				const targetGroup = { ...newBucket[targetIndex] };

				if (!targetGroup.members) targetGroup.members = [];
				targetGroup.members = [
					...targetGroup.members,
					{
						name: draggedItem.name
					}
				];

				newBucket[targetIndex] = targetGroup;
				newBucket.splice(sourceIndex, 1);

				newBucket.forEach((item, index) => {
					item.position = index;
				});
				updateMainBucket(newBucket);
			}
		}

		resetDragState();
	}

	function resetDragState() {
		draggedQualityFromMain = null;
		lastTargetIndex = null;
		hoverTargetIndex = null;
		willCreateGroup = false;
		willAddToGroup = false;
	}

	function moveItem(index: number, direction: 'up' | 'down') {
		const targetIndex = direction === 'up' ? index - 1 : index + 1;
		if (targetIndex < 0 || targetIndex >= mainBucket.length) return;

		const newBucket = [...mainBucket];
		const [movedItem] = newBucket.splice(index, 1);
		newBucket.splice(targetIndex, 0, movedItem);

		newBucket.forEach((item, idx) => {
			item.position = idx;
		});
		updateMainBucket(newBucket);
	}

	function startEditingGroupName(item: OrderedItem, index: number) {
		if (item.type === 'group') {
			editingGroupIndex = index;
			editingGroupName = item.name;
		}
	}

	function saveGroupName() {
		if (editingGroupIndex !== null && editingGroupName.trim()) {
			const newBucket = [...mainBucket];
			newBucket[editingGroupIndex] = {
				...newBucket[editingGroupIndex],
				name: editingGroupName.trim()
			};
			updateMainBucket(newBucket);
		}
		editingGroupIndex = null;
		editingGroupName = '';
	}

	function cancelEditingGroupName() {
		editingGroupIndex = null;
		editingGroupName = '';
	}

	function toggleEnabled(index: number) {
		if (mainBucket[index].enabled && mainBucket[index].upgradeUntil) {
			alertStore.add(
				'warning',
				'Cannot disable an item that is set as "Upgrade Until". Please remove the "Upgrade Until" flag first.'
			);
			return;
		}

		const newBucket = [...mainBucket];
		newBucket[index] = { ...newBucket[index], enabled: !newBucket[index].enabled };
		updateMainBucket(newBucket);
	}

	function toggleUpgradeUntil(index: number) {
		const newBucket = [...mainBucket];

		if (!newBucket[index].enabled) {
			newBucket[index] = { ...newBucket[index], enabled: true };
			alertStore.add(
				'info',
				'Item was automatically enabled because "Upgrade Until" requires it to be enabled.'
			);
		}

		newBucket.forEach((item, i) => {
			newBucket[i] = { ...item, upgradeUntil: i === index };
		});
		updateMainBucket(newBucket);
	}

	function collapseGroup(group: OrderedItem) {
		if (group.type !== 'group' || !group.members) return;

		const groupIndex = mainBucket.findIndex(
			(item) => item.type === 'group' && item.name === group.name
		);
		if (groupIndex === -1) return;

		const newQualities: OrderedItem[] = group.members.map((member, index) => ({
			type: 'quality' as const,
			name: member.name,
			position: groupIndex + index,
			enabled: group.enabled,
			upgradeUntil: index === 0 ? group.upgradeUntil : false
		}));

		const newBucket = [...mainBucket];
		newBucket.splice(groupIndex, 1, ...newQualities);

		newBucket.forEach((item, index) => {
			item.position = index;
		});

		updateMainBucket(newBucket);
	}

	function openGroupModal() {
		showGroupModal = true;
		groupNameInput = '';
		selectedGroupNames = new Set();
	}

	function closeGroupModal() {
		showGroupModal = false;
		groupNameInput = '';
		selectedGroupNames = new Set();
	}

	function toggleGroupSelection(name: string) {
		if (selectedGroupNames.has(name)) {
			selectedGroupNames.delete(name);
		} else {
			selectedGroupNames.add(name);
		}
		selectedGroupNames = selectedGroupNames;
	}

	function handleCreateGroup() {
		if (!canCreateGroup) return;

		const selectedItems = mainBucket.filter(
			(item) => item.type === 'quality' && selectedGroupNames.has(item.name)
		) as OrderedItem[];

		if (selectedItems.length < 2) return;

		const insertIndex = mainBucket.findIndex(
			(item) => item.type === 'quality' && selectedGroupNames.has(item.name)
		);
		if (insertIndex === -1) return;

		const groupName =
			groupNameInput.trim() || selectedItems.map((item) => item.name).join(' + ');

		const newGroup: OrderedItem = {
			type: 'group',
			name: groupName,
			position: insertIndex,
			enabled: selectedItems.every((item) => item.enabled),
			upgradeUntil: selectedItems.some((item) => item.upgradeUntil),
			members: selectedItems.map((item) => ({ name: item.name }))
		};

		const newBucket = mainBucket.filter(
			(item) => !(item.type === 'quality' && selectedGroupNames.has(item.name))
		);
		newBucket.splice(insertIndex, 0, newGroup);

		newBucket.forEach((item, index) => {
			item.position = index;
		});

		updateMainBucket(newBucket);
		closeGroupModal();
	}

	async function handleSaveClick() {
		selectedLayer = data.canWriteToBase ? 'base' : 'user';
		await tick();
		formElement?.requestSubmit();
	}

</script>

<svelte:head>
	<title>Qualities - Profilarr</title>
</svelte:head>

<StickyCard position="top">
	<svelte:fragment slot="left">
		<h1 class="text-neutral-900 dark:text-neutral-50">Qualities</h1>
		<p class="text-neutral-600 dark:text-neutral-400">
			Configure ordering, grouping, and upgrade behavior.
		</p>
	</svelte:fragment>
	<svelte:fragment slot="right">
		<div class="flex items-center gap-2">
			<Button text="Info" icon={Info} on:click={() => (showInfoModal = true)} />
			<Button text="Create Group" icon={Layers} on:click={openGroupModal} />
			<Button
				disabled={isSaving || !$isDirty}
				icon={isSaving ? Loader2 : Save}
				iconColor="text-blue-600 dark:text-blue-400"
				text={isSaving ? 'Saving...' : 'Save'}
				on:click={handleSaveClick}
			/>
		</div>
	</svelte:fragment>
</StickyCard>

<!-- Hidden form for submission -->
<form
	bind:this={formElement}
	method="POST"
	action="?/update"
	class="hidden"
	use:enhance={() => {
		isSaving = true;
		return async ({ result, update: formUpdate }) => {
			isSaving = false;
			if (result.type === 'success') {
				alertStore.add('success', 'Qualities saved!');
				await formUpdate();
			} else if (result.type === 'failure') {
				const message = (result.data as { error?: string })?.error || 'Failed to save';
				alertStore.add('error', message);
			}
		};
	}}
>
	<input type="hidden" name="orderedItems" value={JSON.stringify(mainBucket)} />
	<input type="hidden" name="layer" value={selectedLayer} />
</form>

<div class="mt-6 space-y-6 md:px-4">
	<div
		class="min-h-[36rem] rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900"
		role="region"
		aria-label="Main quality configuration"
	>
		{#if mainBucket.length === 0}
			<div
				class="flex h-full items-center justify-center text-sm text-neutral-500 dark:text-neutral-400"
			>
				No qualities found
			</div>
		{:else}
			<div class="space-y-4">
				{#each mainBucket as item, index (item.type === 'quality' ? `quality-${item.name}-${index}` : `group-${item.name}-${index}`)}
					<div
						draggable={!isMobile}
						on:dragstart={() => handleQualityDragStart(item, index)}
						on:dragover={(e) => handleQualityDragOver(e, item, index)}
						on:dragleave={handleQualityDragLeave}
						on:drop={(e) => handleQualityDrop(e, item, index)}
						on:dragend={resetDragState}
						on:click={() => toggleEnabled(index)}
						on:keydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								toggleEnabled(index);
							}
						}}
						class="relative rounded-lg border border-neutral-200 bg-neutral-50 p-3 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700 {isMobile
							? 'cursor-pointer'
							: 'cursor-move'} {draggedQualityFromMain?.index ===
						index
							? 'scale-95 opacity-50'
							: ''}"
						style="transition: opacity 100ms, transform 100ms;"
						role="button"
						tabindex="0"
					>
						{#if hoverTargetIndex === index && willCreateGroup}
							<div
								class="pointer-events-none absolute inset-0 rounded-lg border-2 border-dashed border-green-500 bg-green-50/30 dark:border-green-400 dark:bg-green-950/30"
							></div>
						{/if}
						{#if hoverTargetIndex === index && willAddToGroup}
							<div
								class="pointer-events-none absolute inset-0 rounded-lg border-2 border-dashed border-accent-500 bg-accent-50/30 dark:border-accent-400 dark:bg-accent-950/30"
							></div>
						{/if}
						<div class="relative flex items-center justify-between">
							<div class="flex-1">
								{#if item.type === 'group' && editingGroupIndex === index}
									<input
										type="text"
										bind:value={editingGroupName}
										on:blur={saveGroupName}
										on:click={(e) => e.stopPropagation()}
										on:keydown={(e) => {
											if (e.key === 'Enter') saveGroupName();
											if (e.key === 'Escape') cancelEditingGroupName();
										}}
										class="max-w-xs rounded border border-accent-500 bg-white px-2 py-1 text-sm font-medium text-neutral-900 focus:ring-2 focus:ring-accent-500 focus:outline-none dark:bg-neutral-800 dark:text-neutral-100"
									/>
								{:else}
									<div class="font-medium text-neutral-900 dark:text-neutral-100">
										{#if item.type === 'group'}
											<span
												class="cursor-pointer hover:text-accent-600 dark:hover:text-accent-400"
												on:click={(e) => {
													e.stopPropagation();
													startEditingGroupName(item, index);
												}}
												on:keydown={(e) => {
													if (e.key === 'Enter' || e.key === ' ') {
														e.preventDefault();
														e.stopPropagation();
														startEditingGroupName(item, index);
													}
												}}
												role="button"
												tabindex="0"
											>
												{item.name}
											</span>
											<span class="ml-2 text-xs text-neutral-500 dark:text-neutral-400">(Group)</span>
										{:else}
											{item.name}
										{/if}
									</div>
									{#if item.type === 'group' && item.members}
										<div class="mt-1 hidden text-xs text-neutral-600 dark:text-neutral-400 md:block">
											{item.members.map((m) => m.name).join(', ')}
										</div>
									{/if}
								{/if}
							</div>
							<div class="flex items-center gap-3">
								<div class="flex items-center gap-1 md:hidden">
									<button
										type="button"
										disabled={index === 0}
										on:click|stopPropagation={() => moveItem(index, 'up')}
										class="flex h-7 w-7 items-center justify-center rounded border border-neutral-200 bg-white text-neutral-600 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
									>
										<ChevronUp size={16} />
									</button>
									<button
										type="button"
										disabled={index === mainBucket.length - 1}
										on:click|stopPropagation={() => moveItem(index, 'down')}
										class="flex h-7 w-7 items-center justify-center rounded border border-neutral-200 bg-white text-neutral-600 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
									>
										<ChevronDown size={16} />
									</button>
								</div>
								{#if hoverTargetIndex === index && willCreateGroup}
									<div class="text-xs font-medium text-green-600 dark:text-green-400">
										Create Group
									</div>
								{:else if hoverTargetIndex === index && willAddToGroup}
									<div class="text-xs font-medium text-accent-600 dark:text-accent-400">
										Add to Group
									</div>
								{/if}
								{#if item.type === 'group'}
									<button
										on:click={(e) => {
											e.stopPropagation();
											collapseGroup(item);
										}}
										class="rounded p-1 text-neutral-500 transition-colors hover:bg-neutral-200 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
										title="Collapse group into individual qualities"
									>
										<X size={16} />
									</button>
								{/if}
								<IconCheckbox
									checked={item.upgradeUntil}
									icon={ArrowUp}
									color="#07CA07"
									shape="circle"
									on:click={(e) => {
										e.stopPropagation();
										toggleUpgradeUntil(index);
									}}
								/>
								<IconCheckbox
									checked={item.enabled}
									icon={Check}
									color="blue"
									shape="circle"
									on:click={(e) => {
										e.stopPropagation();
										toggleEnabled(index);
									}}
								/>
							</div>
						</div>
						{#if item.type === 'group' && item.members}
							<div
								class="mt-3 border-t border-neutral-200 pt-3 text-xs text-neutral-600 dark:border-neutral-700 dark:text-neutral-400 md:hidden"
							>
								<div class="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
									Group Members
								</div>
								<div class="mt-1 text-sm text-neutral-900 dark:text-neutral-100">
									{item.members.map((m) => m.name).join(', ')}
								</div>
							</div>
						{/if}
					</div>
				{/each}
				<div class="h-[30px]"></div>
			</div>
		{/if}
	</div>
</div>

<InfoModal bind:open={showInfoModal} header="Qualities">
	<div class="space-y-4 text-sm text-neutral-600 dark:text-neutral-400">
		<div>
			<div class="font-medium text-neutral-900 dark:text-neutral-100">Qualities</div>
			<div class="mt-1">
				Define the order, grouping, and configuration of qualities. In previous versions, only
				enabled qualities were tracked. The new system stores all qualities (enabled and disabled)
				to maintain proper ordering across your entire quality profile. Missing qualities are
				automatically appended as disabled.
			</div>
		</div>

		<div>
			<div class="font-medium text-neutral-900 dark:text-neutral-100">Reordering</div>
			<div class="mt-1">
				Drag and drop qualities to change their priority. Higher positions indicate higher
				preference. The order determines which quality will be selected when multiple options are
				available.
			</div>
		</div>

		<div>
			<div class="font-medium text-neutral-900 dark:text-neutral-100">Creating Groups</div>
			<div class="mt-1">
				On desktop, hold Ctrl (or Cmd on Mac) while dragging a quality onto another quality to create
				a group. Groups allow multiple qualities to be treated as equal priority. You can also drag
				a quality onto an existing group to add it to that group. On mobile, use the Create Group
				button in the header.
			</div>
		</div>

		<div>
			<div class="font-medium text-neutral-900 dark:text-neutral-100">Group Names</div>
			<div class="mt-1">
				Click on a group name to edit it. Groups automatically get a default name when created, but
				you can customize this to better describe the qualities it contains.
			</div>
		</div>

		<div>
			<div class="font-medium text-neutral-900 dark:text-neutral-100">Collapsing Groups</div>
			<div class="mt-1">
				Click the X button on a group to break it apart into individual qualities. The qualities
				will maintain their enabled state and position.
			</div>
		</div>

		<div>
			<div class="font-medium text-neutral-900 dark:text-neutral-100">Enabled/Disabled</div>
			<div class="mt-1">
				The blue checkbox indicates whether a quality is enabled. Click anywhere on the quality row
				or the checkbox itself to toggle. Disabled qualities are still tracked for ordering purposes
				but won't be used for downloads.
			</div>
		</div>

		<div>
			<div class="font-medium text-neutral-900 dark:text-neutral-100">Upgrade Until</div>
			<div class="mt-1">
				The green arrow checkbox marks a quality as the "upgrade until" threshold. Only one quality
				can have this flag at a time. When a file reaches this quality level, the system will stop
				looking for upgrades. This quality must be enabled.
			</div>
		</div>

	</div>
</InfoModal>

<Modal
	open={showGroupModal}
	header="Create Group"
	confirmText="Create Group"
	cancelText="Cancel"
	confirmDisabled={!canCreateGroup}
	on:confirm={handleCreateGroup}
	on:cancel={closeGroupModal}
>
	<div slot="body" class="space-y-4">
		<p class="text-sm text-neutral-600 dark:text-neutral-400">
			Select at least two qualities to combine into a group. Groups share the same priority.
		</p>

		<div>
			<label
				for="quality-group-name"
				class="block text-sm font-medium text-neutral-900 dark:text-neutral-100"
			>
				Group Name (optional)
			</label>
			<input
				id="quality-group-name"
				type="text"
				bind:value={groupNameInput}
				placeholder="e.g. Web + Bluray"
				class="mt-2 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-accent-500 focus:ring-2 focus:ring-accent-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
			/>
		</div>

		<div class="max-h-72 overflow-auto rounded-lg border border-neutral-200 p-2 dark:border-neutral-700">
			{#if groupableItems.length < 2}
				<div class="px-3 py-4 text-sm text-neutral-500 dark:text-neutral-400">
					At least two qualities are required to create a group.
				</div>
			{:else}
				<div class="space-y-2">
					{#each groupableItems as item}
						<button
							type="button"
							on:click={() => toggleGroupSelection(item.name)}
							class="flex w-full items-center justify-between gap-3 rounded-md border border-neutral-200 bg-white px-3 py-2 text-left transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
						>
							<div class="flex items-center gap-3">
								<IconCheckbox
									checked={selectedGroupNames.has(item.name)}
									icon={Check}
									color="blue"
									shape="circle"
								/>
								<div class="text-sm font-medium text-neutral-900 dark:text-neutral-100">
									{item.name}
								</div>
							</div>
							<span
								class="text-xs text-neutral-500 dark:text-neutral-400"
							>
								{item.enabled ? 'Enabled' : 'Disabled'}
							</span>
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<div class="text-xs text-neutral-500 dark:text-neutral-400">
			Selected: {selectedGroupCount}
		</div>
	</div>
</Modal>
