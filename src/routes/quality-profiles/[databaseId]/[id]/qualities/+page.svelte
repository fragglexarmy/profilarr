<script lang="ts">
	import { tick, onMount, onDestroy } from 'svelte';
	import {
		X,
		Check,
		ArrowUp,
		Info,
		Save,
		Loader2,
		Layers,
		ChevronUp,
		ChevronDown,
		Pencil
	} from 'lucide-svelte';
	import IconCheckbox from '$lib/client/ui/form/IconCheckbox.svelte';
	import InfoModal from '$ui/modal/InfoModal.svelte';
	import GroupModal from './components/GroupModal.svelte';
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
	$: hasEnabledItems = mainBucket.some((item) => item.enabled);

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
	let groupingMode: boolean = false;
	let transparentDragImage: HTMLImageElement | null = null;

	// Group creation modal state
	let showGroupModal = false;
	type GroupModalMode = 'create' | 'edit';
	let groupModalMode: GroupModalMode = 'create';
	let groupNameInput = '';
	let selectedGroupNames = new Set<string>();

	type GroupModalItem = {
		name: string;
		enabled: boolean;
		upgradeUntil: boolean;
	};

	$: groupModalItems = buildGroupModalItems(mainBucket, groupModalMode, editingGroupIndex);
	$: groupNameValid = groupNameInput.trim().length > 0;
	$: canSaveGroup = selectedGroupNames.size >= 2 && groupNameValid;
	$: groupModalTitle = groupModalMode === 'edit' ? 'Edit Group' : 'Create Group';
	$: groupModalConfirmText = groupModalMode === 'edit' ? 'Save Group' : 'Create Group';
	$: groupModalDescription =
		groupModalMode === 'edit'
			? 'Select at least two qualities for this group. Groups share the same priority.'
			: 'Select at least two qualities to combine into a group. Groups share the same priority.';

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

	function getTransparentDragImage(): HTMLImageElement | null {
		if (transparentDragImage || typeof window === 'undefined') return transparentDragImage;
		const img = new Image();
		img.src = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
		transparentDragImage = img;
		return transparentDragImage;
	}

	// Helper to update mainBucket in the store
	function updateMainBucket(newBucket: OrderedItem[]) {
		update('orderedItems', newBucket);
	}

	function handleQualityDragStart(event: DragEvent, item: OrderedItem, index: number) {
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
			event.dataTransfer.dropEffect = 'move';
			event.dataTransfer.setData('text/plain', item.name);
			const dragImage = getTransparentDragImage();
			if (dragImage) {
				event.dataTransfer.setDragImage(dragImage, 0, 0);
			}
		}
		document.body.classList.add('dragging');
		draggedQualityFromMain = { item, index };
	}

	function handleQualityDragOver(e: DragEvent, targetItem: OrderedItem, targetIndex: number) {
		e.preventDefault();
		if (e.dataTransfer) {
			e.dataTransfer.dropEffect = 'move';
		}

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
					enabled: true,
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
		document.body.classList.remove('dragging');
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

	function buildGroupModalItems(
		items: OrderedItem[],
		mode: GroupModalMode,
		editIndex: number | null
	): GroupModalItem[] {
		const available = items
			.filter((item) => item.type === 'quality')
			.map((item) => ({
				name: item.name,
				enabled: item.enabled,
				upgradeUntil: item.upgradeUntil
			}));

		if (mode !== 'edit' || editIndex === null) {
			return available;
		}

		const group = items[editIndex];
		if (!group || group.type !== 'group' || !group.members) {
			return available;
		}

		const memberNames = group.members.map((member) => member.name);
		const memberItems = memberNames.map((name) => ({
			name,
			enabled: group.enabled,
			upgradeUntil: false
		}));

		const availableItems = available.filter((item) => !memberNames.includes(item.name));

		return [...memberItems, ...availableItems];
	}

	function openCreateGroupModal() {
		groupModalMode = 'create';
		editingGroupIndex = null;
		groupNameInput = '';
		selectedGroupNames = new Set();
		showGroupModal = true;
	}

	function openEditGroupModal(item: OrderedItem, index: number) {
		if (item.type !== 'group') return;
		groupModalMode = 'edit';
		editingGroupIndex = index;
		groupNameInput = item.name;
		selectedGroupNames = new Set(item.members?.map((member) => member.name) ?? []);
		showGroupModal = true;
	}

	function closeGroupModal() {
		showGroupModal = false;
		groupModalMode = 'create';
		editingGroupIndex = null;
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

	function handleGroupModalConfirm() {
		if (!canSaveGroup) return;
		if (groupModalMode === 'create') {
			createGroup();
			return;
		}
		updateGroup();
	}

	function createGroup() {
		const selectedItems = groupModalItems.filter((item) =>
			selectedGroupNames.has(item.name)
		);
		if (selectedItems.length < 2) return;

		const insertIndex = mainBucket.findIndex(
			(item) => item.type === 'quality' && selectedGroupNames.has(item.name)
		);
		if (insertIndex === -1) return;

		const groupName = groupNameInput.trim();
		if (!groupName) return;

		const newGroup: OrderedItem = {
			type: 'group',
			name: groupName,
			position: insertIndex,
			enabled: true,
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

	function updateGroup() {
		if (editingGroupIndex === null) return;

		const group = mainBucket[editingGroupIndex];
		if (!group || group.type !== 'group') return;

		const selectedItems = groupModalItems.filter((item) =>
			selectedGroupNames.has(item.name)
		);
		if (selectedItems.length < 2) return;

		const groupName = groupNameInput.trim();
		if (!groupName) return;

		const selectedNames = new Set(selectedItems.map((item) => item.name));
		const previousMembers = group.members?.map((member) => member.name) ?? [];
		const removedMembers = previousMembers.filter((name) => !selectedNames.has(name));

		const updatedGroup: OrderedItem = {
			...group,
			name: groupName,
			upgradeUntil: group.upgradeUntil || selectedItems.some((item) => item.upgradeUntil),
			members: selectedItems.map((item) => ({ name: item.name }))
		};

		const newBucket = mainBucket.filter((item) => {
			if (item === group) return true;
			if (item.type === 'quality' && selectedNames.has(item.name)) return false;
			return true;
		});

		const groupIndex = newBucket.indexOf(group);
		if (groupIndex === -1) return;

		newBucket[groupIndex] = updatedGroup;

		if (removedMembers.length > 0) {
			const restoredItems: OrderedItem[] = removedMembers.map((name, index) => ({
				type: 'quality' as const,
				name,
				position: groupIndex + 1 + index,
				enabled: group.enabled,
				upgradeUntil: false
			}));
			newBucket.splice(groupIndex + 1, 0, ...restoredItems);
		}

		newBucket.forEach((item, index) => {
			item.position = index;
		});

		updateMainBucket(newBucket);
		closeGroupModal();
	}

	async function handleSaveClick() {
		if (!hasEnabledItems) return;
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
			<Button
				text="Info"
				icon={Info}
				iconColor="text-blue-600 dark:text-blue-400"
				on:click={() => (showInfoModal = true)}
			/>
			<Button
				text="Create Group"
				icon={Layers}
				iconColor="text-accent-600 dark:text-accent-400"
				on:click={openCreateGroupModal}
			/>
			<Button
				disabled={isSaving || !$isDirty || !hasEnabledItems}
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
	<div class="space-y-4">
		{#each mainBucket as item, index (item.type === 'quality' ? `quality-${item.name}-${index}` : `group-${item.name}-${index}`)}
			<div
				draggable={!isMobile}
				on:dragstart={(e) => handleQualityDragStart(e, item, index)}
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
				class="relative rounded-lg border border-neutral-200 bg-neutral-100 p-3 hover:bg-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700 {isMobile
					? 'cursor-pointer'
					: draggedQualityFromMain?.index === index
						? 'cursor-grabbing'
						: 'cursor-grab'} {draggedQualityFromMain?.index === index
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
							<div class="font-medium text-neutral-900 dark:text-neutral-100">
								{#if item.type === 'group'}
									<span
										class="cursor-pointer hover:text-accent-600 dark:hover:text-accent-400"
										on:click|stopPropagation={() => openEditGroupModal(item, index)}
										on:keydown={(e) => {
											if (e.key === 'Enter' || e.key === ' ') {
												e.preventDefault();
												e.stopPropagation();
												openEditGroupModal(item, index);
											}
										}}
										role="button"
										tabindex="0"
									>
										{item.name}
									</span>
								{:else}
									{item.name}
								{/if}
							</div>
							{#if item.type === 'group' && item.members}
								<div class="mt-1 hidden text-xs text-neutral-600 dark:text-neutral-400 md:block">
									{item.members.map((m) => m.name).join(', ')}
								</div>
							{/if}
						</div>
						<div class="flex items-center gap-3">
							<div class="flex items-center gap-1 md:hidden">
								{#if item.type === 'group'}
									<button
										on:click={(e) => {
											e.stopPropagation();
											collapseGroup(item);
										}}
										class="flex h-7 w-7 items-center justify-center rounded border border-neutral-200 bg-neutral-100 text-neutral-600 transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
										title="Collapse group into individual qualities"
									>
										<X size={16} />
									</button>
									<button
										on:click|stopPropagation={() => openEditGroupModal(item, index)}
										class="flex h-7 w-7 items-center justify-center rounded border border-neutral-200 bg-neutral-100 text-neutral-600 transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
										title="Edit group"
									>
										<Pencil size={16} />
									</button>
								{/if}
								<button
									type="button"
									disabled={index === 0}
									on:click|stopPropagation={() => moveItem(index, 'up')}
									class="flex h-7 w-7 items-center justify-center rounded border border-neutral-200 bg-neutral-100 text-neutral-600 transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
								>
									<ChevronUp size={16} />
								</button>
								<button
									type="button"
									disabled={index === mainBucket.length - 1}
									on:click|stopPropagation={() => moveItem(index, 'down')}
									class="flex h-7 w-7 items-center justify-center rounded border border-neutral-200 bg-neutral-100 text-neutral-600 transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
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
									class="hidden h-7 w-7 items-center justify-center rounded border border-neutral-200 bg-neutral-100 text-neutral-600 transition-colors hover:bg-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 md:inline-flex"
									title="Collapse group into individual qualities"
								>
									<X size={16} />
								</button>
								<button
									on:click|stopPropagation={() => openEditGroupModal(item, index)}
									class="hidden h-7 w-7 items-center justify-center rounded border border-neutral-200 bg-neutral-100 text-neutral-600 transition-colors hover:bg-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 md:inline-flex"
									title="Edit group"
								>
									<Pencil size={16} />
								</button>
							{/if}
						<IconCheckbox
							checked={item.upgradeUntil}
							icon={ArrowUp}
							color="#07CA07"
							shape="circle"
							stopPropagation
							on:click={() => toggleUpgradeUntil(index)}
						/>
						<IconCheckbox
							checked={item.enabled}
							icon={Check}
							color="blue"
							shape="circle"
							stopPropagation
							on:click={() => toggleEnabled(index)}
						/>
					</div>
				</div>
				{#if item.type === 'group' && item.members}
					<div
						class="mt-3 border-t border-neutral-200 pt-3 text-xs text-neutral-600 dark:border-neutral-700 dark:text-neutral-400 md:hidden"
					>
						<div class="mt-1 text-sm text-neutral-900 dark:text-neutral-100">
							{item.members.map((m) => m.name).join(', ')}
						</div>
					</div>
				{/if}
			</div>
		{/each}
		<div class="h-[30px]"></div>
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

<GroupModal
	open={showGroupModal}
	title={groupModalTitle}
	confirmText={groupModalConfirmText}
	confirmDisabled={!canSaveGroup}
	description={groupModalDescription}
	items={groupModalItems}
	selectedNames={selectedGroupNames}
	bind:groupName={groupNameInput}
	on:confirm={handleGroupModalConfirm}
	on:cancel={closeGroupModal}
	on:toggle={(event) => toggleGroupSelection(event.detail.name)}
/>

<style>
	:global(body.dragging),
	:global(body.dragging *) {
		cursor: grabbing !important;
	}
</style>
