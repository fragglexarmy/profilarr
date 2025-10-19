<script lang="ts">
	import type { PageData } from './$types';
	import { Plus } from 'lucide-svelte';

	export let data: PageData;

	// Capitalize first letter for display (reactive statement)
	$: displayName = data.type ? data.type.charAt(0).toUpperCase() + data.type.slice(1) : '';
</script>

<div class="p-8">
	<div class="mb-8 flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-neutral-900 dark:text-neutral-50">{displayName}</h1>
			<p class="mt-3 text-lg text-neutral-600 dark:text-neutral-400">
				Manage your {displayName} instances
			</p>
		</div>
		<a
			href="/arr/new?type={data.type}"
			class="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
		>
			<Plus size={16} />
			Add Instance
		</a>
	</div>

	<!-- Instance list will go here later -->
	<div class="text-neutral-600 dark:text-neutral-400">
		<p>No instances configured yet. Click "Add Instance" to get started.</p>
	</div>
</div>
