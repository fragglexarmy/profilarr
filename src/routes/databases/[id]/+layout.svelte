<script lang="ts">
	import Tabs from '$ui/navigation/tabs/Tabs.svelte';
	import { GitBranch, History } from 'lucide-svelte';
	import { page } from '$app/stores';

	$: database = $page.data.database;
	$: currentPath = $page.url.pathname;

	$: tabs = database ? [
		...(database.personal_access_token
			? [
					{
						label: 'Changes',
						href: `/databases/${database.id}/changes`,
						icon: GitBranch,
						active: currentPath.endsWith('/changes')
					}
				]
			: []),
		{
			label: 'Commits',
			href: `/databases/${database.id}/commits`,
			icon: History,
			active: currentPath.includes('/commits')
		}
	] : [];

	$: backButton = {
		label: 'Back',
		href: '/databases'
	};
</script>

<div class="p-8">
	<Tabs {tabs} {backButton} />
	<slot />
</div>
