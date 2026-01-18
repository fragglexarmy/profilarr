/**
 * Update quality profile languages
 */

import type { PCDCache } from '../../cache.ts';
import { writeOperation, type OperationLayer } from '../../writer.ts';
import { logger } from '$logger/logger.ts';

export interface UpdateLanguagesInput {
	languageName: string | null;
	type: 'must' | 'only' | 'not' | 'simple';
}

export interface UpdateLanguagesOptions {
	databaseId: number;
	cache: PCDCache;
	layer: OperationLayer;
	profileName: string;
	input: UpdateLanguagesInput;
}

/**
 * Update quality profile language configuration
 */
export async function updateLanguages(options: UpdateLanguagesOptions) {
	const { databaseId, cache, layer, profileName, input } = options;
	const db = cache.kb;

	const queries = [];

	// 1. Delete existing languages for this profile
	const deleteLanguages = db
		.deleteFrom('quality_profile_languages')
		.where('quality_profile_name', '=', profileName)
		.compile();
	queries.push(deleteLanguages);

	// 2. Insert new language if one is selected
	if (input.languageName !== null) {
		const insertLanguage = {
			sql: `INSERT INTO quality_profile_languages (quality_profile_name, language_name, type) VALUES ('${profileName.replace(/'/g, "''")}', '${input.languageName.replace(/'/g, "''")}', '${input.type}')`,
			parameters: [],
			query: {} as never
		};
		queries.push(insertLanguage);
	}

	await logger.info(`Save quality profile languages "${profileName}"`, {
		source: 'QualityProfile',
		meta: {
			profileName,
			languageName: input.languageName,
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
