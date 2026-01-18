/**
 * Delete test entity operation
 */

import type { PCDCache } from '../../cache.ts';
import { writeOperation, type OperationLayer } from '../../writer.ts';

export interface DeleteTestEntityOptions {
	databaseId: number;
	cache: PCDCache;
	layer: OperationLayer;
	entityType: 'movie' | 'series';
	entityTmdbId: number;
	entityTitle: string; // For metadata
}

/**
 * Delete a test entity and its releases by writing an operation to the specified layer
 * Uses stable composite key (type, tmdb_id) instead of auto-generated id
 */
export async function remove(options: DeleteTestEntityOptions) {
	const { databaseId, cache, layer, entityType, entityTmdbId, entityTitle } = options;
	const db = cache.kb;

	// Delete releases first (uses composite FK)
	const deleteReleases = db
		.deleteFrom('test_releases')
		.where('entity_type', '=', entityType)
		.where('entity_tmdb_id', '=', entityTmdbId)
		.compile();

	// Delete the entity using stable composite key
	const deleteEntity = db
		.deleteFrom('test_entities')
		.where('type', '=', entityType)
		.where('tmdb_id', '=', entityTmdbId)
		.compile();

	const result = await writeOperation({
		databaseId,
		layer,
		description: `delete-test-entity-${entityTitle.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`,
		queries: [deleteReleases, deleteEntity],
		metadata: {
			operation: 'delete',
			entity: 'test_entity',
			name: entityTitle
		}
	});

	return result;
}
