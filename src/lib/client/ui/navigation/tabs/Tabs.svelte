<script lang="ts">
	import type { ComponentType } from 'svelte';

	interface Tab {
		label: string;
		href: string;
		active?: boolean;
		icon?: ComponentType;
	}

	export let tabs: Tab[] = [];
</script>

<div class="border-b border-neutral-200 dark:border-neutral-800">
	<nav class="-mb-px flex gap-2" aria-label="Tabs">
		{#each tabs as tab (tab.href)}
			<a
				href={tab.href}
				class="flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors {tab.active
					? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-500'
					: 'border-transparent text-neutral-600 hover:border-neutral-300 hover:text-neutral-900 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-50'}"
			>
				{#if tab.icon}
					<svelte:component this={tab.icon} size={16} />
				{/if}
				{tab.label}
			</a>
		{/each}

		<!-- Actions slot for custom action tabs (like Add Instance) -->
		<slot name="actions" />
	</nav>
</div>
