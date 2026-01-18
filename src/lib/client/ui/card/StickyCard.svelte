<script lang="ts">
	import { onMount } from 'svelte';

	export let position: 'top' | 'bottom' = 'top';

	let isStuck = false;
	let sentinel: HTMLDivElement;

	onMount(() => {
		const observer = new IntersectionObserver(
			([entry]) => {
				isStuck = !entry.isIntersecting;
			},
			{ threshold: 0 }
		);

		if (sentinel) observer.observe(sentinel);

		return () => observer.disconnect();
	});
</script>

<div bind:this={sentinel} class="absolute {position === 'top' ? 'top-0' : 'bottom-0'} h-px w-px"></div>

<div
	class="sticky z-10 -mx-8 bg-neutral-50 dark:bg-neutral-900
		{position === 'top' ? 'top-0' : 'bottom-0'}"
>
	<div class="px-12 py-4">
		<div class="flex items-center justify-between gap-4">
			<slot name="left" />
			<slot name="right" />
		</div>
	</div>
	{#if position === 'top'}
		<div class="border-b border-neutral-200 transition-[margin] duration-200 dark:border-neutral-800 {isStuck ? '' : 'mx-8'}"></div>
	{:else}
		<div class="border-t border-neutral-200 transition-[margin] duration-200 dark:border-neutral-800 {isStuck ? '' : 'mx-8'}"></div>
	{/if}
</div>
