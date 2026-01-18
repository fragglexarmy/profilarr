<script lang="ts">
	import { enhance } from '$app/forms';
	import { tick } from 'svelte';
	import type { QualityDefinition } from '$pcd/queries/mediaManagement';
	import RangeScale from '$ui/form/RangeScale.svelte';
	import type { Marker } from '$ui/form/RangeScale.svelte';
	import NumberInput from '$ui/form/NumberInput.svelte';
	import ExpandableTable from '$ui/table/ExpandableTable.svelte';
	import type { Column } from '$ui/table/types';
	import { ChevronDown, Check, Pencil, X, Loader2 } from 'lucide-svelte';
	import Dropdown from '$ui/dropdown/Dropdown.svelte';
	import DropdownItem from '$ui/dropdown/DropdownItem.svelte';
	import { alertStore } from '$lib/client/alerts/store';
	import SaveTargetModal from '$ui/modal/SaveTargetModal.svelte';
	import {
		type ResolutionGroup,
		RESOLUTION_GROUP_ORDER,
		RESOLUTION_GROUP_LABELS,
		getResolutionGroup
	} from '$lib/shared/mediaManagement';

	export let definitions: QualityDefinition[];
	export let arrType: 'radarr' | 'sonarr';
	export let canWriteToBase: boolean = false;

	// Edit mode state (exported for parent dirty tracking)
	export let isEditing = false;
	export let hasChanges = false;
	let isSaving = false;

	// Shared expanded state between read-only and edit mode tables
	let expandedRows: Set<string | number> = new Set();

	// Layer selection
	let selectedLayer: 'user' | 'base' = 'user';
	let showSaveTargetModal = false;
	let formElement: HTMLFormElement;

	// Store original definitions for cancel
	let originalDefinitions: QualityDefinition[] = [];

	// Unit options with conversion multipliers (base unit is MB/min)
	interface UnitOption {
		id: string;
		label: string;
		short: string;
		multiplier: number;
	}

	const RADARR_UNITS: UnitOption[] = [
		{ id: 'mb-min', label: 'MB per minute', short: 'MB/m', multiplier: 1 },
		{ id: 'gb-hr', label: 'GB per hour', short: 'GB/h', multiplier: 60 / 1024 },
		{ id: 'gb-90', label: 'GB per 90 min', short: 'GB/90m', multiplier: 90 / 1024 },
		{ id: 'gb-2hr', label: 'GB per 2 hours', short: 'GB/2h', multiplier: 120 / 1024 }
	];

	const SONARR_UNITS: UnitOption[] = [
		{ id: 'mb-min', label: 'MB per minute', short: 'MB/m', multiplier: 1 },
		{ id: 'mb-30', label: 'MB per 30 min', short: 'MB/30m', multiplier: 30 },
		{ id: 'gb-45', label: 'GB per 45 min', short: 'GB/45m', multiplier: 45 / 1024 },
		{ id: 'gb-hr', label: 'GB per hour', short: 'GB/h', multiplier: 60 / 1024 }
	];

	$: unitOptions = arrType === 'radarr' ? RADARR_UNITS : SONARR_UNITS;
	$: defaultUnit = arrType === 'radarr' ? 'gb-2hr' : 'gb-45';

	let selectedUnitId: string = defaultUnit;
	let showUnitDropdown = false;

	$: selectedUnit = unitOptions.find((u) => u.id === selectedUnitId) || unitOptions[0];

	// Convert from base (MB/min) to display unit
	function toDisplayUnit(value: number): number {
		return value * selectedUnit.multiplier;
	}

	// Group definitions by resolution
	interface QualityGroup {
		resolution: ResolutionGroup;
		label: string;
		definitions: QualityDefinition[];
	}

	$: groupedDefinitions = (() => {
		const groups: Map<ResolutionGroup, QualityDefinition[]> = new Map();

		// Initialize groups in order
		for (const res of RESOLUTION_GROUP_ORDER) {
			groups.set(res, []);
		}

		// Group definitions
		for (const def of definitions) {
			const resolution = getResolutionGroup(def.quality_name);
			groups.get(resolution)?.push(def);
		}

		// Convert to array, filtering empty groups
		const result: QualityGroup[] = [];
		for (const res of RESOLUTION_GROUP_ORDER) {
			const defs = groups.get(res) || [];
			if (defs.length > 0) {
				result.push({
					resolution: res,
					label: RESOLUTION_GROUP_LABELS[res],
					definitions: defs
				});
			}
		}
		return result;
	})();

	// Table columns
	const columns: Column<QualityGroup>[] = [
		{
			key: 'label',
			header: 'Resolution',
			sortable: false
		},
		{
			key: 'count',
			header: 'Qualities',
			align: 'right',
			sortable: false
		}
	];

	// Convert definitions to reactive markers for each quality
	function createMarkers(def: QualityDefinition): Marker[] {
		return [
			{ id: 'min', label: 'Min', color: 'blue', value: def.min_size },
			{ id: 'preferred', label: 'Preferred', color: 'green', value: def.preferred_size },
			{ id: 'max', label: 'Max', color: 'orange', value: def.max_size }
		];
	}

	// Track markers for each definition by quality_name
	let markersMap: Record<string, Marker[]> = {};

	// Initialize markers from definitions
	$: {
		definitions.forEach((def) => {
			if (!markersMap[def.quality_name]) {
				markersMap[def.quality_name] = createMarkers(def);
			}
		});
	}

	// Sync marker values back to definitions when they change
	function syncToDefinition(qualityName: string) {
		const markers = markersMap[qualityName];
		const def = definitions.find((d) => d.quality_name === qualityName);
		if (markers && def) {
			def.min_size = markers[0].value;
			def.preferred_size = markers[1].value;
			def.max_size = markers[2].value;
			definitions = definitions; // trigger reactivity
		}
	}

	// Max scale value based on arr type (in base unit MB/min)
	$: baseScaleMax = arrType === 'radarr' ? 2000 : 1000;

	// Edit mode functions
	function startEditing() {
		originalDefinitions = definitions.map((d) => ({ ...d }));
		isEditing = true;
	}

	function cancelEditing() {
		definitions = originalDefinitions.map((d) => ({ ...d }));
		markersMap = {};
		definitions.forEach((def) => {
			markersMap[def.quality_name] = createMarkers(def);
		});
		isEditing = false;
	}

	async function handleSaveClick() {
		if (canWriteToBase) {
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

	// Get changed definitions
	$: changedDefinitions = definitions.filter((d) => {
		const original = originalDefinitions.find((o) => o.quality_name === d.quality_name);
		if (!original) return true;
		return (
			d.min_size !== original.min_size ||
			d.max_size !== original.max_size ||
			d.preferred_size !== original.preferred_size
		);
	});

	$: hasChanges = changedDefinitions.length > 0;

	$: definitionsForSubmit = JSON.stringify(
		changedDefinitions.map((d) => ({
			quality_name: d.quality_name,
			min_size: d.min_size,
			max_size: d.max_size,
			preferred_size: d.preferred_size
		}))
	);
</script>

<section>
	<div class="mb-4 flex items-center justify-between">
		<h2 class="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
			Quality Definitions
		</h2>

		<div class="flex items-center gap-2">
			<!-- Unit selector -->
			<div class="relative">
				<button
					type="button"
					on:click={() => (showUnitDropdown = !showUnitDropdown)}
					on:blur={() => setTimeout(() => (showUnitDropdown = false), 150)}
					class="flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
				>
					{selectedUnit.label}
					<ChevronDown
						size={14}
						class="transition-transform {showUnitDropdown ? 'rotate-180' : ''}"
					/>
				</button>

				{#if showUnitDropdown}
					<Dropdown position="right" minWidth="12rem">
						{#each unitOptions as unit}
							<DropdownItem
								label="{unit.label} ({unit.short})"
								selected={selectedUnitId === unit.id}
								on:click={() => {
									selectedUnitId = unit.id;
									showUnitDropdown = false;
								}}
							/>
						{/each}
					</Dropdown>
				{/if}
			</div>

			<!-- Edit button -->
			{#if definitions.length > 0 && !isEditing}
				<button
					type="button"
					on:click={startEditing}
					class="flex cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
				>
					<Pencil size={14} />
					Edit
				</button>
			{/if}
		</div>
	</div>

	{#if definitions.length === 0}
		<div
			class="rounded-lg border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900"
		>
			<p class="text-neutral-600 dark:text-neutral-400">
				No quality definitions configured for {arrType === 'radarr' ? 'Radarr' : 'Sonarr'}
			</p>
		</div>
	{:else if isEditing}
		<!-- Edit Mode -->
		<form
			bind:this={formElement}
			method="POST"
			action="?/updateQualityDefinitions"
			use:enhance={() => {
				isSaving = true;
				return async ({ result, update }) => {
					if (result.type === 'failure' && result.data) {
						alertStore.add('error', (result.data as { error?: string }).error || 'Failed to save');
					} else if (result.type === 'success') {
						alertStore.add('success', 'Quality definitions updated');
						isEditing = false;
					}
					await update();
					if (result.type === 'success') {
						markersMap = {};
					}
					isSaving = false;
				};
			}}
		>
			<input type="hidden" name="layer" value={selectedLayer} />
			<input type="hidden" name="definitions" value={definitionsForSubmit} />

			<ExpandableTable
				{columns}
				data={groupedDefinitions}
				getRowId={(group) => group.resolution}
				emptyMessage="No quality definitions"
				flushExpanded
				flushBottom
				bind:expandedRows
			>
				<svelte:fragment slot="cell" let:row let:column>
					{#if column.key === 'label'}
						{row.label}
					{:else if column.key === 'count'}
						<span
							class="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
						>
							{row.definitions.length}
						</span>
					{/if}
				</svelte:fragment>

				<svelte:fragment slot="expanded" let:row>
					<div class="divide-y divide-neutral-200 dark:divide-neutral-700">
						{#each row.definitions as def (def.quality_name)}
							{@const markers = markersMap[def.quality_name] || createMarkers(def)}
							<div class="flex items-center gap-3 bg-white pb-8 pt-5 pl-8 pr-4 dark:bg-neutral-900">
								<!-- Quality Name -->
								<div
									class="w-32 shrink-0 text-sm font-medium text-neutral-900 dark:text-neutral-100"
								>
									{def.quality_name}
								</div>

								<!-- Range Scale -->
								<div class="min-w-0 flex-1 pl-2 pr-16 pt-4">
									<RangeScale
										orientation="horizontal"
										direction="start"
										min={0}
										max={baseScaleMax}
										step={1}
										minSeparation={5}
										unit={selectedUnit.short}
										unlimitedValue={baseScaleMax}
										displayTransform={toDisplayUnit}
										bind:markers={markersMap[def.quality_name]}
										on:change={() => syncToDefinition(def.quality_name)}
									/>
								</div>

								<!-- Number Inputs -->
								<div class="w-24 shrink-0">
									<div
										class="mb-1 flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400"
									>
										Min <span class="text-neutral-400 dark:text-neutral-500">(MB/m)</span>
									</div>
									<NumberInput
										id="min-{def.quality_name}"
										name="min-{def.quality_name}"
										bind:value={markers[0].value}
										min={0}
										max={markers[1].value}
										step={1}
										onchange={() => syncToDefinition(def.quality_name)}
									/>
								</div>

								<div class="w-24 shrink-0">
									<div
										class="mb-1 flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400"
									>
										Pref <span class="text-neutral-400 dark:text-neutral-500">(MB/m)</span>
									</div>
									<NumberInput
										id="preferred-{def.quality_name}"
										name="preferred-{def.quality_name}"
										bind:value={markers[1].value}
										min={markers[0].value}
										max={markers[2].value}
										step={1}
										onchange={() => syncToDefinition(def.quality_name)}
									/>
								</div>

								<div class="w-24 shrink-0">
									<div
										class="mb-1 flex items-center gap-1 text-xs font-medium text-orange-600 dark:text-orange-400"
									>
										Max <span class="text-neutral-400 dark:text-neutral-500">(MB/m)</span>
									</div>
									<NumberInput
										id="max-{def.quality_name}"
										name="max-{def.quality_name}"
										bind:value={markers[2].value}
										min={markers[1].value}
										step={1}
										onchange={() => syncToDefinition(def.quality_name)}
									/>
								</div>
							</div>
						{/each}
					</div>
				</svelte:fragment>
			</ExpandableTable>

			<!-- Actions -->
			<div
				class="flex justify-end gap-2 rounded-b-lg border border-t-0 border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-800/50"
			>
				<button
					type="button"
					on:click={cancelEditing}
					disabled={isSaving}
					class="flex cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
				>
					<X size={14} />
					Cancel
				</button>
				<button
					type="button"
					on:click={handleSaveClick}
					disabled={isSaving || !hasChanges}
					class="flex cursor-pointer items-center gap-1.5 rounded-lg bg-accent-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-accent-500 dark:hover:bg-accent-600"
				>
					{#if isSaving}
						<Loader2 size={14} class="animate-spin" />
						Saving...
					{:else}
						<Check size={14} />
						Save
					{/if}
				</button>
			</div>
		</form>
	{:else}
		<!-- Display Mode (read-only) -->
		<ExpandableTable
			{columns}
			data={groupedDefinitions}
			getRowId={(group) => group.resolution}
			emptyMessage="No quality definitions"
			flushExpanded
			bind:expandedRows
		>
			<svelte:fragment slot="cell" let:row let:column>
				{#if column.key === 'label'}
					{row.label}
				{:else if column.key === 'count'}
					<span
						class="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
					>
						{row.definitions.length}
					</span>
				{/if}
			</svelte:fragment>

			<svelte:fragment slot="expanded" let:row>
				<div class="divide-y divide-neutral-200 dark:divide-neutral-700">
					{#each row.definitions as def (def.quality_name)}
						{@const markers = markersMap[def.quality_name] || createMarkers(def)}
						<div class="flex items-center gap-3 bg-white pb-8 pt-5 pl-8 pr-4 dark:bg-neutral-900">
							<!-- Quality Name -->
							<div class="w-32 shrink-0 text-sm font-medium text-neutral-900 dark:text-neutral-100">
								{def.quality_name}
							</div>

							<!-- Range Scale (read-only) -->
							<div class="pointer-events-none min-w-0 flex-1 pl-2 pr-16 pt-4">
								<RangeScale
									orientation="horizontal"
									direction="start"
									min={0}
									max={baseScaleMax}
									step={1}
									minSeparation={5}
									unit={selectedUnit.short}
									unlimitedValue={baseScaleMax}
									displayTransform={toDisplayUnit}
									bind:markers={markersMap[def.quality_name]}
								/>
							</div>

							<!-- Values display (read-only) -->
							<div class="w-24 shrink-0">
								<div
									class="mb-1 flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400"
								>
									Min <span class="text-neutral-400 dark:text-neutral-500">(MB/m)</span>
								</div>
								<div
									class="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
								>
									{def.min_size}
								</div>
							</div>

							<div class="w-24 shrink-0">
								<div
									class="mb-1 flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400"
								>
									Pref <span class="text-neutral-400 dark:text-neutral-500">(MB/m)</span>
								</div>
								<div
									class="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
								>
									{def.preferred_size}
								</div>
							</div>

							<div class="w-24 shrink-0">
								<div
									class="mb-1 flex items-center gap-1 text-xs font-medium text-orange-600 dark:text-orange-400"
								>
									Max <span class="text-neutral-400 dark:text-neutral-500">(MB/m)</span>
								</div>
								<div
									class="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
								>
									{def.max_size === baseScaleMax ? 'Unlimited' : def.max_size}
								</div>
							</div>
						</div>
					{/each}
				</div>
			</svelte:fragment>
		</ExpandableTable>
	{/if}
</section>

<!-- Save Target Modal -->
{#if canWriteToBase}
	<SaveTargetModal
		open={showSaveTargetModal}
		mode="save"
		on:select={handleLayerSelect}
		on:cancel={() => (showSaveTargetModal = false)}
	/>
{/if}
