<script lang="ts">
	import type { PageData } from './$types';
	import { Pencil } from 'lucide-svelte';

	export let data: PageData;
</script>

<svelte:head>
	<title>{data.database.name} - Profilarr</title>
</svelte:head>

<!-- Floating Edit Button -->
<a
	href="/databases/{data.database.id}/edit"
	class="group fixed right-8 bottom-8 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 shadow-md transition-all hover:scale-110 hover:border-neutral-300 hover:shadow-lg dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-600"
	aria-label="Edit database"
>
	<Pencil size={18} class="transition-transform duration-300 group-hover:rotate-12" />
</a>
