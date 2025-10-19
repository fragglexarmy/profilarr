<script lang="ts">
	import ArrInstanceForm from '$components/arr/ArrInstanceForm.svelte';
	import type { ActionData, PageData } from './$types';

	export let form: ActionData;
	export let data: PageData;
</script>

<ArrInstanceForm mode="edit" {form} instance={data.instance} />
