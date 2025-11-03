<script lang="ts">
	import InstanceForm from '../components/InstanceForm.svelte';
	import type { ActionData, PageData } from './$types';

	export let form: ActionData;
	export let data: PageData;
</script>

<InstanceForm mode="create" {form} {data} />
