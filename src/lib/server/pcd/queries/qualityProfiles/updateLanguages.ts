/**
 * Update quality profile languages
 */

import type { PCDCache } from '../../cache.ts';
import { writeOperation, type OperationLayer } from '../../writer.ts';
import { logger } from '$logger/logger.ts';

export interface UpdateLanguagesInput {
	languageId: number | null;
	type: 'must' | 'only' | 'not' | 'simple';
}

export interface UpdateLanguagesOptions {
	databaseId: number;
	cache: PCDCache;
	layer: OperationLayer;
	profileId: number;
	profileName: string;
	input: UpdateLanguagesInput;
}

/**
 * Update quality profile language configuration
 */
export async function updateLanguages(options: UpdateLanguagesOptions) {
	const { databaseId, cache, layer, profileId, profileName, input } = options;
	const db = cache.kb;

	const queries = [];

	// 1. Delete existing languages for this profile
	const deleteLanguages = db
		.deleteFrom('quality_profile_languages')
		.where('quality_profile_id', '=', profileId)
		.compile();
	queries.push(deleteLanguages);

	// 2. Insert new language if one is selected
	if (input.languageId !== null) {
		const insertLanguage = {
			sql: `INSERT INTO quality_profile_languages (quality_profile_id, language_id, type) VALUES (${profileId}, ${input.languageId}, '${input.type}')`,
			parameters: [],
			query: {} as never
		};
		queries.push(insertLanguage);
	}

	await logger.info(`Save quality profile languages "${profileName}"`, {
		source: 'QualityProfile',
		meta: {
			profileId,
			languageId: input.languageId,
			type: input.type
		}
	});

	// Write the operation
	const result = await writeOperation({
		databaseId,
		layer,
		description: `update-quality-profile-languages-${profileName}`,
		queries,
		metadata: {
			operation: 'update',
			entity: 'quality_profile',
			name: profileName
		}
	});

	return result;
}
