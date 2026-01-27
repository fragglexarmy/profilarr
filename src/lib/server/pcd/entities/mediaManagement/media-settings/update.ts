/**
 * Update media settings config operations
 */

import type { PCDCache } from '$pcd/index.ts';
import { writeOperation, type OperationLayer } from '$pcd/index.ts';
import type { RadarrMediaSettingsRow } from '$shared/pcd/display.ts';

export interface UpdateMediaSettingsInput {
	name: string;
	propersRepacks: RadarrMediaSettingsRow['propers_repacks'];
	enableMediaInfo: boolean;
}

export interface UpdateMediaSettingsOptions {
	databaseId: number;
	cache: PCDCache;
	layer: OperationLayer;
	currentName: string;
	input: UpdateMediaSettingsInput;
}

export async function updateRadarrMediaSettings(options: UpdateMediaSettingsOptions) {
	const { databaseId, cache, layer, currentName, input } = options;
	const db = cache.kb;

	// If renaming, check if new name already exists
	if (input.name !== currentName) {
		const existing = await db
			.selectFrom('radarr_media_settings')
			.where('name', '=', input.name)
			.select('name')
			.executeTakeFirst();

		if (existing) {
			throw new Error(`A radarr media settings config with name "${input.name}" already exists`);
		}
	}

	const updateQuery = db
		.updateTable('radarr_media_settings')
		.set({
			name: input.name,
			propers_repacks: input.propersRepacks,
			enable_media_info: input.enableMediaInfo ? 1 : 0
		})
		.where('name', '=', currentName)
		.compile();

	return writeOperation({
		databaseId,
		layer,
		description: `update-radarr-media-settings-${input.name}`,
		queries: [updateQuery],
		metadata: {
			operation: 'update',
			entity: 'radarr_media_settings',
			name: input.name
		}
	});
}

export async function updateSonarrMediaSettings(options: UpdateMediaSettingsOptions) {
	const { databaseId, cache, layer, currentName, input } = options;
	const db = cache.kb;

	// If renaming, check if new name already exists
	if (input.name !== currentName) {
		const existing = await db
			.selectFrom('sonarr_media_settings')
			.where('name', '=', input.name)
			.select('name')
			.executeTakeFirst();

		if (existing) {
			throw new Error(`A sonarr media settings config with name "${input.name}" already exists`);
		}
	}

	const updateQuery = db
		.updateTable('sonarr_media_settings')
		.set({
			name: input.name,
			propers_repacks: input.propersRepacks,
			enable_media_info: input.enableMediaInfo ? 1 : 0
		})
		.where('name', '=', currentName)
		.compile();

	return writeOperation({
		databaseId,
		layer,
		description: `update-sonarr-media-settings-${input.name}`,
		queries: [updateQuery],
		metadata: {
			operation: 'update',
			entity: 'sonarr_media_settings',
			name: input.name
		}
	});
}
