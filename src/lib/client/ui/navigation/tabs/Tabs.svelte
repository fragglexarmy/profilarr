<script lang="ts">
	import type { ComponentType } from 'svelte';
	import { ArrowLeft, ChevronRight } from 'lucide-svelte';

	interface Tab {
		label: string;
		href: string;
		active?: boolean;
		icon?: ComponentType;
	}

	interface BackButton {
		label: string;
		href: string;
	}

	interface Breadcrumb {
		parent: {
			label: string;
			href: string;
		};
		current: string;
	}

	export let tabs: Tab[] = [];
	export let backButton: BackButton | undefined = undefined;
	export let breadcrumb: Breadcrumb | undefined = undefined;
</script>

<div class="border-b border-neutral-200 dark:border-neutral-800">
	<nav class="-mb-px flex items-center justify-between gap-2" aria-label="Tabs">
		<div class="flex gap-2">
			{#each tabs as tab (tab.href)}
				<a
					href={tab.href}
					data-sveltekit-preload-data="tap"
					class="flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors {tab.active
						? 'border-accent-600 text-accent-600 dark:border-accent-500 dark:text-accent-500'
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
		</div>

		{#if breadcrumb}
			<div class="flex items-center gap-2 text-sm">
				<a
					href={breadcrumb.parent.href}
					class="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
				>
					{breadcrumb.parent.label}
				</a>
				<ChevronRight size={14} class="text-neutral-400 dark:text-neutral-600" />
				<span class="font-medium text-neutral-900 dark:text-neutral-50">{breadcrumb.current}</span>
			</div>
		{:else if backButton}
			<a
				href={backButton.href}
				class="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
			>
				<ArrowLeft size={14} />
				{backButton.label}
			</a>
		{/if}
	</nav>
</div>
