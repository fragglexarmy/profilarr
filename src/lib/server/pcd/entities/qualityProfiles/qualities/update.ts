/**
 * Update quality profile qualities
 */

import type { PCDCache } from '$pcd/index.ts';
import { writeOperation, type OperationLayer } from '$pcd/index.ts';
import type { OrderedItem, QualitiesPageData } from '$shared/pcd/display.ts';
import { logger } from '$logger/logger.ts';
import { qualities as readQualities } from './read.ts';

// ============================================================================
// Input types
// ============================================================================

interface UpdateQualitiesInput {
	orderedItems: OrderedItem[];
}

interface UpdateQualitiesOptions {
	databaseId: number;
	cache: PCDCache;
	layer: OperationLayer;
	profileName: string;
	input: UpdateQualitiesInput;
}

// ============================================================================
// Mutations
// ============================================================================

function esc(str: string): string {
	return str.replace(/'/g, "''");
}

/**
 * Update quality profile qualities configuration
 */
export async function updateQualities(options: UpdateQualitiesOptions) {
	const { databaseId, cache, layer, profileName, input } = options;
	const db = cache.kb;

	const queries = [];

	const currentData = await readQualities(cache, databaseId, profileName);
	if (isSameOrderedItems(currentData, input.orderedItems)) {
		return { success: true };
	}

	// 1. Delete existing quality_profile_qualities with value guards
	for (const item of currentData.orderedItems) {
		if (item.type === 'quality') {
			const deleteQPQ = {
				sql: `DELETE FROM quality_profile_qualities
WHERE quality_profile_name = '${esc(profileName)}'
  AND quality_name = '${esc(item.name)}'
  AND quality_group_name IS NULL
  AND position = ${item.position}
  AND enabled = ${item.enabled ? 1 : 0}
  AND upgrade_until = ${item.upgradeUntil ? 1 : 0}`,
				parameters: [],
				query: {} as never
			};
			queries.push(deleteQPQ);
		} else {
			const deleteQPQ = {
				sql: `DELETE FROM quality_profile_qualities
WHERE quality_profile_name = '${esc(profileName)}'
  AND quality_group_name = '${esc(item.name)}'
  AND quality_name IS NULL
  AND position = ${item.position}
  AND enabled = ${item.enabled ? 1 : 0}
  AND upgrade_until = ${item.upgradeUntil ? 1 : 0}`,
				parameters: [],
				query: {} as never
			};
			queries.push(deleteQPQ);
		}
	}

	// 2. Delete existing quality_group_members with value guards
	for (const group of currentData.groups) {
		for (const member of group.members) {
			const deleteGroupMember = {
				sql: `DELETE FROM quality_group_members
WHERE quality_profile_name = '${esc(profileName)}'
  AND quality_group_name = '${esc(group.name)}'
  AND quality_name = '${esc(member.name)}'`,
				parameters: [],
				query: {} as never
			};
			queries.push(deleteGroupMember);
		}
	}

	// 3. Delete existing quality_groups with value guards
	for (const group of currentData.groups) {
		const deleteGroup = {
			sql: `DELETE FROM quality_groups
WHERE quality_profile_name = '${esc(profileName)}'
  AND name = '${esc(group.name)}'`,
			parameters: [],
			query: {} as never
		};
		queries.push(deleteGroup);
	}

	// 4. Process each ordered item
	// First pass: create groups
	for (const item of input.orderedItems) {
		if (item.type === 'group') {
			// Create the group
			const createGroup = {
				sql: `INSERT INTO quality_groups (quality_profile_name, name) VALUES ('${esc(profileName)}', '${esc(item.name)}')`,
				parameters: [],
				query: {} as never
			};
			queries.push(createGroup);

			// Add group members
			if (item.members && item.members.length > 0) {
				for (const member of item.members) {
					const addMember = {
						sql: `INSERT INTO quality_group_members (quality_profile_name, quality_group_name, quality_name) VALUES ('${esc(profileName)}', '${esc(item.name)}', '${esc(member.name)}')`,
						parameters: [],
						query: {} as never
					};
					queries.push(addMember);
				}
			}
		}
	}

	// 5. Insert quality_profile_qualities entries
	for (const item of input.orderedItems) {
		const enabled = item.enabled ? 1 : 0;
		const upgradeUntil = item.upgradeUntil ? 1 : 0;

		if (item.type === 'quality') {
			// Individual quality
			const insertQPQ = {
				sql: `INSERT INTO quality_profile_qualities (quality_profile_name, quality_name, quality_group_name, position, enabled, upgrade_until) VALUES ('${esc(profileName)}', '${esc(item.name)}', NULL, ${item.position}, ${enabled}, ${upgradeUntil})`,
				parameters: [],
				query: {} as never
			};
			queries.push(insertQPQ);
		} else if (item.type === 'group') {
			// Group reference
			const insertQPQ = {
				sql: `INSERT INTO quality_profile_qualities (quality_profile_name, quality_name, quality_group_name, position, enabled, upgrade_until) VALUES ('${esc(profileName)}', NULL, '${esc(item.name)}', ${item.position}, ${enabled}, ${upgradeUntil})`,
				parameters: [],
				query: {} as never
			};
			queries.push(insertQPQ);
		}
	}

	await logger.info(`Save quality profile qualities "${profileName}"`, {
		source: 'QualityProfile',
		meta: {
			profileName,
			itemCount: input.orderedItems.length,
			groupCount: input.orderedItems.filter((i) => i.type === 'group').length
		}
	});

	// Write the operation
	const result = await writeOperation({
		databaseId,
		layer,
		description: `update-quality-profile-qualities-${profileName}`,
		queries,
		desiredState: {
			ordered_items: input.orderedItems
		},
		metadata: {
			operation: 'update',
			entity: 'quality_profile',
			name: profileName,
			stableKey: { key: 'quality_profile_name', value: profileName },
			changedFields: ['qualities'],
			summary: 'Update quality profile qualities',
			title: `Update qualities for quality profile "${profileName}"`
		}
	});

	return result;
}

function isSameOrderedItems(currentData: QualitiesPageData, nextItems: OrderedItem[]): boolean {
	const normalize = (items: OrderedItem[]) =>
		items.map((item) => ({
			type: item.type,
			name: item.name,
			position: item.position,
			enabled: item.enabled,
			upgradeUntil: item.upgradeUntil,
			members: item.members ? item.members.map((m) => m.name).sort() : []
		}));

	const current = normalize(currentData.orderedItems);
	const next = normalize(nextItems);

	return JSON.stringify(current) === JSON.stringify(next);
}
