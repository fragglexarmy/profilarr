/**
 * Delete test entity operation
 */

import type { PCDCache } from '../../cache.ts';
import { writeOperation, type OperationLayer } from '../../writer.ts';

export interface DeleteTestEntityOptions {
	databaseId: number;
	cache: PCDCache;
	layer: OperationLayer;
	entityId: number;
}

/**
 * Delete a test entity and its releases by writing an operation to the specified layer
 */
export async function remove(options: DeleteTestEntityOptions) {
	const { databaseId, cache, layer, entityId } = options;
	const db = cache.kb;

	// Delete releases first (foreign key constraint)
	const deleteReleases = db
		.deleteFrom('test_releases')
		.where('test_entity_id', '=', entityId)
		.compile();

	// Delete the entity
	const deleteEntity = db.deleteFrom('test_entities').where('id', '=', entityId).compile();

	const result = await writeOperation({
		databaseId,
		layer,
		description: `delete-test-entity-${entityId}`,
		queries: [deleteReleases, deleteEntity],
		metadata: {
			operation: 'delete',
			entity: 'test_entity',
			name: `id:${entityId}`
		}
	});

	return result;
}
