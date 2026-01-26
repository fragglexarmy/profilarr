import { error, redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { pcdManager } from '$pcd/pcd.ts';
import { canWriteToBase } from '$pcd/writer.ts';
import type { OperationLayer } from '$pcd/writer.ts';
import { getRadarrByName, getAvailableQualities } from '$pcd/queries/mediaManagement/quality-definitions/read.ts';
import { updateRadarrQualityDefinitions, removeRadarrQualityDefinitions } from '$pcd/queries/mediaManagement/quality-definitions/index.ts';

export const load: PageServerLoad = async ({ params, parent }) => {
	const { databaseId, name } = params;

	if (!databaseId || !name) {
		throw error(400, 'Missing parameters');
	}

	const currentDatabaseId = parseInt(databaseId, 10);
	if (isNaN(currentDatabaseId)) {
		throw error(400, 'Invalid database ID');
	}

	const cache = pcdManager.getCache(currentDatabaseId);
	if (!cache) {
		throw error(500, 'Database cache not available');
	}

	const decodedName = decodeURIComponent(name);
	const qualityDefinitionsConfig = await getRadarrByName(cache, decodedName);

	if (!qualityDefinitionsConfig) {
		throw error(404, 'Quality definitions config not found');
	}

	const availableQualities = await getAvailableQualities(cache, 'radarr');
	const parentData = await parent();

	return {
		qualityDefinitionsConfig,
		availableQualities,
		canWriteToBase: parentData.canWriteToBase
	};
};

export const actions: Actions = {
	update: async ({ request, params }) => {
		console.log('[QD-ACTION] update action called at', Date.now());
		const { databaseId, name } = params;

		if (!databaseId || !name) {
			return fail(400, { error: 'Missing parameters' });
		}

		const currentDatabaseId = parseInt(databaseId, 10);
		if (isNaN(currentDatabaseId)) {
			return fail(400, { error: 'Invalid database ID' });
		}

		const cache = pcdManager.getCache(currentDatabaseId);
		if (!cache) {
			return fail(500, { error: 'Database cache not available' });
		}

		const decodedName = decodeURIComponent(name);
		const current = await getRadarrByName(cache, decodedName);
		if (!current) {
			return fail(404, { error: 'Quality definitions config not found' });
		}

		const formData = await request.formData();
		const newName = formData.get('name') as string;
		const layer = (formData.get('layer') as OperationLayer) || 'user';
		const entriesJson = formData.get('entries') as string;

		if (!newName?.trim()) {
			return fail(400, { error: 'Name is required' });
		}

		if (layer === 'base' && !canWriteToBase(currentDatabaseId)) {
			return fail(403, { error: 'Cannot write to base layer without personal access token' });
		}

		let entries;
		try {
			entries = JSON.parse(entriesJson || '[]');
		} catch {
			return fail(400, { error: 'Invalid entries data' });
		}

		const result = await updateRadarrQualityDefinitions({
			databaseId: currentDatabaseId,
			cache,
			layer,
			currentName: decodedName,
			input: {
				name: newName.trim(),
				entries
			}
		});

		if (!result.success) {
			return fail(500, { error: result.error || 'Failed to update quality definitions config' });
		}

		throw redirect(303, `/media-management/${databaseId}/quality-definitions`);
	},

	delete: async ({ request, params }) => {
		const { databaseId, name } = params;

		if (!databaseId || !name) {
			return fail(400, { error: 'Missing parameters' });
		}

		const currentDatabaseId = parseInt(databaseId, 10);
		if (isNaN(currentDatabaseId)) {
			return fail(400, { error: 'Invalid database ID' });
		}

		const cache = pcdManager.getCache(currentDatabaseId);
		if (!cache) {
			return fail(500, { error: 'Database cache not available' });
		}

		const decodedName = decodeURIComponent(name);
		const current = await getRadarrByName(cache, decodedName);
		if (!current) {
			return fail(404, { error: 'Quality definitions config not found' });
		}

		const formData = await request.formData();
		const layer = (formData.get('layer') as OperationLayer) || 'user';

		if (layer === 'base' && !canWriteToBase(currentDatabaseId)) {
			return fail(403, { error: 'Cannot write to base layer without personal access token' });
		}

		const result = await removeRadarrQualityDefinitions({
			databaseId: currentDatabaseId,
			cache,
			layer,
			name: decodedName
		});

		if (!result.success) {
			return fail(500, { error: result.error || 'Failed to delete quality definitions config' });
		}

		throw redirect(303, `/media-management/${databaseId}/quality-definitions`);
	}
};
