/**
 * Update custom format general information
 */

import type { PCDCache } from '../../cache.ts';
import { writeOperation, type OperationLayer } from '../../writer.ts';
import type { CustomFormatGeneral } from './types.ts';
import { logger } from '$logger/logger.ts';

export interface UpdateGeneralInput {
	name: string;
	description: string;
	includeInRename: boolean;
	tags: string[];
}

export interface UpdateGeneralOptions {
	databaseId: number;
	cache: PCDCache;
	layer: OperationLayer;
	/** The current custom format data (for value guards) */
	current: CustomFormatGeneral;
	/** The new values */
	input: UpdateGeneralInput;
}

/**
 * Escape a string for SQL
 */
function esc(value: string): string {
	return value.replace(/'/g, "''");
}

/**
 * Update custom format general information
 */
export async function updateGeneral(options: UpdateGeneralOptions) {
	const { databaseId, cache, layer, current, input } = options;
	const db = cache.kb;

	const queries = [];

	// 1. Update the custom format with value guards
	const updateFormat = db
		.updateTable('custom_formats')
		.set({
			name: input.name,
			description: input.description || null,
			include_in_rename: input.includeInRename ? 1 : 0
		})
		.where('id', '=', current.id)
		// Value guards - ensure current values match what we expect
		.where('name', '=', current.name)
		.compile();

	queries.push(updateFormat);

	// 2. Handle tag changes
	const currentTagNames = current.tags.map(t => t.name);
	const newTagNames = input.tags;

	// Tags to remove
	const tagsToRemove = currentTagNames.filter(t => !newTagNames.includes(t));
	for (const tagName of tagsToRemove) {
		const removeTag = {
			sql: `DELETE FROM custom_format_tags WHERE custom_format_id = (SELECT id FROM custom_formats WHERE name = '${esc(current.name)}') AND tag_id = tag('${esc(tagName)}')`,
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

		// Link tag to custom format
		// Use input.name for lookup since the format might have been renamed
		const formatName = input.name !== current.name ? input.name : current.name;
		const linkTag = {
			sql: `INSERT INTO custom_format_tags (custom_format_id, tag_id) VALUES ((SELECT id FROM custom_formats WHERE name = '${esc(formatName)}'), tag('${esc(tagName)}'))`,
			parameters: [],
			query: {} as never
		};

		queries.push(linkTag);
	}

	// Log what's being changed
	const changes: Record<string, { from: unknown; to: unknown }> = {};

	if (current.name !== input.name) {
		changes.name = { from: current.name, to: input.name };
	}
	if (current.description !== input.description) {
		changes.description = { from: current.description, to: input.description };
	}
	if (current.include_in_rename !== input.includeInRename) {
		changes.includeInRename = { from: current.include_in_rename, to: input.includeInRename };
	}
	if (tagsToAdd.length > 0 || tagsToRemove.length > 0) {
		changes.tags = { from: currentTagNames, to: input.tags };
	}

	await logger.info(`Save custom format "${input.name}"`, {
		source: 'CustomFormat',
		meta: {
			id: current.id,
			changes
		}
	});

	// Write the operation with metadata
	const isRename = input.name !== current.name;

	const result = await writeOperation({
		databaseId,
		layer,
		description: `update-custom-format-${input.name}`,
		queries,
		metadata: {
			operation: 'update',
			entity: 'custom_format',
			name: input.name,
			...(isRename && { previousName: current.name })
		}
	});

	return result;
}
