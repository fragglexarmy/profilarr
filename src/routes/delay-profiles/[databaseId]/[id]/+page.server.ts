import { error, redirect, fail } from '@sveltejs/kit';
import type { ServerLoad, Actions } from '@sveltejs/kit';
import { pcdManager } from '$pcd/pcd.ts';
import { canWriteToBase } from '$pcd/writer.ts';
import * as delayProfileQueries from '$pcd/queries/delayProfiles/index.ts';
import type { OperationLayer } from '$pcd/writer.ts';
import type { PreferredProtocol } from '$pcd/queries/delayProfiles/index.ts';
import { logger } from '$logger/logger.ts';

export const load: ServerLoad = async ({ params }) => {
	const { databaseId, id } = params;

	if (!databaseId || !id) {
		throw error(400, 'Missing parameters');
	}

	const currentDatabaseId = parseInt(databaseId, 10);
	const profileId = parseInt(id, 10);

	if (isNaN(currentDatabaseId) || isNaN(profileId)) {
		throw error(400, 'Invalid parameters');
	}

	const currentDatabase = pcdManager.getById(currentDatabaseId);
	if (!currentDatabase) {
		throw error(404, 'Database not found');
	}

	const cache = pcdManager.getCache(currentDatabaseId);
	if (!cache) {
		throw error(500, 'Database cache not available');
	}

	const delayProfile = await delayProfileQueries.get(cache, profileId);
	if (!delayProfile) {
		throw error(404, 'Delay profile not found');
	}

	return {
		currentDatabase,
		delayProfile,
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
		const profileId = parseInt(id, 10);

		if (isNaN(currentDatabaseId) || isNaN(profileId)) {
			return fail(400, { error: 'Invalid parameters' });
		}

		const cache = pcdManager.getCache(currentDatabaseId);
		if (!cache) {
			return fail(500, { error: 'Database cache not available' });
		}

		// Get current profile for value guards
		const current = await delayProfileQueries.get(cache, profileId);
		if (!current) {
			return fail(404, { error: 'Delay profile not found' });
		}

		const formData = await request.formData();

		// Parse form data
		const name = formData.get('name') as string;
		const tagsJson = formData.get('tags') as string;
		const preferredProtocol = formData.get('preferredProtocol') as PreferredProtocol;
		const usenetDelay = parseInt(formData.get('usenetDelay') as string, 10) || 0;
		const torrentDelay = parseInt(formData.get('torrentDelay') as string, 10) || 0;
		const bypassIfHighestQuality = formData.get('bypassIfHighestQuality') === 'true';
		const bypassIfAboveCfScore = formData.get('bypassIfAboveCfScore') === 'true';
		const minimumCfScore = parseInt(formData.get('minimumCfScore') as string, 10) || 0;
		const layer = (formData.get('layer') as OperationLayer) || 'user';

		// Validate
		if (!name?.trim()) {
			return fail(400, { error: 'Name is required' });
		}

		let tags: string[] = [];
		try {
			tags = JSON.parse(tagsJson || '[]');
		} catch {
			return fail(400, { error: 'Invalid tags format' });
		}

		if (tags.length === 0) {
			return fail(400, { error: 'At least one tag is required' });
		}

		// Check layer permission
		if (layer === 'base' && !canWriteToBase(currentDatabaseId)) {
			return fail(403, { error: 'Cannot write to base layer without personal access token' });
		}

		// Update the delay profile
		const result = await delayProfileQueries.update({
			databaseId: currentDatabaseId,
			cache,
			layer,
			current,
			input: {
				name: name.trim(),
				tags,
				preferredProtocol,
				usenetDelay,
				torrentDelay,
				bypassIfHighestQuality,
				bypassIfAboveCfScore,
				minimumCfScore
			}
		});

		if (!result.success) {
			return fail(500, { error: result.error || 'Failed to update delay profile' });
		}

		throw redirect(303, `/delay-profiles/${databaseId}`);
	},

	delete: async ({ request, params }) => {
		const { databaseId, id } = params;

		if (!databaseId || !id) {
			return fail(400, { error: 'Missing parameters' });
		}

		const currentDatabaseId = parseInt(databaseId, 10);
		const profileId = parseInt(id, 10);

		if (isNaN(currentDatabaseId) || isNaN(profileId)) {
			return fail(400, { error: 'Invalid parameters' });
		}

		const cache = pcdManager.getCache(currentDatabaseId);
		if (!cache) {
			return fail(500, { error: 'Database cache not available' });
		}

		// Get current profile for value guards
		const current = await delayProfileQueries.get(cache, profileId);
		if (!current) {
			return fail(404, { error: 'Delay profile not found' });
		}

		const formData = await request.formData();
		const layerFromForm = formData.get('layer');
		const layer = (layerFromForm as OperationLayer) || 'user';

		await logger.debug('Delete action received', {
			source: 'DelayProfileDelete',
			meta: {
				profileId,
				profileName: current.name,
				layerFromForm,
				layerUsed: layer
			}
		});

		// Check layer permission
		if (layer === 'base' && !canWriteToBase(currentDatabaseId)) {
			return fail(403, { error: 'Cannot write to base layer without personal access token' });
		}

		const result = await delayProfileQueries.remove({
			databaseId: currentDatabaseId,
			cache,
			layer,
			current
		});

		if (!result.success) {
			return fail(500, { error: result.error || 'Failed to delete delay profile' });
		}

		throw redirect(303, `/delay-profiles/${databaseId}`);
	}
};
