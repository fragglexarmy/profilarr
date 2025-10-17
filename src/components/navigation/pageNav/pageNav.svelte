<script lang="ts">
	import Group from './group.svelte';
	import GroupItem from './groupItem.svelte';
</script>

<nav
	class="fixed left-0 top-16 h-[calc(100vh-4rem)] w-72 overflow-y-auto border-r border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900"
>
	<Group label="🏠 Home" href="/" hasItems={true}>
		<GroupItem label="Databases" href="/databases" />
		<GroupItem label="Radarr" href="/radarr" />
		<GroupItem label="Sonarr" href="/sonarr" />
		<GroupItem label="Lidarr" href="/lidarr" />
	</Group>

	<Group label="⚡ Quality Profiles" href="/quality-profiles" initialOpen={false} />

	<Group label="🎨 Custom Formats" href="/custom-formats" initialOpen={false} />

	<Group label="🔬 Regular Expressions" href="/regular-expressions" initialOpen={false} />

	<Group label="🏷️ Media Management" href="/media-management" initialOpen={false} />

	<Group label="⚙️ Settings" href="/settings" initialOpen={true} hasItems={true}>
		<GroupItem label="General" href="/settings/general" />
		<GroupItem label="Jobs" href="/settings/jobs" />
		<GroupItem label="Logs" href="/settings/logs" />
		<GroupItem label="Backups" href="/settings/backups" />
		<GroupItem label="Notifications" href="/settings/notifications" />
		<GroupItem label="About" href="/settings/about" />
	</Group>
</nav>
