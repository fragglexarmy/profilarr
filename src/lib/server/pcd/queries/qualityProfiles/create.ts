/**
 * Create a quality profile operation
 */

import type { PCDCache } from '../../cache.ts';
import { writeOperation, type OperationLayer } from '../../writer.ts';

export interface CreateQualityProfileInput {
	name: string;
	description: string | null;
	tags: string[];
}

export interface CreateQualityProfileOptions {
	databaseId: number;
	cache: PCDCache;
	layer: OperationLayer;
	input: CreateQualityProfileInput;
}

/**
 * Escape a string for SQL
 */
function esc(value: string): string {
	return value.replace(/'/g, "''");
}

/**
 * Create a quality profile by writing an operation to the specified layer
 */
export async function create(options: CreateQualityProfileOptions) {
	const { databaseId, cache, layer, input } = options;
	const db = cache.kb;

	const queries = [];

	// 1. Insert the quality profile with default values
	const insertProfile = db
		.insertInto('quality_profiles')
		.values({
			name: input.name,
			description: input.description,
			upgrades_allowed: 1,
			minimum_custom_format_score: 0,
			upgrade_until_score: 0,
			upgrade_score_increment: 1
		})
		.compile();

	queries.push(insertProfile);

	// 2. Insert tags (create if not exist, then link)
	for (const tagName of input.tags) {
		// Insert tag if not exists
		const insertTag = db
			.insertInto('tags')
			.values({ name: tagName })
			.onConflict((oc) => oc.column('name').doNothing())
			.compile();

		queries.push(insertTag);

		// Link tag to quality profile
		const linkTag = {
			sql: `INSERT INTO quality_profile_tags (quality_profile_id, tag_id) VALUES ((SELECT id FROM quality_profiles WHERE name = '${esc(input.name)}'), tag('${esc(tagName)}'))`,
			parameters: [],
			query: {} as never
		};

		queries.push(linkTag);
	}

	// 3. Get all qualities and add them to the profile as individual items
	const allQualities = await db
		.selectFrom('qualities')
		.select(['id', 'name'])
		.orderBy('id')
		.execute();

	// Insert each quality into quality_profile_qualities
	// quality_group_id is NULL since these are individual qualities, not groups
	for (let i = 0; i < allQualities.length; i++) {
		const quality = allQualities[i];
		const insertQuality = {
			sql: `INSERT INTO quality_profile_qualities (quality_profile_id, quality_id, quality_group_id, position, enabled, upgrade_until) VALUES ((SELECT id FROM quality_profiles WHERE name = '${esc(input.name)}'), ${quality.id}, NULL, ${i + 1}, 1, 0)`,
			parameters: [],
			query: {} as never
		};
		queries.push(insertQuality);
	}

	// Write the operation
	const result = await writeOperation({
		databaseId,
		layer,
		description: `create-quality-profile-${input.name}`,
		queries,
		metadata: {
			operation: 'create',
			entity: 'quality_profile',
			name: input.name
		}
	});

	return result;
}
