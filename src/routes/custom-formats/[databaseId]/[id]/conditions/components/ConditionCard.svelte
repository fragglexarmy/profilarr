<script lang="ts">
	import { Check, X, Trash2, Ban } from 'lucide-svelte';
	import RadarrIcon from '$lib/client/assets/Radarr.svg';
	import SonarrIcon from '$lib/client/assets/Sonarr.svg';
	import { createEventDispatcher } from 'svelte';
	import IconCheckbox from '$ui/form/IconCheckbox.svelte';
	import Input from '$ui/form/Input.svelte';
	import NumberInput from '$ui/form/NumberInput.svelte';
	import DropdownSelect from '$ui/dropdown/DropdownSelect.svelte';
	import Badge from '$ui/badge/Badge.svelte';
	import SearchDropdown from '$ui/form/SearchDropdown.svelte';
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

	// Available patterns and languages from database (passed in)
	export let availablePatterns: { id: number; name: string; pattern: string }[] = [];
	export let availableLanguages: { name: string; radarr: boolean; sonarr: boolean }[] = [];

	// Computed states based on mode
	$: isDraft = mode === 'draft';
	$: rightPaddingClass = 'pr-3';

	// Helper to emit changes - creates new object to maintain immutability
	function emitChange(updates: Partial<ConditionData>) {
		dispatch('change', { ...condition, ...updates });
	}

	$: radarrEnabled = condition.arrType === 'all' || condition.arrType === 'radarr';
	$: sonarrEnabled = condition.arrType === 'all' || condition.arrType === 'sonarr';

	function getArrType(r: boolean, s: boolean): 'all' | 'radarr' | 'sonarr' {
		if (r && s) return 'all';
		if (r) return 'radarr';
		if (s) return 'sonarr';
		return 'all';
	}

	const toggleBase =
		'inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors';
	const toggleIdle =
		'border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700';
	const segmentBase =
		'inline-flex h-10 items-center gap-2 px-3 text-sm font-medium transition-colors';
	const segmentIdle =
		'bg-white text-neutral-600 hover:bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700';

	function toggleClass(active: boolean, variant: 'danger' | 'success') {
		if (!active) return `${toggleBase} ${toggleIdle}`;
		return variant === 'danger'
			? `${toggleBase} border-red-300 bg-red-50 text-red-600 dark:border-red-500/70 dark:bg-red-900/20 dark:text-red-300`
			: `${toggleBase} border-emerald-300 bg-emerald-50 text-emerald-600 dark:border-emerald-500/70 dark:bg-emerald-900/20 dark:text-emerald-300`;
	}

	function segmentClass(active: boolean, variant: 'neutral' | 'radarr' | 'sonarr', hasDivider: boolean) {
		const dividerClass = hasDivider ? 'border-r border-neutral-300 dark:border-neutral-600' : '';
		if (!active) return `${segmentBase} ${segmentIdle} ${dividerClass}`;
		switch (variant) {
			case 'radarr':
				return `${segmentBase} bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-300 ${dividerClass}`;
			case 'sonarr':
				return `${segmentBase} bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-300 ${dividerClass}`;
			default:
				return `${segmentBase} bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200 ${dividerClass}`;
		}
	}

	function actionClass(variant: 'danger' | 'success') {
		if (variant === 'danger') {
			return `${toggleBase} border-neutral-300 bg-white text-red-600 hover:border-red-300 hover:bg-red-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-red-300 dark:hover:border-red-500 dark:hover:bg-red-900/20`;
		}
		return `${toggleBase} border-neutral-300 bg-white text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50 dark:border-neutral-600 dark:bg-neutral-800 dark:text-emerald-300 dark:hover:border-emerald-500 dark:hover:bg-emerald-900/20`;
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

	function handlePatternChange(value: string) {
		if (!value) {
			emitChange({ patterns: [] });
			return;
		}
		const pattern = availablePatterns.find((p) => p.name === value);
		emitChange({ patterns: pattern ? [{ name: pattern.name, pattern: pattern.pattern }] : [] });
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

	// Language except state
	$: hasLanguage = (condition.languages?.length ?? 0) > 0;
	$: languageExcept = condition.languages?.[0]?.except ?? false;

	function handleLanguageChange(value: string) {
		if (!value) {
			emitChange({ languages: [] });
			return;
		}
		emitChange({ languages: [{ name: value, except: languageExcept }] });
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

<div class="relative flex flex-col gap-3 py-3 px-3 {rightPaddingClass} md:flex-row md:items-center">
	<!-- Name -->
	<div class="w-full min-w-0 shrink-0 md:w-48" title={nameConflict ? 'Duplicate condition name' : ''}>
		<Input
			value={condition.name}
			placeholder="Condition name"
			width="w-full"
			error={invalid && !isDraft}
			on:input={(e) => emitChange({ name: e.detail })}
		/>
	</div>

	<div class="flex w-full min-w-0 flex-row gap-3 md:contents">
		<!-- Type dropdown -->
		<div class="w-36 min-w-0 shrink-0 md:w-52">
			<DropdownSelect
				options={typeOptions}
				value={condition.type}
				fullWidth
				buttonSize="md"
				on:change={(e) => handleTypeChange(e.detail)}
			/>
		</div>

		<!-- Value input - changes based on type -->
		<div class="min-w-0 flex-1">
			{#if isPatternType}
				<SearchDropdown
					options={patternOptions}
					value={selectedValue}
					placeholder="Select pattern..."
					on:change={(e) => handlePatternChange(e.detail)}
				/>
			{:else if condition.type === 'language'}
				<div class="flex flex-col gap-2 md:flex-row md:items-center">
					<div class="min-w-0 flex-1">
						<SearchDropdown
							options={languageOptions}
							value={selectedValue}
							placeholder="Select language..."
							on:change={(e) => handleLanguageChange(e.detail)}
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
						</SearchDropdown>
					</div>
					<button
						type="button"
						class={`${toggleClass(languageExcept, 'danger')} ${hasLanguage ? '' : 'cursor-not-allowed opacity-50'}`}
						disabled={!hasLanguage}
						on:click={toggleLanguageExcept}
					>
						<X size={16} />
						<span>Except</span>
					</button>
				</div>
			{:else if condition.type === 'size'}
				<div class="flex flex-col gap-2 md:flex-row md:items-center">
					<div class="w-full flex-1">
						<NumberInput
							name="minSize"
							value={minSizeGB}
							min={0}
							step={1}
							font="mono"
							responsive
							placeholder="Min GB"
							on:change={(e) => handleMinSizeChange(e.detail)}
						/>
					</div>
					<span class="hidden text-sm text-neutral-500 md:inline">-</span>
					<div class="w-full flex-1">
						<NumberInput
							name="maxSize"
							value={maxSizeGB}
							min={0}
							step={1}
							font="mono"
							responsive
							placeholder="Max GB"
							on:change={(e) => handleMaxSizeChange(e.detail)}
						/>
					</div>
				</div>
			{:else if condition.type === 'year'}
				<div class="flex flex-col gap-2 md:flex-row md:items-center">
					<div class="w-full flex-1">
						<NumberInput
							name="minYear"
							value={minYear}
							min={1900}
							max={2100}
							step={1}
							font="mono"
							responsive
							placeholder="Min Year"
							on:change={(e) => handleMinYearChange(e.detail)}
						/>
					</div>
					<span class="hidden text-sm text-neutral-500 md:inline">-</span>
					<div class="w-full flex-1">
						<NumberInput
							name="maxYear"
							value={maxYear}
							min={1900}
							max={2100}
							step={1}
							font="mono"
							responsive
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
					buttonSize="md"
					on:change={(e) => handleSelectChange(e.detail)}
				/>
			{/if}
		</div>
	</div>

	<!-- Controls - right aligned -->
	<div class="flex flex-wrap items-center gap-2 md:ml-auto md:shrink-0">
		<!-- Negate -->
		<button
			type="button"
			class={toggleClass(condition.negate, 'danger')}
			on:click={() => emitChange({ negate: !condition.negate })}
			aria-pressed={condition.negate}
			title="Negate"
		>
			<Ban size={16} />
			<span>Negate</span>
		</button>

		<!-- Required -->
		<button
			type="button"
			class={toggleClass(condition.required, 'success')}
			on:click={() => emitChange({ required: !condition.required })}
			aria-pressed={condition.required}
			title="Required"
		>
			<Check size={16} />
			<span>Required</span>
		</button>

		<!-- Arr type -->
		<div class="inline-flex overflow-hidden rounded-lg border border-neutral-300 dark:border-neutral-600">
			<button
				type="button"
				class={segmentClass(condition.arrType === 'all', 'neutral', true)}
				on:click={() => emitChange({ arrType: 'all' })}
				aria-pressed={condition.arrType === 'all'}
				title="All"
			>
				All
			</button>
			<button
				type="button"
				class={segmentClass(condition.arrType === 'radarr', 'radarr', true)}
				on:click={() => emitChange({ arrType: 'radarr' })}
				aria-pressed={condition.arrType === 'radarr'}
				title="Radarr"
			>
				<img src={RadarrIcon} alt="Radarr" class="h-4 w-4" />
				Radarr
			</button>
			<button
				type="button"
				class={segmentClass(condition.arrType === 'sonarr', 'sonarr', false)}
				on:click={() => emitChange({ arrType: 'sonarr' })}
				aria-pressed={condition.arrType === 'sonarr'}
				title="Sonarr"
			>
				<img src={SonarrIcon} alt="Sonarr" class="h-4 w-4" />
				Sonarr
			</button>
		</div>

		<!-- Action buttons based on mode -->
		{#if isDraft}
			<!-- Discard -->
			<button
				type="button"
				on:click={() => dispatch('discard')}
				class={actionClass('danger')}
				title="Discard condition"
			>
				<Trash2 size={16} />
				<span>Discard</span>
			</button>
		{:else}
			<!-- Remove -->
			<button
				type="button"
				on:click={() => dispatch('remove')}
				class={actionClass('danger')}
				title="Remove condition"
			>
				<Trash2 size={16} />
				<span>Remove</span>
			</button>
		{/if}

		{#if isDraft}
			<button
				type="button"
				on:click={() => dispatch('confirm', condition)}
				class={actionClass('success')}
				title="Confirm condition"
			>
				<Check size={16} />
				<span>Save</span>
			</button>
		{/if}
	</div>

	<!-- Confirm button for draft mode - moved inline with other controls -->
</div>
