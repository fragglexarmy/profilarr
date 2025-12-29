/**
 * Get a single regular expression by ID
 */

import type { PCDCache } from '../../cache.ts';
import type { RegularExpressionTableRow } from './types.ts';

/**
 * Get a regular expression by ID with its tags
 */
export async function get(cache: PCDCache, id: number): Promise<RegularExpressionTableRow | null> {
	const db = cache.kb;

	// Get the regular expression
	const regex = await db
		.selectFrom('regular_expressions')
		.select(['id', 'name', 'pattern', 'regex101_id', 'description'])
		.where('id', '=', id)
		.executeTakeFirst();

	if (!regex) {
		return null;
	}

	// Get tags for this regular expression
	const tags = await db
		.selectFrom('regular_expression_tags as ret')
		.innerJoin('tags as t', 't.id', 'ret.tag_id')
		.select(['t.id', 't.name'])
		.where('ret.regular_expression_id', '=', id)
		.execute();

	return {
		...regex,
		tags
	};
}
