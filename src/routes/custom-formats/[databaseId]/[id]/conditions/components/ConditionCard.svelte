<script lang="ts">
	import { Check, X, Trash2 } from 'lucide-svelte';
	import { createEventDispatcher } from 'svelte';
	import IconCheckbox from '$ui/form/IconCheckbox.svelte';
	import Autocomplete from '$ui/form/Autocomplete.svelte';
	import Input from '$ui/form/Input.svelte';
	import NumberInput from '$ui/form/NumberInput.svelte';
	import DropdownSelect from '$ui/dropdown/DropdownSelect.svelte';
	import Badge from '$ui/badge/Badge.svelte';
	import {
		CONDITION_TYPES,
		PATTERN_TYPES,
		SOURCE_VALUES,
		RESOLUTION_VALUES,
		QUALITY_MODIFIER_VALUES,
		RELEASE_TYPE_VALUES,
		INDEXER_FLAG_VALUES
	} from '$shared/pcd/conditions';
	import type { ArrType } from '$shared/pcd/types.ts';
	import type { ConditionData } from '$shared/pcd/display.ts';

	const dispatch = createEventDispatcher<{
		remove: void;
		confirm: ConditionData;
		discard: void;
		change: ConditionData;
	}>();

	// Mode: 'normal' for existing conditions, 'draft' for new unsaved conditions
	export let mode: 'normal' | 'draft' = 'normal';
	export let condition: ConditionData;
	export let invalid = false;
	export let nameConflict = false;
	export let hasDrafts = false;

	// Available patterns and languages from database (passed in)
	export let availablePatterns: { id: number; name: string; pattern: string }[] = [];
	export let availableLanguages: { name: string; radarr: boolean; sonarr: boolean }[] = [];

	// Computed states based on mode
	$: isDraft = mode === 'draft';
	$: rightPadding = isDraft ? 'pr-14' : hasDrafts ? 'pr-14' : 'pr-3';

	// Helper to emit changes - creates new object to maintain immutability
	function emitChange(updates: Partial<ConditionData>) {
		dispatch('change', { ...condition, ...updates });
	}

	// Arr type toggle colors and state
	const ARR_COLORS = { radarr: '#FFC230', sonarr: '#00CCFF' };

	$: radarrEnabled = condition.arrType === 'all' || condition.arrType === 'radarr';
	$: sonarrEnabled = condition.arrType === 'all' || condition.arrType === 'sonarr';

	function getArrType(r: boolean, s: boolean): 'all' | 'radarr' | 'sonarr' {
		if (r && s) return 'all';
		if (r) return 'radarr';
		if (s) return 'sonarr';
		return 'all';
	}

	// All condition types
	$: filteredConditionTypes = [...CONDITION_TYPES];

	// Get value options based on current type
	$: valueOptions = getValueOptions(condition.type);

	function getValueOptions(type: string) {
		switch (type) {
			case 'source':
				return [...SOURCE_VALUES];
			case 'resolution':
				return [...RESOLUTION_VALUES];
			case 'quality_modifier':
				return [...QUALITY_MODIFIER_VALUES];
			case 'release_type':
				return [...RELEASE_TYPE_VALUES];
			case 'indexer_flag':
				return [...INDEXER_FLAG_VALUES];
			default:
				return [];
		}
	}

	// Check if type is pattern-based
	$: isPatternType = PATTERN_TYPES.includes(condition.type as (typeof PATTERN_TYPES)[number]);

	// Autocomplete options for patterns
	$: patternOptions = availablePatterns.map((p) => ({ value: p.name, label: p.name }));

	// Currently selected pattern for Autocomplete
	$: selectedPatterns = condition.patterns
		? condition.patterns.map((p) => ({ value: p.name, label: p.name }))
		: [];

	function handlePatternChange(event: CustomEvent<{ value: string; label: string }[]>) {
		const selected = event.detail;
		if (selected.length > 0) {
			const patternName = selected[0].value;
			const pattern = availablePatterns.find((p) => p.name === patternName);
			emitChange({ patterns: pattern ? [{ name: pattern.name, pattern: pattern.pattern }] : [] });
		} else {
			emitChange({ patterns: [] });
		}
	}

	// Reactive selected value based on condition type
	$: selectedValue = (() => {
		if (isPatternType) {
			return condition.patterns?.[0]?.name ?? '';
		}
		switch (condition.type) {
			case 'source':
				return condition.sources?.[0] ?? '';
			case 'resolution':
				return condition.resolutions?.[0] ?? '';
			case 'quality_modifier':
				return condition.qualityModifiers?.[0] ?? '';
			case 'release_type':
				return condition.releaseTypes?.[0] ?? '';
			case 'indexer_flag':
				return condition.indexerFlags?.[0] ?? '';
			case 'language':
				return condition.languages?.[0]?.name ?? '';
			default:
				return '';
		}
	})();

	// Update value when Select changes
	function handleSelectChange(value: string) {
		switch (condition.type) {
			case 'source':
				emitChange({ sources: value ? [value] : [] });
				break;
			case 'resolution':
				emitChange({ resolutions: value ? [value] : [] });
				break;
			case 'quality_modifier':
				emitChange({ qualityModifiers: value ? [value] : [] });
				break;
			case 'release_type':
				emitChange({ releaseTypes: value ? [value] : [] });
				break;
			case 'indexer_flag':
				emitChange({ indexerFlags: value ? [value] : [] });
				break;
		}
	}

	// Language options for Autocomplete
	$: languageOptions = availableLanguages.map((l) => ({
		value: l.name,
		label: l.name,
		radarr: l.radarr,
		sonarr: l.sonarr
	}));

	// Currently selected language for Autocomplete
	$: selectedLanguages = condition.languages
		? condition.languages.map((l) => ({ value: l.name, label: l.name }))
		: [];

	// Language except state
	$: hasLanguage = (condition.languages?.length ?? 0) > 0;
	$: languageExcept = condition.languages?.[0]?.except ?? false;

	function handleLanguageChange(event: CustomEvent<{ value: string; label: string }[]>) {
		const selected = event.detail;
		if (selected.length > 0) {
			const langName = selected[0].value;
			emitChange({ languages: [{ name: langName, except: languageExcept }] });
		} else {
			emitChange({ languages: [] });
		}
	}

	function toggleLanguageExcept() {
		if (hasLanguage) {
			emitChange({
				languages: [{ ...condition.languages![0], except: !languageExcept }]
			});
		}
	}

	// Handle type change - reset values
	function handleTypeChange(newType: string) {
		emitChange({
			type: newType,
			patterns: undefined,
			languages: undefined,
			sources: undefined,
			resolutions: undefined,
			qualityModifiers: undefined,
			releaseTypes: undefined,
			indexerFlags: undefined,
			size: undefined,
			years: undefined
		});
	}

	// Type options for Select
	$: typeOptions = filteredConditionTypes.map((t) => ({ value: t.value, label: t.label }));

	// Size helpers (convert between bytes and GB for display)
	$: minSizeGB = condition.size?.minBytes
		? condition.size.minBytes / 1024 / 1024 / 1024
		: undefined;
	$: maxSizeGB = condition.size?.maxBytes
		? condition.size.maxBytes / 1024 / 1024 / 1024
		: undefined;

	function handleMinSizeChange(value: number | undefined) {
		const currentSize = condition.size ?? { minBytes: null, maxBytes: null };
		emitChange({
			size: {
				...currentSize,
				minBytes: value == null ? null : Math.round(value * 1024 * 1024 * 1024)
			}
		});
	}

	function handleMaxSizeChange(value: number | undefined) {
		const currentSize = condition.size ?? { minBytes: null, maxBytes: null };
		emitChange({
			size: {
				...currentSize,
				maxBytes: value == null ? null : Math.round(value * 1024 * 1024 * 1024)
			}
		});
	}

	// Year helpers
	$: minYear = condition.years?.minYear ?? undefined;
	$: maxYear = condition.years?.maxYear ?? undefined;

	function handleMinYearChange(value: number | undefined) {
		const currentYears = condition.years ?? { minYear: null, maxYear: null };
		emitChange({
			years: {
				...currentYears,
				minYear: value ?? null
			}
		});
	}

	function handleMaxYearChange(value: number | undefined) {
		const currentYears = condition.years ?? { minYear: null, maxYear: null };
		emitChange({
			years: {
				...currentYears,
				maxYear: value ?? null
			}
		});
	}

	const inputClass =
		'w-full rounded-lg border border-neutral-300 bg-white px-2 py-1 text-sm font-mono text-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100';
</script>

<div class="relative flex items-center gap-3 py-2 pl-3 {rightPadding}">
	<!-- Name -->
	<div class="w-48 shrink-0" title={nameConflict ? 'Duplicate condition name' : ''}>
		<Input
			value={condition.name}
			placeholder="Condition name"
			width="w-full"
			error={invalid && !isDraft}
			on:input={(e) => emitChange({ name: e.detail })}
		/>
	</div>

	<!-- Type dropdown -->
	<div class="w-52 shrink-0">
		<DropdownSelect
			options={typeOptions}
			value={condition.type}
			fullWidth
			on:change={(e) => handleTypeChange(e.detail)}
		/>
	</div>

	<!-- Value input - changes based on type -->
	<div class="min-w-0 flex-1">
		{#if isPatternType}
			<Autocomplete
				options={patternOptions}
				selected={selectedPatterns}
				max={1}
				placeholder="Select pattern..."
				mono
				on:change={handlePatternChange}
			/>
		{:else if condition.type === 'language'}
			<div class="flex items-center gap-2">
				<div class="min-w-0 flex-1">
					<Autocomplete
						options={languageOptions}
						selected={selectedLanguages}
						max={1}
						placeholder="Select language..."
						mono
						customItems
						fullWidth
						on:change={handleLanguageChange}
					>
						<svelte:fragment slot="item" let:option>
							<span class="flex items-center justify-between w-full">
								<span>{option.label}</span>
								<span class="flex gap-1">
									{#if option.radarr}
										<Badge variant="warning" size="sm">Radarr</Badge>
									{/if}
									{#if option.sonarr}
										<Badge variant="info" size="sm">Sonarr</Badge>
									{/if}
								</span>
							</span>
						</svelte:fragment>
					</Autocomplete>
				</div>
				<button
					type="button"
					class="relative z-10 flex shrink-0 items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-left transition-colors dark:border-neutral-600 dark:bg-neutral-800 {hasLanguage
						? 'cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700'
						: 'cursor-not-allowed opacity-50'}"
					disabled={!hasLanguage}
					on:click={toggleLanguageExcept}
				>
					<span class="text-sm text-neutral-700 dark:text-neutral-300">Except</span>
					<IconCheckbox icon={X} checked={languageExcept} color="red" shape="rounded" />
				</button>
			</div>
		{:else if condition.type === 'size'}
			<div class="flex items-center gap-2">
				<div class="flex-1">
					<NumberInput
						name="minSize"
						value={minSizeGB}
						min={0}
						step={1}
						font="mono"
						placeholder="Min GB"
						on:change={(e) => handleMinSizeChange(e.detail)}
					/>
				</div>
				<span class="text-sm text-neutral-500">-</span>
				<div class="flex-1">
					<NumberInput
						name="maxSize"
						value={maxSizeGB}
						min={0}
						step={1}
						font="mono"
						placeholder="Max GB"
						on:change={(e) => handleMaxSizeChange(e.detail)}
					/>
				</div>
			</div>
		{:else if condition.type === 'year'}
			<div class="flex items-center gap-2">
				<div class="flex-1">
					<NumberInput
						name="minYear"
						value={minYear}
						min={1900}
						max={2100}
						step={1}
						font="mono"
						placeholder="Min Year"
						on:change={(e) => handleMinYearChange(e.detail)}
					/>
				</div>
				<span class="text-sm text-neutral-500">-</span>
				<div class="flex-1">
					<NumberInput
						name="maxYear"
						value={maxYear}
						min={1900}
						max={2100}
						step={1}
						font="mono"
						placeholder="Max Year"
						on:change={(e) => handleMaxYearChange(e.detail)}
					/>
				</div>
			</div>
		{:else}
			<!-- Enum-based types -->
			<DropdownSelect
				options={valueOptions}
				value={selectedValue}
				fullWidth
				on:change={(e) => handleSelectChange(e.detail)}
			/>
		{/if}
	</div>

	<!-- Controls - right aligned -->
	<div class="ml-auto flex shrink-0 items-center gap-2">
		<!-- Negate -->
		<button
			type="button"
			class="flex cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-left transition-colors hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800 dark:hover:bg-neutral-700"
			on:click={() => emitChange({ negate: !condition.negate })}
		>
			<span class="text-sm text-neutral-700 dark:text-neutral-300">Negate</span>
			<IconCheckbox icon={X} checked={condition.negate} color="red" shape="rounded" />
		</button>

		<!-- Required -->
		<button
			type="button"
			class="flex cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-left transition-colors hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800 dark:hover:bg-neutral-700"
			on:click={() => emitChange({ required: !condition.required })}
		>
			<span class="text-sm text-neutral-700 dark:text-neutral-300">Required</span>
			<IconCheckbox icon={Check} checked={condition.required} color="green" shape="rounded" />
		</button>

		<!-- Radarr -->
		<button
			type="button"
			class="flex cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-left transition-colors hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800 dark:hover:bg-neutral-700"
			on:click={() => emitChange({ arrType: getArrType(!radarrEnabled, sonarrEnabled) })}
		>
			<span class="text-sm text-neutral-700 dark:text-neutral-300">Radarr</span>
			<IconCheckbox icon={Check} checked={radarrEnabled} color={ARR_COLORS.radarr} shape="rounded" />
		</button>

		<!-- Sonarr -->
		<button
			type="button"
			class="flex cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-left transition-colors hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800 dark:hover:bg-neutral-700"
			on:click={() => emitChange({ arrType: getArrType(radarrEnabled, !sonarrEnabled) })}
		>
			<span class="text-sm text-neutral-700 dark:text-neutral-300">Sonarr</span>
			<IconCheckbox icon={Check} checked={sonarrEnabled} color={ARR_COLORS.sonarr} shape="rounded" />
		</button>

		<!-- Action buttons based on mode -->
		{#if isDraft}
			<!-- Discard -->
			<button
				type="button"
				on:click={() => dispatch('discard')}
				class="flex cursor-pointer items-center rounded-lg border border-neutral-300 bg-white p-2 transition-colors hover:border-red-300 hover:bg-red-50 dark:border-neutral-600 dark:bg-neutral-800 dark:hover:border-red-500 dark:hover:bg-red-900/20"
				title="Discard condition"
			>
				<Trash2 size={14} class="text-red-500 dark:text-red-400" />
			</button>
		{:else}
			<!-- Remove -->
			<button
				type="button"
				on:click={() => dispatch('remove')}
				class="flex cursor-pointer items-center rounded-lg border border-neutral-300 bg-white p-2 transition-colors hover:border-red-300 hover:bg-red-50 dark:border-neutral-600 dark:bg-neutral-800 dark:hover:border-red-500 dark:hover:bg-red-900/20"
				title="Remove condition"
			>
				<Trash2 size={14} class="text-red-500 dark:text-red-400" />
			</button>
		{/if}
	</div>

	<!-- Confirm button for draft mode - positioned in right padding -->
	{#if isDraft}
		<button
			type="button"
			on:click={() => dispatch('confirm', condition)}
			class="absolute right-3 top-1/2 -translate-y-1/2 flex cursor-pointer items-center rounded-lg border border-neutral-300 bg-white p-2 transition-colors hover:border-emerald-300 hover:bg-emerald-50 dark:border-neutral-600 dark:bg-neutral-800 dark:hover:border-emerald-500 dark:hover:bg-emerald-900/20"
			title="Confirm condition"
		>
			<Check size={14} class="text-emerald-500 dark:text-emerald-400" />
		</button>
	{/if}
</div>
