<script lang="ts">
	import { goto } from '$app/navigation';
	import DelayProfileForm from '../components/DelayProfileForm.svelte';
	import type { PageData } from './$types';
	import type { PreferredProtocol } from '$pcd/queries/delayProfiles';

	export let data: PageData;

	// Form state initialized from data
	let name = data.delayProfile.name;
	let tags = data.delayProfile.tags.map((t) => t.name);
	let preferredProtocol: PreferredProtocol = data.delayProfile.preferred_protocol;
	let usenetDelay = data.delayProfile.usenet_delay ?? 0;
	let torrentDelay = data.delayProfile.torrent_delay ?? 0;
	let bypassIfHighestQuality = data.delayProfile.bypass_if_highest_quality;
	let bypassIfAboveCfScore = data.delayProfile.bypass_if_above_custom_format_score;
	let minimumCfScore = data.delayProfile.minimum_custom_format_score ?? 0;

	function handleCancel() {
		goto(`/delay-profiles/${data.currentDatabase.id}`);
	}
</script>

<svelte:head>
	<title>{data.delayProfile.name} - Delay Profiles - Profilarr</title>
</svelte:head>

<DelayProfileForm
	mode="edit"
	databaseName={data.currentDatabase.name}
	canWriteToBase={data.canWriteToBase}
	actionUrl="?/update"
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
