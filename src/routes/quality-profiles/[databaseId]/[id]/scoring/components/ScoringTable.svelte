<script lang="ts">
	import NumberInput from '$ui/form/NumberInput.svelte';
	import IconCheckbox from '$ui/form/IconCheckbox.svelte';
	import { Check } from 'lucide-svelte';

	export let formats: any[];
	export let arrTypes: string[];
	export let state: any;
	export let getArrTypeColor: (arrType: string) => string;
	export let title: string | null = null;
</script>

{#if title}
	<div class="mb-3">
		<h3 class="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{title}</h3>
	</div>
{/if}

<div class="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
	<table class="w-full">
		<!-- Header -->
		<thead
			class="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-800"
		>
			<tr>
				<th
					class="sticky left-0 z-10 bg-neutral-50 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
				>
					Custom Format
				</th>
				{#each arrTypes as arrType}
					<th
						class="w-64 px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-neutral-700 dark:text-neutral-300"
					>
						{arrType}
					</th>
				{/each}
			</tr>
		</thead>

		<!-- Body -->
		<tbody
			class="divide-y divide-neutral-200 bg-white dark:divide-neutral-800 dark:bg-neutral-900"
		>
			{#if formats.length === 0}
				<tr>
					<td
						colspan={arrTypes.length + 1}
						class="px-6 py-8 text-center text-sm text-neutral-500 dark:text-neutral-400"
					>
						No custom formats found
					</td>
				</tr>
			{:else}
				{#each formats as format}
					{@const rowDisabled = arrTypes.every(
						(arrType) => !state.customFormatEnabled[format.id]?.[arrType]
					)}
					<tr
						class="transition-colors {rowDisabled
							? 'bg-neutral-100 dark:bg-neutral-800 opacity-60'
							: 'hover:bg-neutral-50 dark:hover:bg-neutral-900'}"
					>
						<td
							class="sticky left-0 z-10 px-6 py-4 text-sm font-medium {rowDisabled
								? 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-500'
								: 'bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100'}"
						>
							{format.name}
						</td>
						{#each arrTypes as arrType}
							<td class="px-6 py-4">
								<div class="flex items-center justify-center gap-2">
									<IconCheckbox
										checked={state.customFormatEnabled[format.id][arrType]}
										icon={Check}
										color={getArrTypeColor(arrType)}
										shape="circle"
										on:click={() => {
											const isEnabled = state.customFormatEnabled[format.id][arrType];
											if (isEnabled) {
												state.customFormatScores[format.id][arrType] = null;
											} else {
												if (state.customFormatScores[format.id][arrType] === null) {
													state.customFormatScores[format.id][arrType] = 0;
												}
											}
											state.customFormatEnabled[format.id][arrType] = !isEnabled;
										}}
									/>
									<div class="w-48">
										<NumberInput
											name="score-{format.id}-{arrType}"
											bind:value={state.customFormatScores[format.id][arrType]}
											step={1}
											disabled={!state.customFormatEnabled[format.id][arrType]}
											font="mono"
										/>
									</div>
								</div>
							</td>
						{/each}
					</tr>
				{/each}
			{/if}
		</tbody>
	</table>
</div>
