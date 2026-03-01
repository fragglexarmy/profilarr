/**
 * Centralized PCD reference resolver
 * Resolves entity relationships in PCD caches (QP ↔ CF ↔ Regex)
 */

import type { PCDCache } from './database/cache.ts';
import type { SyncArrType } from '../sync/mappings.ts';

/**
 * Get all custom format names referenced by a quality profile
 * (Forward: QP → CFs)
 */
export async function getCustomFormatsForProfile(
	cache: PCDCache,
	profileName: string,
	arrType: SyncArrType
): Promise<string[]> {
	const rows = await cache.kb
		.selectFrom('quality_profile_custom_formats')
		.select(['custom_format_name'])
		.where('quality_profile_name', '=', profileName)
		.where((eb) => eb.or([eb('arr_type', '=', arrType), eb('arr_type', '=', 'all')]))
		.execute();

	return [...new Set(rows.map((r) => r.custom_format_name))];
}

/**
 * Get all quality profile names that reference a custom format
 * (Reverse: CF → QPs)
 */
export async function getProfilesForCustomFormat(
	cache: PCDCache,
	cfName: string,
	arrType: SyncArrType
): Promise<string[]> {
	const rows = await cache.kb
		.selectFrom('quality_profile_custom_formats')
		.select(['quality_profile_name'])
		.where('custom_format_name', '=', cfName)
		.where((eb) => eb.or([eb('arr_type', '=', arrType), eb('arr_type', '=', 'all')]))
		.execute();

	return [...new Set(rows.map((r) => r.quality_profile_name))];
}

/**
 * Get all custom format names that use a regular expression
 * (Reverse: Regex → CFs)
 */
export async function getCustomFormatsForRegex(
	cache: PCDCache,
	regexName: string
): Promise<string[]> {
	const rows = await cache.kb
		.selectFrom('condition_patterns')
		.select(['custom_format_name'])
		.where('regular_expression_name', '=', regexName)
		.execute();

	return [...new Set(rows.map((r) => r.custom_format_name))];
}
