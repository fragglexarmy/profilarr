/**
 * Custom format condition queries for test evaluation
 */

import type { PCDCache } from '../../cache.ts';

/** Full condition data for evaluation */
export interface ConditionData {
	name: string;
	type: string;
	arrType: 'all' | 'radarr' | 'sonarr';
	negate: boolean;
	required: boolean;
	// Type-specific data
	patterns?: { name: string; pattern: string }[];
	languages?: { name: string; except: boolean }[];
	sources?: string[];
	resolutions?: string[];
	qualityModifiers?: string[];
	releaseTypes?: string[];
	indexerFlags?: string[];
	size?: { minBytes: number | null; maxBytes: number | null };
	years?: { minYear: number | null; maxYear: number | null };
}

/**
 * Get all conditions for a custom format with full data for evaluation
 */
export async function getConditionsForEvaluation(
	cache: PCDCache,
	formatName: string
): Promise<ConditionData[]> {
	const db = cache.kb;

	// Get base conditions
	const conditions = await db
		.selectFrom('custom_format_conditions')
		.select(['custom_format_name', 'name', 'type', 'arr_type', 'negate', 'required'])
		.where('custom_format_name', '=', formatName)
		.execute();

	if (conditions.length === 0) return [];

	const conditionNames = conditions.map((c) => c.name);

	// Get all related data in parallel
	const [
		patterns,
		languages,
		sources,
		resolutions,
		qualityModifiers,
		releaseTypes,
		indexerFlags,
		sizes,
		years
	] = await Promise.all([
		// Patterns with regex
		db
			.selectFrom('condition_patterns as cp')
			.innerJoin('regular_expressions as re', 're.name', 'cp.regular_expression_name')
			.select(['cp.condition_name', 're.name', 're.pattern'])
			.where('cp.custom_format_name', '=', formatName)
			.where('cp.condition_name', 'in', conditionNames)
			.execute(),

		// Languages
		db
			.selectFrom('condition_languages as cl')
			.innerJoin('languages as l', 'l.name', 'cl.language_name')
			.select(['cl.condition_name', 'l.name', 'cl.except_language'])
			.where('cl.custom_format_name', '=', formatName)
			.where('cl.condition_name', 'in', conditionNames)
			.execute(),

		// Sources
		db
			.selectFrom('condition_sources')
			.select(['condition_name', 'source'])
			.where('custom_format_name', '=', formatName)
			.where('condition_name', 'in', conditionNames)
			.execute(),

		// Resolutions
		db
			.selectFrom('condition_resolutions')
			.select(['condition_name', 'resolution'])
			.where('custom_format_name', '=', formatName)
			.where('condition_name', 'in', conditionNames)
			.execute(),

		// Quality modifiers
		db
			.selectFrom('condition_quality_modifiers')
			.select(['condition_name', 'quality_modifier'])
			.where('custom_format_name', '=', formatName)
			.where('condition_name', 'in', conditionNames)
			.execute(),

		// Release types
		db
			.selectFrom('condition_release_types')
			.select(['condition_name', 'release_type'])
			.where('custom_format_name', '=', formatName)
			.where('condition_name', 'in', conditionNames)
			.execute(),

		// Indexer flags
		db
			.selectFrom('condition_indexer_flags')
			.select(['condition_name', 'flag'])
			.where('custom_format_name', '=', formatName)
			.where('condition_name', 'in', conditionNames)
			.execute(),

		// Sizes
		db
			.selectFrom('condition_sizes')
			.select(['condition_name', 'min_bytes', 'max_bytes'])
			.where('custom_format_name', '=', formatName)
			.where('condition_name', 'in', conditionNames)
			.execute(),

		// Years
		db
			.selectFrom('condition_years')
			.select(['condition_name', 'min_year', 'max_year'])
			.where('custom_format_name', '=', formatName)
			.where('condition_name', 'in', conditionNames)
			.execute()
	]);

	// Build lookup maps using condition_name as key
	const patternsMap = new Map<string, { name: string; pattern: string }[]>();
	for (const p of patterns) {
		if (!patternsMap.has(p.condition_name)) {
			patternsMap.set(p.condition_name, []);
		}
		patternsMap.get(p.condition_name)!.push({ name: p.name, pattern: p.pattern });
	}

	const languagesMap = new Map<string, { name: string; except: boolean }[]>();
	for (const l of languages) {
		if (!languagesMap.has(l.condition_name)) {
			languagesMap.set(l.condition_name, []);
		}
		languagesMap.get(l.condition_name)!.push({
			name: l.name,
			except: l.except_language === 1
		});
	}

	const sourcesMap = new Map<string, string[]>();
	for (const s of sources) {
		if (!sourcesMap.has(s.condition_name)) {
			sourcesMap.set(s.condition_name, []);
		}
		sourcesMap.get(s.condition_name)!.push(s.source);
	}

	const resolutionsMap = new Map<string, string[]>();
	for (const r of resolutions) {
		if (!resolutionsMap.has(r.condition_name)) {
			resolutionsMap.set(r.condition_name, []);
		}
		resolutionsMap.get(r.condition_name)!.push(r.resolution);
	}

	const qualityModifiersMap = new Map<string, string[]>();
	for (const q of qualityModifiers) {
		if (!qualityModifiersMap.has(q.condition_name)) {
			qualityModifiersMap.set(q.condition_name, []);
		}
		qualityModifiersMap.get(q.condition_name)!.push(q.quality_modifier);
	}

	const releaseTypesMap = new Map<string, string[]>();
	for (const r of releaseTypes) {
		if (!releaseTypesMap.has(r.condition_name)) {
			releaseTypesMap.set(r.condition_name, []);
		}
		releaseTypesMap.get(r.condition_name)!.push(r.release_type);
	}

	const indexerFlagsMap = new Map<string, string[]>();
	for (const f of indexerFlags) {
		if (!indexerFlagsMap.has(f.condition_name)) {
			indexerFlagsMap.set(f.condition_name, []);
		}
		indexerFlagsMap.get(f.condition_name)!.push(f.flag);
	}

	const sizesMap = new Map<string, { minBytes: number | null; maxBytes: number | null }>();
	for (const s of sizes) {
		sizesMap.set(s.condition_name, {
			minBytes: s.min_bytes,
			maxBytes: s.max_bytes
		});
	}

	const yearsMap = new Map<string, { minYear: number | null; maxYear: number | null }>();
	for (const y of years) {
		yearsMap.set(y.condition_name, {
			minYear: y.min_year,
			maxYear: y.max_year
		});
	}

	// Build final result
	return conditions.map((c) => ({
		name: c.name,
		type: c.type,
		arrType: c.arr_type as 'all' | 'radarr' | 'sonarr',
		negate: c.negate === 1,
		required: c.required === 1,
		patterns: patternsMap.get(c.name),
		languages: languagesMap.get(c.name),
		sources: sourcesMap.get(c.name),
		resolutions: resolutionsMap.get(c.name),
		qualityModifiers: qualityModifiersMap.get(c.name),
		releaseTypes: releaseTypesMap.get(c.name),
		indexerFlags: indexerFlagsMap.get(c.name),
		size: sizesMap.get(c.name),
		years: yearsMap.get(c.name)
	}));
}
