<script lang="ts">
	import Group from './group.svelte';
	import GroupItem from './groupItem.svelte';
	import Version from './version.svelte';
</script>

<nav
	class="fixed top-16 left-0 flex h-[calc(100vh-4rem)] w-72 flex-col border-r border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900"
>
	<div class="flex-1 overflow-y-auto p-4">
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
	</div>

	<Version />
</nav>
