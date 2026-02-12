<script lang="ts">
	export let text: string = '';
	export let position: 'top' | 'bottom' = 'bottom';

	let visible = false;
	let style = '';
	let wrapperEl: HTMLDivElement;

	function show() {
		if (!text || !wrapperEl) return;
		const rect = wrapperEl.getBoundingClientRect();
		const centerX = rect.left + rect.width / 2;
		if (position === 'top') {
			style = `left:${centerX}px;top:${rect.top}px;transform:translate(-50%,-100%) translateY(-8px)`;
		} else {
			style = `left:${centerX}px;top:${rect.bottom}px;transform:translate(-50%,0) translateY(8px)`;
		}
		visible = true;
	}

	function hide() {
		visible = false;
	}
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="inline-flex" bind:this={wrapperEl} on:mouseenter={show} on:mouseleave={hide}>
	<slot />
</div>

{#if text && visible}
	<div class="pointer-events-none fixed z-50" {style}>
		<div class="whitespace-nowrap rounded-xl border border-neutral-300 bg-white px-2 py-1 text-xs font-medium text-neutral-900 shadow-lg dark:border-neutral-700/60 dark:bg-neutral-800 dark:text-neutral-50">
			{text}
		</div>
	</div>
{/if}
