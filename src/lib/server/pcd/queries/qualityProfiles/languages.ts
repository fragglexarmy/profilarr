/**
 * Quality profile languages queries
 */

import type { PCDCache } from '../../cache.ts';
import type { QualityProfileLanguages } from './types.ts';

/**
 * Get languages for a quality profile
 */
export async function languages(cache: PCDCache, profileName: string): Promise<QualityProfileLanguages> {
  const db = cache.kb;

  const profileLanguages = await db
    .selectFrom('quality_profile_languages as qpl')
    .innerJoin('languages as l', 'qpl.language_name', 'l.name')
    .select(['l.name as language_name', 'qpl.type'])
    .where('qpl.quality_profile_name', '=', profileName)
    .orderBy('l.name')
    .execute();

  return {
    languages: profileLanguages.map((lang) => ({
      name: lang.language_name,
      type: lang.type as 'must' | 'only' | 'not' | 'simple'
    }))
  };
}
