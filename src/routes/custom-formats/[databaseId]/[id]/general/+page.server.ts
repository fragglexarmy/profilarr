import { error } from '@sveltejs/kit';
import type { ServerLoad } from '@sveltejs/kit';
import { pcdManager } from '$pcd/pcd.ts';
import * as customFormatQueries from '$pcd/queries/customFormats/index.ts';

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

	// Parse and validate the format ID
	const formatId = parseInt(id, 10);
	if (isNaN(formatId)) {
		throw error(400, 'Invalid format ID');
	}

	// Get the cache for the database
	const cache = pcdManager.getCache(currentDatabaseId);
	if (!cache) {
		throw error(500, 'Database cache not available');
	}

	// Get custom format basic info
	const format = await customFormatQueries.getById(cache, formatId);
	if (!format) {
		throw error(404, 'Custom format not found');
	}

	return {
		format
	};
};
