<script lang="ts">
	import { Check, X, Trash2 } from 'lucide-svelte';
	import { createEventDispatcher } from 'svelte';
	import IconCheckbox from '$ui/form/IconCheckbox.svelte';
	import Autocomplete from '$ui/form/Autocomplete.svelte';
	import Select from '$ui/form/Select.svelte';

	const dispatch = createEventDispatcher<{ remove: void }>();
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

	export let condition: ConditionData;
	export let arrType: ArrType = 'all';

	// Available patterns and languages from database (passed in)
	export let availablePatterns: { id: number; name: string; pattern: string }[] = [];
	export let availableLanguages: { id: number; name: string }[] = [];

	// Filter condition types based on arrType
	$: filteredConditionTypes = CONDITION_TYPES.filter(
		(t) => t.arrType === 'all' || t.arrType === arrType
	);

	// Get value options based on current type
	$: valueOptions = getValueOptions(condition.type);

	function getValueOptions(type: string) {
		switch (type) {
			case 'source':
				return SOURCE_VALUES.filter((v) => v.arrType === 'all' || v.arrType === arrType);
			case 'resolution':
				return RESOLUTION_VALUES.filter((v) => v.arrType === 'all' || v.arrType === arrType);
			case 'quality_modifier':
				return QUALITY_MODIFIER_VALUES.filter((v) => v.arrType === 'all' || v.arrType === arrType);
			case 'release_type':
				return RELEASE_TYPE_VALUES.filter((v) => v.arrType === 'all' || v.arrType === arrType);
			case 'indexer_flag':
				return INDEXER_FLAG_VALUES.filter((v) => v.arrType === 'all' || v.arrType === arrType);
			default:
				return [];
		}
	}

	// Check if type is pattern-based
	$: isPatternType = PATTERN_TYPES.includes(condition.type as typeof PATTERN_TYPES[number]);

	// Autocomplete options for patterns
	$: patternOptions = availablePatterns.map((p) => ({ value: p.id.toString(), label: p.name }));

	// Currently selected pattern for Autocomplete
	$: selectedPatterns = condition.patterns
		? condition.patterns.map((p) => ({ value: p.id.toString(), label: availablePatterns.find((ap) => ap.id === p.id)?.name ?? p.pattern }))
		: [];

	function handlePatternChange(event: CustomEvent<{ value: string; label: string }[]>) {
		const selected = event.detail;
		if (selected.length > 0) {
			const patternId = parseInt(selected[0].value);
			const pattern = availablePatterns.find((p) => p.id === patternId);
			condition.patterns = pattern ? [{ id: pattern.id, pattern: pattern.pattern }] : [];
		} else {
			condition.patterns = [];
		}
	}

	// Reactive selected value based on condition type
	$: selectedValue = (() => {
		if (isPatternType) {
			return condition.patterns?.[0]?.id?.toString() ?? '';
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
				return condition.languages?.[0]?.id?.toString() ?? '';
			default:
				return '';
		}
	})();

	// Update value when Select changes
	function handleSelectChange(value: string) {
		switch (condition.type) {
			case 'source':
				condition.sources = value ? [value] : [];
				break;
			case 'resolution':
				condition.resolutions = value ? [value] : [];
				break;
			case 'quality_modifier':
				condition.qualityModifiers = value ? [value] : [];
				break;
			case 'release_type':
				condition.releaseTypes = value ? [value] : [];
				break;
			case 'indexer_flag':
				condition.indexerFlags = value ? [value] : [];
				break;
			case 'language':
				const langId = parseInt(value);
				const lang = availableLanguages.find((l) => l.id === langId);
				condition.languages = lang ? [{ id: lang.id, name: lang.name, except: false }] : [];
				break;
		}
	}

	// Language options for Autocomplete (Any first, Original second, then alphabetical)
	$: languageOptions = availableLanguages
		.map((l) => ({ value: l.id.toString(), label: l.name }))
		.sort((a, b) => {
			if (a.label === 'Any') return -1;
			if (b.label === 'Any') return 1;
			if (a.label === 'Original') return -1;
			if (b.label === 'Original') return 1;
			return a.label.localeCompare(b.label);
		});

	// Currently selected language for Autocomplete
	$: selectedLanguages = condition.languages
		? condition.languages.map((l) => ({ value: l.id.toString(), label: l.name }))
		: [];

	function handleLanguageChange(event: CustomEvent<{ value: string; label: string }[]>) {
		const selected = event.detail;
		if (selected.length > 0) {
			const langId = parseInt(selected[0].value);
			const lang = availableLanguages.find((l) => l.id === langId);
			condition.languages = lang ? [{ id: lang.id, name: lang.name, except: false }] : [];
		} else {
			condition.languages = [];
		}
	}

	// Handle type change - reset values
	function handleTypeChange(newType: string) {
		condition.type = newType;
		// Reset all value fields
		condition.patterns = undefined;
		condition.languages = undefined;
		condition.sources = undefined;
		condition.resolutions = undefined;
		condition.qualityModifiers = undefined;
		condition.releaseTypes = undefined;
		condition.indexerFlags = undefined;
		condition.size = undefined;
		condition.years = undefined;
	}

	// Type options for Select
	$: typeOptions = filteredConditionTypes.map((t) => ({ value: t.value, label: t.label }));

	// Size helpers (convert between bytes and GB for display)
	$: minSizeGB = condition.size?.minBytes ? condition.size.minBytes / 1024 / 1024 / 1024 : null;
	$: maxSizeGB = condition.size?.maxBytes ? condition.size.maxBytes / 1024 / 1024 / 1024 : null;

	function handleMinSizeChange(event: Event) {
		const value = parseFloat((event.target as HTMLInputElement).value);
		if (!condition.size) condition.size = { minBytes: null, maxBytes: null };
		condition.size.minBytes = isNaN(value) ? null : Math.round(value * 1024 * 1024 * 1024);
	}

	function handleMaxSizeChange(event: Event) {
		const value = parseFloat((event.target as HTMLInputElement).value);
		if (!condition.size) condition.size = { minBytes: null, maxBytes: null };
		condition.size.maxBytes = isNaN(value) ? null : Math.round(value * 1024 * 1024 * 1024);
	}

	function handleMinYearChange(event: Event) {
		const value = parseInt((event.target as HTMLInputElement).value);
		if (!condition.years) condition.years = { minYear: null, maxYear: null };
		condition.years.minYear = isNaN(value) ? null : value;
	}

	function handleMaxYearChange(event: Event) {
		const value = parseInt((event.target as HTMLInputElement).value);
		if (!condition.years) condition.years = { minYear: null, maxYear: null };
		condition.years.maxYear = isNaN(value) ? null : value;
	}

	const inputClass =
		'w-full rounded-lg border border-neutral-300 bg-white px-2 py-1 text-sm font-mono text-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100';
</script>

<div
	class="flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
>
	<!-- Name -->
	<div class="w-48 shrink-0">
		<input
			type="text"
			bind:value={condition.name}
			placeholder="Condition name"
			class={inputClass}
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
			on:click={() => (condition.negate = !condition.negate)}
		/>
		<span class="text-xs text-neutral-500 dark:text-neutral-400">Negate</span>
	</div>

	<!-- Required -->
	<div class="flex shrink-0 items-center gap-1.5">
		<IconCheckbox
			icon={Check}
			checked={condition.required}
			color="green"
			on:click={() => (condition.required = !condition.required)}
		/>
		<span class="text-xs text-neutral-500 dark:text-neutral-400">Required</span>
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
