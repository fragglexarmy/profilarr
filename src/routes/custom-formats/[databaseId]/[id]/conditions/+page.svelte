<script lang="ts">
	import { enhance } from '$app/forms';
	import { tick } from 'svelte';
	import { Plus, Save, Loader2 } from 'lucide-svelte';
	import ConditionCard from './components/ConditionCard.svelte';
	import DraftConditionCard from './components/DraftConditionCard.svelte';
	import Badge from '$ui/badge/Badge.svelte';
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

	export let data: PageData;

	// Track next draft ID locally (negative IDs for drafts)
	let nextDraftId = -1;

	// Build initial data from server
	$: initialData = {
		conditions: structuredClone(data.conditions),
		draftConditions: [] as ConditionData[]
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
	$: conditions = ($current.conditions ?? []) as ConditionData[];
	$: draftConditions = ($current.draftConditions ?? []) as ConditionData[];

	// Check if there are draft conditions (blocks saving)
	$: hasDrafts = draftConditions.length > 0;

	// Validation - check all conditions have required values
	$: invalidConditions = conditions.filter((c) => !isConditionValid(c));
	$: hasInvalidConditions = invalidConditions.length > 0;

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

	function handleRemove(conditionId: number) {
		update('conditions', conditions.filter((c) => c.id !== conditionId));
	}

	function handleConditionChange(updatedCondition: ConditionData) {
		update('conditions', conditions.map((c) => c.id === updatedCondition.id ? updatedCondition : c));
	}

	function addDraftCondition() {
		const draft: ConditionData = {
			id: nextDraftId--,
			name: 'New Condition',
			type: 'release_title',
			negate: false,
			required: false
		};
		update('draftConditions', [...draftConditions, draft]);
	}

	function handleDraftChange(updatedDraft: ConditionData) {
		update('draftConditions', draftConditions.map((d) => d.id === updatedDraft.id ? updatedDraft : d));
	}

	function confirmDraft(draft: ConditionData) {
		// Remove from drafts and add to main conditions
		// Keep the negative ID - the server will handle assigning real IDs
		update('draftConditions', draftConditions.filter((d) => d.id !== draft.id));
		update('conditions', [...conditions, draft]);
	}

	function discardDraft(draftId: number) {
		update('draftConditions', draftConditions.filter((d) => d.id !== draftId));
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

	<div class="mt-6 space-y-6">
		<!-- Header -->
		<div class="flex items-start justify-between">
			<div>
				<h2 class="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Conditions</h2>
				<p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
					Define the conditions that must be met for this custom format to match a release.
				</p>
			</div>
			<div class="flex items-center gap-2">
				<button
					type="button"
					onclick={addDraftCondition}
					class="flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
				>
					<Plus size={16} />
					Add Condition
				</button>
				<button
					type="button"
					disabled={saving || !$isDirty || hasDrafts || hasInvalidConditions}
					onclick={handleSaveClick}
					class="flex items-center gap-1.5 rounded-lg bg-accent-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-50"
					title={hasDrafts
						? 'Confirm or discard all draft conditions before saving'
						: hasInvalidConditions
							? 'Some conditions are missing required values'
							: ''}
				>
					{#if saving}
						<Loader2 size={16} class="animate-spin" />
						Saving...
					{:else}
						<Save size={16} />
						Save Changes
					{/if}
				</button>
			</div>
		</div>

		<!-- Draft conditions -->
		{#if draftConditions.length > 0}
			<div class="space-y-2">
				<div class="flex items-center gap-2">
					<span class="text-sm font-medium text-neutral-600 dark:text-neutral-400">Drafts</span>
					<Badge variant="neutral" size="sm">{draftConditions.length}</Badge>
				</div>

				{#each draftConditions as draft (draft.id)}
					<DraftConditionCard
						condition={draft}
						availablePatterns={data.availablePatterns}
						availableLanguages={data.availableLanguages}
						on:confirm={(e) => confirmDraft(e.detail)}
						on:discard={() => discardDraft(draft.id)}
						on:change={(e) => handleDraftChange(e.detail)}
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
					{#each group.conditions as condition (condition.id)}
						<ConditionCard
							{condition}
							availablePatterns={data.availablePatterns}
							availableLanguages={data.availableLanguages}
							invalid={!isConditionValid(condition)}
							on:remove={() => handleRemove(condition.id)}
							on:change={(e) => handleConditionChange(e.detail)}
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
