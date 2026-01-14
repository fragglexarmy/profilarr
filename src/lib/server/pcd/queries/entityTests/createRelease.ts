/**
 * Create test release operation
 */

import type { PCDCache } from '../../cache.ts';
import { writeOperation, type OperationLayer } from '../../writer.ts';

export interface CreateTestReleaseInput {
	entityId: number;
	title: string;
	size_bytes: number | null;
	languages: string[];
	indexers: string[];
	flags: string[];
}

export interface CreateTestReleaseOptions {
	databaseId: number;
	cache: PCDCache;
	layer: OperationLayer;
	input: CreateTestReleaseInput;
}

/**
 * Create a test release by writing an operation to the specified layer
 */
export async function createRelease(options: CreateTestReleaseOptions) {
	const { databaseId, cache, layer, input } = options;
	const db = cache.kb;

	const insertRelease = db
		.insertInto('test_releases')
		.values({
			test_entity_id: input.entityId,
			title: input.title,
			size_bytes: input.size_bytes,
			languages: JSON.stringify(input.languages),
			indexers: JSON.stringify(input.indexers),
			flags: JSON.stringify(input.flags)
		})
		.compile();

	const result = await writeOperation({
		databaseId,
		layer,
		description: `create-test-release`,
		queries: [insertRelease],
		metadata: {
			operation: 'create',
			entity: 'test_release',
			name: input.title.substring(0, 50)
		}
	});

	return result;
}
