/**
 * Quality profile scoring queries
 */

import type { PCDCache } from '../../cache.ts';
import type { QualityProfileScoring } from './types.ts';

/**
 * Get quality profile scoring data
 * Returns all custom formats with their scores per arr type
 */
export async function scoring(
	cache: PCDCache,
	databaseId: number,
	profileName: string
): Promise<QualityProfileScoring> {
	const db = cache.kb;

	// 1. Get profile settings
	const profile = await db
		.selectFrom('quality_profiles')
		.select(['minimum_custom_format_score', 'upgrade_until_score', 'upgrade_score_increment'])
		.where('name', '=', profileName)
		.executeTakeFirst();

	if (!profile) {
		throw new Error(`Quality profile ${profileName} not found`);
	}

	// 2. Define display arr types (radarr, sonarr) - 'all' is not a column
	const arrTypes = ['radarr', 'sonarr'];

	// 3. Get all custom formats
	const customFormats = await db
		.selectFrom('custom_formats')
		.select(['name'])
		.orderBy('name')
		.execute();

	// 4. Get all tags for custom formats
	const customFormatTags = await db
		.selectFrom('custom_format_tags')
		.innerJoin('tags', 'tags.name', 'custom_format_tags.tag_name')
		.select(['custom_format_tags.custom_format_name', 'tags.name as tag_name'])
		.execute();

	// Build tags map for quick lookup
	const tagsMap = new Map<string, string[]>();
	for (const tag of customFormatTags) {
		if (!tagsMap.has(tag.custom_format_name)) {
			tagsMap.set(tag.custom_format_name, []);
		}
		tagsMap.get(tag.custom_format_name)!.push(tag.tag_name);
	}

	// 5. Get all scores for this profile
	const scores = await db
		.selectFrom('quality_profile_custom_formats')
		.select(['custom_format_name', 'arr_type', 'score'])
		.where('quality_profile_name', '=', profileName)
		.execute();

	// 6. Build scores map for quick lookup
	const scoresMap = new Map<string, Map<string, number>>();
	for (const score of scores as { custom_format_name: string; arr_type: string; score: number }[]) {
		if (!scoresMap.has(score.custom_format_name)) {
			scoresMap.set(score.custom_format_name, new Map());
		}
		scoresMap.get(score.custom_format_name)!.set(score.arr_type, score.score);
	}

	// 7. Build custom format scoring data
	const customFormatScoring = customFormats.map((cf: { name: string }) => {
		const formatScores: Record<string, number | null> = {};
		const cfScores = scoresMap.get(cf.name);

		// Get the 'all' score if it exists (used as default for all types)
		const allScore = cfScores?.get('all') ?? null;

		// Add scores for each arr type
		// If specific arr type has a score, use it; otherwise use 'all' score
		for (const arrType of arrTypes) {
			const specificScore = cfScores?.get(arrType);
			formatScores[arrType] = specificScore !== undefined ? specificScore : allScore;
		}

		return {
			name: cf.name,
			tags: tagsMap.get(cf.name) ?? [],
			scores: formatScores
		};
	});

	const result = {
		databaseId,
		arrTypes,
		customFormats: customFormatScoring,
		minimum_custom_format_score: profile.minimum_custom_format_score,
		upgrade_until_score: profile.upgrade_until_score,
		upgrade_score_increment: profile.upgrade_score_increment
	};

	return result;
}
