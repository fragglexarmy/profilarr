/**
 * Delete a regular expression operation
 */

import type { PCDCache } from '$pcd/index.ts';
import { writeOperation, type OperationLayer } from '$pcd/index.ts';
import type { RegularExpressionWithTags } from '$shared/pcd/display.ts';

interface DeleteRegularExpressionOptions {
	databaseId: number;
	cache: PCDCache;
	layer: OperationLayer;
	/** The current regular expression data (for value guards) */
	current: RegularExpressionWithTags;
}

/**
 * Escape a string for SQL
 */
function esc(value: string): string {
	return value.replace(/'/g, "''");
}

/**
 * Delete a regular expression by writing an operation to the specified layer
 * Uses value guards to detect conflicts with upstream changes
 */
export async function remove(options: DeleteRegularExpressionOptions) {
	const { databaseId, cache, layer, current } = options;
	const db = cache.kb;

	const queries = [];

	// 1. Delete tag links first (foreign key constraint)
	for (const tag of current.tags) {
		const removeTagLink = {
			sql: `DELETE FROM regular_expression_tags WHERE regular_expression_name = '${esc(current.name)}' AND tag_name = '${esc(tag.name)}'`,
			parameters: [],
			query: {} as never
		};
		queries.push(removeTagLink);
	}

	// 2. Delete the regular expression with value guards
	const deleteRegex = db
		.deleteFrom('regular_expressions')
		// Value guards - ensure this is the regex we expect
		.where('name', '=', current.name)
		.where('pattern', '=', current.pattern)
		.compile();

	queries.push(deleteRegex);

	// Write the operation
	const result = await writeOperation({
		databaseId,
		layer,
		description: `delete-regular-expression-${current.name}`,
		queries,
		desiredState: {
			deleted: true,
			name: current.name,
			pattern: current.pattern,
			description: current.description ?? null,
			regex101_id: current.regex101_id ?? null,
			tags: current.tags.map((tag) => tag.name)
		},
		metadata: {
			operation: 'delete',
			entity: 'regular_expression',
			name: current.name,
			stableKey: { key: 'regular_expression_name', value: current.name },
			changedFields: ['deleted'],
			summary: 'Delete regular expression',
			title: `Delete regular expression "${current.name}"`
		}
	});

	return result;
}
