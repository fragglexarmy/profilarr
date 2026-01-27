/**
 * Quality definitions remove operations
 */

import type { PCDCache } from '$pcd/index.ts';
import { writeOperation, type OperationLayer } from '$pcd/index.ts';

export interface RemoveQualityDefinitionsOptions {
	databaseId: number;
	cache: PCDCache;
	layer: OperationLayer;
	name: string;
}

export async function removeRadarrQualityDefinitions(options: RemoveQualityDefinitionsOptions) {
	const { databaseId, cache, layer, name } = options;
	const db = cache.kb;

	const deleteQuery = db
		.deleteFrom('radarr_quality_definitions')
		.where('name', '=', name)
		.compile();

	return writeOperation({
		databaseId,
		layer,
		description: `remove-radarr-quality-definitions-${name}`,
		queries: [deleteQuery],
		metadata: {
			operation: 'delete',
			entity: 'radarr_quality_definitions',
			name
		}
	});
}

export async function removeSonarrQualityDefinitions(options: RemoveQualityDefinitionsOptions) {
	const { databaseId, cache, layer, name } = options;
	const db = cache.kb;

	const deleteQuery = db
		.deleteFrom('sonarr_quality_definitions')
		.where('name', '=', name)
		.compile();

	return writeOperation({
		databaseId,
		layer,
		description: `remove-sonarr-quality-definitions-${name}`,
		queries: [deleteQuery],
		metadata: {
			operation: 'delete',
			entity: 'sonarr_quality_definitions',
			name
		}
	});
}
