/**
 * Update custom format conditions
 *
 * This mutation handles:
 * - Deleting removed conditions
 * - Inserting new conditions (from drafts with negative IDs)
 * - Updating existing conditions
 */

import type { PCDCache } from '../../cache.ts';
import { writeOperation, type OperationLayer } from '../../writer.ts';
import type { ConditionData } from './conditions.ts';
import { logger } from '$logger/logger.ts';

export interface UpdateConditionsOptions {
	databaseId: number;
	cache: PCDCache;
	layer: OperationLayer;
	/** The custom format ID */
	formatId: number;
	/** The custom format name (for metadata) */
	formatName: string;
	/** Current conditions from the database (for comparison) */
	originalConditions: ConditionData[];
	/** The new/modified conditions from the client */
	conditions: ConditionData[];
}

/**
 * Escape a string for SQL
 */
function esc(value: string): string {
	return value.replace(/'/g, "''");
}

/**
 * Generate SQL to insert a condition's type-specific data
 */
function generateConditionValueSql(conditionName: string, formatName: string, condition: ConditionData): string[] {
	const conditionIdLookup = `(SELECT id FROM custom_format_conditions WHERE name = '${esc(conditionName)}' AND custom_format_id = (SELECT id FROM custom_formats WHERE name = '${esc(formatName)}'))`;
	const sqls: string[] = [];

	switch (condition.type) {
		case 'release_title':
		case 'release_group':
		case 'edition':
			if (condition.patterns && condition.patterns.length > 0) {
				for (const pattern of condition.patterns) {
					sqls.push(`INSERT INTO condition_patterns (custom_format_condition_id, regular_expression_id) VALUES (${conditionIdLookup}, ${pattern.id})`);
				}
			}
			break;

		case 'language':
			if (condition.languages && condition.languages.length > 0) {
				for (const lang of condition.languages) {
					sqls.push(`INSERT INTO condition_languages (custom_format_condition_id, language_id, except_language) VALUES (${conditionIdLookup}, ${lang.id}, ${lang.except ? 1 : 0})`);
				}
			}
			break;

		case 'source':
			if (condition.sources && condition.sources.length > 0) {
				for (const source of condition.sources) {
					sqls.push(`INSERT INTO condition_sources (custom_format_condition_id, source) VALUES (${conditionIdLookup}, '${esc(source)}')`);
				}
			}
			break;

		case 'resolution':
			if (condition.resolutions && condition.resolutions.length > 0) {
				for (const res of condition.resolutions) {
					sqls.push(`INSERT INTO condition_resolutions (custom_format_condition_id, resolution) VALUES (${conditionIdLookup}, '${esc(res)}')`);
				}
			}
			break;

		case 'quality_modifier':
			if (condition.qualityModifiers && condition.qualityModifiers.length > 0) {
				for (const qm of condition.qualityModifiers) {
					sqls.push(`INSERT INTO condition_quality_modifiers (custom_format_condition_id, quality_modifier) VALUES (${conditionIdLookup}, '${esc(qm)}')`);
				}
			}
			break;

		case 'release_type':
			if (condition.releaseTypes && condition.releaseTypes.length > 0) {
				for (const rt of condition.releaseTypes) {
					sqls.push(`INSERT INTO condition_release_types (custom_format_condition_id, release_type) VALUES (${conditionIdLookup}, '${esc(rt)}')`);
				}
			}
			break;

		case 'indexer_flag':
			if (condition.indexerFlags && condition.indexerFlags.length > 0) {
				for (const flag of condition.indexerFlags) {
					sqls.push(`INSERT INTO condition_indexer_flags (custom_format_condition_id, flag) VALUES (${conditionIdLookup}, '${esc(flag)}')`);
				}
			}
			break;

		case 'size':
			if (condition.size) {
				const minBytes = condition.size.minBytes ?? 'NULL';
				const maxBytes = condition.size.maxBytes ?? 'NULL';
				sqls.push(`INSERT INTO condition_sizes (custom_format_condition_id, min_bytes, max_bytes) VALUES (${conditionIdLookup}, ${minBytes}, ${maxBytes})`);
			}
			break;

		case 'year':
			if (condition.years) {
				const minYear = condition.years.minYear ?? 'NULL';
				const maxYear = condition.years.maxYear ?? 'NULL';
				sqls.push(`INSERT INTO condition_years (custom_format_condition_id, min_year, max_year) VALUES (${conditionIdLookup}, ${minYear}, ${maxYear})`);
			}
			break;
	}

	return sqls;
}

/**
 * Update conditions for a custom format
 *
 * Strategy:
 * 1. Find conditions to delete (in original but not in new)
 * 2. Find conditions to add (new with negative IDs, these are drafts)
 * 3. Find conditions to update (positive IDs that exist in both)
 */
export async function updateConditions(options: UpdateConditionsOptions) {
	const { databaseId, layer, formatId, formatName, originalConditions, conditions } = options;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const queries: any[] = [];

	// Get IDs of conditions to keep
	const newConditionIds = new Set(conditions.filter(c => c.id > 0).map(c => c.id));

	// 1. Delete removed conditions (cascade will handle type-specific tables)
	const conditionsToDelete = originalConditions.filter(c => !newConditionIds.has(c.id));
	for (const condition of conditionsToDelete) {
		queries.push({
			sql: `DELETE FROM custom_format_conditions WHERE id = ${condition.id}`,
			parameters: [],
			query: {} as never
		});
	}

	// 2. Handle new conditions (negative IDs from drafts)
	const newConditions = conditions.filter(c => c.id < 0);
	for (const condition of newConditions) {
		// Insert the base condition
		queries.push({
			sql: `INSERT INTO custom_format_conditions (custom_format_id, name, type, arr_type, negate, required) VALUES (${formatId}, '${esc(condition.name)}', '${esc(condition.type)}', 'all', ${condition.negate ? 1 : 0}, ${condition.required ? 1 : 0})`,
			parameters: [],
			query: {} as never
		});

		// Insert type-specific data
		const valueSqls = generateConditionValueSql(condition.name, formatName, condition);
		for (const sql of valueSqls) {
			queries.push({
				sql,
				parameters: [],
				query: {} as never
			});
		}
	}

	// 3. Handle updated conditions (positive IDs)
	const existingConditions = conditions.filter(c => c.id > 0);
	for (const condition of existingConditions) {
		const original = originalConditions.find(c => c.id === condition.id);
		if (!original) continue;

		// Check if base condition changed
		const baseChanged =
			original.name !== condition.name ||
			original.type !== condition.type ||
			original.negate !== condition.negate ||
			original.required !== condition.required;

		if (baseChanged) {
			// Update base condition
			queries.push({
				sql: `UPDATE custom_format_conditions SET name = '${esc(condition.name)}', type = '${esc(condition.type)}', negate = ${condition.negate ? 1 : 0}, required = ${condition.required ? 1 : 0} WHERE id = ${condition.id}`,
				parameters: [],
				query: {} as never
			});
		}

		// For type-specific data, if type changed, delete old and insert new
		// If type same but values changed, also delete and insert
		const typeChanged = original.type !== condition.type;
		const valuesChanged = !deepEquals(
			getConditionValues(original),
			getConditionValues(condition)
		);

		if (typeChanged || valuesChanged) {
			// Delete old type-specific data based on original type
			const deleteTable = getTypeTable(original.type);
			if (deleteTable) {
				queries.push({
					sql: `DELETE FROM ${deleteTable} WHERE custom_format_condition_id = ${condition.id}`,
					parameters: [],
					query: {} as never
				});
			}

			// Insert new type-specific data
			// Use a direct ID lookup since this is an existing condition
			const valueSqls = generateConditionValueSqlById(condition.id, condition);
			for (const sql of valueSqls) {
				queries.push({
					sql,
					parameters: [],
					query: {} as never
				});
			}
		}
	}

	// If no changes, return success without writing
	if (queries.length === 0) {
		return { success: true };
	}

	// Log what's being changed
	await logger.info(`Save conditions for custom format "${formatName}"`, {
		source: 'CustomFormat',
		meta: {
			formatId,
			deleted: conditionsToDelete.length,
			added: newConditions.length,
			updated: existingConditions.length
		}
	});

	// Write the operation
	const result = await writeOperation({
		databaseId,
		layer,
		description: `update-conditions-${formatName}`,
		queries,
		metadata: {
			operation: 'update',
			entity: 'custom_format_conditions',
			name: formatName
		}
	});

	return result;
}

/**
 * Get the type-specific table name for a condition type
 */
function getTypeTable(type: string): string | null {
	switch (type) {
		case 'release_title':
		case 'release_group':
		case 'edition':
			return 'condition_patterns';
		case 'language':
			return 'condition_languages';
		case 'source':
			return 'condition_sources';
		case 'resolution':
			return 'condition_resolutions';
		case 'quality_modifier':
			return 'condition_quality_modifiers';
		case 'release_type':
			return 'condition_release_types';
		case 'indexer_flag':
			return 'condition_indexer_flags';
		case 'size':
			return 'condition_sizes';
		case 'year':
			return 'condition_years';
		default:
			return null;
	}
}

/**
 * Get condition values for comparison
 */
function getConditionValues(condition: ConditionData): unknown {
	return {
		patterns: condition.patterns,
		languages: condition.languages,
		sources: condition.sources,
		resolutions: condition.resolutions,
		qualityModifiers: condition.qualityModifiers,
		releaseTypes: condition.releaseTypes,
		indexerFlags: condition.indexerFlags,
		size: condition.size,
		years: condition.years
	};
}

/**
 * Generate SQL for condition values using direct ID (for existing conditions)
 */
function generateConditionValueSqlById(conditionId: number, condition: ConditionData): string[] {
	const sqls: string[] = [];

	switch (condition.type) {
		case 'release_title':
		case 'release_group':
		case 'edition':
			if (condition.patterns && condition.patterns.length > 0) {
				for (const pattern of condition.patterns) {
					sqls.push(`INSERT INTO condition_patterns (custom_format_condition_id, regular_expression_id) VALUES (${conditionId}, ${pattern.id})`);
				}
			}
			break;

		case 'language':
			if (condition.languages && condition.languages.length > 0) {
				for (const lang of condition.languages) {
					sqls.push(`INSERT INTO condition_languages (custom_format_condition_id, language_id, except_language) VALUES (${conditionId}, ${lang.id}, ${lang.except ? 1 : 0})`);
				}
			}
			break;

		case 'source':
			if (condition.sources && condition.sources.length > 0) {
				for (const source of condition.sources) {
					sqls.push(`INSERT INTO condition_sources (custom_format_condition_id, source) VALUES (${conditionId}, '${esc(source)}')`);
				}
			}
			break;

		case 'resolution':
			if (condition.resolutions && condition.resolutions.length > 0) {
				for (const res of condition.resolutions) {
					sqls.push(`INSERT INTO condition_resolutions (custom_format_condition_id, resolution) VALUES (${conditionId}, '${esc(res)}')`);
				}
			}
			break;

		case 'quality_modifier':
			if (condition.qualityModifiers && condition.qualityModifiers.length > 0) {
				for (const qm of condition.qualityModifiers) {
					sqls.push(`INSERT INTO condition_quality_modifiers (custom_format_condition_id, quality_modifier) VALUES (${conditionId}, '${esc(qm)}')`);
				}
			}
			break;

		case 'release_type':
			if (condition.releaseTypes && condition.releaseTypes.length > 0) {
				for (const rt of condition.releaseTypes) {
					sqls.push(`INSERT INTO condition_release_types (custom_format_condition_id, release_type) VALUES (${conditionId}, '${esc(rt)}')`);
				}
			}
			break;

		case 'indexer_flag':
			if (condition.indexerFlags && condition.indexerFlags.length > 0) {
				for (const flag of condition.indexerFlags) {
					sqls.push(`INSERT INTO condition_indexer_flags (custom_format_condition_id, flag) VALUES (${conditionId}, '${esc(flag)}')`);
				}
			}
			break;

		case 'size':
			if (condition.size) {
				const minBytes = condition.size.minBytes ?? 'NULL';
				const maxBytes = condition.size.maxBytes ?? 'NULL';
				sqls.push(`INSERT INTO condition_sizes (custom_format_condition_id, min_bytes, max_bytes) VALUES (${conditionId}, ${minBytes}, ${maxBytes})`);
			}
			break;

		case 'year':
			if (condition.years) {
				const minYear = condition.years.minYear ?? 'NULL';
				const maxYear = condition.years.maxYear ?? 'NULL';
				sqls.push(`INSERT INTO condition_years (custom_format_condition_id, min_year, max_year) VALUES (${conditionId}, ${minYear}, ${maxYear})`);
			}
			break;
	}

	return sqls;
}

/**
 * Deep equality check
 */
function deepEquals(a: unknown, b: unknown): boolean {
	if (a === b) return true;
	if (typeof a !== typeof b) return false;
	if (a === null || b === null) return a === b;

	if (Array.isArray(a) && Array.isArray(b)) {
		if (a.length !== b.length) return false;
		return a.every((item, i) => deepEquals(item, b[i]));
	}

	if (typeof a === 'object' && typeof b === 'object') {
		const aObj = a as Record<string, unknown>;
		const bObj = b as Record<string, unknown>;
		const aKeys = Object.keys(aObj);
		const bKeys = Object.keys(bObj);
		if (aKeys.length !== bKeys.length) return false;
		return aKeys.every((key) => deepEquals(aObj[key], bObj[key]));
	}

	return false;
}
