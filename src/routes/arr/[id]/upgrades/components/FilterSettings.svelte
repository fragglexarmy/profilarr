<script lang="ts">
	import { Plus, X, ChevronDown, Pencil, Check, Info, Power, Copy } from 'lucide-svelte';
	import { slide } from 'svelte/transition';
	import { createEmptyFilterConfig, type FilterConfig } from '$lib/shared/filters';
	import { selectors } from '$lib/shared/selectors';
	import FilterGroupComponent from './FilterGroup.svelte';
	import NumberInput from '$ui/form/NumberInput.svelte';
	import FiltersInfoModal from './FiltersInfoModal.svelte';

	export let filters: FilterConfig[] = [];

	let showInfoModal = false;

	let expandedIds: Set<string> = new Set();
	let editingId: string | null = null;
	let editingName: string = '';

	function addFilter() {
		const newFilter = createEmptyFilterConfig(`Filter ${filters.length + 1}`);
		filters = [...filters, newFilter];
		expandedIds.add(newFilter.id);
		expandedIds = expandedIds;
	}

	function removeFilter(id: string, event: MouseEvent) {
		event.stopPropagation();
		filters = filters.filter((f) => f.id !== id);
		expandedIds.delete(id);
		expandedIds = expandedIds;
	}

	function toggleExpanded(id: string) {
		if (expandedIds.has(id)) {
			expandedIds.delete(id);
		} else {
			expandedIds.add(id);
		}
		expandedIds = expandedIds;
	}

	function startEditing(filter: FilterConfig, event: MouseEvent) {
		event.stopPropagation();
		editingId = filter.id;
		editingName = filter.name;
	}

	function saveEditing(event?: MouseEvent) {
		event?.stopPropagation();
		if (editingId) {
			const filter = filters.find((f) => f.id === editingId);
			if (filter) {
				filter.name = editingName;
				filters = filters;
			}
		}
		editingId = null;
		editingName = '';
	}

	function handleChange() {
		filters = filters;
	}

	function toggleEnabled(id: string, event: MouseEvent) {
		event.stopPropagation();
		const filter = filters.find((f) => f.id === id);
		if (filter) {
			filter.enabled = !filter.enabled;
			filters = filters;
		}
	}

	function duplicateFilter(id: string, event: MouseEvent) {
		event.stopPropagation();
		const filter = filters.find((f) => f.id === id);
		if (filter) {
			const duplicate: FilterConfig = {
				...structuredClone(filter),
				id: crypto.randomUUID(),
				name: `${filter.name} (Copy)`
			};
			filters = [...filters, duplicate];
			expandedIds.add(duplicate.id);
			expandedIds = expandedIds;
		}
	}
</script>

<div
	class="rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900"
>
	<div class="mb-4 flex items-center justify-between">
		<h2 class="text-lg font-semibold text-neutral-900 dark:text-neutral-50">Filters</h2>
		<div class="flex items-center gap-2">
			<button
				type="button"
				on:click={() => (showInfoModal = true)}
				class="flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
			>
				<Info size={14} />
				Fields
			</button>
			<button
				type="button"
				on:click={addFilter}
				class="flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
			>
				<Plus size={14} />
				Add Filter
			</button>
		</div>
	</div>

	{#if filters.length === 0}
		<div class="text-sm text-neutral-500 dark:text-neutral-400">
			No filters configured. Add a filter to start.
		</div>
	{:else}
		<div class="space-y-2">
			{#each filters as filter (filter.id)}
				<div class="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
					<!-- Accordion Header -->
					<div class="flex cursor-pointer items-center justify-between bg-neutral-50 px-4 py-3 dark:bg-neutral-800/50">
						<button
							type="button"
							on:click={() => toggleExpanded(filter.id)}
							class="flex flex-1 cursor-pointer items-center gap-3 text-left"
						>
							<ChevronDown
								size={16}
								class="text-neutral-400 transition-transform {expandedIds.has(filter.id) ? 'rotate-180' : ''}"
							/>
							{#if editingId === filter.id}
								<input
									type="text"
									bind:value={editingName}
									on:click|stopPropagation
									on:keydown={(e) => e.key === 'Enter' && saveEditing()}
									on:blur={() => saveEditing()}
									class="w-40 rounded border border-neutral-300 bg-white px-2 py-1 text-sm font-medium text-neutral-900 focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
									autofocus
								/>
							{:else}
								<span class="text-sm font-medium {filter.enabled ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-400 dark:text-neutral-500'}">
									{filter.name}
								</span>
								{#if !filter.enabled}
									<span class="rounded bg-neutral-200 px-1.5 py-0.5 text-xs text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400">
										Disabled
									</span>
								{/if}
							{/if}
						</button>
						<div class="flex items-center gap-1">
							{#if editingId === filter.id}
								<button
									type="button"
									on:click={(e) => saveEditing(e)}
									class="inline-flex h-7 w-7 items-center justify-center rounded border border-green-300 bg-white text-green-600 transition-colors hover:bg-green-50 dark:border-green-700 dark:bg-neutral-800 dark:text-green-400 dark:hover:bg-green-700"
									title="Save"
								>
									<Check size={14} />
								</button>
							{:else}
								<button
									type="button"
									on:click={(e) => toggleEnabled(filter.id, e)}
									class="inline-flex h-7 w-7 items-center justify-center rounded border transition-colors {filter.enabled
										? 'border-green-300 bg-white text-green-600 hover:bg-green-50 dark:border-green-700 dark:bg-neutral-800 dark:text-green-400 dark:hover:bg-green-700'
										: 'border-neutral-300 bg-white text-neutral-400 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-500 dark:hover:bg-neutral-700'}"
									title={filter.enabled ? 'Disable filter' : 'Enable filter'}
								>
									<Power size={14} />
								</button>
								<button
									type="button"
									on:click={(e) => startEditing(filter, e)}
									class="inline-flex h-7 w-7 items-center justify-center rounded border border-neutral-300 bg-white text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
									title="Rename"
								>
									<Pencil size={14} />
								</button>
								<button
									type="button"
									on:click={(e) => duplicateFilter(filter.id, e)}
									class="inline-flex h-7 w-7 items-center justify-center rounded border border-neutral-300 bg-white text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
									title="Duplicate"
								>
									<Copy size={14} />
								</button>
							{/if}
							<button
								type="button"
								on:click={(e) => removeFilter(filter.id, e)}
								class="inline-flex h-7 w-7 items-center justify-center rounded border border-neutral-300 bg-white text-neutral-700 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:border-red-700 dark:hover:bg-red-900/30 dark:hover:text-red-400"
								title="Delete filter"
							>
								<X size={14} />
							</button>
						</div>
					</div>

					<!-- Accordion Content -->
					{#if expandedIds.has(filter.id)}
						<div transition:slide={{ duration: 200 }} class="space-y-4 border-t border-neutral-200 p-4 dark:border-neutral-800">
							<FilterGroupComponent group={filter.group} on:change={handleChange} />

							<!-- Selection Settings -->
							<div class="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-800/50">
								<h3 class="mb-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">Settings</h3>
								<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
									<div>
										<label
											for="cutoff-{filter.id}"
											class="block text-sm font-medium text-neutral-600 dark:text-neutral-400"
										>
											Cutoff %
										</label>
										<div class="mt-1">
											<NumberInput name="cutoff-{filter.id}" bind:value={filter.cutoff} min={0} max={100} font="mono" on:change={handleChange} />
										</div>
										<p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
											Score threshold for "cutoff met"
										</p>
									</div>
									<div>
										<label
											for="cooldown-{filter.id}"
											class="block text-sm font-medium text-neutral-600 dark:text-neutral-400"
										>
											Cooldown (hours)
										</label>
										<div class="mt-1">
											<NumberInput name="cooldown-{filter.id}" bind:value={filter.searchCooldown} min={24} font="mono" on:change={handleChange} />
										</div>
										<p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
											Skip if searched recently
										</p>
									</div>
									<div>
										<label
											for="selector-{filter.id}"
											class="block text-sm font-medium text-neutral-600 dark:text-neutral-400"
										>
											Method
										</label>
										<select
											id="selector-{filter.id}"
											bind:value={filter.selector}
											on:change={handleChange}
											class="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
										>
											{#each selectors as s}
												<option value={s.id}>{s.label} - {s.description}</option>
											{/each}
										</select>
									</div>
									<div>
										<label
											for="count-{filter.id}"
											class="block text-sm font-medium text-neutral-600 dark:text-neutral-400"
										>
											Count
										</label>
										<div class="mt-1">
											<NumberInput name="count-{filter.id}" bind:value={filter.count} min={1} max={5} font="mono" on:change={handleChange} />
										</div>
										<p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
											Items to select per run
										</p>
									</div>
								</div>
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<FiltersInfoModal bind:open={showInfoModal} />
