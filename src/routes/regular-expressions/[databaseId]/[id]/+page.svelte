<script lang="ts">
	import { goto } from '$app/navigation';
	import RegularExpressionForm from '../components/RegularExpressionForm.svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	// Form state initialized from data
	let name = data.regularExpression.name;
	let tags = data.regularExpression.tags.map((t) => t.name);
	let pattern = data.regularExpression.pattern;
	let description = data.regularExpression.description ?? '';
	let regex101Id = data.regularExpression.regex101_id ?? '';

	function handleCancel() {
		goto(`/regular-expressions/${data.currentDatabase.id}`);
	}
</script>

<svelte:head>
	<title>{data.regularExpression.name} - Regular Expressions - Profilarr</title>
</svelte:head>

<RegularExpressionForm
	mode="edit"
	databaseName={data.currentDatabase.name}
	canWriteToBase={data.canWriteToBase}
	actionUrl="?/update"
	bind:name
	bind:tags
	bind:pattern
	bind:description
	bind:regex101Id
	onCancel={handleCancel}
/>
