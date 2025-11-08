/**
 * Quality profile languages queries
 */

import type { PCDCache } from '../../cache.ts';
import type { QualityProfileLanguages } from './types.ts';

/**
 * Get languages for a quality profile
 */
export async function languages(cache: PCDCache, profileId: number): Promise<QualityProfileLanguages> {
  const db = cache.kb;

  const profileLanguages = await db
    .selectFrom('quality_profile_languages as qpl')
    .innerJoin('languages as l', 'qpl.language_id', 'l.id')
    .select(['l.id as language_id', 'l.name as language_name', 'qpl.type'])
    .where('qpl.quality_profile_id', '=', profileId)
    .orderBy('l.name')
    .execute();

  return {
    languages: profileLanguages.map((lang) => ({
      id: lang.language_id,
      name: lang.language_name,
      type: lang.type as 'must' | 'only' | 'not' | 'simple'
    }))
  };
}
