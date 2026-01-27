/**
 * Create a custom format test operation
 */

import { writeOperation, type OperationLayer } from '$pcd/index.ts';

interface CreateTestInput {
	title: string;
	type: 'movie' | 'series';
	should_match: boolean;
	description: string | null;
}

interface CreateTestOptions {
	databaseId: number;
	layer: OperationLayer;
	formatName: string;
	input: CreateTestInput;
}

/**
 * Escape a string for SQL
 */
function esc(value: string): string {
	return value.replace(/'/g, "''");
}

/**
 * Create a custom format test by writing an operation to the specified layer
 */
export async function createTest(options: CreateTestOptions) {
	const { databaseId, layer, formatName, input } = options;

	// Build raw SQL using cf() helper to resolve custom format by name
	const descriptionValue = input.description ? `'${esc(input.description)}'` : 'NULL';

	const insertTest = {
		sql: `INSERT INTO custom_format_tests (custom_format_name, title, type, should_match, description) VALUES ('${esc(formatName)}', '${esc(input.title)}', '${esc(input.type)}', ${input.should_match ? 1 : 0}, ${descriptionValue})`,
		parameters: [],
		query: {} as never
	};

	// Write the operation
	const result = await writeOperation({
		databaseId,
		layer,
		description: `create-test-${formatName}`,
		queries: [insertTest],
		metadata: {
			operation: 'create',
			entity: 'custom_format_test',
			name: `${formatName}: ${input.title.substring(0, 30)}`
		}
	});

	return result;
}
