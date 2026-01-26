/**
 * Remove media settings config operations
 */

import type { PCDCache } from '../../../cache.ts';
import { writeOperation, type OperationLayer } from '../../../writer.ts';

export interface RemoveMediaSettingsOptions {
	databaseId: number;
	cache: PCDCache;
	layer: OperationLayer;
	name: string;
}

export async function removeRadarrMediaSettings(options: RemoveMediaSettingsOptions) {
	const { databaseId, cache, layer, name } = options;
	const db = cache.kb;

	const deleteQuery = db
		.deleteFrom('radarr_media_settings')
		.where('name', '=', name)
		.compile();

	return writeOperation({
		databaseId,
		layer,
		description: `delete-radarr-media-settings-${name}`,
		queries: [deleteQuery],
		metadata: {
			operation: 'delete',
			entity: 'radarr_media_settings',
			name
		}
	});
}

export async function removeSonarrMediaSettings(options: RemoveMediaSettingsOptions) {
	const { databaseId, cache, layer, name } = options;
	const db = cache.kb;

	const deleteQuery = db
		.deleteFrom('sonarr_media_settings')
		.where('name', '=', name)
		.compile();

	return writeOperation({
		databaseId,
		layer,
		description: `delete-sonarr-media-settings-${name}`,
		queries: [deleteQuery],
		metadata: {
			operation: 'delete',
			entity: 'sonarr_media_settings',
			name
		}
	});
}
