/**
 * Create a quality profile operation
 */

import type { PCDCache } from '$pcd/index.ts';
import { writeOperation, type OperationLayer } from '$pcd/index.ts';

// ============================================================================
// Input types
// ============================================================================

interface CreateQualityProfileInput {
	name: string;
	description: string | null;
	tags: string[];
	language: string | null;
}

interface CreateQualityProfileOptions {
	databaseId: number;
	cache: PCDCache;
	layer: OperationLayer;
	input: CreateQualityProfileInput;
}

// ============================================================================
// Mutations
// ============================================================================

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

		// Link tag to quality profile using name-based FKs
		const linkTag = {
			sql: `INSERT INTO quality_profile_tags (quality_profile_name, tag_name) VALUES ('${esc(input.name)}', '${esc(tagName)}')`,
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
	// quality_group_name is NULL since these are individual qualities, not groups
	for (let i = 0; i < allQualities.length; i++) {
		const quality = allQualities[i];
		const insertQuality = {
			sql: `INSERT INTO quality_profile_qualities (quality_profile_name, quality_name, quality_group_name, position, enabled, upgrade_until) VALUES ('${esc(input.name)}', '${esc(quality.name)}', NULL, ${i + 1}, 1, 0)`,
			parameters: [],
			query: {} as never
		};
		queries.push(insertQuality);
	}

	// 4. Insert language if one is selected
	if (input.language !== null) {
		const insertLanguage = {
			sql: `INSERT INTO quality_profile_languages (quality_profile_name, language_name, type) VALUES ('${esc(input.name)}', '${esc(input.language)}', 'simple')`,
			parameters: [],
			query: {} as never
		};
		queries.push(insertLanguage);
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
