import { error, redirect, fail } from '@sveltejs/kit';
import type { ServerLoad, Actions } from '@sveltejs/kit';
import { pcdManager } from '$pcd/pcd.ts';
import { canWriteToBase } from '$pcd/writer.ts';
import * as customFormatQueries from '$pcd/queries/customFormats/index.ts';
import * as regularExpressionQueries from '$pcd/queries/regularExpressions/index.ts';
import * as languageQueries from '$pcd/queries/languages.ts';
import type { OperationLayer } from '$pcd/writer.ts';
import type { ConditionData } from '$pcd/queries/customFormats/index.ts';

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

	// Get current database
	const currentDatabase = pcdManager.getById(currentDatabaseId);
	if (!currentDatabase) {
		throw error(404, 'Database not found');
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
		currentDatabase,
		format,
		conditions,
		availablePatterns: patterns.map((p) => ({ id: p.id, name: p.name, pattern: p.pattern })),
		availableLanguages: languages,
		canWriteToBase: canWriteToBase(currentDatabaseId)
	};
};

export const actions: Actions = {
	update: async ({ request, params }) => {
		const { databaseId, id } = params;

		if (!databaseId || !id) {
			return fail(400, { error: 'Missing parameters' });
		}

		const currentDatabaseId = parseInt(databaseId, 10);
		const formatId = parseInt(id, 10);

		if (isNaN(currentDatabaseId) || isNaN(formatId)) {
			return fail(400, { error: 'Invalid parameters' });
		}

		const cache = pcdManager.getCache(currentDatabaseId);
		if (!cache) {
			return fail(500, { error: 'Database cache not available' });
		}

		// Get current format and conditions
		const format = await customFormatQueries.getById(cache, formatId);
		if (!format) {
			return fail(404, { error: 'Custom format not found' });
		}

		const originalConditions = await customFormatQueries.getConditionsForEvaluation(cache, formatId);

		const formData = await request.formData();

		// Parse form data
		const conditionsJson = formData.get('conditions') as string;
		const layer = (formData.get('layer') as OperationLayer) || 'user';

		let conditions: ConditionData[] = [];
		try {
			conditions = JSON.parse(conditionsJson || '[]');
		} catch {
			return fail(400, { error: 'Invalid conditions format' });
		}

		// Check layer permission
		if (layer === 'base' && !canWriteToBase(currentDatabaseId)) {
			return fail(403, { error: 'Cannot write to base layer without personal access token' });
		}

		// Update conditions
		const result = await customFormatQueries.updateConditions({
			databaseId: currentDatabaseId,
			cache,
			layer,
			formatId,
			formatName: format.name,
			originalConditions,
			conditions
		});

		if (!result.success) {
			return fail(500, { error: result.error || 'Failed to update conditions' });
		}

		throw redirect(303, `/custom-formats/${databaseId}/${id}/conditions`);
	}
};
