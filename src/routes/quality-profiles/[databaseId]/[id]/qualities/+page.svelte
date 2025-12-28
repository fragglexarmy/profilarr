<script lang="ts">
	import { X, Check, ArrowUp, Info, Eye, EyeOff } from 'lucide-svelte';
	import IconCheckbox from '$lib/client/ui/form/IconCheckbox.svelte';
	import UnsavedChangesModal from '$ui/modal/UnsavedChangesModal.svelte';
	import InfoModal from '$ui/modal/InfoModal.svelte';
	import ActionsBar from '$ui/actions/ActionsBar.svelte';
	import ActionButton from '$ui/actions/ActionButton.svelte';
	import { alertStore } from '$lib/client/alerts/store';
	import { useUnsavedChanges } from '$lib/client/utils/unsavedChanges.svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	const unsavedChanges = useUnsavedChanges();

	let showInfoModal = false;
	let showLegacyQualities = true;

	type OrderedItem = PageData['qualities']['orderedItems'][number];
	type QualityMember = PageData['qualities']['availableQualities'][number];

	let mainBucket: OrderedItem[] = structuredClone(data.qualities.orderedItems);
	let legacyBucket: QualityMember[] = structuredClone(data.qualities.availableQualities);

	let draggedFromLegacy: QualityMember | null = null;
	let draggedQualityFromMain: { item: OrderedItem; index: number } | null = null;
	let lastTargetIndex: number | null = null;
	let hoverTargetIndex: number | null = null;
	let willCreateGroup: boolean = false;
	let willAddToGroup: boolean = false;
	let editingGroupIndex: number | null = null;
	let editingGroupName: string = '';
	let groupingMode: boolean = false; // For mobile toggle

	// Mark as dirty when mainBucket or legacyBucket changes
	$: if (
		JSON.stringify(mainBucket) !== JSON.stringify(data.qualities.orderedItems) ||
		JSON.stringify(legacyBucket) !== JSON.stringify(data.qualities.availableQualities)
	) {
		unsavedChanges.markDirty();
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

		// Grouping mode (Ctrl/Cmd held or mobile toggle enabled)
		if (isGroupingMode && draggedItem.type === 'quality') {
			// Check if we're hovering over a quality with a quality (create group)
			if (targetItem.type === 'quality') {
				willCreateGroup = true;
				willAddToGroup = false;
			}
			// Check if we're hovering over a group with a quality (add to group)
			else if (targetItem.type === 'group') {
				willCreateGroup = false;
				willAddToGroup = true;
			} else {
				willCreateGroup = false;
				willAddToGroup = false;
			}
		}
		// Reordering mode (default)
		else {
			willCreateGroup = false;
			willAddToGroup = false;

			// Only reorder if we've moved to a different item
			if (lastTargetIndex === targetIndex) return;

			lastTargetIndex = targetIndex;

			const newBucket = [...mainBucket];
			const sourceIndex = draggedQualityFromMain.index;
			const [movedItem] = newBucket.splice(sourceIndex, 1);
			newBucket.splice(targetIndex, 0, movedItem);

			// Recalculate positions
			newBucket.forEach((item, index) => {
				item.position = index;
			});

			mainBucket = newBucket;
			draggedQualityFromMain.index = targetIndex; // Update the dragged index
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

		// Grouping actions (only if Ctrl/Cmd held or grouping mode enabled)
		if (isGroupingMode && draggedItem.type === 'quality') {
			// Create a new group from two qualities
			if (targetItem.type === 'quality') {
				const newGroup: OrderedItem = {
					id: -1,
					type: 'group',
					referenceId: -1, // Will be assigned on save
					name: `${draggedItem.name} + ${targetItem.name}`,
					position: targetIndex,
					enabled: draggedItem.enabled && targetItem.enabled,
					upgradeUntil: draggedItem.upgradeUntil || targetItem.upgradeUntil,
					members: [
						{ id: draggedItem.referenceId, name: draggedItem.name },
						{ id: targetItem.referenceId, name: targetItem.name }
					]
				};

				const newBucket = [...mainBucket];
				// Remove both items
				const indicesToRemove = [sourceIndex, targetIndex].sort((a, b) => b - a);
				indicesToRemove.forEach(idx => newBucket.splice(idx, 1));
				// Insert the new group at the target position
				const insertPos = Math.min(sourceIndex, targetIndex);
				newBucket.splice(insertPos, 0, newGroup);

				// Recalculate positions
				newBucket.forEach((item, index) => {
					item.position = index;
				});
				mainBucket = newBucket;
			}
			// Add quality to existing group
			else if (targetItem.type === 'group') {
				const newBucket = [...mainBucket];
				const targetGroup = newBucket[targetIndex];

				// Add the quality to the group's members
				if (!targetGroup.members) targetGroup.members = [];
				targetGroup.members.push({
					id: draggedItem.referenceId,
					name: draggedItem.name
				});

				// Remove the dragged quality
				newBucket.splice(sourceIndex, 1);

				// Recalculate positions
				newBucket.forEach((item, index) => {
					item.position = index;
				});
				mainBucket = newBucket;
			}
		}
		// Reordering was already handled in dragover, just need to clean up

		resetDragState();
	}

	function resetDragState() {
		draggedQualityFromMain = null;
		lastTargetIndex = null;
		hoverTargetIndex = null;
		willCreateGroup = false;
		willAddToGroup = false;
	}

	function startEditingGroupName(item: OrderedItem, index: number) {
		if (item.type === 'group') {
			editingGroupIndex = index;
			editingGroupName = item.name;
		}
	}

	function saveGroupName() {
		if (editingGroupIndex !== null && editingGroupName.trim()) {
			mainBucket[editingGroupIndex].name = editingGroupName.trim();
			mainBucket = [...mainBucket]; // Trigger reactivity
		}
		editingGroupIndex = null;
		editingGroupName = '';
	}

	function cancelEditingGroupName() {
		editingGroupIndex = null;
		editingGroupName = '';
	}

	function toggleEnabled(index: number) {
		// Block disabling if the item has upgradeUntil set
		if (mainBucket[index].enabled && mainBucket[index].upgradeUntil) {
			alertStore.add('warning', 'Cannot disable an item that is set as "Upgrade Until". Please remove the "Upgrade Until" flag first.');
			return;
		}

		mainBucket[index].enabled = !mainBucket[index].enabled;
		mainBucket = [...mainBucket]; // Trigger reactivity
	}

	function toggleUpgradeUntil(index: number) {
		// Check if the item is enabled, if not enable it and alert
		if (!mainBucket[index].enabled) {
			mainBucket[index].enabled = true;
			alertStore.add('info', 'Item was automatically enabled because "Upgrade Until" requires it to be enabled.');
		}

		// Set this one and unset all others
		mainBucket.forEach((item, i) => {
			item.upgradeUntil = i === index;
		});
		mainBucket = [...mainBucket]; // Trigger reactivity
	}

	function handleDragStart(item: QualityMember) {
		draggedFromLegacy = item;
	}

	function handleDragOverMain(e: DragEvent) {
		e.preventDefault();
	}

	function handleDropOnMain(e: DragEvent) {
		e.preventDefault();
		if (!draggedFromLegacy) return;

		// Remove from legacy bucket
		legacyBucket = legacyBucket.filter(q => q.id !== draggedFromLegacy!.id);

		// Add to main bucket at the end
		const newItem: OrderedItem = {
			id: -1,
			type: 'quality',
			referenceId: draggedFromLegacy.id,
			name: draggedFromLegacy.name,
			position: mainBucket.length,
			enabled: false,
			upgradeUntil: false
		};

		const newBucket = [...mainBucket, newItem];
		// Recalculate positions
		newBucket.forEach((item, index) => {
			item.position = index;
		});
		mainBucket = newBucket;

		draggedFromLegacy = null;
	}

	function handleDragEnd() {
		draggedFromLegacy = null;
	}

	function collapseGroup(group: OrderedItem) {
		if (group.type !== 'group' || !group.members) return;

		// Find the index of the group
		const groupIndex = mainBucket.findIndex(item => item.id === group.id);
		if (groupIndex === -1) return;

		// Create individual quality items from group members
		const newQualities: OrderedItem[] = group.members.map((member, index) => ({
			id: -1, // Temporary ID
			type: 'quality' as const,
			referenceId: member.id,
			name: member.name,
			position: groupIndex + index,
			enabled: group.enabled,
			upgradeUntil: index === 0 ? group.upgradeUntil : false // Only first gets upgradeUntil
		}));

		// Remove the group and insert individual qualities
		const newBucket = [...mainBucket];
		newBucket.splice(groupIndex, 1, ...newQualities);

		// Recalculate positions
		newBucket.forEach((item, index) => {
			item.position = index;
		});

		mainBucket = newBucket;
	}
</script>

<svelte:head>
	<title>Qualities - Profilarr</title>
</svelte:head>

<UnsavedChangesModal />

<div class="mt-6 space-y-6">
	<ActionsBar>
		<ActionButton icon={Info} on:click={() => (showInfoModal = true)} />
		<ActionButton
			icon={showLegacyQualities ? EyeOff : Eye}
			on:click={() => (showLegacyQualities = !showLegacyQualities)}
		/>
	</ActionsBar>

	<div class="grid gap-6" class:grid-cols-2={showLegacyQualities} class:grid-cols-1={!showLegacyQualities}>
		<!-- Main Bucket -->
		<div>
			<h2 class="mb-3 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
				Qualities
			</h2>
			<div
				class="min-h-[36rem] rounded-lg border-2 border-dashed border-neutral-300 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900"
				on:dragover={handleDragOverMain}
				on:drop={handleDropOnMain}
				role="region"
				aria-label="Main quality configuration"
			>
				{#if mainBucket.length === 0}
					<div class="flex h-full items-center justify-center text-sm text-neutral-500 dark:text-neutral-400">
						Drop qualities here
					</div>
				{:else}
					<div class="space-y-4">
						{#each mainBucket as item, index (item.type === 'quality' ? `quality-${item.referenceId}` : `group-${item.id}`)}
							<div
								draggable={true}
								on:dragstart={() => handleQualityDragStart(item, index)}
								on:dragover={(e) => handleQualityDragOver(e, item, index)}
								on:dragleave={handleQualityDragLeave}
								on:drop={(e) => handleQualityDrop(e, item, index)}
								on:dragend={resetDragState}
								on:click={() => toggleEnabled(index)}
								on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleEnabled(index); } }}
								class="relative cursor-move rounded-lg border border-neutral-200 bg-neutral-50 p-3 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700 {draggedQualityFromMain?.index === index ? 'opacity-50 scale-95' : ''}"
								style="transition: opacity 100ms, transform 100ms;"
								role="button"
								tabindex="0"
							>
								{#if hoverTargetIndex === index && willCreateGroup}
									<div class="absolute inset-0 rounded-lg border-2 border-dashed border-green-500 bg-green-50/30 dark:border-green-400 dark:bg-green-950/30 pointer-events-none"></div>
								{/if}
								{#if hoverTargetIndex === index && willAddToGroup}
									<div class="absolute inset-0 rounded-lg border-2 border-dashed border-accent-500 bg-accent-50/30 dark:border-accent-400 dark:bg-accent-950/30 pointer-events-none"></div>
								{/if}
								<div class="flex items-center justify-between relative">
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
													class="max-w-xs rounded border border-accent-500 bg-white px-2 py-1 text-sm font-medium text-neutral-900 focus:outline-none focus:ring-2 focus:ring-accent-500 dark:bg-neutral-800 dark:text-neutral-100"
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
													<div class="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
														{item.members.map(m => m.name).join(', ')}
													</div>
												{/if}
											{/if}
									</div>
									<div class="flex items-center gap-3">
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
											bind:checked={item.upgradeUntil}
											icon={ArrowUp}
											color="#07CA07"
											shape="circle"
											on:click={(e) => {
												e.stopPropagation();
												toggleUpgradeUntil(index);
											}}
										/>
										<IconCheckbox
											bind:checked={item.enabled}
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
							</div>
						{/each}
						<div class="h-[30px]"></div>
					</div>
				{/if}
			</div>
		</div>

		<!-- Legacy Bucket -->
		{#if showLegacyQualities}
		<div>
			<h2 class="mb-3 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
				Unmigrated Qualities
			</h2>
			<div
				class="min-h-96 rounded-lg border-2 border-dashed border-neutral-300 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900"
			>
				{#if legacyBucket.length === 0}
					<div class="flex h-full items-center justify-center text-sm text-neutral-500 dark:text-neutral-400">
						All qualities added!
					</div>
				{:else}
					<div class="space-y-2">
						{#each legacyBucket as quality}
							<div
								draggable={true}
								on:dragstart={() => handleDragStart(quality)}
								on:dragend={handleDragEnd}
								class="cursor-move rounded-lg border border-neutral-200 bg-neutral-50 p-3 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700"
								role="button"
								tabindex="0"
							>
								<div class="font-medium text-neutral-900 dark:text-neutral-100">
									{quality.name}
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
		{/if}
	</div>
</div>

<InfoModal bind:open={showInfoModal} header="Qualities">
	<div class="space-y-4 text-sm text-neutral-600 dark:text-neutral-400">
		<div>
			<div class="font-medium text-neutral-900 dark:text-neutral-100">Qualities</div>
			<div class="mt-1">
				Define the order, grouping, and configuration of qualities. In previous versions, only enabled qualities were tracked. The new system stores all qualities (enabled and disabled) to maintain proper ordering across your entire quality profile.
			</div>
		</div>

		<div>
			<div class="font-medium text-neutral-900 dark:text-neutral-100">Reordering</div>
			<div class="mt-1">
				Drag and drop qualities to change their priority. Higher positions indicate higher preference. The order determines which quality will be selected when multiple options are available.
			</div>
		</div>

		<div>
			<div class="font-medium text-neutral-900 dark:text-neutral-100">Creating Groups</div>
			<div class="mt-1">
				Hold Ctrl (or Cmd on Mac) while dragging a quality onto another quality to create a group. Groups allow multiple qualities to be treated as equal priority. You can also drag a quality onto an existing group to add it to that group.
			</div>
		</div>

		<div>
			<div class="font-medium text-neutral-900 dark:text-neutral-100">Group Names</div>
			<div class="mt-1">
				Click on a group name to edit it. Groups automatically get a default name when created, but you can customize this to better describe the qualities it contains.
			</div>
		</div>

		<div>
			<div class="font-medium text-neutral-900 dark:text-neutral-100">Collapsing Groups</div>
			<div class="mt-1">
				Click the X button on a group to break it apart into individual qualities. The qualities will maintain their enabled state and position.
			</div>
		</div>

		<div>
			<div class="font-medium text-neutral-900 dark:text-neutral-100">Enabled/Disabled</div>
			<div class="mt-1">
				The blue checkbox indicates whether a quality is enabled. Click anywhere on the quality row or the checkbox itself to toggle. Disabled qualities are still tracked for ordering purposes but won't be used for downloads.
			</div>
		</div>

		<div>
			<div class="font-medium text-neutral-900 dark:text-neutral-100">Upgrade Until</div>
			<div class="mt-1">
				The green arrow checkbox marks a quality as the "upgrade until" threshold. Only one quality can have this flag at a time. When a file reaches this quality level, the system will stop looking for upgrades. This quality must be enabled.
			</div>
		</div>

		<div>
			<div class="font-medium text-neutral-900 dark:text-neutral-100">Unmigrated Qualities</div>
			<div class="mt-1">
				When migrating from older profile versions, qualities that weren't previously enabled appear in the "Unmigrated Qualities" section. Drag these into your main configuration to include them in your quality profile ordering. These start as disabled by default.
			</div>
		</div>
	</div>
</InfoModal>
