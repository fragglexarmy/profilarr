<script lang="ts">
	import { page } from '$app/stores';
	import ArrInstanceForm from '$components/arr/ArrInstanceForm.svelte';
	import type { ActionData } from './$types';

	export let form: ActionData;

	// Get type from URL params if provided
	const typeFromUrl = $page.url.searchParams.get('type') || '';
</script>

<ArrInstanceForm mode="create" {form} initialType={typeFromUrl} />
