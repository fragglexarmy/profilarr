<script lang="ts">
	import Tabs from '$ui/navigation/tabs/Tabs.svelte';
	import { page } from '$app/stores';
	import { Library, RefreshCw, ArrowUpCircle, ScrollText } from 'lucide-svelte';

	$: instanceId = $page.params.id;
	$: currentPath = $page.url.pathname;

	$: tabs = [
		{
			label: 'Library',
			href: `/arr/${instanceId}/library`,
			active: currentPath.includes('/library'),
			icon: Library
		},
		{
			label: 'Sync',
			href: `/arr/${instanceId}/sync`,
			active: currentPath.includes('/sync'),
			icon: RefreshCw
		},
		{
			label: 'Upgrades',
			href: `/arr/${instanceId}/upgrades`,
			active: currentPath.includes('/upgrades'),
			icon: ArrowUpCircle
		},
		{
			label: 'Logs',
			href: `/arr/${instanceId}/logs`,
			active: currentPath.includes('/logs'),
			icon: ScrollText
		}
	];

	$: backButton = {
		label: 'Back',
		href: '/arr'
	};
</script>

<div class="p-8">
	<Tabs {tabs} {backButton} />
	<slot />
</div>
