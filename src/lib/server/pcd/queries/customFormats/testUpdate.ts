/**
 * Update a custom format test operation
 */

import { writeOperation, type OperationLayer } from '../../writer.ts';
import type { CustomFormatTest } from './types.ts';

export interface UpdateTestInput {
	title: string;
	type: 'movie' | 'series';
	should_match: boolean;
	description: string | null;
}

export interface UpdateTestOptions {
	databaseId: number;
	layer: OperationLayer;
	formatName: string;
	/** The current test data (for value guards) */
	current: CustomFormatTest;
	/** The new values */
	input: UpdateTestInput;
}

/**
 * Escape a string for SQL
 */
function esc(value: string): string {
	return value.replace(/'/g, "''");
}

/**
 * Update a custom format test by writing an operation to the specified layer
 * Uses value guards to detect conflicts with upstream changes
 */
export async function updateTest(options: UpdateTestOptions) {
	const { databaseId, layer, formatName, current, input } = options;

	const descriptionValue = input.description ? `'${esc(input.description)}'` : 'NULL';

	// Update with value guards on the current values
	// We match on id AND verify the current values haven't changed
	const updateTest = {
		sql: `UPDATE custom_format_tests SET title = '${esc(input.title)}', type = '${esc(input.type)}', should_match = ${input.should_match ? 1 : 0}, description = ${descriptionValue} WHERE custom_format_name = '${esc(formatName)}' AND title = '${esc(current.title)}' AND type = '${esc(current.type)}'`,
		parameters: [],
		query: {} as never
	};

	// Track if title changed for metadata
	const isTitleChange = input.title !== current.title;

	// Write the operation
	const result = await writeOperation({
		databaseId,
		layer,
		description: `update-test-${formatName}`,
		queries: [updateTest],
		metadata: {
			operation: 'update',
			entity: 'custom_format_test',
			name: `${formatName}: ${input.title.substring(0, 30)}`,
			...(isTitleChange && { previousName: `${formatName}: ${current.title.substring(0, 30)}` })
		}
	});

	return result;
}
