/**
 * Update a regular expression operation
 */

import type { PCDCache } from '$pcd/index.ts';
import { writeOperation, type OperationLayer } from '$pcd/index.ts';
import type { RegularExpressionWithTags } from '$shared/pcd/display.ts';
import { logger } from '$logger/logger.ts';

interface UpdateRegularExpressionInput {
	name: string;
	pattern: string;
	tags: string[];
	description: string | null;
	regex101Id: string | null;
}

interface UpdateRegularExpressionOptions {
	databaseId: number;
	cache: PCDCache;
	layer: OperationLayer;
	/** The current regular expression data (for value guards) */
	current: RegularExpressionWithTags;
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

	if (input.name !== current.name) {
		const existing = await db
			.selectFrom('regular_expressions')
			.where((eb) => eb(eb.fn('lower', [eb.ref('name')]), '=', input.name.toLowerCase()))
			.select('name')
			.executeTakeFirst();

		if (existing) {
			await logger.warn(`Duplicate regular expression name "${input.name}"`, {
				source: 'RegularExpression',
				meta: { databaseId, name: input.name }
			});
			throw new Error(`A regular expression with name "${input.name}" already exists`);
		}
	}

	const rawCurrentDescription = current.description;
	const normalizedCurrentDescription = rawCurrentDescription ?? '';
	const normalizedNextDescription = input.description?.trim() ?? '';
	const rawCurrentRegex101Id = current.regex101_id;
	const normalizedCurrentRegex101Id = rawCurrentRegex101Id ?? '';
	const normalizedNextRegex101Id = input.regex101Id?.trim() ?? '';
	const descriptionChanged = normalizedCurrentDescription !== normalizedNextDescription;
	const regex101Changed = normalizedCurrentRegex101Id !== normalizedNextRegex101Id;

	// 1. Update the regular expression with value guards
	const setValues: Record<string, unknown> = {};

	if (current.name !== input.name) {
		setValues.name = input.name;
	}
	if (current.pattern !== input.pattern) {
		setValues.pattern = input.pattern;
	}
	if (descriptionChanged) {
		setValues.description = normalizedNextDescription === '' ? null : normalizedNextDescription;
	}
	if (regex101Changed) {
		setValues.regex101_id = normalizedNextRegex101Id === '' ? null : normalizedNextRegex101Id;
	}

	let updateRegex = db
		.updateTable('regular_expressions')
		.set(setValues)
		// Value guard - ensure this is the regex we expect
		.where('name', '=', current.name);

	if (current.pattern !== input.pattern) {
		updateRegex = updateRegex.where('pattern', '=', current.pattern);
	}
	if (descriptionChanged) {
		if (rawCurrentDescription === null) {
			updateRegex = updateRegex.where('description', 'is', null);
		} else {
			updateRegex = updateRegex.where('description', '=', rawCurrentDescription);
		}
	}
	if (regex101Changed) {
		if (rawCurrentRegex101Id === null) {
			updateRegex = updateRegex.where('regex101_id', 'is', null);
		} else {
			updateRegex = updateRegex.where('regex101_id', '=', rawCurrentRegex101Id);
		}
	}

	if (Object.keys(setValues).length > 0) {
		const updateRegexQuery = updateRegex.compile();
		queries.push(updateRegexQuery);
	}

	// 2. Handle tag changes
	const currentTagNames = current.tags.map((t) => t.name);
	const newTagNames = Array.from(new Set(input.tags.map((tag) => tag.trim()).filter(Boolean)));
	const tagParentNames = Array.from(new Set([current.name, input.name]));
	const tagParentInClause = tagParentNames.map((name) => `'${esc(name)}'`).join(', ');

	// Tags to remove
	const tagsToRemove = currentTagNames.filter((t) => !newTagNames.includes(t));
	for (const tagName of tagsToRemove) {
		const removeTag = {
			sql: `DELETE FROM regular_expression_tags WHERE regular_expression_name IN (${tagParentInClause}) AND tag_name = '${esc(tagName)}'`,
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

		// Link tag to regular expression
		const linkTag = {
			sql: `INSERT INTO regular_expression_tags (regular_expression_name, tag_name)
SELECT name, '${esc(tagName)}' FROM regular_expressions WHERE name IN (${tagParentInClause}) LIMIT 1`,
			parameters: [],
			query: {} as never
		};

		queries.push(linkTag);
	}

	if (queries.length === 0) {
		return { success: true };
	}

	// Log what's being changed (before the write)
	const changes: Record<string, { from: unknown; to: unknown }> = {};

	if (current.name !== input.name) {
		changes.name = { from: current.name, to: input.name };
	}
	if (current.pattern !== input.pattern) {
		changes.pattern = { from: current.pattern, to: input.pattern };
	}
	if (descriptionChanged) {
		changes.description = {
			from: rawCurrentDescription ?? null,
			to: normalizedNextDescription === '' ? null : normalizedNextDescription
		};
	}
	if (regex101Changed) {
		changes.regex101Id = {
			from: rawCurrentRegex101Id ?? null,
			to: normalizedNextRegex101Id === '' ? null : normalizedNextRegex101Id
		};
	}
	if (tagsToAdd.length > 0 || tagsToRemove.length > 0) {
		changes.tags = { from: currentTagNames, to: newTagNames };
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
	const changedFields = Object.keys(changes);
	const desiredState: Record<string, unknown> = {};
	if (changes.name) {
		desiredState.name = { from: current.name, to: input.name };
	}
	if (changes.pattern) {
		desiredState.pattern = { from: current.pattern, to: input.pattern };
	}
	if (changes.description) {
		desiredState.description = {
			from: rawCurrentDescription ?? null,
			to: normalizedNextDescription === '' ? null : normalizedNextDescription
		};
	}
	if (changes.regex101Id) {
		desiredState.regex101_id = {
			from: rawCurrentRegex101Id ?? null,
			to: normalizedNextRegex101Id === '' ? null : normalizedNextRegex101Id
		};
	}
	if (changes.tags) {
		desiredState.tags = { add: tagsToAdd, remove: tagsToRemove };
	}

	const result = await writeOperation({
		databaseId,
		layer,
		description: `update-regular-expression-${input.name}`,
		queries,
		desiredState,
		metadata: {
			operation: 'update',
			entity: 'regular_expression',
			name: input.name,
			...(isRename && { previousName: current.name }),
			stableKey: { key: 'regular_expression_name', value: current.name },
			changedFields,
			summary: 'Update regular expression',
			title: `Update regular expression "${input.name}"`
		}
	});

	return result;
}
