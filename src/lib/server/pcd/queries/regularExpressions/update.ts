/**
 * Update a regular expression operation
 */

import type { PCDCache } from '../../cache.ts';
import { writeOperation, type OperationLayer } from '../../writer.ts';
import type { RegularExpressionTableRow } from './types.ts';
import { logger } from '$logger/logger.ts';

export interface UpdateRegularExpressionInput {
	name: string;
	pattern: string;
	tags: string[];
	description: string | null;
	regex101Id: string | null;
}

export interface UpdateRegularExpressionOptions {
	databaseId: number;
	cache: PCDCache;
	layer: OperationLayer;
	/** The current regular expression data (for value guards) */
	current: RegularExpressionTableRow;
	/** The new values */
	input: UpdateRegularExpressionInput;
}

/**
 * Escape a string for SQL
 */
function esc(value: string): string {
	return value.replace(/'/g, "''");
}

/**
 * Update a regular expression by writing an operation to the specified layer
 * Uses value guards to detect conflicts with upstream changes
 */
export async function update(options: UpdateRegularExpressionOptions) {
	const { databaseId, cache, layer, current, input } = options;
	const db = cache.kb;

	const queries = [];

	// 1. Update the regular expression with value guards
	const updateRegex = db
		.updateTable('regular_expressions')
		.set({
			name: input.name,
			pattern: input.pattern,
			description: input.description,
			regex101_id: input.regex101Id
		})
		.where('id', '=', current.id)
		// Value guards - ensure current values match what we expect
		.where('name', '=', current.name)
		.where('pattern', '=', current.pattern)
		.compile();

	queries.push(updateRegex);

	// 2. Handle tag changes
	const currentTagNames = current.tags.map(t => t.name);
	const newTagNames = input.tags;

	// Tags to remove
	const tagsToRemove = currentTagNames.filter(t => !newTagNames.includes(t));
	for (const tagName of tagsToRemove) {
		const removeTag = {
			sql: `DELETE FROM regular_expression_tags WHERE regular_expression_name = '${esc(current.name)}' AND tag_name = '${esc(tagName)}'`,
			parameters: [],
			query: {} as never
		};
		queries.push(removeTag);
	}

	// Tags to add
	const tagsToAdd = newTagNames.filter(t => !currentTagNames.includes(t));
	for (const tagName of tagsToAdd) {
		// Insert tag if not exists
		const insertTag = db
			.insertInto('tags')
			.values({ name: tagName })
			.onConflict((oc) => oc.column('name').doNothing())
			.compile();

		queries.push(insertTag);

		// Link tag to regular expression
		// Use input.name since the regex might have been renamed
		const regexName = input.name !== current.name ? input.name : current.name;
		const linkTag = {
			sql: `INSERT INTO regular_expression_tags (regular_expression_name, tag_name) VALUES ('${esc(regexName)}', '${esc(tagName)}')`,
			parameters: [],
			query: {} as never
		};

		queries.push(linkTag);
	}

	// Log what's being changed (before the write)
	const changes: Record<string, { from: unknown; to: unknown }> = {};

	if (current.name !== input.name) {
		changes.name = { from: current.name, to: input.name };
	}
	if (current.pattern !== input.pattern) {
		changes.pattern = { from: current.pattern, to: input.pattern };
	}
	if (current.description !== input.description) {
		changes.description = { from: current.description, to: input.description };
	}
	if (current.regex101_id !== input.regex101Id) {
		changes.regex101Id = { from: current.regex101_id, to: input.regex101Id };
	}
	if (tagsToAdd.length > 0 || tagsToRemove.length > 0) {
		changes.tags = { from: currentTagNames, to: input.tags };
	}

	await logger.info(`Save regular expression "${input.name}"`, {
		source: 'RegularExpression',
		meta: {
			id: current.id,
			changes
		}
	});

	// Write the operation with metadata
	// Include previousName if this is a rename
	const isRename = input.name !== current.name;

	const result = await writeOperation({
		databaseId,
		layer,
		description: `update-regular-expression-${input.name}`,
		queries,
		metadata: {
			operation: 'update',
			entity: 'regular_expression',
			name: input.name,
			...(isRename && { previousName: current.name })
		}
	});

	return result;
}
