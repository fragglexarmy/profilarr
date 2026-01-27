/**
 * Delete a quality profile operation
 */

import type { PCDCache } from '$pcd/index.ts';
import { writeOperation, type OperationLayer } from '$pcd/index.ts';

// ============================================================================
// Input types
// ============================================================================

interface RemoveQualityProfileOptions {
	databaseId: number;
	cache: PCDCache;
	layer: OperationLayer;
	profileId: number;
	profileName: string;
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Delete a quality profile by writing an operation to the specified layer
 */
export async function remove(options: RemoveQualityProfileOptions) {
	const { databaseId, cache, layer, profileId, profileName } = options;
	const db = cache.kb;

	const queries = [];

	// Delete associated tags
	const deleteProfileTags = db
		.deleteFrom('quality_profile_tags')
		.where('quality_profile_name', '=', profileName)
		.compile();

	queries.push(deleteProfileTags);

	// Delete associated languages
	const deleteProfileLanguages = db
		.deleteFrom('quality_profile_languages')
		.where('quality_profile_name', '=', profileName)
		.compile();

	queries.push(deleteProfileLanguages);

	// Delete associated qualities
	const deleteProfileQualities = db
		.deleteFrom('quality_profile_qualities')
		.where('quality_profile_name', '=', profileName)
		.compile();

	queries.push(deleteProfileQualities);

	// Delete associated custom formats
	const deleteProfileCustomFormats = db
		.deleteFrom('quality_profile_custom_formats')
		.where('quality_profile_name', '=', profileName)
		.compile();

	queries.push(deleteProfileCustomFormats);

	// Delete quality groups for this profile
	const deleteQualityGroups = db
		.deleteFrom('quality_groups')
		.where('quality_profile_name', '=', profileName)
		.compile();

	queries.push(deleteQualityGroups);

	// Delete the quality profile itself
	const deleteProfile = db
		.deleteFrom('quality_profiles')
		.where('id', '=', profileId)
		.where('name', '=', profileName)
		.compile();

	queries.push(deleteProfile);

	// Write the operation
	const result = await writeOperation({
		databaseId,
		layer,
		description: `delete-quality-profile-${profileName}`,
		queries,
		metadata: {
			operation: 'delete',
			entity: 'quality_profile',
			name: profileName
		}
	});

	return result;
}
