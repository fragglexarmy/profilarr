<script lang="ts">
	import { Plus, X, FolderPlus } from 'lucide-svelte';
	import { createEventDispatcher } from 'svelte';
	import {
		filterFields,
		getFilterField,
		createEmptyGroup,
		createEmptyRule,
		isRule,
		isGroup,
		type FilterGroup,
		type FilterRule
	} from '$lib/shared/filters';
	import NumberInput from '$ui/form/NumberInput.svelte';

	export let group: FilterGroup;
	export let onRemove: (() => void) | null = null;
	export let depth: number = 0;

	const dispatch = createEventDispatcher<{ change: void }>();

	function notifyChange() {
		dispatch('change');
	}

	function addRule() {
		group.children = [...group.children, createEmptyRule()];
		notifyChange();
	}

	function addNestedGroup() {
		const newGroup = createEmptyGroup();
		newGroup.children.push(createEmptyRule());
		group.children = [...group.children, newGroup];
		notifyChange();
	}

	function removeChild(index: number) {
		group.children = group.children.filter((_, i) => i !== index);
		notifyChange();
	}

	function onFieldChange(rule: FilterRule, fieldId: string) {
		const field = getFilterField(fieldId);
		if (field) {
			rule.field = fieldId;
			rule.operator = field.operators[0].id;
			rule.value = field.values?.[0]?.value ?? null;
			notifyChange();
		}
	}

	function handleNestedChange() {
		notifyChange();
	}
</script>

<div
	class="rounded-lg border p-4 {depth === 0
		? 'border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-800/50'
		: 'border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-800'}"
>
	<!-- Group Header -->
	<div class="mb-3 flex items-center justify-between">
		<div class="flex items-center gap-2">
			<span class="text-sm font-medium text-neutral-700 dark:text-neutral-300">Match</span>
			<select
				bind:value={group.match}
				class="rounded-lg border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
			>
				<option value="all">All (AND)</option>
				<option value="any">Any (OR)</option>
			</select>
			<span class="text-sm text-neutral-500 dark:text-neutral-400">of the following rules</span>
		</div>
		{#if onRemove}
			<button
				type="button"
				on:click={onRemove}
				class="rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-200 hover:text-neutral-600 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
			>
				<X size={16} />
			</button>
		{/if}
	</div>

	<!-- Children (Rules and Nested Groups) -->
	{#if group.children.length === 0}
		<div class="text-sm text-neutral-500 dark:text-neutral-400">
			No rules configured. Add a rule to start filtering.
		</div>
	{:else}
		<div class="space-y-2">
			{#each group.children as child, childIndex}
				{#if isRule(child)}
					{@const field = getFilterField(child.field)}
					<div class="flex items-center gap-2">
						<!-- Field -->
						<select
							value={child.field}
							on:change={(e) => onFieldChange(child, e.currentTarget.value)}
							class="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
						>
							{#each filterFields as f}
								<option value={f.id}>{f.label}</option>
							{/each}
						</select>

						<!-- Operator -->
						<select
							bind:value={child.operator}
							class="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
						>
							{#if field}
								{#each field.operators as op}
									<option value={op.id}>{op.label}</option>
								{/each}
							{/if}
						</select>

						<!-- Value -->
						{#if field?.valueType === 'boolean' || field?.valueType === 'select'}
							<select
								bind:value={child.value}
								class="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
							>
								{#if field.values}
									{#each field.values as v}
										<option value={v.value}>{v.label}</option>
									{/each}
								{/if}
							</select>
						{:else if field?.valueType === 'text'}
							<input
								type="text"
								bind:value={child.value}
								class="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
							/>
						{:else if field?.valueType === 'number'}
							<div class="w-32">
								<NumberInput name="value-{childIndex}" value={child.value as number} on:change={(e) => child.value = e.detail} font="mono" />
							</div>
						{:else if field?.valueType === 'date'}
							{#if child.operator === 'in_last' || child.operator === 'not_in_last'}
								<div class="flex items-center gap-2">
									<div class="w-24">
										<NumberInput name="value-{childIndex}" value={child.value as number} on:change={(e) => child.value = e.detail} min={1} font="mono" />
									</div>
									<span class="text-sm text-neutral-500 dark:text-neutral-400">days</span>
								</div>
							{:else}
								<input
									type="date"
									bind:value={child.value}
									class="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
								/>
							{/if}
						{/if}

						<!-- Remove Rule -->
						<button
							type="button"
							on:click={() => removeChild(childIndex)}
							class="rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-200 hover:text-neutral-600 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
						>
							<X size={16} />
						</button>
					</div>
				{:else if isGroup(child)}
					<!-- Nested Group (recursive) -->
					<div class="ml-4">
						<svelte:self
							group={child}
							depth={depth + 1}
							onRemove={() => removeChild(childIndex)}
							on:change={handleNestedChange}
						/>
					</div>
				{/if}
			{/each}
		</div>
	{/if}

	<!-- Add Buttons -->
	<div class="mt-3 flex items-center gap-2">
		<button
			type="button"
			on:click={addRule}
			class="flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
		>
			<Plus size={14} />
			Add Rule
		</button>
		<button
			type="button"
			on:click={addNestedGroup}
			class="flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
		>
			<FolderPlus size={14} />
			Add Group
		</button>
	</div>
</div>
