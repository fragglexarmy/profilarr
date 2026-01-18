/**
 * Delay profile list queries
 */

import type { PCDCache } from '../../cache.ts';
import type { Tag } from '../../types.ts';
import type { DelayProfileTableRow, PreferredProtocol } from './types.ts';

/**
 * Get delay profiles with full data for table/card views
 */
export async function list(cache: PCDCache): Promise<DelayProfileTableRow[]> {
	const db = cache.kb;

	// 1. Get all delay profiles
	const profiles = await db
		.selectFrom('delay_profiles')
		.select([
			'id',
			'name',
			'preferred_protocol',
			'usenet_delay',
			'torrent_delay',
			'bypass_if_highest_quality',
			'bypass_if_above_custom_format_score',
			'minimum_custom_format_score',
			'created_at',
			'updated_at'
		])
		.orderBy('name')
		.execute();

	if (profiles.length === 0) return [];

	const profileNames = profiles.map((p) => p.name);

	// 2. Get all tags for all profiles
	const allTags = await db
		.selectFrom('delay_profile_tags as dpt')
		.innerJoin('tags as t', 't.name', 'dpt.tag_name')
		.select(['dpt.delay_profile_name', 't.name as tag_name', 't.created_at as tag_created_at'])
		.where('dpt.delay_profile_name', 'in', profileNames)
		.orderBy('dpt.delay_profile_name')
		.orderBy('t.name')
		.execute();

	// Build tags map
	const tagsMap = new Map<string, Tag[]>();
	for (const tag of allTags) {
		if (!tagsMap.has(tag.delay_profile_name)) {
			tagsMap.set(tag.delay_profile_name, []);
		}
		tagsMap.get(tag.delay_profile_name)!.push({
			name: tag.tag_name,
			created_at: tag.tag_created_at
		});
	}

	// Build the final result
	return profiles.map((profile) => ({
		id: profile.id,
		name: profile.name,
		preferred_protocol: profile.preferred_protocol as PreferredProtocol,
		usenet_delay: profile.usenet_delay,
		torrent_delay: profile.torrent_delay,
		bypass_if_highest_quality: profile.bypass_if_highest_quality === 1,
		bypass_if_above_custom_format_score: profile.bypass_if_above_custom_format_score === 1,
		minimum_custom_format_score: profile.minimum_custom_format_score,
		tags: tagsMap.get(profile.name) || [],
		created_at: profile.created_at,
		updated_at: profile.updated_at
	}));
}
