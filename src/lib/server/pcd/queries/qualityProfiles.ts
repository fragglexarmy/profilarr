/**
 * Quality Profile queries for PCD cache
 */

import type { PCDCache } from '../cache.ts';
import type { Tag } from '../types.ts';
import { parseMarkdown } from '$utils/markdown/markdown.ts';

// Type for quality/group items in the hierarchy
interface QualityItem {
  position: number;
  type: 'quality' | 'group';
  id: number;
  name: string;
  is_upgrade_until: boolean;
}

// Type for language configuration
interface ProfileLanguage {
  id: number;
  name: string;
  type: 'must' | 'only' | 'not' | 'simple';
}

// Type for custom format counts
interface CustomFormatCounts {
  all: number;
  radarr: number;
  sonarr: number;
  total: number;
}

/**
 * Quality profile data for table view with all relationships
 */
export interface QualityProfileTableRow {
  // Basic info
  id: number;
  name: string;
  description: string; // Parsed HTML from markdown

  // Tags
  tags: Tag[];

  // Upgrade settings
  upgrades_allowed: boolean;
  minimum_custom_format_score: number;
  upgrade_until_score?: number; // Only if upgrades_allowed
  upgrade_score_increment?: number; // Only if upgrades_allowed

  // Custom format counts by arr type
  custom_formats: CustomFormatCounts;

  // Quality hierarchy (in order)
  qualities: QualityItem[];

  // Single language configuration
  language?: ProfileLanguage;
}

/**
 * Get quality profiles with full data for table/card views
 * Optimized to minimize database queries
 */
export function list(cache: PCDCache): QualityProfileTableRow[] {
  // 1. Get all quality profiles
  const profiles = cache.query<{
    id: number;
    name: string;
    description: string | null;
    upgrades_allowed: number;
    minimum_custom_format_score: number;
    upgrade_until_score: number;
    upgrade_score_increment: number;
  }>(`
    SELECT
      id,
      name,
      description,
      upgrades_allowed,
      minimum_custom_format_score,
      upgrade_until_score,
      upgrade_score_increment
    FROM quality_profiles
    ORDER BY name
  `);

  if (profiles.length === 0) return [];

  const profileIds = profiles.map(p => p.id);
  const idPlaceholders = profileIds.map(() => '?').join(',');

  // 2. Get all tags for all profiles in one query
  const allTags = cache.query<{
    quality_profile_id: number;
    tag_id: number;
    tag_name: string;
    tag_created_at: string;
  }>(`
    SELECT
      qpt.quality_profile_id,
      t.id as tag_id,
      t.name as tag_name,
      t.created_at as tag_created_at
    FROM quality_profile_tags qpt
    JOIN tags t ON qpt.tag_id = t.id
    WHERE qpt.quality_profile_id IN (${idPlaceholders})
    ORDER BY qpt.quality_profile_id, t.name
  `, ...profileIds);

  // 3. Get custom format counts grouped by arr_type for all profiles
  const formatCounts = cache.query<{
    quality_profile_id: number;
    arr_type: string;
    count: number;
  }>(`
    SELECT
      quality_profile_id,
      arr_type,
      COUNT(*) as count
    FROM quality_profile_custom_formats
    WHERE quality_profile_id IN (${idPlaceholders})
    GROUP BY quality_profile_id, arr_type
  `, ...profileIds);

  // 4. Get all qualities for all profiles with names
  const allQualities = cache.query<{
    quality_profile_id: number;
    position: number;
    upgrade_until: number;
    quality_id: number | null;
    quality_group_id: number | null;
    quality_name: string | null;
    group_name: string | null;
  }>(`
    SELECT
      qpq.quality_profile_id,
      qpq.position,
      qpq.upgrade_until,
      qpq.quality_id,
      qpq.quality_group_id,
      q.name as quality_name,
      qg.name as group_name
    FROM quality_profile_qualities qpq
    LEFT JOIN qualities q ON qpq.quality_id = q.id
    LEFT JOIN quality_groups qg ON qpq.quality_group_id = qg.id
    WHERE qpq.quality_profile_id IN (${idPlaceholders})
    ORDER BY qpq.quality_profile_id, qpq.position
  `, ...profileIds);

  // 5. Get languages for all profiles (one per profile)
  const allLanguages = cache.query<{
    quality_profile_id: number;
    language_id: number;
    language_name: string;
    type: string;
  }>(`
    SELECT
      qpl.quality_profile_id,
      l.id as language_id,
      l.name as language_name,
      qpl.type
    FROM quality_profile_languages qpl
    JOIN languages l ON qpl.language_id = l.id
    WHERE qpl.quality_profile_id IN (${idPlaceholders})
  `, ...profileIds);

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
      formatCountsMap.set(fc.quality_profile_id, {all: 0, radarr: 0, sonarr: 0});
    }
    const counts = formatCountsMap.get(fc.quality_profile_id)!;
    if (fc.arr_type === 'all') counts.all = fc.count;
    else if (fc.arr_type === 'radarr') counts.radarr = fc.count;
    else if (fc.arr_type === 'sonarr') counts.sonarr = fc.count;
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
  return profiles.map(profile => {
    const counts = formatCountsMap.get(profile.id) || {all: 0, radarr: 0, sonarr: 0};

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
}