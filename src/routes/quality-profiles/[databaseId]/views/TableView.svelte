<script lang="ts">
	import Table, { type Column } from '$ui/table/Table.svelte';
	import type { QualityProfileTableRow } from '$lib/server/pcd/queries/qualityProfiles';
	import { Tag, FileText, Layers, BookOpenText, Gauge, Earth } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	export let profiles: QualityProfileTableRow[];

	function handleRowClick(row: QualityProfileTableRow) {
		// Get the current database ID from the URL
		const databaseId = $page.params.databaseId;
		goto(`/quality-profiles/${databaseId}/${row.id}`);
	}

	// Define table columns for quality profiles
	const columns: Column<QualityProfileTableRow>[] = [
		{
			key: 'name',
			header: 'Name',
			headerIcon: Tag,
			align: 'left',
			sortable: true,
			cell: (row: QualityProfileTableRow) => ({
				html: `
					<div>
						<div class="font-medium">${row.name}</div>
						${row.tags.length > 0 ? `
							<div class="mt-1 flex flex-wrap gap-1">
								${row.tags.map(tag => `
									<span class="inline-flex items-center px-2 py-0.5 rounded font-mono text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
										${tag.name}
									</span>
								`).join('')}
							</div>
						` : ''}
					</div>
				`
			})
		},
		{
			key: 'description',
			header: 'Description',
			headerIcon: FileText,
			align: 'left',
			cell: (row: QualityProfileTableRow) => ({ html: row.description || '<span class="text-neutral-400">No description</span>' })
		},
		{
			key: 'qualities',
			header: 'Qualities',
			headerIcon: Layers,
			align: 'left',
			width: 'w-48',
			cell: (row: QualityProfileTableRow) => {
				return {
					html: `
						<div class="space-y-1 py-2">
							${row.qualities.map(q => `
								<div class="relative px-2 py-0.5 rounded border ${
									q.is_upgrade_until
										? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950'
										: 'border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800'
								}">
									<span class="font-mono text-xs">${q.name}</span>
								</div>
							`).join('')}
						</div>
					`
				};
			}
		},
		{
			key: 'custom_formats',
			header: 'Custom Formats',
			headerIcon: BookOpenText,
			align: 'left',
			width: 'w-48',
			cell: (row: QualityProfileTableRow) => ({
				html: `
					<div class="text-xs space-y-0.5">
						<div>All: <span class="font-mono text-[10px] bg-neutral-100 dark:bg-neutral-800 px-1 rounded">${row.custom_formats.all}</span></div>
						<div>Radarr: <span class="font-mono text-[10px] bg-neutral-100 dark:bg-neutral-800 px-1 rounded">${row.custom_formats.radarr}</span></div>
						<div>Sonarr: <span class="font-mono text-[10px] bg-neutral-100 dark:bg-neutral-800 px-1 rounded">${row.custom_formats.sonarr}</span></div>
					</div>
				`
			})
		},
		{
			key: 'scores',
			header: 'Scores',
			headerIcon: Gauge,
			align: 'left',
			width: 'w-52',
			cell: (row: QualityProfileTableRow) => ({
				html: `
					<div class="text-xs space-y-0.5">
						<div>Minimum: <span class="font-mono text-[10px] bg-neutral-100 dark:bg-neutral-800 px-1 rounded">${row.minimum_custom_format_score}</span></div>
						${row.upgrades_allowed ? `
							<div>Upgrade Until: <span class="font-mono text-[10px] bg-neutral-100 dark:bg-neutral-800 px-1 rounded">${row.upgrade_until_score}</span></div>
							<div>Increment: <span class="font-mono text-[10px] bg-neutral-100 dark:bg-neutral-800 px-1 rounded">${row.upgrade_score_increment}</span></div>
						` : `
							<div class="text-neutral-500 dark:text-neutral-400">No Upgrades</div>
						`}
					</div>
				`
			})
		},
		{
			key: 'language',
			header: 'Language',
			headerIcon: Earth,
			align: 'left',
			width: 'w-40',
			cell: (row: QualityProfileTableRow) => {
				if (!row.language) return { html: '<span class="text-neutral-400">-</span>' };

				const typePrefix = {
					must: 'Must Include',
					only: 'Must Only Be',
					not: 'Does Not Include',
					simple: ''
				};

				if (row.language.type === 'simple') {
					return {
						html: `<div class="text-xs"><span class="font-mono text-[10px] bg-neutral-100 dark:bg-neutral-800 px-1 rounded">${row.language.name}</span></div>`
					};
				}

				return {
					html: `<div class="text-xs">${typePrefix[row.language.type]} <span class="font-mono text-[10px] bg-neutral-100 dark:bg-neutral-800 px-1 rounded">${row.language.name}</span></div>`
				};
			}
		}
	];
</script>

<Table
	data={profiles}
	{columns}
	emptyMessage="No quality profiles found"
	hoverable={true}
	compact={false}
	onRowClick={handleRowClick}
/>
