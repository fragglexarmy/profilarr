<script lang="ts">
	import Tabs from '$ui/navigation/tabs/Tabs.svelte';
	import { page } from '$app/stores';
	import type { LayoutData } from './$types';

	export let data: LayoutData;

	// Map databases to tabs
	$: databaseTabs = data.databases.map((db) => ({
		label: db.name,
		href: `/media-management/${db.id}/radarr`,
		active: db.id === data.currentDatabase.id
	}));

	// Determine current arr type from URL
	$: currentPath = $page.url.pathname;
	$: currentArrType = currentPath.endsWith('/sonarr') ? 'sonarr' : 'radarr';

	// Arr type tabs
	$: arrTypeTabs = [
		{
			label: 'Radarr',
			href: `/media-management/${data.currentDatabase.id}/radarr`,
			active: currentArrType === 'radarr'
		},
		{
			label: 'Sonarr',
			href: `/media-management/${data.currentDatabase.id}/sonarr`,
			active: currentArrType === 'sonarr'
		}
	];
</script>

<svelte:head>
	<title>Media Management - {data.currentDatabase.name} - Profilarr</title>
</svelte:head>

<div class="space-y-6 p-8">
	<!-- Database Tabs -->
	<Tabs tabs={databaseTabs} />

	<!-- Arr Type Tabs -->
	<Tabs tabs={arrTypeTabs} />

	<!-- Page Content -->
	<slot />
</div>
