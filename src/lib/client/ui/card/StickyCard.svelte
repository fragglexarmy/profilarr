<script lang="ts">
	import { onMount } from 'svelte';

	export let position: 'top' | 'bottom' = 'top';
	export let variant: 'default' | 'transparent' | 'blur' = 'default';

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

	$: bgClass =
		variant === 'default'
			? 'bg-neutral-50 dark:bg-neutral-900'
			: variant === 'blur'
				? 'backdrop-blur-sm bg-neutral-50/50 dark:bg-neutral-900/50'
				: '';
</script>

<div
	bind:this={sentinel}
	class="absolute {position === 'top' ? 'top-0' : 'bottom-0'} h-px w-px"
></div>

<div
	class="sticky z-10 -mx-4 md:-mx-8 {bgClass}
		{position === 'top' ? 'top-0' : 'bottom-0'}"
>
	<div class="px-4 py-3 md:px-12 md:py-4">
		<div class="flex items-center justify-between gap-3 md:gap-4">
			<div class="[&_h1]:text-sm [&_h1]:md:text-xl [&_p]:text-xs [&_p]:md:text-sm">
				<slot name="left" />
			</div>
			<slot name="right" />
		</div>
	</div>
	{#if variant === 'default'}
		{#if position === 'top'}
			<div
				class="border-b border-neutral-200 transition-[margin] duration-200 dark:border-neutral-800 {isStuck
					? ''
					: 'mx-4 md:mx-8'}"
			></div>
		{:else}
			<div
				class="border-t border-neutral-200 transition-[margin] duration-200 dark:border-neutral-800 {isStuck
					? ''
					: 'mx-4 md:mx-8'}"
			></div>
		{/if}
	{/if}
</div>
