/**
 * Get all custom format conditions for batch evaluation
 * Used by entity testing to evaluate releases against all CFs at once
 */

import type { PCDCache } from '../../cache.ts';
import type { ConditionData } from './conditions.ts';

export interface CustomFormatWithConditions {
	id: number;
	name: string;
	conditions: ConditionData[];
}

/**
 * Get all custom formats with their conditions for batch evaluation
 * Optimized to fetch all data in minimal queries
 */
export async function getAllConditionsForEvaluation(
	cache: PCDCache
): Promise<CustomFormatWithConditions[]> {
	const db = cache.kb;

	// Get all custom formats
	const formats = await db
		.selectFrom('custom_formats')
		.select(['id', 'name'])
		.orderBy('name')
		.execute();

	if (formats.length === 0) return [];

	// Get all conditions for all formats
	const conditions = await db
		.selectFrom('custom_format_conditions')
		.select(['id', 'custom_format_id', 'name', 'type', 'arr_type', 'negate', 'required'])
		.execute();

	if (conditions.length === 0) {
		return formats.map((f) => ({ id: f.id, name: f.name, conditions: [] }));
	}

	const conditionIds = conditions.map((c) => c.id);

	// Get all related data in parallel
	const [patterns, languages, sources, resolutions, qualityModifiers, releaseTypes, indexerFlags, sizes, years] =
		await Promise.all([
			// Patterns with regex
			db
				.selectFrom('condition_patterns as cp')
				.innerJoin('regular_expressions as re', 're.id', 'cp.regular_expression_id')
				.select(['cp.custom_format_condition_id', 're.id', 're.pattern'])
				.where('cp.custom_format_condition_id', 'in', conditionIds)
				.execute(),

			// Languages
			db
				.selectFrom('condition_languages as cl')
				.innerJoin('languages as l', 'l.id', 'cl.language_id')
				.select(['cl.custom_format_condition_id', 'l.id', 'l.name', 'cl.except_language'])
				.where('cl.custom_format_condition_id', 'in', conditionIds)
				.execute(),

			// Sources
			db
				.selectFrom('condition_sources')
				.select(['custom_format_condition_id', 'source'])
				.where('custom_format_condition_id', 'in', conditionIds)
				.execute(),

			// Resolutions
			db
				.selectFrom('condition_resolutions')
				.select(['custom_format_condition_id', 'resolution'])
				.where('custom_format_condition_id', 'in', conditionIds)
				.execute(),

			// Quality modifiers
			db
				.selectFrom('condition_quality_modifiers')
				.select(['custom_format_condition_id', 'quality_modifier'])
				.where('custom_format_condition_id', 'in', conditionIds)
				.execute(),

			// Release types
			db
				.selectFrom('condition_release_types')
				.select(['custom_format_condition_id', 'release_type'])
				.where('custom_format_condition_id', 'in', conditionIds)
				.execute(),

			// Indexer flags
			db
				.selectFrom('condition_indexer_flags')
				.select(['custom_format_condition_id', 'flag'])
				.where('custom_format_condition_id', 'in', conditionIds)
				.execute(),

			// Sizes
			db
				.selectFrom('condition_sizes')
				.select(['custom_format_condition_id', 'min_bytes', 'max_bytes'])
				.where('custom_format_condition_id', 'in', conditionIds)
				.execute(),

			// Years
			db
				.selectFrom('condition_years')
				.select(['custom_format_condition_id', 'min_year', 'max_year'])
				.where('custom_format_condition_id', 'in', conditionIds)
				.execute()
		]);

	// Build lookup maps for condition data
	const patternsMap = new Map<number, { id: number; pattern: string }[]>();
	for (const p of patterns) {
		if (!patternsMap.has(p.custom_format_condition_id)) {
			patternsMap.set(p.custom_format_condition_id, []);
		}
		patternsMap.get(p.custom_format_condition_id)!.push({ id: p.id, pattern: p.pattern });
	}

	const languagesMap = new Map<number, { id: number; name: string; except: boolean }[]>();
	for (const l of languages) {
		if (!languagesMap.has(l.custom_format_condition_id)) {
			languagesMap.set(l.custom_format_condition_id, []);
		}
		languagesMap.get(l.custom_format_condition_id)!.push({
			id: l.id,
			name: l.name,
			except: l.except_language === 1
		});
	}

	const sourcesMap = new Map<number, string[]>();
	for (const s of sources) {
		if (!sourcesMap.has(s.custom_format_condition_id)) {
			sourcesMap.set(s.custom_format_condition_id, []);
		}
		sourcesMap.get(s.custom_format_condition_id)!.push(s.source);
	}

	const resolutionsMap = new Map<number, string[]>();
	for (const r of resolutions) {
		if (!resolutionsMap.has(r.custom_format_condition_id)) {
			resolutionsMap.set(r.custom_format_condition_id, []);
		}
		resolutionsMap.get(r.custom_format_condition_id)!.push(r.resolution);
	}

	const qualityModifiersMap = new Map<number, string[]>();
	for (const q of qualityModifiers) {
		if (!qualityModifiersMap.has(q.custom_format_condition_id)) {
			qualityModifiersMap.set(q.custom_format_condition_id, []);
		}
		qualityModifiersMap.get(q.custom_format_condition_id)!.push(q.quality_modifier);
	}

	const releaseTypesMap = new Map<number, string[]>();
	for (const r of releaseTypes) {
		if (!releaseTypesMap.has(r.custom_format_condition_id)) {
			releaseTypesMap.set(r.custom_format_condition_id, []);
		}
		releaseTypesMap.get(r.custom_format_condition_id)!.push(r.release_type);
	}

	const indexerFlagsMap = new Map<number, string[]>();
	for (const f of indexerFlags) {
		if (!indexerFlagsMap.has(f.custom_format_condition_id)) {
			indexerFlagsMap.set(f.custom_format_condition_id, []);
		}
		indexerFlagsMap.get(f.custom_format_condition_id)!.push(f.flag);
	}

	const sizesMap = new Map<number, { minBytes: number | null; maxBytes: number | null }>();
	for (const s of sizes) {
		sizesMap.set(s.custom_format_condition_id, {
			minBytes: s.min_bytes,
			maxBytes: s.max_bytes
		});
	}

	const yearsMap = new Map<number, { minYear: number | null; maxYear: number | null }>();
	for (const y of years) {
		yearsMap.set(y.custom_format_condition_id, {
			minYear: y.min_year,
			maxYear: y.max_year
		});
	}

	// Build conditions by format
	const conditionsByFormat = new Map<number, ConditionData[]>();
	for (const c of conditions) {
		if (!conditionsByFormat.has(c.custom_format_id)) {
			conditionsByFormat.set(c.custom_format_id, []);
		}
		conditionsByFormat.get(c.custom_format_id)!.push({
			id: c.id,
			name: c.name,
			type: c.type,
			arrType: c.arr_type as 'all' | 'radarr' | 'sonarr',
			negate: c.negate === 1,
			required: c.required === 1,
			patterns: patternsMap.get(c.id),
			languages: languagesMap.get(c.id),
			sources: sourcesMap.get(c.id),
			resolutions: resolutionsMap.get(c.id),
			qualityModifiers: qualityModifiersMap.get(c.id),
			releaseTypes: releaseTypesMap.get(c.id),
			indexerFlags: indexerFlagsMap.get(c.id),
			size: sizesMap.get(c.id),
			years: yearsMap.get(c.id)
		});
	}

	// Build final result
	return formats.map((f) => ({
		id: f.id,
		name: f.name,
		conditions: conditionsByFormat.get(f.id) || []
	}));
}
