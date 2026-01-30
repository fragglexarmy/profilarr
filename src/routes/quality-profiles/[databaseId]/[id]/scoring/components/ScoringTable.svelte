<script lang="ts">
	export let formats: any[];
	export let arrTypes: string[];
	export let customFormatScores: Record<string, Record<string, number | null>>;
	export let customFormatEnabled: Record<string, Record<string, boolean>>;
	type IconCheckboxColor = 'accent' | 'blue' | 'green' | 'red' | 'neutral' | `#${string}`;
	export let getArrTypeColor: (arrType: string) => IconCheckboxColor;
	export let title: string | null = null;

	import ScoringTableDesktop from './ScoringTableDesktop.svelte';
	import ScoringTableMobile from './ScoringTableMobile.svelte';
</script>

{#if title}
	<div class="mb-3">
		<h3 class="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{title}</h3>
	</div>
{/if}

<!-- Desktop -->
<div class="hidden md:block">
	<ScoringTableDesktop
		{formats}
		{arrTypes}
		{customFormatScores}
		{customFormatEnabled}
		{getArrTypeColor}
		on:scoreChange
		on:enabledChange
	/>
</div>

<!-- Mobile -->
<div class="md:hidden">
	<ScoringTableMobile
		{formats}
		{arrTypes}
		{customFormatScores}
		{customFormatEnabled}
		{getArrTypeColor}
		on:scoreChange
		on:enabledChange
	/>
</div>
