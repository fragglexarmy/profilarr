/**
 * Quality profile select options query
 */

import type { PCDCache } from '../../cache.ts';

export interface QualityProfileOption {
	id: number;
	name: string;
}

/**
 * Get quality profile options for select/dropdown components
 */
export async function select(cache: PCDCache): Promise<QualityProfileOption[]> {
	const db = cache.kb;

	const profiles = await db
		.selectFrom('quality_profiles')
		.select(['id', 'name'])
		.orderBy('name')
		.execute();

	return profiles;
}
