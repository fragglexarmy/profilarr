/**
 * Create a custom format operation
 */

import type { PCDCache } from '$pcd/index.ts';
import { writeOperation, type OperationLayer } from '$pcd/index.ts';
import { logger } from '$logger/logger.ts';

interface CreateCustomFormatInput {
	name: string;
	description: string | null;
	includeInRename: boolean;
	tags: string[];
}

interface CreateCustomFormatOptions {
	databaseId: number;
	cache: PCDCache;
	layer: OperationLayer;
	input: CreateCustomFormatInput;
}

/**
 * Create a custom format by writing an operation to the specified layer
 */
export async function create(options: CreateCustomFormatOptions) {
	const { databaseId, cache, layer, input } = options;
	const db = cache.kb;

	const queries = [];

	const existing = await db
		.selectFrom('custom_formats')
		.where((eb) => eb(eb.fn('lower', [eb.ref('name')]), '=', input.name.toLowerCase()))
		.select('name')
		.executeTakeFirst();

	if (existing) {
		await logger.warn(`Duplicate custom format name "${input.name}"`, {
			source: 'CustomFormat',
			meta: { databaseId, name: input.name }
		});
		throw new Error(`A custom format with name "${input.name}" already exists`);
	}

	// 1. Insert the custom format
	const insertFormat = db
		.insertInto('custom_formats')
		.values({
			name: input.name,
			description: input.description,
			include_in_rename: input.includeInRename ? 1 : 0
		})
		.compile();

	queries.push(insertFormat);

	// 2. Insert tags (create if not exist, then link)
	for (const tagName of input.tags) {
		// Insert tag if not exists
		const insertTag = db
			.insertInto('tags')
			.values({ name: tagName })
			.onConflict((oc) => oc.column('name').doNothing())
			.compile();

		queries.push(insertTag);

		// Link tag to custom format using name-based FKs
		const linkTag = {
			sql: `INSERT INTO custom_format_tags (custom_format_name, tag_name) VALUES ('${input.name.replace(/'/g, "''")}', '${tagName.replace(/'/g, "''")}')`,
			parameters: [],
			query: {} as never
		};

		queries.push(linkTag);
	}

	// Write the operation
	const result = await writeOperation({
		databaseId,
		layer,
		description: `create-custom-format-${input.name}`,
		queries,
		metadata: {
			operation: 'create',
			entity: 'custom_format',
			name: input.name
		}
	});

	return result;
}
