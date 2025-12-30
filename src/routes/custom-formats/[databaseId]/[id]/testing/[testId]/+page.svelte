<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import TestForm from '../components/TestForm.svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	let title = data.test.title;
	let type: 'movie' | 'series' = data.test.type as 'movie' | 'series';
	let shouldMatch = data.test.should_match;
	let description = data.test.description ?? '';

	function handleCancel() {
		goto(`/custom-formats/${$page.params.databaseId}/${$page.params.id}/testing`);
	}
</script>

<svelte:head>
	<title>Edit Test - {data.format.name} - Profilarr</title>
</svelte:head>

<TestForm
	mode="edit"
	formatName={data.format.name}
	canWriteToBase={data.canWriteToBase}
	actionUrl="?/update"
	bind:title
	bind:type
	bind:shouldMatch
	bind:description
	onCancel={handleCancel}
/>
