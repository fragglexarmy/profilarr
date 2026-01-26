<script lang="ts">
	import Tabs from '$ui/navigation/tabs/Tabs.svelte';
	import { GitBranch, History, Wrench, Settings, FileCog } from 'lucide-svelte';
	import { page } from '$app/stores';

	$: database = $page.data.database;
	$: currentPath = $page.url.pathname;

	$: tabs = database
		? [
				{
					label: 'Changes',
					href: `/databases/${database.id}/changes`,
					icon: GitBranch,
					active: currentPath.endsWith('/changes')
				},
				{
					label: 'Commits',
					href: `/databases/${database.id}/commits`,
					icon: History,
					active: currentPath.includes('/commits')
				},
				{
					label: 'Tweaks',
					href: `/databases/${database.id}/tweaks`,
					icon: Wrench,
					active: currentPath.includes('/tweaks')
				},
				...(database.personal_access_token
					? [
							{
								label: 'Config',
								href: `/databases/${database.id}/config`,
								icon: FileCog,
								active: currentPath.includes('/config')
							}
						]
					: []),
				{
					label: 'Settings',
					href: `/databases/${database.id}/settings`,
					icon: Settings,
					active: currentPath.includes('/settings')
				}
			]
		: [];

	$: breadcrumb = {
		parent: {
			label: 'Databases',
			href: '/databases'
		},
		current: database?.name ?? ''
	};
</script>

<div class="p-8">
	<Tabs {tabs} {breadcrumb} />
	<slot />
</div>
