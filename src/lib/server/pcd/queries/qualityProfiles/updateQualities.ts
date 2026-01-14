/**
 * Update quality profile qualities
 */

import type { PCDCache } from '../../cache.ts';
import { writeOperation, type OperationLayer } from '../../writer.ts';
import { logger } from '$logger/logger.ts';

export interface QualityMember {
	id: number;
	name: string;
}

export interface OrderedItem {
	id: number;
	type: 'quality' | 'group';
	referenceId: number;
	name: string;
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
	profileId: number;
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
	const { databaseId, cache, layer, profileId, profileName, input } = options;
	const db = cache.kb;

	const queries = [];

	// 1. Delete existing quality_profile_qualities for this profile
	const deleteQPQ = db
		.deleteFrom('quality_profile_qualities')
		.where('quality_profile_id', '=', profileId)
		.compile();
	queries.push(deleteQPQ);

	// 2. Delete existing quality_groups for this profile (cascades to quality_group_members)
	const deleteGroups = db
		.deleteFrom('quality_groups')
		.where('quality_profile_id', '=', profileId)
		.compile();
	queries.push(deleteGroups);

	// 3. Process each ordered item
	// First pass: create groups and track their temporary IDs
	const groupNameToPosition = new Map<string, number>();

	for (const item of input.orderedItems) {
		if (item.type === 'group') {
			// Create the group
			const createGroup = {
				sql: `INSERT INTO quality_groups (quality_profile_id, name) VALUES (${profileId}, '${esc(item.name)}')`,
				parameters: [],
				query: {} as never
			};
			queries.push(createGroup);

			// Track position for this group name
			groupNameToPosition.set(item.name, item.position);

			// Add group members
			if (item.members && item.members.length > 0) {
				for (const member of item.members) {
					const addMember = {
						sql: `INSERT INTO quality_group_members (quality_group_id, quality_id) VALUES ((SELECT id FROM quality_groups WHERE quality_profile_id = ${profileId} AND name = '${esc(item.name)}'), ${member.id})`,
						parameters: [],
						query: {} as never
					};
					queries.push(addMember);
				}
			}
		}
	}

	// 4. Insert quality_profile_qualities entries
	for (const item of input.orderedItems) {
		const enabled = item.enabled ? 1 : 0;
		const upgradeUntil = item.upgradeUntil ? 1 : 0;

		if (item.type === 'quality') {
			// Individual quality
			const insertQPQ = {
				sql: `INSERT INTO quality_profile_qualities (quality_profile_id, quality_id, quality_group_id, position, enabled, upgrade_until) VALUES (${profileId}, ${item.referenceId}, NULL, ${item.position}, ${enabled}, ${upgradeUntil})`,
				parameters: [],
				query: {} as never
			};
			queries.push(insertQPQ);
		} else if (item.type === 'group') {
			// Group reference
			const insertQPQ = {
				sql: `INSERT INTO quality_profile_qualities (quality_profile_id, quality_id, quality_group_id, position, enabled, upgrade_until) VALUES (${profileId}, NULL, (SELECT id FROM quality_groups WHERE quality_profile_id = ${profileId} AND name = '${esc(item.name)}'), ${item.position}, ${enabled}, ${upgradeUntil})`,
				parameters: [],
				query: {} as never
			};
			queries.push(insertQPQ);
		}
	}

	await logger.info(`Save quality profile qualities "${profileName}"`, {
		source: 'QualityProfile',
		meta: {
			profileId,
			itemCount: input.orderedItems.length,
			groupCount: input.orderedItems.filter(i => i.type === 'group').length
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
