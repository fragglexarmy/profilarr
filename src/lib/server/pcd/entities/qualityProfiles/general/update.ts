/**
 * Update quality profile general information and languages
 */

import type { PCDCache } from '$pcd/index.ts';
import { writeOperation, type OperationLayer } from '$pcd/index.ts';
import type { QualityProfileGeneral } from '$shared/pcd/display.ts';
import { logger } from '$logger/logger.ts';

// ============================================================================
// Input types
// ============================================================================

interface UpdateGeneralInput {
	name: string;
	description: string;
	tags: string[];
	language: string | null;
}

interface UpdateGeneralOptions {
	databaseId: number;
	cache: PCDCache;
	layer: OperationLayer;
	current: QualityProfileGeneral;
	input: UpdateGeneralInput;
}

interface UpdateLanguagesInput {
	languageName: string | null;
	type: 'must' | 'only' | 'not' | 'simple';
}

interface UpdateLanguagesOptions {
	databaseId: number;
	cache: PCDCache;
	layer: OperationLayer;
	profileName: string;
	input: UpdateLanguagesInput;
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Escape a string for SQL
 */
function esc(value: string): string {
	return value.replace(/'/g, "''");
}

/**
 * Update quality profile general information
 */
export async function updateGeneral(options: UpdateGeneralOptions) {
	const { databaseId, cache, layer, current, input } = options;
	const db = cache.kb;

	const queries = [];

	if (input.name !== current.name) {
		const existing = await db
			.selectFrom('quality_profiles')
			.where((eb) => eb(eb.fn('lower', [eb.ref('name')]), '=', input.name.toLowerCase()))
			.select('name')
			.executeTakeFirst();

		if (existing) {
			await logger.warn(`Duplicate quality profile name "${input.name}"`, {
				source: 'QualityProfile',
				meta: { databaseId, name: input.name }
			});
			throw new Error(`A quality profile with name "${input.name}" already exists`);
		}
	}

	// 1. Update the quality profile with value guards
	const setValues: Record<string, unknown> = {};

	if (current.name !== input.name) {
		setValues.name = input.name;
	}
	if (current.description !== input.description) {
		setValues.description = input.description || null;
	}

	let updateProfile = db
		.updateTable('quality_profiles')
		.set(setValues)
		// Value guards - ensure current values match what we expect
		.where('name', '=', current.name);

	if (current.description !== input.description) {
		if (current.description === null) {
			updateProfile = updateProfile.where('description', 'is', null);
		} else {
			updateProfile = updateProfile.where('description', '=', current.description);
		}
	}

	if (Object.keys(setValues).length > 0) {
		const updateProfileQuery = updateProfile.compile();
		queries.push(updateProfileQuery);
	}

	const profileNameForTags = input.name !== current.name ? input.name : current.name;

	// 2. Handle tag changes
	const currentTagNames = current.tags.map((t) => t.name);
	const newTagNames = Array.from(new Set(input.tags.map((tag) => tag.trim()).filter(Boolean)));

	// Tags to remove
	const tagsToRemove = currentTagNames.filter((t) => !newTagNames.includes(t));
	if (tagsToRemove.length > 0) {
		for (const tagName of tagsToRemove) {
			const removeTag = {
				sql: `DELETE FROM quality_profile_tags WHERE quality_profile_name = '${esc(profileNameForTags)}' AND tag_name = '${esc(tagName)}'`,
				parameters: [],
				query: {} as never
			};
			queries.push(removeTag);
		}
	}

	// Tags to add
	const tagsToAdd = newTagNames.filter((t) => !currentTagNames.includes(t));
	if (tagsToAdd.length > 0) {
		for (const tagName of tagsToAdd) {
			// Insert tag if not exists
			const insertTag = db
				.insertInto('tags')
				.values({ name: tagName })
				.onConflict((oc) => oc.column('name').doNothing())
				.compile();

			queries.push(insertTag);

			// Link tag to quality profile
			const linkTag = {
				sql: `INSERT INTO quality_profile_tags (quality_profile_name, tag_name) VALUES ('${esc(profileNameForTags)}', '${esc(tagName)}')`,
				parameters: [],
				query: {} as never
			};

			queries.push(linkTag);
		}
	}

	// 3. Handle language changes
	const profileNameForLanguage = input.name !== current.name ? input.name : current.name;
	const languageChanged = current.language !== input.language;

	if (languageChanged) {
		// Delete existing language only if it matches expected current value
		if (current.language !== null) {
			const deleteLanguage = {
				sql: `DELETE FROM quality_profile_languages WHERE quality_profile_name = '${esc(profileNameForLanguage)}' AND language_name = '${esc(current.language)}' AND type = 'simple'`,
				parameters: [],
				query: {} as never
			};
			queries.push(deleteLanguage);
		}

		// Insert new language if one is selected, but only if no simple language exists
		if (input.language !== null) {
			const insertLanguage = {
				sql: `INSERT INTO quality_profile_languages (quality_profile_name, language_name, type)
SELECT '${esc(profileNameForLanguage)}', '${esc(input.language)}', 'simple'
WHERE NOT EXISTS (
  SELECT 1 FROM quality_profile_languages
  WHERE quality_profile_name = '${esc(profileNameForLanguage)}' AND type = 'simple'
)`,
				parameters: [],
				query: {} as never
			};
			queries.push(insertLanguage);
		}
	}

	// Log what's being changed
	const changes: Record<string, { from: unknown; to: unknown }> = {};

	if (current.name !== input.name) {
		changes.name = { from: current.name, to: input.name };
	}
	if (current.description !== input.description) {
		changes.description = { from: current.description, to: input.description };
	}
	if (tagsToAdd.length > 0 || tagsToRemove.length > 0) {
		changes.tags = { from: currentTagNames, to: newTagNames };
	}
	if (current.language !== input.language) {
		changes.language = { from: current.language, to: input.language };
	}

	await logger.info(`Save quality profile "${input.name}"`, {
		source: 'QualityProfile',
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
			from: current.description ?? null,
			to: input.description ?? null
		};
	}
	if (changes.tags) {
		desiredState.tags = { add: tagsToAdd, remove: tagsToRemove };
	}
	if (changes.language) {
		desiredState.language = {
			from: current.language ?? null,
			to: input.language ?? null,
			type: 'simple'
		};
	}

	const result = await writeOperation({
		databaseId,
		layer,
		description: `update-quality-profile-${input.name}`,
		queries,
		desiredState,
		metadata: {
			operation: 'update',
			entity: 'quality_profile',
			name: input.name,
			...(isRename && { previousName: current.name }),
			stableKey: { key: 'quality_profile_name', value: current.name },
			changedFields,
			summary: 'Update quality profile',
			title: `Update quality profile "${input.name}"`
		}
	});

	return result;
}

/**
 * Update quality profile language configuration
 */
export async function updateLanguages(options: UpdateLanguagesOptions) {
	const { databaseId, cache, layer, profileName, input } = options;
	const db = cache.kb;

	const queries = [];

	// 1. Delete existing languages for this profile
	const deleteLanguages = db
		.deleteFrom('quality_profile_languages')
		.where('quality_profile_name', '=', profileName)
		.compile();
	queries.push(deleteLanguages);

	// 2. Insert new language if one is selected
	if (input.languageName !== null) {
		const insertLanguage = {
			sql: `INSERT INTO quality_profile_languages (quality_profile_name, language_name, type) VALUES ('${profileName.replace(/'/g, "''")}', '${input.languageName.replace(/'/g, "''")}', '${input.type}')`,
			parameters: [],
			query: {} as never
		};
		queries.push(insertLanguage);
	}

	await logger.info(`Save quality profile languages "${profileName}"`, {
		source: 'QualityProfile',
		meta: {
			profileName,
			languageName: input.languageName,
			type: input.type
		}
	});

	// Write the operation
	const result = await writeOperation({
		databaseId,
		layer,
		description: `update-quality-profile-languages-${profileName}`,
		queries,
		metadata: {
			operation: 'update',
			entity: 'quality_profile',
			name: profileName
		}
	});

	return result;
}
