<script lang="ts">
	import Tabs from '$ui/navigation/tabs/Tabs.svelte';
	import { page } from '$app/stores';
	import { Library, ArrowUpDown, ScrollText } from 'lucide-svelte';

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
			label: 'Search Priority',
			href: `/arr/${instanceId}/search-priority`,
			active: currentPath.includes('/search-priority'),
			icon: ArrowUpDown
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
