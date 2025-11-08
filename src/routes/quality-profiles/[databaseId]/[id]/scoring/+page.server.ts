import { error } from '@sveltejs/kit';
import type { ServerLoad } from '@sveltejs/kit';
import { pcdManager } from '$pcd/pcd.ts';
import * as qualityProfileQueries from '$pcd/queries/qualityProfiles/index.ts';

export const load: ServerLoad = async ({ params, isDataRequest }) => {
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

	// Always return synchronous data at top level, stream the heavy data
	if (isDataRequest) {
		// Client-side navigation - stream the data
		return {
			loaded: true, // Synchronous data to enable instant navigation
			streamed: {
				scoring: qualityProfileQueries.scoring(cache, currentDatabaseId, profileId)
			}
		};
	} else {
		// Initial page load - await the data for SEO
		const scoringData = await qualityProfileQueries.scoring(cache, currentDatabaseId, profileId);
		return {
			loaded: true,
			streamed: {
				scoring: Promise.resolve(scoringData)
			}
		};
	}
};
