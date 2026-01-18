/**
 * Get all custom format conditions for batch evaluation
 * Used by entity testing to evaluate releases against all CFs at once
 */

import type { PCDCache } from '../../cache.ts';
import type { ConditionData } from './conditions.ts';

export interface CustomFormatWithConditions {
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
		.select(['custom_format_name', 'name', 'type', 'arr_type', 'negate', 'required'])
		.execute();

	if (conditions.length === 0) {
		return formats.map((f) => ({ name: f.name, conditions: [] }));
	}

	// Build composite keys for condition lookups
	const conditionKeys = conditions.map((c) => `${c.custom_format_name}|${c.name}`);

	// Get all related data in parallel
	const [patterns, languages, sources, resolutions, qualityModifiers, releaseTypes, indexerFlags, sizes, years] =
		await Promise.all([
			// Patterns with regex
			db
				.selectFrom('condition_patterns as cp')
				.innerJoin('regular_expressions as re', 're.name', 'cp.regular_expression_name')
				.select(['cp.custom_format_name', 'cp.condition_name', 're.name', 're.pattern'])
				.execute(),

			// Languages
			db
				.selectFrom('condition_languages as cl')
				.innerJoin('languages as l', 'l.name', 'cl.language_name')
				.select(['cl.custom_format_name', 'cl.condition_name', 'l.name', 'cl.except_language'])
				.execute(),

			// Sources
			db
				.selectFrom('condition_sources')
				.select(['custom_format_name', 'condition_name', 'source'])
				.execute(),

			// Resolutions
			db
				.selectFrom('condition_resolutions')
				.select(['custom_format_name', 'condition_name', 'resolution'])
				.execute(),

			// Quality modifiers
			db
				.selectFrom('condition_quality_modifiers')
				.select(['custom_format_name', 'condition_name', 'quality_modifier'])
				.execute(),

			// Release types
			db
				.selectFrom('condition_release_types')
				.select(['custom_format_name', 'condition_name', 'release_type'])
				.execute(),

			// Indexer flags
			db
				.selectFrom('condition_indexer_flags')
				.select(['custom_format_name', 'condition_name', 'flag'])
				.execute(),

			// Sizes
			db
				.selectFrom('condition_sizes')
				.select(['custom_format_name', 'condition_name', 'min_bytes', 'max_bytes'])
				.execute(),

			// Years
			db
				.selectFrom('condition_years')
				.select(['custom_format_name', 'condition_name', 'min_year', 'max_year'])
				.execute()
		]);

	// Build lookup maps using composite key (custom_format_name|condition_name)
	const patternsMap = new Map<string, { name: string; pattern: string }[]>();
	for (const p of patterns) {
		const key = `${p.custom_format_name}|${p.condition_name}`;
		if (!patternsMap.has(key)) {
			patternsMap.set(key, []);
		}
		patternsMap.get(key)!.push({ name: p.name, pattern: p.pattern });
	}

	const languagesMap = new Map<string, { name: string; except: boolean }[]>();
	for (const l of languages) {
		const key = `${l.custom_format_name}|${l.condition_name}`;
		if (!languagesMap.has(key)) {
			languagesMap.set(key, []);
		}
		languagesMap.get(key)!.push({
			name: l.name,
			except: l.except_language === 1
		});
	}

	const sourcesMap = new Map<string, string[]>();
	for (const s of sources) {
		const key = `${s.custom_format_name}|${s.condition_name}`;
		if (!sourcesMap.has(key)) {
			sourcesMap.set(key, []);
		}
		sourcesMap.get(key)!.push(s.source);
	}

	const resolutionsMap = new Map<string, string[]>();
	for (const r of resolutions) {
		const key = `${r.custom_format_name}|${r.condition_name}`;
		if (!resolutionsMap.has(key)) {
			resolutionsMap.set(key, []);
		}
		resolutionsMap.get(key)!.push(r.resolution);
	}

	const qualityModifiersMap = new Map<string, string[]>();
	for (const q of qualityModifiers) {
		const key = `${q.custom_format_name}|${q.condition_name}`;
		if (!qualityModifiersMap.has(key)) {
			qualityModifiersMap.set(key, []);
		}
		qualityModifiersMap.get(key)!.push(q.quality_modifier);
	}

	const releaseTypesMap = new Map<string, string[]>();
	for (const r of releaseTypes) {
		const key = `${r.custom_format_name}|${r.condition_name}`;
		if (!releaseTypesMap.has(key)) {
			releaseTypesMap.set(key, []);
		}
		releaseTypesMap.get(key)!.push(r.release_type);
	}

	const indexerFlagsMap = new Map<string, string[]>();
	for (const f of indexerFlags) {
		const key = `${f.custom_format_name}|${f.condition_name}`;
		if (!indexerFlagsMap.has(key)) {
			indexerFlagsMap.set(key, []);
		}
		indexerFlagsMap.get(key)!.push(f.flag);
	}

	const sizesMap = new Map<string, { minBytes: number | null; maxBytes: number | null }>();
	for (const s of sizes) {
		const key = `${s.custom_format_name}|${s.condition_name}`;
		sizesMap.set(key, {
			minBytes: s.min_bytes,
			maxBytes: s.max_bytes
		});
	}

	const yearsMap = new Map<string, { minYear: number | null; maxYear: number | null }>();
	for (const y of years) {
		const key = `${y.custom_format_name}|${y.condition_name}`;
		yearsMap.set(key, {
			minYear: y.min_year,
			maxYear: y.max_year
		});
	}

	// Build conditions by format
	const conditionsByFormat = new Map<string, ConditionData[]>();
	for (const c of conditions) {
		if (!conditionsByFormat.has(c.custom_format_name)) {
			conditionsByFormat.set(c.custom_format_name, []);
		}
		const key = `${c.custom_format_name}|${c.name}`;
		conditionsByFormat.get(c.custom_format_name)!.push({
			name: c.name,
			type: c.type,
			arrType: c.arr_type as 'all' | 'radarr' | 'sonarr',
			negate: c.negate === 1,
			required: c.required === 1,
			patterns: patternsMap.get(key),
			languages: languagesMap.get(key),
			sources: sourcesMap.get(key),
			resolutions: resolutionsMap.get(key),
			qualityModifiers: qualityModifiersMap.get(key),
			releaseTypes: releaseTypesMap.get(key),
			indexerFlags: indexerFlagsMap.get(key),
			size: sizesMap.get(key),
			years: yearsMap.get(key)
		});
	}

	// Build final result
	return formats.map((f) => ({
		name: f.name,
		conditions: conditionsByFormat.get(f.name) || []
	}));
}
