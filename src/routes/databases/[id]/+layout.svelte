<script lang="ts">
	import Tabs from '$ui/navigation/tabs/Tabs.svelte';
	import { RefreshCw, GitBranch } from 'lucide-svelte';
	import { page } from '$app/stores';

	$: instanceId = $page.params.id;
	$: currentPath = $page.url.pathname;
	$: hasToken = !!$page.data.database?.personal_access_token;

	$: tabs = [
		{
			label: 'Sync',
			href: `/databases/${instanceId}/sync`,
			icon: RefreshCw,
			active: currentPath.includes('/sync')
		},
		...(hasToken
			? [
					{
						label: 'Changes',
						href: `/databases/${instanceId}/changes`,
						icon: GitBranch,
						active: currentPath.includes('/changes')
					}
				]
			: [])
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
