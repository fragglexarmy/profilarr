/**
 * Entity Serialization
 *
 * Reads full entities from PCD cache and returns portable format.
 * Used by clone (serialize → rename → deserialize) and future export.
 */

import type { PCDCache } from '$pcd/index.ts';
import type { PortableDelayProfile } from '$shared/pcd/portable.ts';
import * as delayProfileQueries from './delayProfiles/index.ts';

// ============================================================================
// DELAY PROFILES
// ============================================================================

export async function serializeDelayProfile(
	cache: PCDCache,
	name: string
): Promise<PortableDelayProfile> {
	const row = await delayProfileQueries.getByName(cache, name);
	if (!row) throw new Error(`Delay profile "${name}" not found`);

	return {
		name: row.name,
		preferredProtocol: row.preferred_protocol,
		usenetDelay: row.usenet_delay ?? 0,
		torrentDelay: row.torrent_delay ?? 0,
		bypassIfHighestQuality: row.bypass_if_highest_quality,
		bypassIfAboveCfScore: row.bypass_if_above_custom_format_score,
		minimumCfScore: row.minimum_custom_format_score ?? 0
	};
}
