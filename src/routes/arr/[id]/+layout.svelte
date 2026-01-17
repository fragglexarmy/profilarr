<script lang="ts">
	import Tabs from '$ui/navigation/tabs/Tabs.svelte';
	import { page } from '$app/stores';
	import { Library, RefreshCw, ArrowUpCircle, FileEdit, ScrollText } from 'lucide-svelte';
	import type { LayoutData } from './$types';

	export let data: LayoutData;

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
			label: 'Renames',
			href: `/arr/${instanceId}/rename`,
			active: currentPath.includes('/rename'),
			icon: FileEdit
		},
		{
			label: 'Logs',
			href: `/arr/${instanceId}/logs`,
			active: currentPath.includes('/logs'),
			icon: ScrollText
		}
	];

	$: breadcrumb = {
		parent: {
			label: 'Instances',
			href: '/arr'
		},
		current: data.instance.name
	};
</script>

<div class="p-8">
	<Tabs {tabs} {breadcrumb} />
	<slot />
</div>
