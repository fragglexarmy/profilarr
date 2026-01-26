<script lang="ts">
	import { enhance } from '$app/forms';
	import { tick } from 'svelte';
	import SaveTargetModal from '$ui/modal/SaveTargetModal.svelte';
	import StickyCard from '$ui/card/StickyCard.svelte';
	import Button from '$ui/button/Button.svelte';
	import RangeScale from '$ui/form/RangeScale.svelte';
	import type { Marker } from '$ui/form/RangeScale.svelte';
	import NumberInput from '$ui/form/NumberInput.svelte';
	import ExpandableTable from '$ui/table/ExpandableTable.svelte';
	import type { Column } from '$ui/table/types';
	import { alertStore } from '$alerts/store';
	import { Save, Trash2, ChevronDown } from 'lucide-svelte';
	import Dropdown from '$ui/dropdown/Dropdown.svelte';
	import DropdownItem from '$ui/dropdown/DropdownItem.svelte';
	import { isDirty, initEdit, initCreate, update } from '$lib/client/stores/dirty';
	import type { ArrType, QualityDefinitionsConfig, QualityDefinitionEntry } from '$pcd/queries/mediaManagement/quality-definitions/types.ts';
	import {
		type ResolutionGroup,
		RESOLUTION_GROUP_ORDER,
		RESOLUTION_GROUP_LABELS,
		getResolutionGroup
	} from '$lib/shared/mediaManagement.ts';

	export let mode: 'create' | 'edit';
	export let arrType: ArrType;
	export let databaseName: string;
	export let canWriteToBase: boolean = false;
	export let actionUrl: string = '';
	export let availableQualities: string[] = [];
	export let initialData: QualityDefinitionsConfig | null;

	// Form state
	let configName = initialData?.name ?? '';
	let entries: QualityDefinitionEntry[] = initialData?.entries ?? [];

	// Initialize entries for create mode
	$: if (mode === 'create' && entries.length === 0 && availableQualities.length > 0) {
		entries = availableQualities.map(quality_name => ({
			quality_name,
			min_size: 0,
			max_size: baseScaleMax,
			preferred_size: baseScaleMax
		}));
	}

	// Dirty tracking
	interface DirtyFormData {
		name: string;
		entries: QualityDefinitionEntry[];
		[key: string]: unknown;
	}

	function mapToFormData(data: QualityDefinitionsConfig | null): DirtyFormData {
		return {
			name: data?.name ?? '',
			entries: data?.entries ?? []
		};
	}

	if (mode === 'create') {
		initCreate(mapToFormData(initialData));
	} else {
		initEdit(mapToFormData(initialData));
	}

	$: update('name', configName);
	$: update('entries', entries);

	let saving = false;
	let deleting = false;
	let selectedLayer: 'user' | 'base' = 'user';
	let showSaveTargetModal = false;
	let showDeleteTargetModal = false;
	let expandedRows: Set<string | number> = new Set();
	let mainFormElement: HTMLFormElement;
	let deleteFormElement: HTMLFormElement;

	$: arrLabel = arrType === 'radarr' ? 'Radarr' : 'Sonarr';
	$: title = mode === 'create' ? `New ${arrLabel} Quality Definitions` : `Edit ${arrLabel} Quality Definitions`;
	$: description =
		mode === 'create'
			? `Create a new ${arrLabel} quality definitions configuration for ${databaseName}`
			: `Update ${arrLabel} quality definitions configuration`;
	$: isValid = configName.trim() !== '' && entries.length > 0;

	// Max scale value based on arr type (in base unit MB/min)
	$: baseScaleMax = arrType === 'radarr' ? 2000 : 1000;

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
		entries: QualityDefinitionEntry[];
	}

	$: groupedEntries = (() => {
		const groups: Map<ResolutionGroup, QualityDefinitionEntry[]> = new Map();

		// Initialize groups in order
		for (const res of RESOLUTION_GROUP_ORDER) {
			groups.set(res, []);
		}

		// Group entries
		for (const entry of entries) {
			const resolution = getResolutionGroup(entry.quality_name);
			groups.get(resolution)?.push(entry);
		}

		// Convert to array, filtering empty groups
		const result: QualityGroup[] = [];
		for (const res of RESOLUTION_GROUP_ORDER) {
			const groupEntries = groups.get(res) || [];
			if (groupEntries.length > 0) {
				result.push({
					resolution: res,
					label: RESOLUTION_GROUP_LABELS[res],
					entries: groupEntries
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

	// Markers for each quality
	function createMarkers(entry: QualityDefinitionEntry): Marker[] {
		const scaleMax = baseScaleMax;
		return [
			{ id: 'min', label: 'Min', color: 'blue', value: entry.min_size },
			{ id: 'preferred', label: 'Preferred', color: 'green', value: entry.preferred_size === 0 ? scaleMax : entry.preferred_size },
			{ id: 'max', label: 'Max', color: 'orange', value: entry.max_size === 0 ? scaleMax : entry.max_size }
		];
	}

	let markersMap: Record<string, Marker[]> = {};

	// Initialize markers
	$: {
		entries.forEach((entry) => {
			if (!markersMap[entry.quality_name]) {
				markersMap[entry.quality_name] = createMarkers(entry);
			}
		});
	}

	function syncToEntry(qualityName: string) {
		const markers = markersMap[qualityName];
		const entry = entries.find((e) => e.quality_name === qualityName);
		if (markers && entry) {
			entry.min_size = markers[0].value;
			entry.preferred_size = markers[1].value;
			entry.max_size = markers[2].value;
			entries = entries; // trigger reactivity
		}
	}

	// Note: API uses 0 for "unlimited", so convert baseScaleMax → 0 on save
	$: entriesForSubmit = JSON.stringify(
		entries.map((e) => ({
			quality_name: e.quality_name,
			min_size: e.min_size,
			max_size: e.max_size >= baseScaleMax ? 0 : e.max_size,
			preferred_size: e.preferred_size >= baseScaleMax ? 0 : e.preferred_size
		}))
	);

	async function handleSaveClick() {
		if (saving) return;
		if (canWriteToBase) {
			showSaveTargetModal = true;
		} else {
			saving = true;
			selectedLayer = 'user';
			await tick();
			mainFormElement?.requestSubmit();
		}
	}

	async function handleLayerSelect(event: CustomEvent<'user' | 'base'>) {
		if (saving) return;
		saving = true;
		selectedLayer = event.detail;
		showSaveTargetModal = false;
		await tick();
		mainFormElement?.requestSubmit();
	}

	async function handleDeleteClick() {
		if (canWriteToBase) {
			showDeleteTargetModal = true;
		} else {
			selectedLayer = 'user';
			await tick();
			deleteFormElement?.requestSubmit();
		}
	}

	async function handleDeleteLayerSelect(event: CustomEvent<'user' | 'base'>) {
		selectedLayer = event.detail;
		showDeleteTargetModal = false;
		await tick();
		deleteFormElement?.requestSubmit();
	}
</script>

<StickyCard position="top">
	<div slot="left">
		<h1 class="text-xl font-semibold text-neutral-900 dark:text-neutral-50">{title}</h1>
		<p class="text-sm text-neutral-500 dark:text-neutral-400">{description}</p>
	</div>
	<div slot="right" class="flex items-center gap-2">
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

		{#if mode === 'edit'}
			<Button
				text={deleting ? 'Deleting...' : 'Delete'}
				icon={Trash2}
				iconColor="text-red-600 dark:text-red-400"
				disabled={deleting || saving}
				on:click={handleDeleteClick}
			/>
		{/if}
		<Button
			text={saving ? 'Saving...' : mode === 'create' ? 'Create' : 'Save'}
			icon={Save}
			iconColor="text-blue-600 dark:text-blue-400"
			disabled={saving || !isValid || !$isDirty}
			on:click={handleSaveClick}
		/>
	</div>
</StickyCard>

<div class="mt-6 px-4 space-y-6">
	<!-- Name input -->
	<div class="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
		<h2 class="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Basic Info</h2>
		<div>
			<label
				for="name"
				class="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
			>
				Name <span class="text-red-500">*</span>
			</label>
			<input
				type="text"
				id="name"
				bind:value={configName}
				placeholder="e.g., default"
				class="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-accent-500 focus:ring-1 focus:ring-accent-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500"
			/>
		</div>
	</div>

	<!-- Quality definitions table -->
	{#if entries.length === 0}
		<div
			class="rounded-lg border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900"
		>
			<p class="text-neutral-600 dark:text-neutral-400">
				No qualities available for {arrLabel}
			</p>
		</div>
	{:else}
		<ExpandableTable
			{columns}
			data={groupedEntries}
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
						{row.entries.length}
					</span>
				{/if}
			</svelte:fragment>

			<svelte:fragment slot="expanded" let:row>
				<div class="divide-y divide-neutral-200 dark:divide-neutral-700">
					{#each row.entries as entry (entry.quality_name)}
						{@const markers = markersMap[entry.quality_name] || createMarkers(entry)}
						<div class="flex items-center gap-3 bg-white pt-5 pr-4 pb-8 pl-8 dark:bg-neutral-900">
							<!-- Quality Name -->
							<div class="w-32 shrink-0 text-sm font-medium text-neutral-900 dark:text-neutral-100">
								{entry.quality_name}
							</div>

							<!-- Range Scale -->
							<div class="min-w-0 flex-1 pt-4 pr-16 pl-2">
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
									bind:markers={markersMap[entry.quality_name]}
									on:change={() => syncToEntry(entry.quality_name)}
								/>
							</div>

							<!-- Number Inputs -->
							<div class="w-24 shrink-0">
								<div class="mb-1 flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400">
									Min <span class="text-neutral-400 dark:text-neutral-500">(MB/m)</span>
								</div>
								<NumberInput
									id="min-{entry.quality_name}"
									name="min-{entry.quality_name}"
									bind:value={markers[0].value}
									min={0}
									max={markers[1].value}
									step={1}
									onchange={() => syncToEntry(entry.quality_name)}
								/>
							</div>

							<div class="w-24 shrink-0">
								<div class="mb-1 flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
									Pref <span class="text-neutral-400 dark:text-neutral-500">(MB/m)</span>
								</div>
								<NumberInput
									id="preferred-{entry.quality_name}"
									name="preferred-{entry.quality_name}"
									bind:value={markers[1].value}
									min={markers[0].value}
									max={markers[2].value}
									step={1}
									onchange={() => syncToEntry(entry.quality_name)}
								/>
							</div>

							<div class="w-24 shrink-0">
								<div class="mb-1 flex items-center gap-1 text-xs font-medium text-orange-600 dark:text-orange-400">
									Max <span class="text-neutral-400 dark:text-neutral-500">(MB/m)</span>
								</div>
								<NumberInput
									id="max-{entry.quality_name}"
									name="max-{entry.quality_name}"
									bind:value={markers[2].value}
									min={markers[1].value}
									step={1}
									onchange={() => syncToEntry(entry.quality_name)}
								/>
							</div>
						</div>
					{/each}
				</div>
			</svelte:fragment>
		</ExpandableTable>
	{/if}
</div>

<!-- Hidden save form -->
<form
	bind:this={mainFormElement}
	method="POST"
	action={actionUrl}
	class="hidden"
	use:enhance={() => {
		saving = true;
		return async ({ result, update: formUpdate }) => {
			if (result.type === 'failure' && result.data) {
				alertStore.add('error', (result.data as { error?: string }).error || 'Operation failed');
			} else if (result.type === 'redirect') {
				alertStore.add(
					'success',
					mode === 'create' ? 'Quality definitions created!' : 'Quality definitions updated!'
				);
				initEdit({ name: configName, entries });
			}
			await formUpdate();
			saving = false;
		};
	}}
>
	<input type="hidden" name="arrType" value={arrType} />
	<input type="hidden" name="name" value={configName} />
	<input type="hidden" name="entries" value={entriesForSubmit} />
	<input type="hidden" name="layer" value={selectedLayer} />
</form>

<!-- Hidden delete form -->
{#if mode === 'edit'}
	<form
		bind:this={deleteFormElement}
		method="POST"
		action="?/delete"
		class="hidden"
		use:enhance={() => {
			deleting = true;
			return async ({ result, update: formUpdate }) => {
				if (result.type === 'failure' && result.data) {
					alertStore.add(
						'error',
						(result.data as { error?: string }).error || 'Failed to delete'
					);
				} else if (result.type === 'redirect') {
					alertStore.add('success', 'Quality definitions deleted');
				}
				await formUpdate();
				deleting = false;
			};
		}}
	>
		<input type="hidden" name="layer" value={selectedLayer} />
	</form>
{/if}

{#if canWriteToBase}
	<SaveTargetModal
		open={showSaveTargetModal}
		mode="save"
		on:select={handleLayerSelect}
		on:cancel={() => (showSaveTargetModal = false)}
	/>

	<SaveTargetModal
		open={showDeleteTargetModal}
		mode="delete"
		on:select={handleDeleteLayerSelect}
		on:cancel={() => (showDeleteTargetModal = false)}
	/>
{/if}
