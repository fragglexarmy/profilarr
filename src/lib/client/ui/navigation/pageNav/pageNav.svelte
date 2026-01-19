<script lang="ts">
	import Group from './group.svelte';
	import GroupItem from './groupItem.svelte';
	import Version from './version.svelte';
	import { Home, Sliders, Palette, Microscope, Tag, Clock, Settings } from 'lucide-svelte';
	import { navIconStore } from '$stores/navIcons';

	export let collapsed: boolean = false;
	export let version: string = '';

	$: useEmoji = $navIconStore === 'emoji';
</script>

<nav
	class="fixed top-16 left-0 flex h-[calc(100vh-4rem)] w-72 flex-col border-r border-neutral-200 bg-neutral-50 transition-transform duration-200 dark:border-neutral-800 dark:bg-neutral-900"
	class:-translate-x-[calc(100%-24px)]={collapsed}
>
	<div class="flex-1 overflow-y-auto p-4">
		<Group
			label={useEmoji ? '🏠 Home' : 'Home'}
			href="/"
			icon={useEmoji ? undefined : Home}
			hasItems={true}
		>
			<GroupItem label="Databases" href="/databases" />
			<GroupItem label="Arrs" href="/arr" />
		</Group>

		<Group
			label={useEmoji ? '⚡ Quality Profiles' : 'Quality Profiles'}
			href="/quality-profiles"
			icon={useEmoji ? undefined : Sliders}
			initialOpen={true}
			hasItems={true}
		>
			<GroupItem label="Testing" href="/quality-profiles/entity-testing" />
		</Group>

		<Group
			label={useEmoji ? '🎨 Custom Formats' : 'Custom Formats'}
			href="/custom-formats"
			icon={useEmoji ? undefined : Palette}
			initialOpen={false}
		/>

		<Group
			label={useEmoji ? '🔬 Regular Expressions' : 'Regular Expressions'}
			href="/regular-expressions"
			icon={useEmoji ? undefined : Microscope}
			initialOpen={false}
		/>

		<Group
			label={useEmoji ? '🏷️ Media Management' : 'Media Management'}
			href="/media-management"
			icon={useEmoji ? undefined : Tag}
			initialOpen={false}
		/>

		<Group
			label={useEmoji ? '⏱️ Delay Profiles' : 'Delay Profiles'}
			href="/delay-profiles"
			icon={useEmoji ? undefined : Clock}
			initialOpen={false}
		/>

		<Group
			label={useEmoji ? '⚙️ Settings' : 'Settings'}
			href="/settings"
			icon={useEmoji ? undefined : Settings}
			initialOpen={true}
			hasItems={true}
		>
			<GroupItem label="General" href="/settings/general" />
			<GroupItem label="Jobs" href="/settings/jobs" />
			<GroupItem label="Logs" href="/settings/logs" />
			<GroupItem label="Backups" href="/settings/backups" />
			<GroupItem label="Notifications" href="/settings/notifications" />
			<GroupItem label="About" href="/settings/about" />
		</Group>
	</div>

	<Version {version} />
</nav>
