<script lang="ts">
	import GroupHeader from './groupHeader.svelte';
	import type { Snippet } from 'svelte';
	import { slide } from 'svelte/transition';

	interface Props {
		label: string;
		href: string;
		initialOpen?: boolean;
		hasItems?: boolean;
		children?: Snippet;
	}

	let { label, href, initialOpen = true, hasItems = false, children }: Props = $props();
	let isOpen = $state(initialOpen);

	function toggleOpen() {
		isOpen = !isOpen;
	}
</script>

<div class="mb-4">
	<GroupHeader {label} {href} {isOpen} {hasItems} onToggle={toggleOpen} />

	{#if isOpen && hasItems && children}
		<div class="mt-2 grid grid-cols-[auto_1fr]" transition:slide={{ duration: 200 }}>
			<!-- Column 1: Vertical line -->
			<div class="flex justify-center px-5">
				<div class="w-0.5 rounded-full bg-neutral-300 dark:bg-neutral-700"></div>
			</div>

			<!-- Column 2: Items -->
			<div class="-ml-3 flex flex-col gap-1">
				{@render children()}
			</div>
		</div>
	{/if}
</div>
