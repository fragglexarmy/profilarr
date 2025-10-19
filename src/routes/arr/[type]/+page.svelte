<script lang="ts">
	import type { PageData } from './$types';
	import { Plus, Inbox } from 'lucide-svelte';

	export let data: PageData;

	// Capitalize first letter for display
	$: displayName = data.type ? data.type.charAt(0).toUpperCase() + data.type.slice(1) : '';
</script>

<div class="flex min-h-[calc(100vh-4rem)] items-center justify-center p-8">
	<div class="w-full max-w-md text-center">
		<!-- Icon -->
		<div class="mb-6 flex justify-center">
			<div class="rounded-full bg-neutral-100 p-6 dark:bg-neutral-800">
				<Inbox class="h-12 w-12 text-neutral-400 dark:text-neutral-500" />
			</div>
		</div>

		<!-- Title -->
		<h1 class="mb-3 text-2xl font-bold text-neutral-900 dark:text-neutral-50">
			No {displayName} instances yet
		</h1>

		<!-- Description -->
		<p class="mb-8 text-neutral-600 dark:text-neutral-400">
			Get started by adding your first {displayName} instance to begin managing your media library.
		</p>

		<!-- Action Button -->
		<a
			href="/arr/new?type={data.type}"
			class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
		>
			<Plus size={18} />
			Add {displayName} Instance
		</a>
	</div>
</div>
