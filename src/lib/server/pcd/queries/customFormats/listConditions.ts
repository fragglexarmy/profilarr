/**
 * Custom format condition list query
 */

import type { PCDCache } from '../../cache.ts';

/** Condition item for list display */
export interface ConditionListItem {
	id: number;
	name: string;
	type: string;
	negate: boolean;
	required: boolean;
}

/**
 * Get all conditions for a custom format (basic info for list display)
 */
export async function listConditions(
	cache: PCDCache,
	formatId: number
): Promise<ConditionListItem[]> {
	const db = cache.kb;

	const conditions = await db
		.selectFrom('custom_format_conditions')
		.select(['id', 'name', 'type', 'negate', 'required'])
		.where('custom_format_id', '=', formatId)
		.orderBy('id')
		.execute();

	return conditions.map((c) => ({
		id: c.id,
		name: c.name,
		type: c.type,
		negate: c.negate === 1,
		required: c.required === 1
	}));
}
