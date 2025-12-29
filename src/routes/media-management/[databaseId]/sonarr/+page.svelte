<script lang="ts">
	import QualityDefinitionsSection from '../components/QualityDefinitionsSection.svelte';
	import NamingSection from '../components/NamingSection.svelte';
	import MediaSettingsSection from '../components/MediaSettingsSection.svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	$: hasAnyData =
		data.mediaManagement.qualityDefinitions.length > 0 ||
		data.mediaManagement.naming !== null ||
		data.mediaManagement.mediaSettings !== null;
</script>

<div class="space-y-8">
	{#if !hasAnyData}
		<div
			class="rounded-lg border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900"
		>
			<p class="text-neutral-600 dark:text-neutral-400">
				No Sonarr media management settings configured
			</p>
		</div>
	{:else}
		<QualityDefinitionsSection
			definitions={data.mediaManagement.qualityDefinitions}
			arrType="sonarr"
			canWriteToBase={data.canWriteToBase}
		/>

		<NamingSection
			naming={data.mediaManagement.naming}
			arrType="sonarr"
			canWriteToBase={data.canWriteToBase}
		/>

		<MediaSettingsSection
			settings={data.mediaManagement.mediaSettings}
			arrType="sonarr"
			canWriteToBase={data.canWriteToBase}
		/>
	{/if}
</div>
