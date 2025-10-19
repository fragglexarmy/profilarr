<script lang="ts">
	import type { PageData } from './$types';
	import {
		Info,
		FolderOpen,
		Database,
		HelpCircle,
		Heart,
		ListChecks,
		Package
	} from 'lucide-svelte';
	import InfoTable from './components/InfoTable.svelte';
	import InfoRow from './components/InfoRow.svelte';
	import VersionBadge from './components/VersionBadge.svelte';

	export let data: PageData;

	type InfoRowData = {
		label: string;
		value: string;
		type: 'code' | 'link' | 'text';
		href?: string;
	};

	type Section = {
		title: string;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		icon?: any;
		rows: InfoRowData[];
	};

	const sections: Section[] = [
		{
			title: 'Paths',
			icon: FolderOpen,
			rows: [
				{ label: 'Base Path', value: data.paths.base, type: 'code' },
				{ label: 'Data Directory', value: data.paths.data, type: 'code' },
				{ label: 'Logs Directory', value: data.paths.logs, type: 'code' },
				{ label: 'Database Path', value: data.paths.database, type: 'code' }
			]
		},
		{
			title: 'Getting Support',
			icon: HelpCircle,
			rows: [
				{
					label: 'Documentation',
					value: 'https://dictionarry.dev/',
					type: 'link',
					href: 'https://dictionarry.dev/'
				},
				{
					label: 'GitHub',
					value: 'https://github.com/Dictionarry-Hub',
					type: 'link',
					href: 'https://github.com/Dictionarry-Hub'
				},
				{
					label: 'Discord',
					value: 'https://discord.gg/XGdTJP5G8a',
					type: 'link',
					href: 'https://discord.gg/XGdTJP5G8a'
				}
			]
		},
		{
			title: 'Support',
			icon: Heart,
			rows: [
				{
					label: 'GitHub Sponsors',
					value: 'https://github.com/sponsors/Dictionarry-Hub',
					type: 'link',
					href: 'https://github.com/sponsors/Dictionarry-Hub'
				},
				{
					label: 'Buy Me a Coffee',
					value: 'https://www.buymeacoffee.com/santiagosayshey',
					type: 'link',
					href: 'https://www.buymeacoffee.com/santiagosayshey'
				}
			]
		}
	];
</script>

<div class="p-8">
	<h1 class="mb-6 text-3xl font-bold text-neutral-900 dark:text-neutral-50">About Profilarr</h1>

	<div class="space-y-6">
		<!-- Application (special case with version badge) -->
		<InfoTable title="Application" icon={Info}>
			<tr class="bg-white dark:bg-neutral-900">
				<td class="w-1/3 px-6 py-4 text-sm font-medium text-neutral-900 dark:text-neutral-50">
					Version
				</td>
				<td class="px-6 py-4 text-sm">
					<div class="flex items-center gap-2">
						<code
							class="rounded bg-neutral-100 px-2 py-1 font-mono text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
						>
							v{data.version}
						</code>
						<VersionBadge status={data.versionStatus} />
					</div>
				</td>
			</tr>
			<InfoRow label="Timezone" value={data.timezone} type="code" />
		</InfoTable>

		{#each sections as section (section.title)}
			<InfoTable title={section.title} icon={section.icon}>
				{#each section.rows as row (row.label)}
					<InfoRow label={row.label} value={row.value} type={row.type} href={row.href} />
				{/each}
			</InfoTable>
		{/each}

		<!-- Database (special case with custom content) -->
		{#if data.migration.applied.length > 0}
			<InfoTable title="Database" icon={Database}>
				<tr class="bg-white dark:bg-neutral-900">
					<td
						class="w-1/3 px-6 py-4 align-top text-sm font-medium text-neutral-900 dark:text-neutral-50"
					>
						Migrations
					</td>
					<td class="px-6 py-4">
						<div class="space-y-2">
							{#each data.migration.applied as migration (migration.version)}
								<div class="flex items-center justify-between">
									<div class="text-sm">
										<code
											class="rounded bg-neutral-100 px-2 py-1 font-mono text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
										>
											v{migration.version}
										</code>
										<span class="ml-2 text-neutral-600 dark:text-neutral-400">
											{migration.name}
										</span>
									</div>
									<span class="text-xs text-neutral-500">
										{new Date(migration.applied_at).toLocaleDateString()}
									</span>
								</div>
							{/each}
						</div>
					</td>
				</tr>
			</InfoTable>
		{/if}

		<!-- Releases Section -->
		{#if data.releases.length > 0}
			<InfoTable title="Releases" icon={Package}>
				<tr class="bg-white dark:bg-neutral-900">
					<td colspan="2" class="px-6 py-4">
						<div class="space-y-3">
							{#each data.releases as release, index (release.tag_name)}
								<div
									class="flex items-center justify-between border-b border-neutral-200 pb-3 last:border-0 last:pb-0 dark:border-neutral-800"
								>
									<div class="flex items-center gap-3">
										<a
											href={release.html_url}
											target="_blank"
											rel="noopener noreferrer"
											data-sveltekit-reload
											class="font-mono text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
										>
											{release.tag_name}
										</a>
										{#if index === 0}
											<span
												class="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
											>
												Latest
											</span>
										{/if}
										{#if release.prerelease}
											<span
												class="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
											>
												Pre-release
											</span>
										{/if}
									</div>
									<span class="text-xs text-neutral-500 dark:text-neutral-500">
										{new Date(release.published_at).toLocaleDateString()}
									</span>
								</div>
							{/each}
						</div>
					</td>
				</tr>
			</InfoTable>
		{/if}
	</div>
</div>
