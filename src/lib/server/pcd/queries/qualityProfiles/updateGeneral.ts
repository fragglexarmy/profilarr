/**
 * Update quality profile general information
 */

import type { PCDCache } from '../../cache.ts';
import { writeOperation, type OperationLayer } from '../../writer.ts';
import type { QualityProfileGeneral } from './types.ts';
import { logger } from '$logger/logger.ts';

export interface UpdateGeneralInput {
	name: string;
	description: string;
	tags: string[];
}

export interface UpdateGeneralOptions {
	databaseId: number;
	cache: PCDCache;
	layer: OperationLayer;
	/** The current quality profile data (for value guards) */
	current: QualityProfileGeneral;
	/** The new values */
	input: UpdateGeneralInput;
}

/**
 * Escape a string for SQL
 */
function esc(value: string): string {
	return value.replace(/'/g, "''");
}

/**
 * Update quality profile general information
 */
export async function updateGeneral(options: UpdateGeneralOptions) {
	const { databaseId, cache, layer, current, input } = options;
	const db = cache.kb;

	const queries = [];

	// 1. Update the quality profile with value guards
	const updateProfile = db
		.updateTable('quality_profiles')
		.set({
			name: input.name,
			description: input.description || null
		})
		.where('id', '=', current.id)
		// Value guards - ensure current values match what we expect
		.where('name', '=', current.name)
		.compile();

	queries.push(updateProfile);

	// 2. Handle tag changes
	const currentTagNames = current.tags.map((t) => t.name);
	const newTagNames = input.tags;

	// Tags to remove
	const tagsToRemove = currentTagNames.filter((t) => !newTagNames.includes(t));
	for (const tagName of tagsToRemove) {
		const removeTag = {
			sql: `DELETE FROM quality_profile_tags WHERE quality_profile_name = '${esc(current.name)}' AND tag_name = '${esc(tagName)}'`,
			parameters: [],
			query: {} as never
		};
		queries.push(removeTag);
	}

	// Tags to add
	const tagsToAdd = newTagNames.filter((t) => !currentTagNames.includes(t));
	for (const tagName of tagsToAdd) {
		// Insert tag if not exists
		const insertTag = db
			.insertInto('tags')
			.values({ name: tagName })
			.onConflict((oc) => oc.column('name').doNothing())
			.compile();

		queries.push(insertTag);

		// Link tag to quality profile
		// Use input.name since the profile might have been renamed
		const profileNameForLink = input.name !== current.name ? input.name : current.name;
		const linkTag = {
			sql: `INSERT INTO quality_profile_tags (quality_profile_name, tag_name) VALUES ('${esc(profileNameForLink)}', '${esc(tagName)}')`,
			parameters: [],
			query: {} as never
		};

		queries.push(linkTag);
	}

	// Log what's being changed
	const changes: Record<string, { from: unknown; to: unknown }> = {};

	if (current.name !== input.name) {
		changes.name = { from: current.name, to: input.name };
	}
	if (current.description !== input.description) {
		changes.description = { from: current.description, to: input.description };
	}
	if (tagsToAdd.length > 0 || tagsToRemove.length > 0) {
		changes.tags = { from: currentTagNames, to: input.tags };
	}

	await logger.info(`Save quality profile "${input.name}"`, {
		source: 'QualityProfile',
		meta: {
			id: current.id,
			changes
		}
	});

	// Write the operation with metadata
	const isRename = input.name !== current.name;

	const result = await writeOperation({
		databaseId,
		layer,
		description: `update-quality-profile-${input.name}`,
		queries,
		metadata: {
			operation: 'update',
			entity: 'quality_profile',
			name: input.name,
			...(isRename && { previousName: current.name })
		}
	});

	return result;
}
