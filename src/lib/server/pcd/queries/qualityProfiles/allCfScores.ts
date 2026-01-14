/**
 * Get all custom format scores for all quality profiles
 * Used by entity testing to calculate scores client-side
 */

import type { PCDCache } from '../../cache.ts';

export interface ProfileCfScores {
	profileId: number;
	/** Map of custom format ID to score (by arr type) */
	scores: Record<number, { radarr: number | null; sonarr: number | null }>;
}

export interface AllCfScoresResult {
	/** All custom formats with their names */
	customFormats: Array<{ id: number; name: string }>;
	/** CF scores per profile */
	profiles: ProfileCfScores[];
}

/**
 * Get all custom format scores for all quality profiles
 */
export async function allCfScores(cache: PCDCache): Promise<AllCfScoresResult> {
	const db = cache.kb;

	// Get all custom formats
	const customFormats = await db
		.selectFrom('custom_formats')
		.select(['id', 'name'])
		.orderBy('name')
		.execute();

	// Get all quality profiles
	const profiles = await db
		.selectFrom('quality_profiles')
		.select(['id'])
		.execute();

	// Get all CF scores for all profiles
	const allScores = await db
		.selectFrom('quality_profile_custom_formats')
		.select(['quality_profile_id', 'custom_format_id', 'arr_type', 'score'])
		.execute();

	// Build scores map: profileId -> cfId -> arrType -> score
	const scoresMap = new Map<number, Map<number, Map<string, number>>>();

	for (const score of allScores) {
		if (!scoresMap.has(score.quality_profile_id)) {
			scoresMap.set(score.quality_profile_id, new Map());
		}
		const profileScores = scoresMap.get(score.quality_profile_id)!;

		if (!profileScores.has(score.custom_format_id)) {
			profileScores.set(score.custom_format_id, new Map());
		}
		profileScores.get(score.custom_format_id)!.set(score.arr_type, score.score);
	}

	// Build result
	const profilesResult: ProfileCfScores[] = profiles.map((profile) => {
		const profileScores = scoresMap.get(profile.id);
		const scores: Record<number, { radarr: number | null; sonarr: number | null }> = {};

		for (const cf of customFormats) {
			const cfScores = profileScores?.get(cf.id);
			const allScore = cfScores?.get('all') ?? null;

			scores[cf.id] = {
				radarr: cfScores?.get('radarr') ?? allScore,
				sonarr: cfScores?.get('sonarr') ?? allScore
			};
		}

		return {
			profileId: profile.id,
			scores
		};
	});

	return {
		customFormats,
		profiles: profilesResult
	};
}
