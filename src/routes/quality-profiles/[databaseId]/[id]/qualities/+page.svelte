<script lang="ts">
	import { tick } from 'svelte';
	import { X, Check, ArrowUp, Info, Eye, EyeOff, Save, Loader2 } from 'lucide-svelte';
	import IconCheckbox from '$lib/client/ui/form/IconCheckbox.svelte';
	import InfoModal from '$ui/modal/InfoModal.svelte';
	import SaveTargetModal from '$ui/modal/SaveTargetModal.svelte';
	import ActionsBar from '$ui/actions/ActionsBar.svelte';
	import ActionButton from '$ui/actions/ActionButton.svelte';
	import { alertStore } from '$lib/client/alerts/store';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { current, isDirty, initEdit, update } from '$lib/client/stores/dirty';
	import type { PageData } from './$types';

	export let data: PageData;

	let showInfoModal = false;
	let showLegacyQualities = true;

	type OrderedItem = PageData['qualities']['orderedItems'][number];
	type QualityMember = PageData['qualities']['availableQualities'][number];

	// Form data shape
	interface QualitiesFormData {
		orderedItems: OrderedItem[];
		availableQualities: QualityMember[];
		[key: string]: unknown;
	}

	// Build initial data from server
	$: initialData = buildInitialData(data.qualities);

	function buildInitialData(qualities: typeof data.qualities): QualitiesFormData {
		return {
			orderedItems: structuredClone(qualities.orderedItems),
			availableQualities: structuredClone(qualities.availableQualities)
		};
	}

	// Initialize dirty tracking
	$: initEdit(initialData);

	// Reactive getters for current values
	$: mainBucket = ($current.orderedItems ?? []) as OrderedItem[];
	$: legacyBucket = ($current.availableQualities ?? []) as QualityMember[];

	// Save state
	let isSaving = false;
	let saveError: string | null = null;
	let selectedLayer: 'user' | 'base' = 'user';
	let showSaveTargetModal = false;
	let formElement: HTMLFormElement;

	// Drag state (local, not tracked for dirty)
	let draggedFromLegacy: QualityMember | null = null;
	let draggedQualityFromMain: { item: OrderedItem; index: number } | null = null;
	let lastTargetIndex: number | null = null;
	let hoverTargetIndex: number | null = null;
	let willCreateGroup: boolean = false;
	let willAddToGroup: boolean = false;
	let editingGroupIndex: number | null = null;
	let editingGroupName: string = '';
	let groupingMode: boolean = false;

	// Helper to update mainBucket in the store
	function updateMainBucket(newBucket: OrderedItem[]) {
		update('orderedItems', newBucket);
	}

	// Helper to update legacyBucket in the store
	function updateLegacyBucket(newBucket: QualityMember[]) {
		update('availableQualities', newBucket);
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

	function handleDragStart(item: QualityMember) {
		draggedFromLegacy = item;
	}

	function handleDragOverMain(e: DragEvent) {
		e.preventDefault();
	}

	function handleDropOnMain(e: DragEvent) {
		e.preventDefault();
		if (!draggedFromLegacy) return;

		const newLegacyBucket = legacyBucket.filter((q) => q.name !== draggedFromLegacy!.name);
		updateLegacyBucket(newLegacyBucket);

		const newItem: OrderedItem = {
			type: 'quality',
			name: draggedFromLegacy.name,
			position: mainBucket.length,
			enabled: false,
			upgradeUntil: false
		};

		const newBucket = [...mainBucket, newItem];
		newBucket.forEach((item, index) => {
			item.position = index;
		});
		updateMainBucket(newBucket);

		draggedFromLegacy = null;
	}

	function handleDragEnd() {
		draggedFromLegacy = null;
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

	async function handleSaveClick() {
		if (data.canWriteToBase) {
			showSaveTargetModal = true;
		} else {
			selectedLayer = 'user';
			await tick();
			formElement?.requestSubmit();
		}
	}

	async function handleLayerSelect(event: CustomEvent<'user' | 'base'>) {
		selectedLayer = event.detail;
		showSaveTargetModal = false;
		await tick();
		formElement?.requestSubmit();
	}
</script>

<svelte:head>
	<title>Qualities - Profilarr</title>
</svelte:head>

<!-- Save Bar -->
{#if $isDirty}
	<div
		class="sticky top-0 z-40 -mx-8 mb-6 flex items-center justify-between border-b border-neutral-200 bg-white/95 px-8 py-3 backdrop-blur-sm dark:border-neutral-700 dark:bg-neutral-900/95"
	>
		<div class="flex items-center gap-3">
			<span class="text-sm font-medium text-amber-600 dark:text-amber-400">Unsaved changes</span>
			{#if saveError}
				<span class="text-sm text-red-600 dark:text-red-400">{saveError}</span>
			{/if}
		</div>

		<button
			type="button"
			disabled={isSaving}
			on:click={handleSaveClick}
			class="flex items-center gap-1.5 rounded-lg bg-accent-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-accent-500 dark:hover:bg-accent-600"
		>
			{#if isSaving}
				<Loader2 size={14} class="animate-spin" />
				Saving...
			{:else}
				<Save size={14} />
				Save
			{/if}
		</button>
	</div>

	<!-- Hidden form for submission -->
	<form
		bind:this={formElement}
		method="POST"
		action="?/update"
		class="hidden"
		use:enhance={() => {
			isSaving = true;
			saveError = null;
			return async ({ result, update: formUpdate }) => {
				isSaving = false;
				if (result.type === 'success') {
					alertStore.add('success', 'Qualities saved!');
					initEdit(initialData);
					await formUpdate();
				} else if (result.type === 'failure') {
					saveError = (result.data as { error?: string })?.error || 'Failed to save';
					alertStore.add('error', saveError);
				}
			};
		}}
	>
		<input type="hidden" name="orderedItems" value={JSON.stringify(mainBucket)} />
		<input type="hidden" name="layer" value={selectedLayer} />
	</form>
{/if}

<div class="mt-6 space-y-6">
	<ActionsBar>
		<ActionButton icon={Info} on:click={() => (showInfoModal = true)} />
		<ActionButton
			icon={showLegacyQualities ? EyeOff : Eye}
			on:click={() => (showLegacyQualities = !showLegacyQualities)}
		/>
	</ActionsBar>

	<div
		class="grid gap-6"
		class:grid-cols-2={showLegacyQualities}
		class:grid-cols-1={!showLegacyQualities}
	>
		<!-- Main Bucket -->
		<div>
			<h2 class="mb-3 text-lg font-semibold text-neutral-900 dark:text-neutral-100">Qualities</h2>
			<div
				class="min-h-[36rem] rounded-lg border-2 border-dashed border-neutral-300 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900"
				on:dragover={handleDragOverMain}
				on:drop={handleDropOnMain}
				role="region"
				aria-label="Main quality configuration"
			>
				{#if mainBucket.length === 0}
					<div
						class="flex h-full items-center justify-center text-sm text-neutral-500 dark:text-neutral-400"
					>
						Drop qualities here
					</div>
				{:else}
					<div class="space-y-4">
						{#each mainBucket as item, index (item.type === 'quality' ? `quality-${item.name}-${index}` : `group-${item.name}-${index}`)}
							<div
								draggable={true}
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
								class="relative cursor-move rounded-lg border border-neutral-200 bg-neutral-50 p-3 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700 {draggedQualityFromMain?.index ===
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
													<span class="ml-2 text-xs text-neutral-500 dark:text-neutral-400"
														>(Group)</span
													>
												{:else}
													{item.name}
												{/if}
											</div>
											{#if item.type === 'group' && item.members}
												<div class="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
													{item.members.map((m) => m.name).join(', ')}
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
						<div
							class="flex h-full items-center justify-center text-sm text-neutral-500 dark:text-neutral-400"
						>
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
				Define the order, grouping, and configuration of qualities. In previous versions, only
				enabled qualities were tracked. The new system stores all qualities (enabled and disabled)
				to maintain proper ordering across your entire quality profile.
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
				Hold Ctrl (or Cmd on Mac) while dragging a quality onto another quality to create a group.
				Groups allow multiple qualities to be treated as equal priority. You can also drag a quality
				onto an existing group to add it to that group.
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

		<div>
			<div class="font-medium text-neutral-900 dark:text-neutral-100">Unmigrated Qualities</div>
			<div class="mt-1">
				When migrating from older profile versions, qualities that weren't previously enabled appear
				in the "Unmigrated Qualities" section. Drag these into your main configuration to include
				them in your quality profile ordering. These start as disabled by default.
			</div>
		</div>
	</div>
</InfoModal>

<!-- Save Target Modal -->
{#if data.canWriteToBase}
	<SaveTargetModal
		open={showSaveTargetModal}
		mode="save"
		on:select={handleLayerSelect}
		on:cancel={() => (showSaveTargetModal = false)}
	/>
{/if}
