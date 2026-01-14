/**
 * Update test release operation
 */

import type { PCDCache } from '../../cache.ts';
import { writeOperation, type OperationLayer } from '../../writer.ts';

export interface UpdateTestReleaseInput {
	id: number;
	title: string;
	size_bytes: number | null;
	languages: string[];
	indexers: string[];
	flags: string[];
}

export interface UpdateTestReleaseOptions {
	databaseId: number;
	cache: PCDCache;
	layer: OperationLayer;
	input: UpdateTestReleaseInput;
}

/**
 * Update a test release by writing an operation to the specified layer
 */
export async function updateRelease(options: UpdateTestReleaseOptions) {
	const { databaseId, cache, layer, input } = options;
	const db = cache.kb;

	const updateQuery = db
		.updateTable('test_releases')
		.set({
			title: input.title,
			size_bytes: input.size_bytes,
			languages: JSON.stringify(input.languages),
			indexers: JSON.stringify(input.indexers),
			flags: JSON.stringify(input.flags)
		})
		.where('id', '=', input.id)
		.compile();

	const result = await writeOperation({
		databaseId,
		layer,
		description: `update-test-release-${input.id}`,
		queries: [updateQuery],
		metadata: {
			operation: 'update',
			entity: 'test_release',
			name: input.title.substring(0, 50)
		}
	});

	return result;
}
