/**
 * Delete a custom format operation
 */

import type { PCDCache } from '$pcd/index.ts';
import { writeOperation, type OperationLayer } from '$pcd/index.ts';

interface DeleteCustomFormatOptions {
	databaseId: number;
	cache: PCDCache;
	layer: OperationLayer;
	/** The custom format ID */
	formatId: number;
	/** The custom format name (for metadata and value guards) */
	formatName: string;
}

/**
 * Escape a string for SQL
 */
function esc(value: string): string {
	return value.replace(/'/g, "''");
}

/**
 * Delete a custom format by writing an operation to the specified layer
 * Cascading deletes handle conditions, tests, and tag links
 */
export async function remove(options: DeleteCustomFormatOptions) {
	const { databaseId, cache, layer, formatName } = options;
	const db = cache.kb;

	const queries = [];

	const formatRow = await db
		.selectFrom('custom_formats')
		.select(['description', 'include_in_rename'])
		.where('name', '=', formatName)
		.executeTakeFirst();

	const conditionCountRow = await db
		.selectFrom('custom_format_conditions')
		.select(db.fn.count<number>('custom_format_name').as('count'))
		.where('custom_format_name', '=', formatName)
		.executeTakeFirst();
	const testCountRow = await db
		.selectFrom('custom_format_tests')
		.select(db.fn.count<number>('custom_format_name').as('count'))
		.where('custom_format_name', '=', formatName)
		.executeTakeFirst();
	const tagCountRow = await db
		.selectFrom('custom_format_tags')
		.select(db.fn.count<number>('custom_format_name').as('count'))
		.where('custom_format_name', '=', formatName)
		.executeTakeFirst();

	// Delete the custom format with value guards
	// Foreign key cascades will handle:
	// - custom_format_tags
	// - custom_format_conditions (and their type-specific tables)
	// - custom_format_tests
	const deleteFormat = db
		.deleteFrom('custom_formats')
		// Value guard - ensure this is the format we expect
		.where('name', '=', formatName)
		.compile();

	queries.push(deleteFormat);

	// Write the operation
	const result = await writeOperation({
		databaseId,
		layer,
		description: `delete-custom-format-${formatName}`,
		queries,
		desiredState: {
			deleted: true,
			name: formatName,
			description: formatRow?.description ?? null,
			include_in_rename: formatRow?.include_in_rename === 1,
			counts: {
				conditions: conditionCountRow?.count ?? 0,
				tests: testCountRow?.count ?? 0,
				tags: tagCountRow?.count ?? 0
			}
		},
		metadata: {
			operation: 'delete',
			entity: 'custom_format',
			name: formatName,
			stableKey: { key: 'custom_format_name', value: formatName },
			changedFields: ['deleted'],
			summary: 'Delete custom format',
			title: `Delete custom format "${formatName}"`
		}
	});

	return result;
}
