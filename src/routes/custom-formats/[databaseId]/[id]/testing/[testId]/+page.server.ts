import { error, redirect, fail } from '@sveltejs/kit';
import type { ServerLoad, Actions } from '@sveltejs/kit';
import { pcdManager } from '$pcd/pcd.ts';
import { canWriteToBase, type OperationLayer } from '$pcd/writer.ts';
import * as customFormatQueries from '$pcd/queries/customFormats/index.ts';

export const load: ServerLoad = async ({ params }) => {
	const { databaseId, id, testId } = params;

	if (!databaseId || !id || !testId) {
		throw error(400, 'Missing required parameters');
	}

	const currentDatabaseId = parseInt(databaseId, 10);
	const formatId = parseInt(id, 10);
	const currentTestId = parseInt(testId, 10);

	if (isNaN(currentDatabaseId) || isNaN(formatId) || isNaN(currentTestId)) {
		throw error(400, 'Invalid parameters');
	}

	const cache = pcdManager.getCache(currentDatabaseId);
	if (!cache) {
		throw error(500, 'Database cache not available');
	}

	const format = await customFormatQueries.getById(cache, formatId);
	if (!format) {
		throw error(404, 'Custom format not found');
	}

	const test = await customFormatQueries.getTestById(cache, currentTestId);
	if (!test) {
		throw error(404, 'Test not found');
	}

	return {
		format,
		test,
		canWriteToBase: canWriteToBase(currentDatabaseId)
	};
};

export const actions: Actions = {
	update: async ({ request, params }) => {
		const { databaseId, id, testId } = params;

		if (!databaseId || !id || !testId) {
			return fail(400, { error: 'Missing required parameters' });
		}

		const currentDatabaseId = parseInt(databaseId, 10);
		const currentTestId = parseInt(testId, 10);

		if (isNaN(currentDatabaseId) || isNaN(currentTestId)) {
			return fail(400, { error: 'Invalid parameters' });
		}

		const cache = pcdManager.getCache(currentDatabaseId);
		if (!cache) {
			return fail(500, { error: 'Database cache not available' });
		}

		// Get current test for value guards
		const current = await customFormatQueries.getTestById(cache, currentTestId);
		if (!current) {
			return fail(404, { error: 'Test not found' });
		}

		const formData = await request.formData();

		const title = formData.get('title') as string;
		const type = formData.get('type') as 'movie' | 'series';
		const shouldMatch = formData.get('shouldMatch') === '1';
		const description = (formData.get('description') as string) || null;
		const formatName = formData.get('formatName') as string;
		const layer = (formData.get('layer') as OperationLayer) || 'user';

		if (!title?.trim()) {
			return fail(400, { error: 'Title is required' });
		}

		if (type !== 'movie' && type !== 'series') {
			return fail(400, { error: 'Invalid type' });
		}

		if (!formatName) {
			return fail(400, { error: 'Format name is required' });
		}

		// Check layer permission
		if (layer === 'base' && !canWriteToBase(currentDatabaseId)) {
			return fail(403, { error: 'Cannot write to base layer without personal access token' });
		}

		const result = await customFormatQueries.updateTest({
			databaseId: currentDatabaseId,
			layer,
			formatName,
			current,
			input: {
				title: title.trim(),
				type,
				should_match: shouldMatch,
				description: description?.trim() || null
			}
		});

		if (!result.success) {
			return fail(500, { error: result.error || 'Failed to update test' });
		}

		throw redirect(303, `/custom-formats/${databaseId}/${id}/testing`);
	},

	delete: async ({ request, params }) => {
		const { databaseId, id, testId } = params;

		if (!databaseId || !id || !testId) {
			return fail(400, { error: 'Missing required parameters' });
		}

		const currentDatabaseId = parseInt(databaseId, 10);
		const currentTestId = parseInt(testId, 10);

		if (isNaN(currentDatabaseId) || isNaN(currentTestId)) {
			return fail(400, { error: 'Invalid parameters' });
		}

		const cache = pcdManager.getCache(currentDatabaseId);
		if (!cache) {
			return fail(500, { error: 'Database cache not available' });
		}

		// Get current test for value guards
		const current = await customFormatQueries.getTestById(cache, currentTestId);
		if (!current) {
			return fail(404, { error: 'Test not found' });
		}

		const formData = await request.formData();
		const formatName = formData.get('formatName') as string;
		const layer = (formData.get('layer') as OperationLayer) || 'user';

		if (!formatName) {
			return fail(400, { error: 'Format name is required' });
		}

		// Check layer permission
		if (layer === 'base' && !canWriteToBase(currentDatabaseId)) {
			return fail(403, { error: 'Cannot write to base layer without personal access token' });
		}

		const result = await customFormatQueries.deleteTest({
			databaseId: currentDatabaseId,
			layer,
			formatName,
			current
		});

		if (!result.success) {
			return fail(500, { error: result.error || 'Failed to delete test' });
		}

		throw redirect(303, `/custom-formats/${databaseId}/${id}/testing`);
	}
};
