/**
 * Create a regular expression operation
 */

import type { PCDCache } from '../../cache.ts';
import { writeOperation, type OperationLayer } from '../../writer.ts';

export interface CreateRegularExpressionInput {
	name: string;
	pattern: string;
	tags: string[];
	description: string | null;
	regex101Id: string | null;
}

export interface CreateRegularExpressionOptions {
	databaseId: number;
	cache: PCDCache;
	layer: OperationLayer;
	input: CreateRegularExpressionInput;
}

/**
 * Create a regular expression by writing an operation to the specified layer
 */
export async function create(options: CreateRegularExpressionOptions) {
	const { databaseId, cache, layer, input } = options;
	const db = cache.kb;

	const queries = [];

	// 1. Insert the regular expression
	const insertRegex = db
		.insertInto('regular_expressions')
		.values({
			name: input.name,
			pattern: input.pattern,
			description: input.description,
			regex101_id: input.regex101Id
		})
		.compile();

	queries.push(insertRegex);

	// 2. Insert tags (create if not exist, then link)
	for (const tagName of input.tags) {
		// Insert tag if not exists
		const insertTag = db
			.insertInto('tags')
			.values({ name: tagName })
			.onConflict((oc) => oc.column('name').doNothing())
			.compile();

		queries.push(insertTag);

		// Link tag to regular expression using helper functions
		const linkTag = {
			sql: `INSERT INTO regular_expression_tags (regular_expression_id, tag_id) VALUES ((SELECT id FROM regular_expressions WHERE name = '${input.name.replace(/'/g, "''")}'), tag('${tagName.replace(/'/g, "''")}'))`,
			parameters: [],
			query: {} as never
		};

		queries.push(linkTag);
	}

	// Write the operation
	const result = await writeOperation({
		databaseId,
		layer,
		description: `create-regular-expression-${input.name}`,
		queries,
		metadata: {
			operation: 'create',
			entity: 'regular_expression',
			name: input.name
		}
	});

	return result;
}
