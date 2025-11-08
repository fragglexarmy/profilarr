/**
 * Quality profile list queries
 */

import type { PCDCache } from '../../cache.ts';
import type { Tag } from '../../types.ts';
import type { QualityProfileTableRow, QualityItem, ProfileLanguage, CustomFormatCounts } from './types.ts';
import { parseMarkdown } from '$utils/markdown/markdown.ts';
import { logger } from '$logger/logger.ts';

/**
 * Get quality profiles with full data for table/card views
 * Optimized to minimize database queries
 */
export async function list(cache: PCDCache): Promise<QualityProfileTableRow[]> {
  const db = cache.kb;

  // 1. Get all quality profiles
  const profiles = await db
    .selectFrom('quality_profiles')
    .select([
      'id',
      'name',
      'description',
      'upgrades_allowed',
      'minimum_custom_format_score',
      'upgrade_until_score',
      'upgrade_score_increment'
    ])
    .orderBy('name')
    .execute();

  if (profiles.length === 0) return [];

  const profileIds = profiles.map(p => p.id);

  // 2. Get all tags for all profiles
  const allTags = await db
    .selectFrom('quality_profile_tags as qpt')
    .innerJoin('tags as t', 't.id', 'qpt.tag_id')
    .select([
      'qpt.quality_profile_id',
      't.id as tag_id',
      't.name as tag_name',
      't.created_at as tag_created_at'
    ])
    .where('qpt.quality_profile_id', 'in', profileIds)
    .orderBy('qpt.quality_profile_id')
    .orderBy('t.name')
    .execute();

  // 3. Get custom format counts grouped by arr_type
  const formatCounts = await db
    .selectFrom('quality_profile_custom_formats')
    .select(['quality_profile_id', 'arr_type'])
    .select((eb) => eb.fn.count('quality_profile_id').as('count'))
    .where('quality_profile_id', 'in', profileIds)
    .groupBy(['quality_profile_id', 'arr_type'])
    .execute();

  // 4. Get all qualities for all profiles with names
  const allQualities = await db
    .selectFrom('quality_profile_qualities as qpq')
    .leftJoin('qualities as q', 'qpq.quality_id', 'q.id')
    .leftJoin('quality_groups as qg', 'qpq.quality_group_id', 'qg.id')
    .select([
      'qpq.quality_profile_id',
      'qpq.position',
      'qpq.upgrade_until',
      'qpq.quality_id',
      'qpq.quality_group_id',
      'q.name as quality_name',
      'qg.name as group_name'
    ])
    .where('qpq.quality_profile_id', 'in', profileIds)
    .orderBy('qpq.quality_profile_id')
    .orderBy('qpq.position')
    .execute();

  // 5. Get languages for all profiles
  const allLanguages = await db
    .selectFrom('quality_profile_languages as qpl')
    .innerJoin('languages as l', 'qpl.language_id', 'l.id')
    .select([
      'qpl.quality_profile_id',
      'l.id as language_id',
      'l.name as language_name',
      'qpl.type'
    ])
    .where('qpl.quality_profile_id', 'in', profileIds)
    .execute();

  // Build maps for efficient lookup
  const tagsMap = new Map<number, Tag[]>();
  for (const tag of allTags) {
    if (!tagsMap.has(tag.quality_profile_id)) {
      tagsMap.set(tag.quality_profile_id, []);
    }
    tagsMap.get(tag.quality_profile_id)!.push({
      id: tag.tag_id,
      name: tag.tag_name,
      created_at: tag.tag_created_at
    });
  }

  const formatCountsMap = new Map<number, Omit<CustomFormatCounts, 'total'>>();
  for (const fc of formatCounts) {
    if (!formatCountsMap.has(fc.quality_profile_id)) {
      formatCountsMap.set(fc.quality_profile_id, { all: 0, radarr: 0, sonarr: 0 });
    }
    const counts = formatCountsMap.get(fc.quality_profile_id)!;
    const count = Number(fc.count);
    if (fc.arr_type === 'all') counts.all = count;
    else if (fc.arr_type === 'radarr') counts.radarr = count;
    else if (fc.arr_type === 'sonarr') counts.sonarr = count;
  }

  const qualitiesMap = new Map<number, QualityItem[]>();
  for (const qual of allQualities) {
    if (!qualitiesMap.has(qual.quality_profile_id)) {
      qualitiesMap.set(qual.quality_profile_id, []);
    }

    qualitiesMap.get(qual.quality_profile_id)!.push({
      position: qual.position,
      type: qual.quality_id ? 'quality' : 'group',
      id: qual.quality_id || qual.quality_group_id!,
      name: qual.quality_name || qual.group_name!,
      is_upgrade_until: qual.upgrade_until === 1
    });
  }

  const languagesMap = new Map<number, ProfileLanguage>();
  for (const lang of allLanguages) {
    languagesMap.set(lang.quality_profile_id, {
      id: lang.language_id,
      name: lang.language_name,
      type: lang.type as 'must' | 'only' | 'not' | 'simple'
    });
  }

  // Build the final result
  const results = profiles.map((profile) => {
    const counts = formatCountsMap.get(profile.id) || { all: 0, radarr: 0, sonarr: 0 };

    const result: QualityProfileTableRow = {
      id: profile.id,
      name: profile.name,
      description: parseMarkdown(profile.description),
      tags: tagsMap.get(profile.id) || [],
      upgrades_allowed: profile.upgrades_allowed === 1,
      minimum_custom_format_score: profile.minimum_custom_format_score,
      custom_formats: {
        all: counts.all,
        radarr: counts.radarr,
        sonarr: counts.sonarr,
        total: counts.all + counts.radarr + counts.sonarr
      },
      qualities: qualitiesMap.get(profile.id) || [],
      language: languagesMap.get(profile.id)
    };

    // Only include upgrade settings if upgrades are allowed
    if (profile.upgrades_allowed === 1) {
      result.upgrade_until_score = profile.upgrade_until_score;
      result.upgrade_score_increment = profile.upgrade_score_increment;
    }

    return result;
  });

  return results;
}
