/**
 * Bulk create test releases operation
 */

import type { PCDCache } from '../../cache.ts';
import { writeOperation, type OperationLayer } from '../../writer.ts';

export interface CreateTestReleasesInput {
	entityType: 'movie' | 'series';
	entityTmdbId: number;
	title: string;
	size_bytes: number | null;
	languages: string[];
	indexers: string[];
	flags: string[];
}

export interface CreateTestReleasesOptions {
	databaseId: number;
	cache: PCDCache;
	layer: OperationLayer;
	inputs: CreateTestReleasesInput[];
}

/**
 * Bulk create test releases by writing operations to the specified layer
 * Skips releases that already exist (by title within the same entity)
 */
export async function createReleases(options: CreateTestReleasesOptions) {
	const { databaseId, cache, layer, inputs } = options;
	const db = cache.kb;

	if (inputs.length === 0) {
		return {
			success: true,
			added: 0,
			skipped: 0
		};
	}

	// Get the entity key (all inputs should have the same entity)
	const entityType = inputs[0].entityType;
	const entityTmdbId = inputs[0].entityTmdbId;

	// Check for existing releases for this entity
	const existingReleases = await db
		.selectFrom('test_releases')
		.select(['title'])
		.where('entity_type', '=', entityType)
		.where('entity_tmdb_id', '=', entityTmdbId)
		.execute();

	const existingTitles = new Set(existingReleases.map((r) => r.title));

	// Filter out duplicates
	const newInputs = inputs.filter((input) => !existingTitles.has(input.title));

	const skippedCount = inputs.length - newInputs.length;

	// If all releases already exist, return early
	if (newInputs.length === 0) {
		return {
			success: true,
			added: 0,
			skipped: skippedCount
		};
	}

	const queries = [];

	for (const input of newInputs) {
		const insertRelease = db
			.insertInto('test_releases')
			.values({
				entity_type: input.entityType,
				entity_tmdb_id: input.entityTmdbId,
				title: input.title,
				size_bytes: input.size_bytes,
				languages: JSON.stringify(input.languages),
				indexers: JSON.stringify(input.indexers),
				flags: JSON.stringify(input.flags)
			})
			.compile();

		queries.push(insertRelease);
	}

	const result = await writeOperation({
		databaseId,
		layer,
		description: `import-test-releases`,
		queries,
		metadata: {
			operation: 'create',
			entity: 'test_release',
			name: `${newInputs.length} releases`
		}
	});

	return {
		...result,
		added: newInputs.length,
		skipped: skippedCount
	};
}
