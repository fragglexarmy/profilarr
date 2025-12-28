/**
 * Delete a delay profile operation
 */

import type { PCDCache } from '../../cache.ts';
import { writeOperation, type OperationLayer } from '../../writer.ts';
import type { DelayProfileTableRow } from './types.ts';

export interface DeleteDelayProfileOptions {
	databaseId: number;
	cache: PCDCache;
	layer: OperationLayer;
	/** The current profile data (for value guards) */
	current: DelayProfileTableRow;
}

/**
 * Escape a string for SQL
 */
function esc(value: string): string {
	return value.replace(/'/g, "''");
}

/**
 * Delete a delay profile by writing an operation to the specified layer
 * Uses value guards to detect conflicts with upstream changes
 */
export async function remove(options: DeleteDelayProfileOptions) {
	const { databaseId, cache, layer, current } = options;
	const db = cache.kb;

	const queries = [];

	// 1. Delete tag links first (foreign key constraint)
	for (const tag of current.tags) {
		const removeTagLink = {
			sql: `DELETE FROM delay_profile_tags WHERE delay_profile_id = dp('${esc(current.name)}') AND tag_id = tag('${esc(tag.name)}')`,
			parameters: [],
			query: {} as never
		};
		queries.push(removeTagLink);
	}

	// 2. Delete the delay profile with value guards
	const deleteProfile = db
		.deleteFrom('delay_profiles')
		.where('id', '=', current.id)
		// Value guards - ensure this is the profile we expect
		.where('name', '=', current.name)
		.where('preferred_protocol', '=', current.preferred_protocol)
		.compile();

	queries.push(deleteProfile);

	// Write the operation
	const result = await writeOperation({
		databaseId,
		layer,
		description: `delete-delay-profile-${current.name}`,
		queries,
		metadata: {
			operation: 'delete',
			entity: 'delay_profile',
			name: current.name
		}
	});

	return result;
}
