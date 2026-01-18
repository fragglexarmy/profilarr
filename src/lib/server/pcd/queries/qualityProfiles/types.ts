/**
 * Quality Profile query-specific types
 */

import type { Tag } from '../../types.ts';

// ============================================================================
// INTERNAL TYPES (used within queries)
// ============================================================================

/** Quality/group item in the hierarchy */
export interface QualityItem {
  position: number;
  type: 'quality' | 'group';
  name: string;
  is_upgrade_until: boolean;
}

/** Language configuration */
export interface ProfileLanguage {
  name: string;
  type: 'must' | 'only' | 'not' | 'simple';
}

/** Custom format counts by arr type */
export interface CustomFormatCounts {
  all: number;
  radarr: number;
  sonarr: number;
  total: number;
}

// ============================================================================
// QUERY RESULT TYPES
// ============================================================================

/** Quality profile general information */
export interface QualityProfileGeneral {
  id: number;
  name: string;
  description: string; // Raw markdown
  tags: Tag[];
}

/** Language configuration for a quality profile */
export interface QualityProfileLanguage {
  name: string;
  type: 'must' | 'only' | 'not' | 'simple';
}

/** Quality profile languages information */
export interface QualityProfileLanguages {
  languages: QualityProfileLanguage[];
}

/** Single quality item */
export interface QualitySingle {
  name: string;
  position: number;
  enabled: boolean;
  isUpgradeUntil: boolean;
}

/** Quality group with members */
export interface QualityGroup {
  name: string;
  position: number;
  enabled: boolean;
  isUpgradeUntil: boolean;
  members: {
    name: string;
  }[];
}

/** Quality profile qualities information */
export interface QualityProfileQualities {
  singles: QualitySingle[];
  groups: QualityGroup[];
}

/** Quality profile data for table view with all relationships */
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
