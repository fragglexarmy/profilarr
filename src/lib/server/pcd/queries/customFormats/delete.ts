/**
 * Delete a custom format operation
 */

import type { PCDCache } from '../../cache.ts';
import { writeOperation, type OperationLayer } from '../../writer.ts';

export interface DeleteCustomFormatOptions {
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
	const { databaseId, cache, layer, formatId, formatName } = options;
	const db = cache.kb;

	const queries = [];

	// Delete the custom format with value guards
	// Foreign key cascades will handle:
	// - custom_format_tags
	// - custom_format_conditions (and their type-specific tables)
	// - custom_format_tests
	const deleteFormat = db
		.deleteFrom('custom_formats')
		.where('id', '=', formatId)
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
		metadata: {
			operation: 'delete',
			entity: 'custom_format',
			name: formatName
		}
	});

	return result;
}
