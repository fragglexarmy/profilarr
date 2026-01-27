/**
 * Delete test release operation
 */

import type { PCDCache } from '$pcd/cache.ts';
import { writeOperation, type OperationLayer } from '$pcd/writer.ts';

interface DeleteReleaseOptions {
	databaseId: number;
	cache: PCDCache;
	layer: OperationLayer;
	releaseId: number;
}

/**
 * Delete a test release by writing an operation to the specified layer
 */
export async function deleteRelease(options: DeleteReleaseOptions) {
	const { databaseId, cache, layer, releaseId } = options;
	const db = cache.kb;

	const deleteQuery = db.deleteFrom('test_releases').where('id', '=', releaseId).compile();

	const result = await writeOperation({
		databaseId,
		layer,
		description: `delete-test-release-${releaseId}`,
		queries: [deleteQuery],
		metadata: {
			operation: 'delete',
			entity: 'test_release',
			name: `id:${releaseId}`
		}
	});

	return result;
}
