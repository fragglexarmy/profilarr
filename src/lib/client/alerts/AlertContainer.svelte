<script lang="ts">
	import { alertStore } from './store';
	import Alert from './Alert.svelte';
</script>

<div class="pointer-events-none fixed top-20 right-4 z-50 flex flex-col gap-3">
	{#each $alertStore as alert (alert.id)}
		<div class="pointer-events-auto">
			<Alert id={alert.id} type={alert.type} message={alert.message} />
		</div>
	{/each}
</div>
