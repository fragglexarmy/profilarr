import { error } from '@sveltejs/kit';
import type { ServerLoad } from '@sveltejs/kit';
import { pcdManager } from '$pcd/pcd.ts';
import * as qualityProfileQueries from '$pcd/queries/qualityProfiles/index.ts';
import * as languageQueries from '$pcd/queries/languages.ts';

export const load: ServerLoad = async ({ params }) => {
	const { databaseId, id } = params;

	// Validate params exist
	if (!databaseId || !id) {
		throw error(400, 'Missing required parameters');
	}

	// Parse and validate the database ID
	const currentDatabaseId = parseInt(databaseId, 10);
	if (isNaN(currentDatabaseId)) {
		throw error(400, 'Invalid database ID');
	}

	// Parse and validate the profile ID
	const profileId = parseInt(id, 10);
	if (isNaN(profileId)) {
		throw error(400, 'Invalid profile ID');
	}

	// Get the cache for the database
	const cache = pcdManager.getCache(currentDatabaseId);
	if (!cache) {
		throw error(500, 'Database cache not available');
	}

	// Load languages for the quality profile
	const languagesData = await qualityProfileQueries.languages(cache, profileId);

	// Load all available languages
	const availableLanguages = languageQueries.list(cache);

	return {
		languages: languagesData.languages,
		availableLanguages
	};
};
