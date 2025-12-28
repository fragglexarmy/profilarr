/**
 * Get a single delay profile by ID
 */

import type { PCDCache } from '../../cache.ts';
import type { Tag } from '../../types.ts';
import type { DelayProfileTableRow, PreferredProtocol } from './types.ts';

/**
 * Get a single delay profile by ID with all data
 */
export async function get(cache: PCDCache, id: number): Promise<DelayProfileTableRow | null> {
	const db = cache.kb;

	// Get the delay profile
	const profile = await db
		.selectFrom('delay_profiles')
		.select([
			'id',
			'name',
			'preferred_protocol',
			'usenet_delay',
			'torrent_delay',
			'bypass_if_highest_quality',
			'bypass_if_above_custom_format_score',
			'minimum_custom_format_score'
		])
		.where('id', '=', id)
		.executeTakeFirst();

	if (!profile) return null;

	// Get tags for this profile
	const tags = await db
		.selectFrom('delay_profile_tags as dpt')
		.innerJoin('tags as t', 't.id', 'dpt.tag_id')
		.select(['t.id as tag_id', 't.name as tag_name', 't.created_at as tag_created_at'])
		.where('dpt.delay_profile_id', '=', id)
		.orderBy('t.name')
		.execute();

	const tagList: Tag[] = tags.map((t) => ({
		id: t.tag_id,
		name: t.tag_name,
		created_at: t.tag_created_at
	}));

	return {
		id: profile.id,
		name: profile.name,
		preferred_protocol: profile.preferred_protocol as PreferredProtocol,
		usenet_delay: profile.usenet_delay,
		torrent_delay: profile.torrent_delay,
		bypass_if_highest_quality: profile.bypass_if_highest_quality === 1,
		bypass_if_above_custom_format_score: profile.bypass_if_above_custom_format_score === 1,
		minimum_custom_format_score: profile.minimum_custom_format_score,
		tags: tagList
	};
}
