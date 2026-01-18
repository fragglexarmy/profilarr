/**
 * Update quality profile scoring settings
 */

import type { PCDCache } from '../../cache.ts';
import { writeOperation, type OperationLayer } from '../../writer.ts';
import { logger } from '$logger/logger.ts';

export interface CustomFormatScore {
	customFormatName: string;
	arrType: string;
	score: number | null;
}

export interface UpdateScoringInput {
	minimumScore: number;
	upgradeUntilScore: number;
	upgradeScoreIncrement: number;
	customFormatScores: CustomFormatScore[];
}

export interface UpdateScoringOptions {
	databaseId: number;
	cache: PCDCache;
	layer: OperationLayer;
	profileName: string;
	input: UpdateScoringInput;
}

/**
 * Update quality profile scoring settings
 */
export async function updateScoring(options: UpdateScoringOptions) {
	const { databaseId, cache, layer, profileName, input } = options;
	const db = cache.kb;

	const queries = [];

	// 1. Update profile-level scoring settings
	const updateProfile = db
		.updateTable('quality_profiles')
		.set({
			minimum_custom_format_score: input.minimumScore,
			upgrade_until_score: input.upgradeUntilScore,
			upgrade_score_increment: input.upgradeScoreIncrement
		})
		.where('name', '=', profileName)
		.compile();

	queries.push(updateProfile);

	// 2. Handle custom format scores
	// Group scores by custom format for easier processing
	const scoresByFormat = new Map<string, Map<string, number | null>>();
	for (const score of input.customFormatScores) {
		if (!scoresByFormat.has(score.customFormatName)) {
			scoresByFormat.set(score.customFormatName, new Map());
		}
		scoresByFormat.get(score.customFormatName)!.set(score.arrType, score.score);
	}

	// For each custom format, update or insert scores
	for (const [customFormatName, arrTypeScores] of scoresByFormat) {
		for (const [arrType, score] of arrTypeScores) {
			if (score === null) {
				// Delete the score if it exists
				const deleteScore = db
					.deleteFrom('quality_profile_custom_formats')
					.where('quality_profile_name', '=', profileName)
					.where('custom_format_name', '=', customFormatName)
					.where('arr_type', '=', arrType)
					.compile();

				queries.push(deleteScore);
			} else {
				// Insert or update the score using INSERT OR REPLACE
				const upsertScore = {
					sql: `INSERT OR REPLACE INTO quality_profile_custom_formats (quality_profile_name, custom_format_name, arr_type, score) VALUES ('${profileName.replace(/'/g, "''")}', '${customFormatName.replace(/'/g, "''")}', '${arrType}', ${score})`,
					parameters: [],
					query: {} as never
				};

				queries.push(upsertScore);
			}
		}
	}

	await logger.info(`Save quality profile scoring "${profileName}"`, {
		source: 'QualityProfile',
		meta: {
			profileName,
			minimumScore: input.minimumScore,
			upgradeUntilScore: input.upgradeUntilScore,
			upgradeScoreIncrement: input.upgradeScoreIncrement,
			customFormatScoreCount: input.customFormatScores.length
		}
	});

	// Write the operation
	const result = await writeOperation({
		databaseId,
		layer,
		description: `update-quality-profile-scoring-${profileName}`,
		queries,
		metadata: {
			operation: 'update',
			entity: 'quality_profile',
			name: profileName
		}
	});

	return result;
}
