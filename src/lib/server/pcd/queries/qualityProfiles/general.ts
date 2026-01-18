/**
 * Quality profile general queries
 */

import type { PCDCache } from '../../cache.ts';
import type { QualityProfileGeneral } from './types.ts';

/**
 * Get general information for a single quality profile
 */
export async function general(cache: PCDCache, profileId: number): Promise<QualityProfileGeneral | null> {
  const db = cache.kb;

  // Get the quality profile
  const profile = await db
    .selectFrom('quality_profiles')
    .select(['id', 'name', 'description'])
    .where('id', '=', profileId)
    .executeTakeFirst();

  if (!profile) return null;

  // Get tags for this profile
  const tags = await db
    .selectFrom('quality_profile_tags as qpt')
    .innerJoin('tags as t', 't.name', 'qpt.tag_name')
    .select(['t.name as tag_name', 't.created_at as tag_created_at'])
    .where('qpt.quality_profile_name', '=', profile.name)
    .orderBy('t.name')
    .execute();

  return {
    id: profile.id,
    name: profile.name,
    description: profile.description || '',
    tags: tags.map((tag) => ({
      name: tag.tag_name,
      created_at: tag.tag_created_at
    }))
  };
}
