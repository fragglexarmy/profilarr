<script lang="ts">
	import { Check, X, Trash2 } from 'lucide-svelte';
	import { createEventDispatcher } from 'svelte';
	import IconCheckbox from '$ui/form/IconCheckbox.svelte';
	import Autocomplete from '$ui/form/Autocomplete.svelte';
	import Select from '$ui/form/Select.svelte';
	import {
		CONDITION_TYPES,
		PATTERN_TYPES,
		SOURCE_VALUES,
		RESOLUTION_VALUES,
		QUALITY_MODIFIER_VALUES,
		RELEASE_TYPE_VALUES,
		INDEXER_FLAG_VALUES,
		type ArrType
	} from '$lib/shared/conditionTypes';
	import type { ConditionData } from '$pcd/queries/customFormats/index';

	const dispatch = createEventDispatcher<{
		remove: void;
		change: ConditionData;
	}>();

	export let condition: ConditionData;
	export let arrType: ArrType = 'all';
	export let invalid = false;
	export let nameConflict = false;

	// Combined error state for styling
	$: hasError = invalid || nameConflict;

	// Available patterns and languages from database (passed in)
	export let availablePatterns: { id: number; name: string; pattern: string }[] = [];
	export let availableLanguages: { id: number; name: string }[] = [];
	// Note: availablePatterns/Languages still have id from DB, but ConditionData uses name for FK stability

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
		return 'all'; // Default to 'all' if neither is checked
	}

	// All condition types (no arrType filtering)
	$: filteredConditionTypes = [...CONDITION_TYPES];

	// Get value options based on current type (no arrType filtering - show all options)
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

	// Autocomplete options for patterns (use name as value for FK stability)
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
			case 'language':
				const lang = availableLanguages.find((l) => l.name === value);
				emitChange({ languages: lang ? [{ name: lang.name, except: false }] : [] });
				break;
		}
	}

	// Language options for Autocomplete (use name as value for FK stability)
	$: languageOptions = availableLanguages
		.map((l) => ({ value: l.name, label: l.name }))
		.sort((a, b) => {
			if (a.label === 'Any') return -1;
			if (b.label === 'Any') return 1;
			if (a.label === 'Original') return -1;
			if (b.label === 'Original') return 1;
			return a.label.localeCompare(b.label);
		});

	// Currently selected language for Autocomplete
	$: selectedLanguages = condition.languages
		? condition.languages.map((l) => ({ value: l.name, label: l.name }))
		: [];

	function handleLanguageChange(event: CustomEvent<{ value: string; label: string }[]>) {
		const selected = event.detail;
		if (selected.length > 0) {
			const langName = selected[0].value;
			const lang = availableLanguages.find((l) => l.name === langName);
			emitChange({ languages: lang ? [{ name: lang.name, except: false }] : [] });
		} else {
			emitChange({ languages: [] });
		}
	}

	// Handle type change - reset values
	function handleTypeChange(newType: string) {
		emitChange({
			type: newType,
			// Reset all value fields
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
	$: minSizeGB = condition.size?.minBytes ? condition.size.minBytes / 1024 / 1024 / 1024 : null;
	$: maxSizeGB = condition.size?.maxBytes ? condition.size.maxBytes / 1024 / 1024 / 1024 : null;

	function handleMinSizeChange(event: Event) {
		const value = parseFloat((event.target as HTMLInputElement).value);
		const currentSize = condition.size ?? { minBytes: null, maxBytes: null };
		emitChange({
			size: {
				...currentSize,
				minBytes: isNaN(value) ? null : Math.round(value * 1024 * 1024 * 1024)
			}
		});
	}

	function handleMaxSizeChange(event: Event) {
		const value = parseFloat((event.target as HTMLInputElement).value);
		const currentSize = condition.size ?? { minBytes: null, maxBytes: null };
		emitChange({
			size: {
				...currentSize,
				maxBytes: isNaN(value) ? null : Math.round(value * 1024 * 1024 * 1024)
			}
		});
	}

	function handleMinYearChange(event: Event) {
		const value = parseInt((event.target as HTMLInputElement).value);
		const currentYears = condition.years ?? { minYear: null, maxYear: null };
		emitChange({
			years: {
				...currentYears,
				minYear: isNaN(value) ? null : value
			}
		});
	}

	function handleMaxYearChange(event: Event) {
		const value = parseInt((event.target as HTMLInputElement).value);
		const currentYears = condition.years ?? { minYear: null, maxYear: null };
		emitChange({
			years: {
				...currentYears,
				maxYear: isNaN(value) ? null : value
			}
		});
	}

	function handleNameChange(event: Event) {
		emitChange({ name: (event.target as HTMLInputElement).value });
	}

	const inputClass =
		'w-full rounded-lg border border-neutral-300 bg-white px-2 py-1 text-sm font-mono text-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100';
</script>

<div
	class="flex items-center gap-3 rounded-lg border px-3 py-2 {invalid
		? 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20'
		: 'border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800'}"
>
	<!-- Name -->
	<div class="w-48 shrink-0" title={nameConflict ? 'Duplicate condition name' : ''}>
		<input
			type="text"
			value={condition.name}
			on:input={handleNameChange}
			placeholder="Condition name"
			class="{inputClass} {nameConflict ? 'text-red-500 dark:text-red-400' : ''}"
		/>
	</div>

	<!-- Type dropdown -->
	<div class="w-44 shrink-0">
		<Select
			options={typeOptions}
			value={condition.type}
			placeholder="Select type..."
			mono
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
				placeholder="Search patterns..."
				mono
				on:change={handlePatternChange}
			/>
		{:else if condition.type === 'language'}
			<Autocomplete
				options={languageOptions}
				selected={selectedLanguages}
				max={1}
				placeholder="Search languages..."
				mono
				on:change={handleLanguageChange}
			/>
		{:else if condition.type === 'size'}
			<div class="flex items-center gap-2">
				<input
					type="number"
					step="0.1"
					placeholder="Min"
					value={minSizeGB ?? ''}
					on:change={handleMinSizeChange}
					class="{inputClass} w-20 font-mono"
				/>
				<span class="text-sm text-neutral-500">-</span>
				<input
					type="number"
					step="0.1"
					placeholder="Max"
					value={maxSizeGB ?? ''}
					on:change={handleMaxSizeChange}
					class="{inputClass} w-20 font-mono"
				/>
				<span class="text-sm text-neutral-500 dark:text-neutral-400">GB</span>
			</div>
		{:else if condition.type === 'year'}
			<div class="flex items-center gap-2">
				<input
					type="number"
					placeholder="Min"
					value={condition.years?.minYear ?? ''}
					on:change={handleMinYearChange}
					class="{inputClass} w-20 font-mono"
				/>
				<span class="text-sm text-neutral-500">-</span>
				<input
					type="number"
					placeholder="Max"
					value={condition.years?.maxYear ?? ''}
					on:change={handleMaxYearChange}
					class="{inputClass} w-20 font-mono"
				/>
			</div>
		{:else}
			<!-- Enum-based types -->
			<Select
				options={valueOptions}
				value={selectedValue}
				placeholder="Select value..."
				mono
				on:change={(e) => handleSelectChange(e.detail)}
			/>
		{/if}
	</div>

	<!-- Negate -->
	<div class="flex shrink-0 items-center gap-1.5">
		<IconCheckbox
			icon={X}
			checked={condition.negate}
			color="red"
			on:click={() => emitChange({ negate: !condition.negate })}
		/>
		<span class="text-xs text-neutral-500 dark:text-neutral-400">Negate</span>
	</div>

	<!-- Required -->
	<div class="flex shrink-0 items-center gap-1.5">
		<IconCheckbox
			icon={Check}
			checked={condition.required}
			color="green"
			on:click={() => emitChange({ required: !condition.required })}
		/>
		<span class="text-xs text-neutral-500 dark:text-neutral-400">Required</span>
	</div>

	<!-- Radarr -->
	<div class="flex shrink-0 items-center gap-1.5">
		<IconCheckbox
			icon={Check}
			checked={radarrEnabled}
			color={ARR_COLORS.radarr}
			on:click={() => emitChange({ arrType: getArrType(!radarrEnabled, sonarrEnabled) })}
		/>
		<span class="text-xs text-neutral-500 dark:text-neutral-400">Radarr</span>
	</div>

	<!-- Sonarr -->
	<div class="flex shrink-0 items-center gap-1.5">
		<IconCheckbox
			icon={Check}
			checked={sonarrEnabled}
			color={ARR_COLORS.sonarr}
			on:click={() => emitChange({ arrType: getArrType(radarrEnabled, !sonarrEnabled) })}
		/>
		<span class="text-xs text-neutral-500 dark:text-neutral-400">Sonarr</span>
	</div>

	<!-- Remove -->
	<button
		type="button"
		on:click={() => dispatch('remove')}
		class="shrink-0 cursor-pointer p-1 text-neutral-400 transition-colors hover:text-red-500 dark:text-neutral-500 dark:hover:text-red-400"
		title="Remove condition"
	>
		<Trash2 size={16} />
	</button>
</div>
