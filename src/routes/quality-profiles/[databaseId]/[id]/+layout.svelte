<script lang="ts">
	import Tabs from '$ui/navigation/tabs/Tabs.svelte';
	import { page } from '$app/stores';
	import { FileText, Gauge, Layers, Earth } from 'lucide-svelte';

	$: databaseId = $page.params.databaseId;
	$: profileId = $page.params.id;
	$: currentPath = $page.url.pathname;

	$: tabs = [
		{
			label: 'General',
			href: `/quality-profiles/${databaseId}/${profileId}/general`,
			active: currentPath.includes('/general'),
			icon: FileText
		},
		{
			label: 'Scoring',
			href: `/quality-profiles/${databaseId}/${profileId}/scoring`,
			active: currentPath.includes('/scoring'),
			icon: Gauge
		},
		{
			label: 'Qualities',
			href: `/quality-profiles/${databaseId}/${profileId}/qualities`,
			active: currentPath.includes('/qualities'),
			icon: Layers
		},
		{
			label: 'Languages',
			href: `/quality-profiles/${databaseId}/${profileId}/languages`,
			active: currentPath.includes('/languages'),
			icon: Earth
		}
	];

	$: backButton = {
		label: 'Back',
		href: `/quality-profiles/${databaseId}`
	};
</script>

<div class="p-8">
	<Tabs {tabs} {backButton} />
	<slot />
</div>
