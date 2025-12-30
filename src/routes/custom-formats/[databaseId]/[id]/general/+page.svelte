<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<svelte:head>
	<title>{data.format.name} - General - Profilarr</title>
</svelte:head>

<div class="mt-6 space-y-6">
	<p class="text-neutral-600 dark:text-neutral-400">
		General tab placeholder - conditions and settings will go here.
	</p>
</div>
