/**
 * Regular expression list queries
 */

import type { PCDCache } from '../../cache.ts';
import type { Tag } from '../../types.ts';
import type { RegularExpressionTableRow } from './types.ts';

/**
 * Get regular expressions with full data for table/card views
 */
export async function list(cache: PCDCache): Promise<RegularExpressionTableRow[]> {
	const db = cache.kb;

	// 1. Get all regular expressions
	const expressions = await db
		.selectFrom('regular_expressions')
		.select(['id', 'name', 'pattern', 'regex101_id', 'description', 'created_at', 'updated_at'])
		.orderBy('name')
		.execute();

	if (expressions.length === 0) return [];

	const expressionIds = expressions.map((e) => e.id);

	// 2. Get all tags for all expressions
	const allTags = await db
		.selectFrom('regular_expression_tags as ret')
		.innerJoin('tags as t', 't.id', 'ret.tag_id')
		.select([
			'ret.regular_expression_id',
			't.id as tag_id',
			't.name as tag_name',
			't.created_at as tag_created_at'
		])
		.where('ret.regular_expression_id', 'in', expressionIds)
		.orderBy('ret.regular_expression_id')
		.orderBy('t.name')
		.execute();

	// Build tags map
	const tagsMap = new Map<number, Tag[]>();
	for (const tag of allTags) {
		if (!tagsMap.has(tag.regular_expression_id)) {
			tagsMap.set(tag.regular_expression_id, []);
		}
		tagsMap.get(tag.regular_expression_id)!.push({
			id: tag.tag_id,
			name: tag.tag_name,
			created_at: tag.tag_created_at
		});
	}

	// Build the final result
	return expressions.map((expression) => ({
		id: expression.id,
		name: expression.name,
		pattern: expression.pattern,
		regex101_id: expression.regex101_id,
		description: expression.description,
		tags: tagsMap.get(expression.id) || [],
		created_at: expression.created_at,
		updated_at: expression.updated_at
	}));
}
