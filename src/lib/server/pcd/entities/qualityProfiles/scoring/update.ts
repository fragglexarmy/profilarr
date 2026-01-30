/**
 * Update quality profile scoring settings
 */

import type { PCDCache } from '$pcd/index.ts';
import { writeOperation, type OperationLayer } from '$pcd/index.ts';
import { logger } from '$logger/logger.ts';

// ============================================================================
// Input types
// ============================================================================

interface CustomFormatScore {
	customFormatName: string;
	arrType: string;
	score: number | null;
}

interface UpdateScoringInput {
	minimumScore: number;
	upgradeUntilScore: number;
	upgradeScoreIncrement: number;
	customFormatScores: CustomFormatScore[];
}

interface UpdateScoringOptions {
	databaseId: number;
	cache: PCDCache;
	layer: OperationLayer;
	profileName: string;
	input: UpdateScoringInput;
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Update quality profile scoring settings
 */
export async function updateScoring(options: UpdateScoringOptions) {
	const { databaseId, cache, layer, profileName, input } = options;
	const db = cache.kb;

	if (input.upgradeScoreIncrement < 1) {
		throw new Error('Upgrade score increment must be at least 1');
	}

	const queries = [];

	// Fetch current profile scoring values for guards
	const currentProfile = await db
		.selectFrom('quality_profiles')
		.select([
			'minimum_custom_format_score',
			'upgrade_until_score',
			'upgrade_score_increment'
		])
		.where('name', '=', profileName)
		.executeTakeFirst();

	if (!currentProfile) {
		return { success: false, error: `Quality profile "${profileName}" not found` };
	}

	// Fetch current custom format scores for guards
	const currentScores = await db
		.selectFrom('quality_profile_custom_formats')
		.select(['custom_format_name', 'arr_type', 'score'])
		.where('quality_profile_name', '=', profileName)
		.execute();

	const currentScoreMap = new Map<string, number>();
	for (const row of currentScores) {
		const key = `${row.custom_format_name}::${row.arr_type}`;
		currentScoreMap.set(key, row.score);
	}

	const changedFields: string[] = [];
	const desiredState: Record<string, unknown> = {};

	// 1. Update profile-level scoring settings
	const setValues: Record<string, number> = {};
	const profileGuards: Array<{ column: string; op: '='; value: number }> = [];

	if (currentProfile.minimum_custom_format_score !== input.minimumScore) {
		setValues.minimum_custom_format_score = input.minimumScore;
		profileGuards.push({
			column: 'minimum_custom_format_score',
			op: '=',
			value: currentProfile.minimum_custom_format_score
		});
		changedFields.push('minimum_custom_format_score');
		desiredState.minimum_custom_format_score = {
			from: currentProfile.minimum_custom_format_score,
			to: input.minimumScore
		};
	}
	if (currentProfile.upgrade_until_score !== input.upgradeUntilScore) {
		setValues.upgrade_until_score = input.upgradeUntilScore;
		profileGuards.push({
			column: 'upgrade_until_score',
			op: '=',
			value: currentProfile.upgrade_until_score
		});
		changedFields.push('upgrade_until_score');
		desiredState.upgrade_until_score = {
			from: currentProfile.upgrade_until_score,
			to: input.upgradeUntilScore
		};
	}
	if (currentProfile.upgrade_score_increment !== input.upgradeScoreIncrement) {
		setValues.upgrade_score_increment = input.upgradeScoreIncrement;
		profileGuards.push({
			column: 'upgrade_score_increment',
			op: '=',
			value: currentProfile.upgrade_score_increment
		});
		changedFields.push('upgrade_score_increment');
		desiredState.upgrade_score_increment = {
			from: currentProfile.upgrade_score_increment,
			to: input.upgradeScoreIncrement
		};
	}

	if (Object.keys(setValues).length > 0) {
		let updateProfile = db
			.updateTable('quality_profiles')
			.set(setValues)
			.where('name', '=', profileName);

		for (const guard of profileGuards) {
			updateProfile = updateProfile.where(guard.column, guard.op, guard.value);
		}

		const updateProfileQuery = updateProfile.compile();
		queries.push(updateProfileQuery);
	}

	// 2. Handle custom format scores
	// Group scores by custom format for easier processing
	const scoresByFormat = new Map<string, Map<string, number | null>>();
	for (const score of input.customFormatScores) {
		if (!scoresByFormat.has(score.customFormatName)) {
			scoresByFormat.set(score.customFormatName, new Map());
		}
		scoresByFormat.get(score.customFormatName)!.set(score.arrType, score.score);
	}

	const cfChanges: Array<{
		custom_format_name: string;
		arr_type: string;
		from: number | null;
		to: number | null;
	}> = [];

	// For each custom format, update or insert scores with value guards
	for (const [customFormatName, arrTypeScores] of scoresByFormat) {
		for (const [arrType, score] of arrTypeScores) {
			const key = `${customFormatName}::${arrType}`;
			const currentScore = currentScoreMap.get(key);

			if (currentScore === undefined) {
				if (score === null) continue;

				const insertScore = {
					sql: `INSERT INTO quality_profile_custom_formats (quality_profile_name, custom_format_name, arr_type, score)
SELECT '${esc(profileName)}', '${esc(customFormatName)}', '${esc(arrType)}', ${score}
WHERE NOT EXISTS (
  SELECT 1 FROM quality_profile_custom_formats
  WHERE quality_profile_name = '${esc(profileName)}'
    AND custom_format_name = '${esc(customFormatName)}'
    AND arr_type = '${esc(arrType)}'
)`,
					parameters: [],
					query: {} as never
				};

				queries.push(insertScore);
				cfChanges.push({
					custom_format_name: customFormatName,
					arr_type: arrType,
					from: null,
					to: score
				});
				continue;
			}

			if (score === null) {
				const deleteScore = {
					sql: `DELETE FROM quality_profile_custom_formats
WHERE quality_profile_name = '${esc(profileName)}'
  AND custom_format_name = '${esc(customFormatName)}'
  AND arr_type = '${esc(arrType)}'
  AND score = ${currentScore}`,
					parameters: [],
					query: {} as never
				};

				queries.push(deleteScore);
				cfChanges.push({
					custom_format_name: customFormatName,
					arr_type: arrType,
					from: currentScore,
					to: null
				});
				continue;
			}

			if (score !== currentScore) {
				const updateScore = {
					sql: `UPDATE quality_profile_custom_formats
SET score = ${score}
WHERE quality_profile_name = '${esc(profileName)}'
  AND custom_format_name = '${esc(customFormatName)}'
  AND arr_type = '${esc(arrType)}'
  AND score = ${currentScore}`,
					parameters: [],
					query: {} as never
				};

				queries.push(updateScore);
				cfChanges.push({
					custom_format_name: customFormatName,
					arr_type: arrType,
					from: currentScore,
					to: score
				});
			}
		}
	}

	if (cfChanges.length > 0) {
		changedFields.push('custom_format_scores');
		desiredState.custom_format_scores = cfChanges;
	}

	if (queries.length === 0) {
		return { success: true };
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
		desiredState,
		metadata: {
			operation: 'update',
			entity: 'quality_profile',
			name: profileName,
			stableKey: { key: 'quality_profile_name', value: profileName },
			changedFields,
			summary: 'Update quality profile scoring',
			title: `Update scoring for quality profile "${profileName}"`
		}
	});

	return result;
}

function esc(value: string): string {
	return value.replace(/'/g, "''");
}
