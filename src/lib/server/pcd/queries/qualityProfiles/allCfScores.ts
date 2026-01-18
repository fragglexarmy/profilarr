/**
 * Get all custom format scores for all quality profiles
 * Used by entity testing to calculate scores client-side
 */

import type { PCDCache } from '../../cache.ts';

export interface ProfileCfScores {
	profileName: string;
	/** Map of custom format name to score (by arr type) */
	scores: Record<string, { radarr: number | null; sonarr: number | null }>;
}

export interface AllCfScoresResult {
	/** All custom formats with their names */
	customFormats: Array<{ name: string }>;
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
		.select(['name'])
		.orderBy('name')
		.execute();

	// Get all quality profiles
	const profiles = await db
		.selectFrom('quality_profiles')
		.select(['name'])
		.execute();

	// Get all CF scores for all profiles
	const allScores = await db
		.selectFrom('quality_profile_custom_formats')
		.select(['quality_profile_name', 'custom_format_name', 'arr_type', 'score'])
		.execute();

	// Build scores map: profileName -> cfName -> arrType -> score
	const scoresMap = new Map<string, Map<string, Map<string, number>>>();

	for (const score of allScores) {
		if (!scoresMap.has(score.quality_profile_name)) {
			scoresMap.set(score.quality_profile_name, new Map());
		}
		const profileScores = scoresMap.get(score.quality_profile_name)!;

		if (!profileScores.has(score.custom_format_name)) {
			profileScores.set(score.custom_format_name, new Map());
		}
		profileScores.get(score.custom_format_name)!.set(score.arr_type, score.score);
	}

	// Build result
	const profilesResult: ProfileCfScores[] = profiles.map((profile) => {
		const profileScores = scoresMap.get(profile.name);
		const scores: Record<string, { radarr: number | null; sonarr: number | null }> = {};

		for (const cf of customFormats) {
			const cfScores = profileScores?.get(cf.name);
			const allScore = cfScores?.get('all') ?? null;

			scores[cf.name] = {
				radarr: cfScores?.get('radarr') ?? allScore,
				sonarr: cfScores?.get('sonarr') ?? allScore
			};
		}

		return {
			profileName: profile.name,
			scores
		};
	});

	return {
		customFormats,
		profiles: profilesResult
	};
}
