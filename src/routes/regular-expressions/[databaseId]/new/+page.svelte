<script lang="ts">
	import { goto } from '$app/navigation';
	import RegularExpressionForm from '../components/RegularExpressionForm.svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	// Form state - initialize from preset data
	let name = data.preset.name;
	let tags: string[] = data.preset.tags;
	let pattern = data.preset.pattern;
	let description = data.preset.description;
	let regex101Id = data.preset.regex101Id;

	function handleCancel() {
		goto(`/regular-expressions/${data.currentDatabase.id}`);
	}
</script>

<svelte:head>
	<title>New Regular Expression - {data.currentDatabase.name} - Profilarr</title>
</svelte:head>

<RegularExpressionForm
	mode="create"
	databaseName={data.currentDatabase.name}
	canWriteToBase={data.canWriteToBase}
	bind:name
	bind:tags
	bind:pattern
	bind:description
	bind:regex101Id
	onCancel={handleCancel}
/>
