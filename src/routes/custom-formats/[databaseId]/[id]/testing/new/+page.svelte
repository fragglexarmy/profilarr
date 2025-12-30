<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import TestForm from '../components/TestForm.svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	let title = '';
	let type: 'movie' | 'series' = 'movie';
	let shouldMatch = true;
	let description = '';

	function handleCancel() {
		goto(`/custom-formats/${$page.params.databaseId}/${$page.params.id}/testing`);
	}
</script>

<svelte:head>
	<title>New Test - {data.format.name} - Profilarr</title>
</svelte:head>

<TestForm
	mode="create"
	formatName={data.format.name}
	canWriteToBase={data.canWriteToBase}
	bind:title
	bind:type
	bind:shouldMatch
	bind:description
	onCancel={handleCancel}
/>
