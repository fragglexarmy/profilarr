/**
 * Remove naming config operations
 */

import type { PCDCache } from '../../../cache.ts';
import { writeOperation, type OperationLayer } from '../../../writer.ts';

export interface RemoveRadarrNamingOptions {
	databaseId: number;
	cache: PCDCache;
	layer: OperationLayer;
	name: string;
}

export async function removeRadarrNaming(options: RemoveRadarrNamingOptions) {
	const { databaseId, cache, layer, name } = options;
	const db = cache.kb;

	const deleteQuery = db
		.deleteFrom('radarr_naming')
		.where('name', '=', name)
		.compile();

	return writeOperation({
		databaseId,
		layer,
		description: `delete-radarr-naming-${name}`,
		queries: [deleteQuery],
		metadata: {
			operation: 'delete',
			entity: 'radarr_naming',
			name
		}
	});
}

export interface RemoveSonarrNamingOptions {
	databaseId: number;
	cache: PCDCache;
	layer: OperationLayer;
	name: string;
}

export async function removeSonarrNaming(options: RemoveSonarrNamingOptions) {
	const { databaseId, cache, layer, name } = options;
	const db = cache.kb;

	const deleteQuery = db
		.deleteFrom('sonarr_naming')
		.where('name', '=', name)
		.compile();

	return writeOperation({
		databaseId,
		layer,
		description: `delete-sonarr-naming-${name}`,
		queries: [deleteQuery],
		metadata: {
			operation: 'delete',
			entity: 'sonarr_naming',
			name
		}
	});
}
