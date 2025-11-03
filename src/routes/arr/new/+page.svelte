<script lang="ts">
	import { page } from '$app/stores';
	import InstanceForm from '../components/InstanceForm.svelte';
	import type { ActionData } from './$types';

	export let form: ActionData;

	// Get type from URL params if provided
	const typeFromUrl = $page.url.searchParams.get('type') || '';
</script>

<InstanceForm mode="create" {form} initialType={typeFromUrl} />
