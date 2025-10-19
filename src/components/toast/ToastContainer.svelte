<script lang="ts">
	import { toastStore } from '$stores/toast';
	import Toast from './Toast.svelte';
</script>

<div class="pointer-events-none fixed right-4 top-20 z-50 flex flex-col gap-3">
	{#each $toastStore as toast (toast.id)}
		<div class="pointer-events-auto">
			<Toast id={toast.id} type={toast.type} message={toast.message} />
		</div>
	{/each}
</div>
