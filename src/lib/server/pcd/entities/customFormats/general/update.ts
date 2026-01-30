/**
 * Update custom format general information
 */

import type { PCDCache } from '$pcd/index.ts';
import { writeOperation, type OperationLayer } from '$pcd/index.ts';
import type { CustomFormatGeneral } from '$shared/pcd/display.ts';
import { logger } from '$logger/logger.ts';

interface UpdateGeneralInput {
	name: string;
	description: string;
	includeInRename: boolean;
	tags: string[];
}

interface UpdateGeneralOptions {
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

	if (input.name !== current.name) {
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
	}

	const currentDescription = current.description === '' ? null : current.description;
	const nextDescription = input.description === '' ? null : input.description;

	// 1. Update the custom format with value guards
	const setValues: Record<string, unknown> = {};

	if (current.name !== input.name) {
		setValues.name = input.name;
	}
	if (currentDescription !== nextDescription) {
		setValues.description = nextDescription;
	}
	if (current.include_in_rename !== input.includeInRename) {
		setValues.include_in_rename = input.includeInRename ? 1 : 0;
	}

	let updateFormat = db
		.updateTable('custom_formats')
		.set(setValues)
		// Value guards - ensure current values match what we expect
		.where('name', '=', current.name);

	if (currentDescription !== nextDescription) {
		if (currentDescription === null) {
			updateFormat = updateFormat.where('description', 'is', null);
		} else {
			updateFormat = updateFormat.where('description', '=', currentDescription);
		}
	}
	if (current.include_in_rename !== input.includeInRename) {
		updateFormat = updateFormat.where(
			'include_in_rename',
			'=',
			current.include_in_rename ? 1 : 0
		);
	}

	if (Object.keys(setValues).length > 0) {
		const updateFormatQuery = updateFormat.compile();
		queries.push(updateFormatQuery);
	}

	// 2. Handle tag changes
	const currentTagNames = current.tags.map((t) => t.name);
	const newTagNames = Array.from(new Set(input.tags.map((tag) => tag.trim()).filter(Boolean)));
	const formatNameForTags = input.name !== current.name ? input.name : current.name;

	// Tags to remove
	const tagsToRemove = currentTagNames.filter((t) => !newTagNames.includes(t));
	for (const tagName of tagsToRemove) {
		const removeTag = {
			sql: `DELETE FROM custom_format_tags WHERE custom_format_name = '${esc(formatNameForTags)}' AND tag_name = '${esc(tagName)}'`,
			parameters: [],
			query: {} as never
		};
		queries.push(removeTag);
	}

	// Tags to add
	const tagsToAdd = newTagNames.filter((t) => !currentTagNames.includes(t));
	for (const tagName of tagsToAdd) {
		// Insert tag if not exists
		const insertTag = db
			.insertInto('tags')
			.values({ name: tagName })
			.onConflict((oc) => oc.column('name').doNothing())
			.compile();

		queries.push(insertTag);

		// Link tag to custom format
		const linkTag = {
			sql: `INSERT INTO custom_format_tags (custom_format_name, tag_name) VALUES ('${esc(formatNameForTags)}', '${esc(tagName)}')`,
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
		changes.tags = { from: currentTagNames, to: newTagNames };
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
	const changedFields = Object.keys(changes);
	const desiredState: Record<string, unknown> = {};
	if (changes.name) {
		desiredState.name = { from: current.name, to: input.name };
	}
	if (changes.description) {
		desiredState.description = {
			from: currentDescription,
			to: nextDescription
		};
	}
	if (changes.includeInRename) {
		desiredState.include_in_rename = {
			from: current.include_in_rename,
			to: input.includeInRename
		};
	}
	if (changes.tags) {
		desiredState.tags = { add: tagsToAdd, remove: tagsToRemove };
	}

	const result = await writeOperation({
		databaseId,
		layer,
		description: `update-custom-format-${input.name}`,
		queries,
		desiredState,
		metadata: {
			operation: 'update',
			entity: 'custom_format',
			name: input.name,
			...(isRename && { previousName: current.name }),
			stableKey: { key: 'custom_format_name', value: current.name },
			changedFields,
			summary: 'Update custom format',
			title: `Update custom format "${input.name}"`
		}
	});

	return result;
}
