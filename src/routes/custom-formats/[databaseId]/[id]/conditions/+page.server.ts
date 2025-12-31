import { error } from '@sveltejs/kit';
import type { ServerLoad } from '@sveltejs/kit';
import { pcdManager } from '$pcd/pcd.ts';
import * as customFormatQueries from '$pcd/queries/customFormats/index.ts';
import * as regularExpressionQueries from '$pcd/queries/regularExpressions/index.ts';
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

	// Get custom format basic info, conditions, and available options
	const [format, conditions, patterns, languages] = await Promise.all([
		customFormatQueries.getById(cache, formatId),
		customFormatQueries.getConditionsForEvaluation(cache, formatId),
		regularExpressionQueries.list(cache),
		languageQueries.list(cache)
	]);

	if (!format) {
		throw error(404, 'Custom format not found');
	}

	return {
		format,
		conditions,
		availablePatterns: patterns.map((p) => ({ id: p.id, name: p.name, pattern: p.pattern })),
		availableLanguages: languages
	};
};
