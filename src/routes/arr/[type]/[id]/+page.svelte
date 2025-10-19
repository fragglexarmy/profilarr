<script lang="ts">
	import type { PageData } from './$types';
	import { Plus, Pencil } from 'lucide-svelte';

	export let data: PageData;
</script>

<div class="p-8">
	<!-- Tabs Section -->
	<div class="mb-8">
		<div class="border-b border-neutral-200 dark:border-neutral-800">
			<nav class="-mb-px flex gap-2" aria-label="Tabs">
				<!-- Instance Tabs -->
				{#each data.allInstances as instance (instance.id)}
					<a
						href="/arr/{data.type}/{instance.id}"
						class="border-b-2 px-4 py-3 text-sm font-medium transition-colors {data.instance.id ===
						instance.id
							? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-500'
							: 'border-transparent text-neutral-600 hover:border-neutral-300 hover:text-neutral-900 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-50'}"
					>
						{instance.name}
					</a>
				{/each}

				<!-- Add Instance Tab (always visible) -->
				<a
					href="/arr/new?type={data.type}"
					class="flex items-center gap-2 border-b-2 border-transparent px-4 py-3 text-sm font-medium text-neutral-600 transition-colors hover:border-neutral-300 hover:text-neutral-900 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-50"
				>
					<Plus size={16} />
					Add Instance
				</a>
			</nav>
		</div>
	</div>

	<!-- Content Area -->
	<div class="text-neutral-600 dark:text-neutral-400">
		<p>Instance content for: {data.instance.name} (ID: {data.instance.id})</p>
		<p class="mt-2">URL: {data.instance.url}</p>
		<p class="mt-2">Type: {data.instance.type}</p>
	</div>
</div>

<!-- Floating Edit Button -->
<a
	href="/arr/{data.type}/{data.instance.id}/edit"
	class="group fixed right-8 bottom-8 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 shadow-md transition-all hover:scale-110 hover:border-neutral-300 hover:shadow-lg dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-600"
	aria-label="Edit instance"
>
	<Pencil size={18} class="transition-transform duration-300 group-hover:rotate-12" />
</a>
