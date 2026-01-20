/**
 * Get a single delay profile by ID
 */

import type { PCDCache } from '../../cache.ts';
import type { DelayProfileTableRow, PreferredProtocol } from './types.ts';

/**
 * Get a single delay profile by ID with all data
 */
export async function get(cache: PCDCache, id: number): Promise<DelayProfileTableRow | null> {
	const db = cache.kb;

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
			'minimum_custom_format_score',
			'created_at',
			'updated_at'
		])
		.where('id', '=', id)
		.executeTakeFirst();

	if (!profile) return null;

	return {
		id: profile.id,
		name: profile.name,
		preferred_protocol: profile.preferred_protocol as PreferredProtocol,
		usenet_delay: profile.usenet_delay,
		torrent_delay: profile.torrent_delay,
		bypass_if_highest_quality: profile.bypass_if_highest_quality === 1,
		bypass_if_above_custom_format_score: profile.bypass_if_above_custom_format_score === 1,
		minimum_custom_format_score: profile.minimum_custom_format_score,
		created_at: profile.created_at,
		updated_at: profile.updated_at
	};
}
