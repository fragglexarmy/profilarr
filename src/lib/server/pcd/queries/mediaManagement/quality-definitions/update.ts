/**
 * Quality definitions update operations
 */

import type { PCDCache } from '../../../cache.ts';
import { writeOperation, type OperationLayer } from '../../../writer.ts';
import type { QualityDefinitionEntry } from '$shared/pcd/display.ts';

export interface UpdateQualityDefinitionsInput {
	name: string;
	entries: QualityDefinitionEntry[];
}

export interface UpdateQualityDefinitionsOptions {
	databaseId: number;
	cache: PCDCache;
	layer: OperationLayer;
	currentName: string;
	input: UpdateQualityDefinitionsInput;
}

export async function updateRadarrQualityDefinitions(options: UpdateQualityDefinitionsOptions) {
	const { databaseId, cache, layer, currentName, input } = options;
	const db = cache.kb;

	// If renaming, check if new name already exists
	if (input.name !== currentName) {
		const existing = await db
			.selectFrom('radarr_quality_definitions')
			.where('name', '=', input.name)
			.select('name')
			.executeTakeFirst();

		if (existing) {
			throw new Error(`A radarr quality definitions config with name "${input.name}" already exists`);
		}
	}

	// Delete all existing entries for this config
	const deleteQuery = db
		.deleteFrom('radarr_quality_definitions')
		.where('name', '=', currentName)
		.compile();

	// Insert all new entries
	const insertQueries = input.entries.map(entry =>
		db
			.insertInto('radarr_quality_definitions')
			.values({
				name: input.name,
				quality_name: entry.quality_name,
				min_size: entry.min_size,
				max_size: entry.max_size,
				preferred_size: entry.preferred_size
			})
			.compile()
	);

	return writeOperation({
		databaseId,
		layer,
		description: `update-radarr-quality-definitions-${input.name}`,
		queries: [deleteQuery, ...insertQueries],
		metadata: {
			operation: 'update',
			entity: 'radarr_quality_definitions',
			name: input.name
		}
	});
}

export async function updateSonarrQualityDefinitions(options: UpdateQualityDefinitionsOptions) {
	const { databaseId, cache, layer, currentName, input } = options;
	const db = cache.kb;

	// If renaming, check if new name already exists
	if (input.name !== currentName) {
		const existing = await db
			.selectFrom('sonarr_quality_definitions')
			.where('name', '=', input.name)
			.select('name')
			.executeTakeFirst();

		if (existing) {
			throw new Error(`A sonarr quality definitions config with name "${input.name}" already exists`);
		}
	}

	// Delete all existing entries for this config
	const deleteQuery = db
		.deleteFrom('sonarr_quality_definitions')
		.where('name', '=', currentName)
		.compile();

	// Insert all new entries
	const insertQueries = input.entries.map(entry =>
		db
			.insertInto('sonarr_quality_definitions')
			.values({
				name: input.name,
				quality_name: entry.quality_name,
				min_size: entry.min_size,
				max_size: entry.max_size,
				preferred_size: entry.preferred_size
			})
			.compile()
	);

	return writeOperation({
		databaseId,
		layer,
		description: `update-sonarr-quality-definitions-${input.name}`,
		queries: [deleteQuery, ...insertQueries],
		metadata: {
			operation: 'update',
			entity: 'sonarr_quality_definitions',
			name: input.name
		}
	});
}
