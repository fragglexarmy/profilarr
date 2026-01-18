<script lang="ts">
	import { enhance } from '$app/forms';
	import { tick } from 'svelte';
	import { Plus, Save, Loader2, AlertTriangle } from 'lucide-svelte';
	import ConditionCard from './components/ConditionCard.svelte';
	import DraftConditionCard from './components/DraftConditionCard.svelte';
	import Badge from '$ui/badge/Badge.svelte';
	import Button from '$ui/button/Button.svelte';
	import StickyCard from '$ui/card/StickyCard.svelte';
	import SaveTargetModal from '$ui/modal/SaveTargetModal.svelte';
	import { alertStore } from '$alerts/store';
	import { CONDITION_TYPES } from '$lib/shared/conditionTypes';
	import {
		current,
		isDirty,
		initEdit,
		update
	} from '$lib/client/stores/dirty';
	import type { PageData } from './$types';
	import type { ConditionData } from '$pcd/queries/customFormats/index';

	// Extended type with stable key for Svelte keying
	type KeyedCondition = ConditionData & { _key: string };

	export let data: PageData;

	// Track next key for stable identification
	let nextKey = 0;
	function genKey() {
		return `cond-${nextKey++}`;
	}

	// Build initial data from server, adding stable keys
	$: initialData = {
		conditions: data.conditions.map((c) => ({ ...structuredClone(c), _key: genKey() })) as KeyedCondition[],
		draftConditions: [] as KeyedCondition[]
	};

	// Initialize dirty tracking
	$: initEdit(initialData);

	// Loading state
	let saving = false;

	// Layer selection
	let selectedLayer: 'user' | 'base' = 'user';

	// Modal state
	let showSaveTargetModal = false;
	let mainFormElement: HTMLFormElement;

	// Reactive getters for current values
	$: conditions = ($current.conditions ?? []) as KeyedCondition[];
	$: draftConditions = ($current.draftConditions ?? []) as KeyedCondition[];

	// Check if there are draft conditions (blocks saving)
	$: hasDrafts = draftConditions.length > 0;

	// Validation - check all conditions have required values
	$: invalidConditions = conditions.filter((c) => !isConditionValid(c));
	$: hasInvalidConditions = invalidConditions.length > 0;

	// Validation - check for duplicate condition names
	$: duplicateNames = (() => {
		const names = conditions.map((c) => c.name.trim().toLowerCase());
		const seen = new Set<string>();
		const dupes = new Set<string>();
		for (const name of names) {
			if (seen.has(name)) dupes.add(name);
			seen.add(name);
		}
		return dupes;
	})();
	$: hasDuplicateNames = duplicateNames.size > 0;

	function hasNameConflict(condition: KeyedCondition): boolean {
		return duplicateNames.has(condition.name.trim().toLowerCase());
	}

	function isConditionValid(condition: ConditionData): boolean {
		switch (condition.type) {
			case 'release_title':
			case 'release_group':
			case 'edition':
				return (condition.patterns?.length ?? 0) > 0;
			case 'language':
				return (condition.languages?.length ?? 0) > 0;
			case 'source':
				return (condition.sources?.length ?? 0) > 0;
			case 'resolution':
				return (condition.resolutions?.length ?? 0) > 0;
			case 'quality_modifier':
				return (condition.qualityModifiers?.length ?? 0) > 0;
			case 'release_type':
				return (condition.releaseTypes?.length ?? 0) > 0;
			case 'indexer_flag':
				return (condition.indexerFlags?.length ?? 0) > 0;
			case 'size':
				// At least one of min or max must be set
				return condition.size?.minBytes != null || condition.size?.maxBytes != null;
			case 'year':
				// At least one of min or max must be set
				return condition.years?.minYear != null || condition.years?.maxYear != null;
			default:
				return true;
		}
	}

	// Group conditions by type
	$: groupedConditions = conditions.reduce(
		(acc, condition) => {
			const type = condition.type;
			if (!acc[type]) acc[type] = [];
			acc[type].push(condition);
			return acc;
		},
		{} as Record<string, ConditionData[]>
	);

	// Get ordered types (only those that have conditions)
	$: orderedTypes = CONDITION_TYPES.filter((t) => groupedConditions[t.value]).map((t) => ({
		value: t.value,
		label: t.label,
		conditions: groupedConditions[t.value]
	}));

	function handleRemove(key: string) {
		update('conditions', conditions.filter((c) => c._key !== key));
	}

	function handleConditionChange(updatedCondition: ConditionData, key: string) {
		update('conditions', conditions.map((c) => c._key === key ? { ...updatedCondition, _key: key } : c));
	}

	function addDraftCondition() {
		const draft: KeyedCondition = {
			_key: genKey(),
			name: 'New Condition',
			type: 'release_title',
			arrType: 'all',
			negate: false,
			required: false
		};
		update('draftConditions', [...draftConditions, draft]);
	}

	function handleDraftChange(updatedDraft: ConditionData, key: string) {
		update('draftConditions', draftConditions.map((d) => d._key === key ? { ...updatedDraft, _key: key } : d));
	}

	function confirmDraft(draft: KeyedCondition) {
		// Remove from drafts and add to main conditions
		update('draftConditions', draftConditions.filter((d) => d._key !== draft._key));
		update('conditions', [...conditions, draft]);
	}

	function discardDraft(key: string) {
		update('draftConditions', draftConditions.filter((d) => d._key !== key));
	}

	async function handleSaveClick() {
		if (data.canWriteToBase) {
			showSaveTargetModal = true;
		} else {
			selectedLayer = 'user';
			await tick();
			mainFormElement?.requestSubmit();
		}
	}

	async function handleLayerSelect(event: CustomEvent<'user' | 'base'>) {
		selectedLayer = event.detail;
		showSaveTargetModal = false;
		await tick();
		mainFormElement?.requestSubmit();
	}
</script>

<svelte:head>
	<title>{data.format.name} - Conditions - Profilarr</title>
</svelte:head>

<form
	bind:this={mainFormElement}
	method="POST"
	action="?/update"
	use:enhance={() => {
		saving = true;
		return async ({ result, update: formUpdate }) => {
			if (result.type === 'failure' && result.data) {
				alertStore.add('error', (result.data as { error?: string }).error || 'Operation failed');
			} else if (result.type === 'redirect') {
				alertStore.add('success', 'Conditions updated!');
				// Mark as clean so navigation guard doesn't trigger
				initEdit(initialData);
			}
			await formUpdate();
			saving = false;
		};
	}}
>
	<!-- Hidden fields for form data -->
	<input type="hidden" name="conditions" value={JSON.stringify(conditions)} />
	<input type="hidden" name="layer" value={selectedLayer} />

	<StickyCard position="top">
		<svelte:fragment slot="left">
			<div>
				<h2 class="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Conditions</h2>
				<p class="text-sm text-neutral-600 dark:text-neutral-400">
					Define the conditions that must be met for this custom format to match a release.
				</p>
			</div>
		</svelte:fragment>
		<svelte:fragment slot="right">
			<div class="flex items-center gap-3">
				{#if hasDuplicateNames}
					<span class="flex items-center gap-1.5 text-sm text-yellow-600 dark:text-yellow-400">
						<AlertTriangle size={14} class="shrink-0" />
						Condition names must be unique
					</span>
				{:else if hasDrafts}
					<span class="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400">
						<AlertTriangle size={14} class="shrink-0" />
						Confirm or discard drafts
					</span>
				{:else if hasInvalidConditions}
					<span class="flex items-center gap-1.5 text-sm text-yellow-600 dark:text-yellow-400">
						<AlertTriangle size={14} class="shrink-0" />
						Missing required values
					</span>
				{/if}
				<Button
					text="Add Condition"
					icon={Plus}
					variant="secondary"
					on:click={addDraftCondition}
				/>
				<Button
					text={saving ? 'Saving...' : 'Save Changes'}
					icon={saving ? Loader2 : Save}
					variant="primary"
					disabled={saving || !$isDirty || hasDrafts || hasInvalidConditions || hasDuplicateNames}
					on:click={handleSaveClick}
				/>
			</div>
		</svelte:fragment>
	</StickyCard>

	<div class="mt-6 space-y-6 px-4 pb-12">

		<!-- Draft conditions -->
		{#if draftConditions.length > 0}
			<div class="space-y-2">
				<div class="flex items-center gap-2">
					<span class="text-sm font-medium text-neutral-600 dark:text-neutral-400">Drafts</span>
					<Badge variant="neutral" size="sm">{draftConditions.length}</Badge>
				</div>

				{#each draftConditions as draft (draft._key)}
					<DraftConditionCard
						condition={draft}
						availablePatterns={data.availablePatterns}
						availableLanguages={data.availableLanguages}
						on:confirm={() => confirmDraft(draft)}
						on:discard={() => discardDraft(draft._key)}
						on:change={(e) => handleDraftChange(e.detail, draft._key)}
					/>
				{/each}
			</div>
		{/if}

		<!-- Existing conditions grouped by type -->
		{#if conditions.length === 0 && draftConditions.length === 0}
			<p class="text-sm text-neutral-500 dark:text-neutral-400">No conditions defined</p>
		{:else}
			{#each orderedTypes as group (group.value)}
				<div class="space-y-2">
					<!-- Group header -->
					<div class="flex items-center gap-2">
						<span class="text-sm font-medium text-neutral-600 dark:text-neutral-400">
							{group.label}
						</span>
						<Badge variant="neutral" size="sm">{group.conditions.length}</Badge>
					</div>

					<!-- Conditions -->
					{#each group.conditions as condition (condition._key)}
						<ConditionCard
							{condition}
							availablePatterns={data.availablePatterns}
							availableLanguages={data.availableLanguages}
							invalid={!isConditionValid(condition)}
							nameConflict={hasNameConflict(condition)}
							on:remove={() => handleRemove(condition._key)}
							on:change={(e) => handleConditionChange(e.detail, condition._key)}
						/>
					{/each}
				</div>
			{/each}
		{/if}
	</div>
</form>

<!-- Save Target Modal -->
{#if data.canWriteToBase}
	<SaveTargetModal
		open={showSaveTargetModal}
		mode="save"
		on:select={handleLayerSelect}
		on:cancel={() => (showSaveTargetModal = false)}
	/>
{/if}
