/**
 * Quality profile name queries
 */

import type { PCDCache } from '../../cache.ts';

/**
 * Get all quality profile names from a cache
 */
export async function names(cache: PCDCache): Promise<string[]> {
	const db = cache.kb;

	const profiles = await db
		.selectFrom('quality_profiles')
		.select(['name'])
		.orderBy('name')
		.execute();

	return profiles.map((p) => p.name);
}
