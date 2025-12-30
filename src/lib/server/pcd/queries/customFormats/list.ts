/**
 * Custom format list queries
 */

import type { PCDCache } from '../../cache.ts';
import type { Tag } from '../../types.ts';
import type { CustomFormatTableRow, ConditionRef } from './types.ts';

/**
 * Get custom formats with full data for table/card views
 */
export async function list(cache: PCDCache): Promise<CustomFormatTableRow[]> {
	const db = cache.kb;

	// 1. Get all custom formats
	const formats = await db
		.selectFrom('custom_formats')
		.select(['id', 'name', 'description'])
		.orderBy('name')
		.execute();

	if (formats.length === 0) return [];

	const formatIds = formats.map((f) => f.id);

	// 2. Get all tags for all custom formats
	const allTags = await db
		.selectFrom('custom_format_tags as cft')
		.innerJoin('tags as t', 't.id', 'cft.tag_id')
		.select([
			'cft.custom_format_id',
			't.id as tag_id',
			't.name as tag_name',
			't.created_at as tag_created_at'
		])
		.where('cft.custom_format_id', 'in', formatIds)
		.orderBy('cft.custom_format_id')
		.orderBy('t.name')
		.execute();

	// 3. Get all conditions for all custom formats
	const allConditions = await db
		.selectFrom('custom_format_conditions')
		.select(['id', 'custom_format_id', 'name', 'required', 'negate'])
		.where('custom_format_id', 'in', formatIds)
		.orderBy('custom_format_id')
		.orderBy('name')
		.execute();

	// 4. Get test counts for all custom formats
	const testCounts = await db
		.selectFrom('custom_format_tests')
		.select(['custom_format_id'])
		.select((eb) => eb.fn.count('id').as('count'))
		.where('custom_format_id', 'in', formatIds)
		.groupBy('custom_format_id')
		.execute();

	// Build test count map
	const testCountMap = new Map<number, number>();
	for (const tc of testCounts) {
		testCountMap.set(tc.custom_format_id, Number(tc.count));
	}

	// Build tags map
	const tagsMap = new Map<number, Tag[]>();
	for (const tag of allTags) {
		if (!tagsMap.has(tag.custom_format_id)) {
			tagsMap.set(tag.custom_format_id, []);
		}
		tagsMap.get(tag.custom_format_id)!.push({
			id: tag.tag_id,
			name: tag.tag_name,
			created_at: tag.tag_created_at
		});
	}

	// Build conditions map
	const conditionsMap = new Map<number, ConditionRef[]>();
	for (const condition of allConditions) {
		if (!conditionsMap.has(condition.custom_format_id)) {
			conditionsMap.set(condition.custom_format_id, []);
		}
		conditionsMap.get(condition.custom_format_id)!.push({
			id: condition.id,
			name: condition.name,
			required: condition.required === 1,
			negate: condition.negate === 1
		});
	}

	// Build the final result
	return formats.map((format) => ({
		id: format.id,
		name: format.name,
		description: format.description,
		tags: tagsMap.get(format.id) || [],
		conditions: conditionsMap.get(format.id) || [],
		testCount: testCountMap.get(format.id) || 0
	}));
}
