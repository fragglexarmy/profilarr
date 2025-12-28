<script lang="ts">
	import Tabs from '$ui/navigation/tabs/Tabs.svelte';
	import { GitBranch, History } from 'lucide-svelte';
	import { page } from '$app/stores';

	$: instanceId = $page.params.id;
	$: currentPath = $page.url.pathname;

	$: tabs = [
		{
			label: 'Changes',
			href: `/databases/${instanceId}/changes`,
			icon: GitBranch,
			active: currentPath.endsWith('/changes')
		},
		{
			label: 'Commits',
			href: `/databases/${instanceId}/commits`,
			icon: History,
			active: currentPath.includes('/commits')
		}
	];

	$: backButton = {
		label: 'Back',
		href: '/databases'
	};
</script>

<div class="p-8">
	<Tabs {tabs} {backButton} />
	<slot />
</div>
