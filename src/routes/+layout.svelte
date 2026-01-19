<script lang="ts">
	import '../app.css';
	import logo from '$assets/logo-512.png';
	import Navbar from '$ui/navigation/navbar/navbar.svelte';
	import PageNav from '$ui/navigation/pageNav/pageNav.svelte';
	import AlertContainer from '$alerts/AlertContainer.svelte';
	import { sidebarCollapsed } from '$lib/client/stores/sidebar';

	export let data;
</script>

<svelte:head>
	<link rel="icon" href={logo} />
	<title>Profilarr</title>
</svelte:head>

<Navbar collapsed={$sidebarCollapsed} />
<PageNav collapsed={$sidebarCollapsed} version={data.version} />
<AlertContainer />

<!-- Sidebar collapse toggle button -->
<button
	type="button"
	on:click={() => sidebarCollapsed.toggle()}
	class="fixed top-16 z-50 flex h-6 w-6 -translate-x-1/2 -translate-y-1/3 items-center justify-center rounded-md border border-neutral-300 bg-white shadow-sm transition-all hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700"
	style="left: {$sidebarCollapsed ? '24px' : '288px'}"
	aria-label={$sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
>
	<div class="flex flex-col gap-[3px]">
		<div class="h-[2px] w-3 rounded-full bg-neutral-400 dark:bg-neutral-500"></div>
		<div class="h-[2px] w-3 rounded-full bg-neutral-400 dark:bg-neutral-500"></div>
		<div class="h-[2px] w-3 rounded-full bg-neutral-400 dark:bg-neutral-500"></div>
	</div>
</button>

<main class="transition-all duration-200 {$sidebarCollapsed ? 'pl-[24px]' : 'pl-72'}">
	<slot />
</main>
