<script lang="ts">
	import { goto } from '$app/navigation';
	import DelayProfileForm from '../components/DelayProfileForm.svelte';
	import type { PageData } from './$types';
	import type { PreferredProtocol } from '$pcd/queries/delayProfiles';

	export let data: PageData;

	// Form state
	let name = '';
	let tags: string[] = [];
	let preferredProtocol: PreferredProtocol = 'prefer_usenet';
	let usenetDelay = 0;
	let torrentDelay = 0;
	let bypassIfHighestQuality = false;
	let bypassIfAboveCfScore = false;
	let minimumCfScore = 0;

	function handleCancel() {
		goto(`/delay-profiles/${data.currentDatabase.id}`);
	}
</script>

<svelte:head>
	<title>New Delay Profile - {data.currentDatabase.name} - Profilarr</title>
</svelte:head>

<DelayProfileForm
	mode="create"
	databaseName={data.currentDatabase.name}
	canWriteToBase={data.canWriteToBase}
	bind:name
	bind:tags
	bind:preferredProtocol
	bind:usenetDelay
	bind:torrentDelay
	bind:bypassIfHighestQuality
	bind:bypassIfAboveCfScore
	bind:minimumCfScore
	onCancel={handleCancel}
/>
