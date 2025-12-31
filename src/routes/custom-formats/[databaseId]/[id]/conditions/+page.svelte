<script lang="ts">
	import { Plus } from 'lucide-svelte';
	import ConditionCard from './components/ConditionCard.svelte';
	import DraftConditionCard from './components/DraftConditionCard.svelte';
	import Badge from '$ui/badge/Badge.svelte';
	import { CONDITION_TYPES } from '$lib/shared/conditionTypes';
	import type { PageData } from './$types';
	import type { ConditionData } from '$pcd/queries/customFormats/index';

	export let data: PageData;

	// Draft conditions (not yet confirmed)
	let draftConditions: ConditionData[] = [];
	let nextDraftId = -1; // Use negative IDs for drafts

	// Group conditions by type
	$: groupedConditions = data.conditions.reduce(
		(acc, condition) => {
			const type = condition.type;
			if (!acc[type]) acc[type] = [];
			acc[type].push(condition);
			return acc;
		},
		{} as Record<string, typeof data.conditions>
	);

	// Get ordered types (only those that have conditions)
	$: orderedTypes = CONDITION_TYPES.filter((t) => groupedConditions[t.value]).map((t) => ({
		value: t.value,
		label: t.label,
		conditions: groupedConditions[t.value]
	}));

	function handleRemove(conditionId: number) {
		data.conditions = data.conditions.filter((c) => c.id !== conditionId);
	}

	function addDraftCondition() {
		const draft: ConditionData = {
			id: nextDraftId--,
			name: 'New Condition',
			type: 'release_title',
			negate: false,
			required: false
		};
		draftConditions = [...draftConditions, draft];
	}

	function confirmDraft(draft: ConditionData) {
		// Remove from drafts
		draftConditions = draftConditions.filter((d) => d.id !== draft.id);
		// Add to main conditions with a new positive ID
		const newId = Math.max(0, ...data.conditions.map((c) => c.id)) + 1;
		data.conditions = [...data.conditions, { ...draft, id: newId }];
	}

	function discardDraft(draftId: number) {
		draftConditions = draftConditions.filter((d) => d.id !== draftId);
	}
</script>

<svelte:head>
	<title>{data.format.name} - Conditions - Profilarr</title>
</svelte:head>

<div class="mt-6 space-y-6">
	<!-- Header -->
	<div class="flex items-start justify-between">
		<div>
			<h2 class="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Conditions</h2>
			<p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
				Define the conditions that must be met for this custom format to match a release.
			</p>
		</div>
		<button
			type="button"
			on:click={addDraftCondition}
			class="flex items-center gap-1.5 rounded-lg bg-accent-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-700"
		>
			<Plus size={16} />
			Add Condition
		</button>
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
					on:confirm={() => confirmDraft(draft)}
					on:discard={() => discardDraft(draft.id)}
				/>
			{/each}
		</div>
	{/if}

	<!-- Existing conditions grouped by type -->
	{#if data.conditions.length === 0 && draftConditions.length === 0}
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
						on:remove={() => handleRemove(condition.id)}
					/>
				{/each}
			</div>
		{/each}
	{/if}
</div>
