<script lang="ts">
	import Tabs from '$ui/navigation/tabs/Tabs.svelte';
	import { page } from '$app/stores';
	import { FileText, FlaskConical } from 'lucide-svelte';

	$: databaseId = $page.params.databaseId;
	$: formatId = $page.params.id;
	$: currentPath = $page.url.pathname;

	$: tabs = [
		{
			label: 'General',
			href: `/custom-formats/${databaseId}/${formatId}/general`,
			active: currentPath.includes('/general'),
			icon: FileText
		},
		{
			label: 'Testing',
			href: `/custom-formats/${databaseId}/${formatId}/testing`,
			active: currentPath.includes('/testing'),
			icon: FlaskConical
		}
	];

	$: backButton = {
		label: 'Back',
		href: `/custom-formats/${databaseId}`
	};
</script>

<div class="p-8">
	<Tabs {tabs} {backButton} />
	<slot />
</div>
