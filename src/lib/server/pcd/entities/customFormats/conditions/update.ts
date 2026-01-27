/**
 * Update custom format conditions
 *
 * This mutation handles:
 * - Deleting removed conditions
 * - Inserting new conditions (from drafts with negative IDs)
 * - Updating existing conditions
 */

import type { PCDCache } from '$pcd/cache.ts';
import { writeOperation, type OperationLayer } from '$pcd/writer.ts';
import type { ConditionData } from '$shared/pcd/display.ts';
import { logger } from '$logger/logger.ts';

interface UpdateConditionsOptions {
	databaseId: number;
	cache: PCDCache;
	layer: OperationLayer;
	/** The custom format name */
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
 * Generate SQL to insert a condition's type-specific data using name-based FKs
 */
function generateConditionValueSql(
	formatName: string,
	conditionName: string,
	condition: ConditionData
): string[] {
	const sqls: string[] = [];

	switch (condition.type) {
		case 'release_title':
		case 'release_group':
		case 'edition':
			if (condition.patterns && condition.patterns.length > 0) {
				for (const pattern of condition.patterns) {
					sqls.push(
						`INSERT INTO condition_patterns (custom_format_name, condition_name, regular_expression_name) VALUES ('${esc(formatName)}', '${esc(conditionName)}', '${esc(pattern.name)}')`
					);
				}
			}
			break;

		case 'language':
			if (condition.languages && condition.languages.length > 0) {
				for (const lang of condition.languages) {
					sqls.push(
						`INSERT INTO condition_languages (custom_format_name, condition_name, language_name, except_language) VALUES ('${esc(formatName)}', '${esc(conditionName)}', '${esc(lang.name)}', ${lang.except ? 1 : 0})`
					);
				}
			}
			break;

		case 'source':
			if (condition.sources && condition.sources.length > 0) {
				for (const source of condition.sources) {
					sqls.push(
						`INSERT INTO condition_sources (custom_format_name, condition_name, source) VALUES ('${esc(formatName)}', '${esc(conditionName)}', '${esc(source)}')`
					);
				}
			}
			break;

		case 'resolution':
			if (condition.resolutions && condition.resolutions.length > 0) {
				for (const res of condition.resolutions) {
					sqls.push(
						`INSERT INTO condition_resolutions (custom_format_name, condition_name, resolution) VALUES ('${esc(formatName)}', '${esc(conditionName)}', '${esc(res)}')`
					);
				}
			}
			break;

		case 'quality_modifier':
			if (condition.qualityModifiers && condition.qualityModifiers.length > 0) {
				for (const qm of condition.qualityModifiers) {
					sqls.push(
						`INSERT INTO condition_quality_modifiers (custom_format_name, condition_name, quality_modifier) VALUES ('${esc(formatName)}', '${esc(conditionName)}', '${esc(qm)}')`
					);
				}
			}
			break;

		case 'release_type':
			if (condition.releaseTypes && condition.releaseTypes.length > 0) {
				for (const rt of condition.releaseTypes) {
					sqls.push(
						`INSERT INTO condition_release_types (custom_format_name, condition_name, release_type) VALUES ('${esc(formatName)}', '${esc(conditionName)}', '${esc(rt)}')`
					);
				}
			}
			break;

		case 'indexer_flag':
			if (condition.indexerFlags && condition.indexerFlags.length > 0) {
				for (const flag of condition.indexerFlags) {
					sqls.push(
						`INSERT INTO condition_indexer_flags (custom_format_name, condition_name, flag) VALUES ('${esc(formatName)}', '${esc(conditionName)}', '${esc(flag)}')`
					);
				}
			}
			break;

		case 'size':
			if (condition.size) {
				const minBytes = condition.size.minBytes ?? 'NULL';
				const maxBytes = condition.size.maxBytes ?? 'NULL';
				sqls.push(
					`INSERT INTO condition_sizes (custom_format_name, condition_name, min_bytes, max_bytes) VALUES ('${esc(formatName)}', '${esc(conditionName)}', ${minBytes}, ${maxBytes})`
				);
			}
			break;

		case 'year':
			if (condition.years) {
				const minYear = condition.years.minYear ?? 'NULL';
				const maxYear = condition.years.maxYear ?? 'NULL';
				sqls.push(
					`INSERT INTO condition_years (custom_format_name, condition_name, min_year, max_year) VALUES ('${esc(formatName)}', '${esc(conditionName)}', ${minYear}, ${maxYear})`
				);
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
 * 2. Find conditions to add (new conditions not in original)
 * 3. Find conditions to update (names that exist in both)
 */
export async function updateConditions(options: UpdateConditionsOptions) {
	const { databaseId, layer, formatName, originalConditions, conditions } = options;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const queries: any[] = [];

	// Get names of conditions to keep
	const newConditionNames = new Set(conditions.map((c) => c.name));
	const originalConditionNames = new Set(originalConditions.map((c) => c.name));

	// 1. Delete removed conditions (cascade will handle type-specific tables)
	const conditionsToDelete = originalConditions.filter((c) => !newConditionNames.has(c.name));
	for (const condition of conditionsToDelete) {
		queries.push({
			sql: `DELETE FROM custom_format_conditions WHERE custom_format_name = '${esc(formatName)}' AND name = '${esc(condition.name)}'`,
			parameters: [],
			query: {} as never
		});
	}

	// 2. Handle new conditions (names not in original)
	const newConditions = conditions.filter((c) => !originalConditionNames.has(c.name));
	for (const condition of newConditions) {
		// Insert the base condition
		queries.push({
			sql: `INSERT INTO custom_format_conditions (custom_format_name, name, type, arr_type, negate, required) VALUES ('${esc(formatName)}', '${esc(condition.name)}', '${esc(condition.type)}', '${condition.arrType ?? 'all'}', ${condition.negate ? 1 : 0}, ${condition.required ? 1 : 0})`,
			parameters: [],
			query: {} as never
		});

		// Insert type-specific data
		const valueSqls = generateConditionValueSql(formatName, condition.name, condition);
		for (const sql of valueSqls) {
			queries.push({
				sql,
				parameters: [],
				query: {} as never
			});
		}
	}

	// 3. Handle updated conditions (names that exist in both)
	const existingConditions = conditions.filter((c) => originalConditionNames.has(c.name));
	for (const condition of existingConditions) {
		const original = originalConditions.find((c) => c.name === condition.name);
		if (!original) continue;

		// Check if base condition changed
		const baseChanged =
			original.type !== condition.type ||
			original.arrType !== condition.arrType ||
			original.negate !== condition.negate ||
			original.required !== condition.required;

		if (baseChanged) {
			// Update base condition
			queries.push({
				sql: `UPDATE custom_format_conditions SET type = '${esc(condition.type)}', arr_type = '${condition.arrType ?? 'all'}', negate = ${condition.negate ? 1 : 0}, required = ${condition.required ? 1 : 0} WHERE custom_format_name = '${esc(formatName)}' AND name = '${esc(condition.name)}'`,
				parameters: [],
				query: {} as never
			});
		}

		// For type-specific data, if type changed, delete old and insert new
		// If type same but values changed, also delete and insert
		const typeChanged = original.type !== condition.type;
		const valuesChanged = !deepEquals(getConditionValues(original), getConditionValues(condition));

		if (typeChanged || valuesChanged) {
			// Delete old type-specific data based on original type
			const deleteTable = getTypeTable(original.type);
			if (deleteTable) {
				queries.push({
					sql: `DELETE FROM ${deleteTable} WHERE custom_format_name = '${esc(formatName)}' AND condition_name = '${esc(condition.name)}'`,
					parameters: [],
					query: {} as never
				});
			}

			// Insert new type-specific data
			const valueSqls = generateConditionValueSql(formatName, condition.name, condition);
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
			formatName,
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
