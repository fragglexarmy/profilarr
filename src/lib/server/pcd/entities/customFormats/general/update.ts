/**
 * Update custom format general information
 */

import type { PCDCache } from '$pcd/index.ts';
import { writeOperation, type OperationLayer } from '$pcd/index.ts';
import type { CustomFormatGeneral } from '$shared/pcd/display.ts';
import { uuid } from '$shared/utils/uuid.ts';
import { logger } from '$logger/logger.ts';
import type { CompiledQuery } from 'kysely';

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
	const isRename = input.name !== current.name;
	const groupId = isRename ? uuid() : undefined;

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

	const rawCurrentDescription = current.description;
	const normalizedCurrentDescription = rawCurrentDescription ?? '';
	const normalizedNextDescription = input.description?.trim() ?? '';
	const descriptionChanged = normalizedCurrentDescription !== normalizedNextDescription;

	// 1. Update the custom format with value guards
	const setValues: Record<string, unknown> = {};

	if (current.name !== input.name) {
		setValues.name = input.name;
	}
	if (descriptionChanged) {
		setValues.description = normalizedNextDescription === '' ? null : normalizedNextDescription;
	}
	if (current.include_in_rename !== input.includeInRename) {
		setValues.include_in_rename = input.includeInRename ? 1 : 0;
	}

	let updateFormat = db
		.updateTable('custom_formats')
		.set(setValues)
		// Value guards - ensure current values match what we expect
		.where('name', '=', current.name);

	if (descriptionChanged) {
		if (rawCurrentDescription === null) {
			updateFormat = updateFormat.where('description', 'is', null);
		} else {
			updateFormat = updateFormat.where('description', '=', rawCurrentDescription);
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

	const dependentScores = isRename
		? await db
				.selectFrom('quality_profile_custom_formats')
				.select(['quality_profile_name', 'custom_format_name', 'arr_type', 'score'])
				.where('custom_format_name', '=', current.name)
				.execute()
		: [];

	const dependentOps: Array<{
		profileName: string;
		queries: CompiledQuery[];
		customFormatScores: Array<{
			custom_format_name: string;
			arr_type: string;
			from: number | null;
			to: number | null;
		}>;
	}> = [];

	if (dependentScores.length > 0) {
		const scoresByProfile = new Map<
			string,
			Array<{ custom_format_name: string; arr_type: string; score: number }>
		>();

		for (const score of dependentScores) {
			if (!scoresByProfile.has(score.quality_profile_name)) {
				scoresByProfile.set(score.quality_profile_name, []);
			}
			scoresByProfile.get(score.quality_profile_name)!.push({
				custom_format_name: score.custom_format_name,
				arr_type: score.arr_type,
				score: score.score
			});
		}

		for (const [profileName, scores] of scoresByProfile.entries()) {
			const scoreQueries = scores.map((score) =>
				db
					.updateTable('quality_profile_custom_formats')
					.set({ custom_format_name: input.name })
					.where('quality_profile_name', '=', profileName)
					.where('custom_format_name', '=', current.name)
					.where('arr_type', '=', score.arr_type)
					.where('score', '=', score.score)
					.compile()
			);

			const customFormatScores = scores.flatMap((score) => [
				{
					custom_format_name: current.name,
					arr_type: score.arr_type,
					from: score.score,
					to: null
				},
				{
					custom_format_name: input.name,
					arr_type: score.arr_type,
					from: null,
					to: score.score
				}
			]);

			dependentOps.push({ profileName, queries: scoreQueries, customFormatScores });
		}
	}

	// Log what's being changed
	const changes: Record<string, { from: unknown; to: unknown }> = {};

	if (current.name !== input.name) {
		changes.name = { from: current.name, to: input.name };
	}
	if (descriptionChanged) {
		changes.description = {
			from: rawCurrentDescription ?? null,
			to: normalizedNextDescription === '' ? null : normalizedNextDescription
		};
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
	const changedFields = Object.keys(changes);
	const desiredState: Record<string, unknown> = {};
	if (changes.name) {
		desiredState.name = { from: current.name, to: input.name };
	}
	if (changes.description) {
		desiredState.description = {
			from: rawCurrentDescription ?? null,
			to: normalizedNextDescription === '' ? null : normalizedNextDescription
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
			...(groupId && { groupId }),
			changedFields,
			summary: 'Update custom format',
			title: `Update custom format "${input.name}"`
		}
	});

	if (!result.success || !isRename || dependentScores.length === 0 || !groupId) {
		return result;
	}
	if (dependentOps.length === 0) {
		return result;
	}

	for (const op of dependentOps) {
		const scoreResult = await writeOperation({
			databaseId,
			layer,
			description: `update-quality-profile-scoring-${op.profileName}`,
			queries: op.queries,
			desiredState: {
				custom_format_scores: op.customFormatScores
			},
			metadata: {
				operation: 'update',
				entity: 'quality_profile',
				name: op.profileName,
				stableKey: { key: 'quality_profile_name', value: op.profileName },
				groupId,
				generated: true,
				dependsOn: [
					{
						entity: 'custom_format',
						key: 'custom_format_name',
						value: input.name
					}
				],
				changedFields: ['custom_format_scores'],
				summary: 'Update quality profile scoring',
				title: `Update scoring for quality profile "${op.profileName}"`
			}
		});

		if (!scoreResult.success) {
			return scoreResult;
		}
	}

	return result;
}
