<script lang="ts">
	import Card from './card.svelte';

	const settingsItems = [
		{
			label: 'General',
			href: '/settings/general',
			description: 'Configure general application settings, preferences, and default behaviors'
		},
		{
			label: 'Jobs',
			href: '/settings/jobs',
			description: 'Manage scheduled tasks, background jobs, and automation workflows'
		},
		{
			label: 'Logs',
			href: '/settings/logs',
			description: 'View application logs, error reports, and system activity history'
		},
		{
			label: 'Backups',
			href: '/settings/backups',
			description: 'Configure automatic backups, restore points, and data recovery options'
		},
		{
			label: 'Notifications',
			href: '/settings/notifications',
			description: 'Set up alerts, email notifications, and webhook integrations'
		},
		{
			label: 'About',
			href: '/settings/about',
			description: 'View application information, version details, and system status'
		}
	];
</script>

<div class="p-8">
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-neutral-900 dark:text-neutral-50">Settings</h1>
		<p class="mt-3 text-lg text-neutral-600 dark:text-neutral-400">
			Configure and manage your Profilarr application
		</p>
	</div>

	<div class="space-y-4">
		{#each settingsItems as item}
			<Card label={item.label} href={item.href} description={item.description} />
		{/each}
	</div>
</div>
