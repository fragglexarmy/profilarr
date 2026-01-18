/**
 * Update quality profile qualities
 */

import type { PCDCache } from '../../cache.ts';
import { writeOperation, type OperationLayer } from '../../writer.ts';
import { logger } from '$logger/logger.ts';

export interface QualityMember {
	name: string;
}

export interface OrderedItem {
	type: 'quality' | 'group';
	name: string; // quality_name or quality_group_name
	position: number;
	enabled: boolean;
	upgradeUntil: boolean;
	members?: QualityMember[];
}

export interface UpdateQualitiesInput {
	orderedItems: OrderedItem[];
}

export interface UpdateQualitiesOptions {
	databaseId: number;
	cache: PCDCache;
	layer: OperationLayer;
	profileName: string;
	input: UpdateQualitiesInput;
}

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

	// 1. Delete existing quality_profile_qualities for this profile
	const deleteQPQ = db
		.deleteFrom('quality_profile_qualities')
		.where('quality_profile_name', '=', profileName)
		.compile();
	queries.push(deleteQPQ);

	// 2. Delete existing quality_group_members for this profile
	const deleteGroupMembers = db
		.deleteFrom('quality_group_members')
		.where('quality_profile_name', '=', profileName)
		.compile();
	queries.push(deleteGroupMembers);

	// 3. Delete existing quality_groups for this profile
	const deleteGroups = db
		.deleteFrom('quality_groups')
		.where('quality_profile_name', '=', profileName)
		.compile();
	queries.push(deleteGroups);

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
		metadata: {
			operation: 'update',
			entity: 'quality_profile',
			name: profileName
		}
	});

	return result;
}
