<script lang="ts">
	import { alertStore } from './store';
	import Alert from './Alert.svelte';
</script>

<div class="pointer-events-none fixed top-4 left-4 right-4 z-50 mx-auto flex max-w-md flex-col gap-3 md:left-auto md:mx-0">
	{#each $alertStore as alert (alert.id)}
		<div class="pointer-events-auto">
			<Alert id={alert.id} type={alert.type} message={alert.message} />
		</div>
	{/each}
</div>
