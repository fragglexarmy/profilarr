<script lang="ts">
	import { Save, Check, Code } from 'lucide-svelte';
	import ExpandableTable from '$ui/table/ExpandableTable.svelte';
	import IconCheckbox from '$ui/form/IconCheckbox.svelte';
	import type { Column } from '$ui/table/types';
	import type { PageData } from './$types';

	export let data: PageData;

	// Mock tweak data
	type Tweak = {
		id: string;
		name: string;
		description: string;
		sql: string;
	};

	const mockTweaks: Tweak[] = [
		{
			id: 'enable-prereleases',
			name: 'Enable Prereleases',
			description: 'Adds a Prereleases quality group (CAM, Telesync, DVD Screener, etc.) to the bottom of all quality profiles, allowing early access to new releases.',
			sql: `-- Enable Prereleases
-- Creates a Prereleases quality group for each profile and places it
-- below the last enabled quality/group

-- Step 1: Create Prereleases group for each quality profile
INSERT INTO quality_groups (quality_profile_id, name)
SELECT id, 'Prereleases'
FROM quality_profiles
WHERE id NOT IN (
    SELECT quality_profile_id FROM quality_groups WHERE name = 'Prereleases'
);

-- Step 2: Add prerelease qualities to the group
INSERT INTO quality_group_members (quality_group_id, quality_id)
SELECT qg.id, q.id
FROM quality_groups qg
CROSS JOIN qualities q
WHERE qg.name = 'Prereleases'
  AND q.name IN ('CAM', 'TELESYNC', 'TELECINE', 'DVDSCR', 'REGIONAL', 'WORKPRINT')
  AND NOT EXISTS (
      SELECT 1 FROM quality_group_members qgm
      WHERE qgm.quality_group_id = qg.id AND qgm.quality_id = q.id
  );

-- Step 3: Add the group to each profile's quality list
-- Position it below the last enabled quality/group
INSERT INTO quality_profile_qualities (quality_profile_id, quality_group_id, position, enabled)
SELECT
    qg.quality_profile_id,
    qg.id,
    COALESCE(
        (SELECT MAX(position) + 1
         FROM quality_profile_qualities
         WHERE quality_profile_id = qg.quality_profile_id AND enabled = 1),
        1
    ),
    1
FROM quality_groups qg
WHERE qg.name = 'Prereleases'
  AND NOT EXISTS (
      SELECT 1 FROM quality_profile_qualities qpq
      WHERE qpq.quality_group_id = qg.id
  );`
		}
	];

	// Track enabled state (not persisted)
	let enabledTweaks: Set<string> = new Set();

	function toggleTweak(id: string) {
		if (enabledTweaks.has(id)) {
			enabledTweaks.delete(id);
		} else {
			enabledTweaks.add(id);
		}
		enabledTweaks = enabledTweaks;
	}

	const columns: Column<Tweak>[] = [
		{
			key: 'name',
			header: 'Name',
			sortable: true
		},
		{
			key: 'description',
			header: 'Description'
		}
	];

	function getRowId(row: Tweak): string {
		return row.id;
	}

	$: hasChanges = enabledTweaks.size > 0;
</script>

<svelte:head>
	<title>Tweaks - {data.database.name} - Profilarr</title>
</svelte:head>

<div class="mt-6 space-y-4">
	<!-- Header with Save -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Tweaks</h1>
			<p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
				Optional modifications curated by databases. Enable tweaks to adjust quality profile behaviour.
			</p>
		</div>
		<button
			type="button"
			disabled={!hasChanges}
			class="flex items-center gap-2 rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-accent-500 dark:hover:bg-accent-600"
		>
			<Save size={16} />
			Save
		</button>
	</div>

	<!-- Tweaks Table -->
	{#if mockTweaks.length > 0}
		<ExpandableTable
			{columns}
			data={mockTweaks}
			{getRowId}
			compact={true}
			flushExpanded={true}
			emptyMessage="No tweaks available"
			chevronPosition="right"
		>
			<svelte:fragment slot="cell" let:row let:column>
				{#if column.key === 'name'}
					<span class="font-medium text-neutral-900 dark:text-neutral-100">{row.name}</span>
				{:else if column.key === 'description'}
					<span class="text-sm text-neutral-600 dark:text-neutral-400">{row.description}</span>
				{/if}
			</svelte:fragment>

			<svelte:fragment slot="actions" let:row>
				<IconCheckbox
					icon={Check}
					checked={enabledTweaks.has(row.id)}
					on:click={() => toggleTweak(row.id)}
				/>
			</svelte:fragment>

			<svelte:fragment slot="expanded" let:row>
				<div class="px-6 py-4">
					<div class="flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">
						<Code size={12} />
						SQL
					</div>
					<pre class="rounded-lg bg-neutral-100 p-3 text-xs font-mono text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 overflow-x-auto">{row.sql}</pre>
				</div>
			</svelte:fragment>
		</ExpandableTable>
	{:else}
		<div class="rounded-lg border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
			<p class="text-neutral-500 dark:text-neutral-400">
				No tweaks available for this database.
			</p>
		</div>
	{/if}
</div>
