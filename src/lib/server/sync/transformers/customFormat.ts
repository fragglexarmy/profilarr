/**
 * Custom Format Transformer
 * Transforms PCD custom format data to arr API format
 */

import type { PCDCache } from '$pcd/cache.ts';
import {
	type SyncArrType,
	getSource,
	getResolution,
	getIndexerFlag,
	getQualityModifier,
	getReleaseType,
	getLanguage
} from '../mappings.ts';

// =============================================================================
// Arr API Types
// =============================================================================

export interface ArrCustomFormatSpecification {
	name: string;
	implementation: string;
	negate: boolean;
	required: boolean;
	fields: { name: string; value: unknown }[];
}

export interface ArrCustomFormat {
	id?: number;
	name: string;
	includeCustomFormatWhenRenaming?: boolean;
	specifications: ArrCustomFormatSpecification[];
}

// =============================================================================
// PCD Data Types
// =============================================================================

export interface PcdCustomFormat {
	id: number;
	name: string;
	includeInRename: boolean;
	conditions: PcdCondition[];
}

export interface PcdCondition {
	id: number;
	name: string;
	type: string;
	arrType: string; // 'radarr', 'sonarr', 'all'
	negate: boolean;
	required: boolean;
	// Type-specific data
	patterns?: { id: number; pattern: string }[];
	languages?: { id: number; name: string; except: boolean }[];
	sources?: string[];
	resolutions?: string[];
	qualityModifiers?: string[];
	releaseTypes?: string[];
	indexerFlags?: string[];
	size?: { minBytes: number | null; maxBytes: number | null };
	years?: { minYear: number | null; maxYear: number | null };
}

// =============================================================================
// Condition Type to Implementation Mapping
// =============================================================================

const CONDITION_IMPLEMENTATIONS: Record<string, string> = {
	release_title: 'ReleaseTitleSpecification',
	release_group: 'ReleaseGroupSpecification',
	edition: 'EditionSpecification',
	source: 'SourceSpecification',
	resolution: 'ResolutionSpecification',
	indexer_flag: 'IndexerFlagSpecification',
	quality_modifier: 'QualityModifierSpecification',
	size: 'SizeSpecification',
	language: 'LanguageSpecification',
	release_type: 'ReleaseTypeSpecification',
	year: 'YearSpecification'
};

// =============================================================================
// Transformer Functions
// =============================================================================

/**
 * Transform a single condition to arr API specification format
 * Returns null if the condition should be skipped for this arr type
 */
function transformCondition(
	condition: PcdCondition,
	arrType: SyncArrType
): ArrCustomFormatSpecification | null {
	// Skip conditions not applicable to this arr type
	if (condition.arrType !== 'all' && condition.arrType !== arrType) {
		return null;
	}

	// Quality modifier is Radarr-only
	if (condition.type === 'quality_modifier' && arrType === 'sonarr') {
		return null;
	}

	// Release type is Sonarr-only
	if (condition.type === 'release_type' && arrType === 'radarr') {
		return null;
	}

	const implementation = CONDITION_IMPLEMENTATIONS[condition.type];
	if (!implementation) {
		return null;
	}

	const spec: ArrCustomFormatSpecification = {
		name: condition.name,
		implementation,
		negate: condition.negate,
		required: condition.required,
		fields: []
	};

	// Build fields based on condition type
	switch (condition.type) {
		case 'release_title':
		case 'release_group':
		case 'edition': {
			// Pattern-based conditions use the regex pattern
			const pattern = condition.patterns?.[0]?.pattern;
			if (!pattern) return null;
			spec.fields = [{ name: 'value', value: pattern }];
			break;
		}

		case 'source': {
			const source = condition.sources?.[0];
			if (!source) return null;
			spec.fields = [{ name: 'value', value: getSource(source, arrType) }];
			break;
		}

		case 'resolution': {
			const resolution = condition.resolutions?.[0];
			if (!resolution) return null;
			spec.fields = [{ name: 'value', value: getResolution(resolution) }];
			break;
		}

		case 'indexer_flag': {
			const flag = condition.indexerFlags?.[0];
			if (!flag) return null;
			spec.fields = [{ name: 'value', value: getIndexerFlag(flag, arrType) }];
			break;
		}

		case 'quality_modifier': {
			const modifier = condition.qualityModifiers?.[0];
			if (!modifier) return null;
			spec.fields = [{ name: 'value', value: getQualityModifier(modifier) }];
			break;
		}

		case 'release_type': {
			const releaseType = condition.releaseTypes?.[0];
			if (!releaseType) return null;
			spec.fields = [{ name: 'value', value: getReleaseType(releaseType) }];
			break;
		}

		case 'size': {
			const size = condition.size;
			if (!size) return null;
			spec.fields = [
				{ name: 'min', value: size.minBytes ?? 0 },
				{ name: 'max', value: size.maxBytes ?? 0 }
			];
			break;
		}

		case 'year': {
			const years = condition.years;
			if (!years) return null;
			spec.fields = [
				{ name: 'min', value: years.minYear ?? 0 },
				{ name: 'max', value: years.maxYear ?? 0 }
			];
			break;
		}

		case 'language': {
			const lang = condition.languages?.[0];
			if (!lang) return null;
			const langData = getLanguage(lang.name, arrType);
			spec.fields = [{ name: 'value', value: langData.id }];
			// Add exceptLanguage field if present
			if (lang.except) {
				spec.fields.push({ name: 'exceptLanguage', value: true });
			}
			break;
		}

		default:
			return null;
	}

	return spec;
}

/**
 * Transform a PCD custom format to arr API format
 */
export function transformCustomFormat(format: PcdCustomFormat, arrType: SyncArrType): ArrCustomFormat {
	const specifications: ArrCustomFormatSpecification[] = [];

	for (const condition of format.conditions) {
		const spec = transformCondition(condition, arrType);
		if (spec) {
			specifications.push(spec);
		}
	}

	const result: ArrCustomFormat = {
		name: format.name,
		specifications
	};

	if (format.includeInRename) {
		result.includeCustomFormatWhenRenaming = true;
	}

	return result;
}

// =============================================================================
// PCD Query Functions
// =============================================================================

/**
 * Fetch a custom format from PCD cache with all conditions
 */
export async function fetchCustomFormatFromPcd(
	cache: PCDCache,
	formatId: number
): Promise<PcdCustomFormat | null> {
	const db = cache.kb;

	// Get custom format
	const format = await db
		.selectFrom('custom_formats')
		.select(['id', 'name', 'include_in_rename'])
		.where('id', '=', formatId)
		.executeTakeFirst();

	if (!format) return null;

	// Get conditions
	const conditions = await db
		.selectFrom('custom_format_conditions')
		.select(['id', 'name', 'type', 'arr_type', 'negate', 'required'])
		.where('custom_format_id', '=', formatId)
		.execute();

	if (conditions.length === 0) {
		return {
			id: format.id,
			name: format.name,
			includeInRename: format.include_in_rename === 1,
			conditions: []
		};
	}

	const conditionIds = conditions.map((c) => c.id);

	// Fetch all condition data in parallel
	const [patterns, languages, sources, resolutions, qualityModifiers, releaseTypes, indexerFlags, sizes, years] =
		await Promise.all([
			db
				.selectFrom('condition_patterns as cp')
				.innerJoin('regular_expressions as re', 're.id', 'cp.regular_expression_id')
				.select(['cp.custom_format_condition_id', 're.id', 're.pattern'])
				.where('cp.custom_format_condition_id', 'in', conditionIds)
				.execute(),
			db
				.selectFrom('condition_languages as cl')
				.innerJoin('languages as l', 'l.id', 'cl.language_id')
				.select(['cl.custom_format_condition_id', 'l.id', 'l.name', 'cl.except_language'])
				.where('cl.custom_format_condition_id', 'in', conditionIds)
				.execute(),
			db
				.selectFrom('condition_sources')
				.select(['custom_format_condition_id', 'source'])
				.where('custom_format_condition_id', 'in', conditionIds)
				.execute(),
			db
				.selectFrom('condition_resolutions')
				.select(['custom_format_condition_id', 'resolution'])
				.where('custom_format_condition_id', 'in', conditionIds)
				.execute(),
			db
				.selectFrom('condition_quality_modifiers')
				.select(['custom_format_condition_id', 'quality_modifier'])
				.where('custom_format_condition_id', 'in', conditionIds)
				.execute(),
			db
				.selectFrom('condition_release_types')
				.select(['custom_format_condition_id', 'release_type'])
				.where('custom_format_condition_id', 'in', conditionIds)
				.execute(),
			db
				.selectFrom('condition_indexer_flags')
				.select(['custom_format_condition_id', 'flag'])
				.where('custom_format_condition_id', 'in', conditionIds)
				.execute(),
			db
				.selectFrom('condition_sizes')
				.select(['custom_format_condition_id', 'min_bytes', 'max_bytes'])
				.where('custom_format_condition_id', 'in', conditionIds)
				.execute(),
			db
				.selectFrom('condition_years')
				.select(['custom_format_condition_id', 'min_year', 'max_year'])
				.where('custom_format_condition_id', 'in', conditionIds)
				.execute()
		]);

	// Build lookup maps
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

	// Build conditions
	const pcdConditions: PcdCondition[] = conditions.map((c) => ({
		id: c.id,
		name: c.name,
		type: c.type,
		arrType: c.arr_type,
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
	}));

	return {
		id: format.id,
		name: format.name,
		includeInRename: format.include_in_rename === 1,
		conditions: pcdConditions
	};
}

/**
 * Fetch all custom formats from PCD cache
 * Used when syncing all formats referenced by quality profiles
 */
export async function fetchAllCustomFormatsFromPcd(cache: PCDCache): Promise<PcdCustomFormat[]> {
	const db = cache.kb;

	// Get all custom formats
	const formats = await db.selectFrom('custom_formats').select(['id', 'name', 'include_in_rename']).execute();

	if (formats.length === 0) return [];

	// Get all conditions
	const conditions = await db
		.selectFrom('custom_format_conditions')
		.select(['id', 'custom_format_id', 'name', 'type', 'arr_type', 'negate', 'required'])
		.execute();

	const conditionIds = conditions.map((c) => c.id);

	// Fetch all condition data in parallel (same as above)
	const [patterns, languages, sources, resolutions, qualityModifiers, releaseTypes, indexerFlags, sizes, years] =
		conditionIds.length > 0
			? await Promise.all([
					db
						.selectFrom('condition_patterns as cp')
						.innerJoin('regular_expressions as re', 're.id', 'cp.regular_expression_id')
						.select(['cp.custom_format_condition_id', 're.id', 're.pattern'])
						.where('cp.custom_format_condition_id', 'in', conditionIds)
						.execute(),
					db
						.selectFrom('condition_languages as cl')
						.innerJoin('languages as l', 'l.id', 'cl.language_id')
						.select(['cl.custom_format_condition_id', 'l.id', 'l.name', 'cl.except_language'])
						.where('cl.custom_format_condition_id', 'in', conditionIds)
						.execute(),
					db
						.selectFrom('condition_sources')
						.select(['custom_format_condition_id', 'source'])
						.where('custom_format_condition_id', 'in', conditionIds)
						.execute(),
					db
						.selectFrom('condition_resolutions')
						.select(['custom_format_condition_id', 'resolution'])
						.where('custom_format_condition_id', 'in', conditionIds)
						.execute(),
					db
						.selectFrom('condition_quality_modifiers')
						.select(['custom_format_condition_id', 'quality_modifier'])
						.where('custom_format_condition_id', 'in', conditionIds)
						.execute(),
					db
						.selectFrom('condition_release_types')
						.select(['custom_format_condition_id', 'release_type'])
						.where('custom_format_condition_id', 'in', conditionIds)
						.execute(),
					db
						.selectFrom('condition_indexer_flags')
						.select(['custom_format_condition_id', 'flag'])
						.where('custom_format_condition_id', 'in', conditionIds)
						.execute(),
					db
						.selectFrom('condition_sizes')
						.select(['custom_format_condition_id', 'min_bytes', 'max_bytes'])
						.where('custom_format_condition_id', 'in', conditionIds)
						.execute(),
					db
						.selectFrom('condition_years')
						.select(['custom_format_condition_id', 'min_year', 'max_year'])
						.where('custom_format_condition_id', 'in', conditionIds)
						.execute()
				])
			: [[], [], [], [], [], [], [], [], []];

	// Build lookup maps (same pattern as above)
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

	// Group conditions by format
	const conditionsByFormat = new Map<number, PcdCondition[]>();
	for (const c of conditions) {
		if (!conditionsByFormat.has(c.custom_format_id)) {
			conditionsByFormat.set(c.custom_format_id, []);
		}
		conditionsByFormat.get(c.custom_format_id)!.push({
			id: c.id,
			name: c.name,
			type: c.type,
			arrType: c.arr_type,
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

	// Build result
	return formats.map((f) => ({
		id: f.id,
		name: f.name,
		includeInRename: f.include_in_rename === 1,
		conditions: conditionsByFormat.get(f.id) || []
	}));
}
