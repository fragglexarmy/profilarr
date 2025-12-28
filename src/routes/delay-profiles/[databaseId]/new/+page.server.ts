import { error, redirect, fail } from '@sveltejs/kit';
import type { ServerLoad, Actions } from '@sveltejs/kit';
import { pcdManager } from '$pcd/pcd.ts';
import { canWriteToBase } from '$pcd/writer.ts';
import * as delayProfileQueries from '$pcd/queries/delayProfiles/index.ts';
import type { OperationLayer } from '$pcd/writer.ts';
import type { PreferredProtocol } from '$pcd/queries/delayProfiles/index.ts';

export const load: ServerLoad = ({ params }) => {
	const { databaseId } = params;

	if (!databaseId) {
		throw error(400, 'Missing database ID');
	}

	const currentDatabaseId = parseInt(databaseId, 10);
	if (isNaN(currentDatabaseId)) {
		throw error(400, 'Invalid database ID');
	}

	const currentDatabase = pcdManager.getById(currentDatabaseId);
	if (!currentDatabase) {
		throw error(404, 'Database not found');
	}

	return {
		currentDatabase,
		canWriteToBase: canWriteToBase(currentDatabaseId)
	};
};

export const actions: Actions = {
	default: async ({ request, params }) => {
		const { databaseId } = params;

		if (!databaseId) {
			return fail(400, { error: 'Missing database ID' });
		}

		const currentDatabaseId = parseInt(databaseId, 10);
		if (isNaN(currentDatabaseId)) {
			return fail(400, { error: 'Invalid database ID' });
		}

		const cache = pcdManager.getCache(currentDatabaseId);
		if (!cache) {
			return fail(500, { error: 'Database cache not available' });
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

		// Create the delay profile
		const result = await delayProfileQueries.create({
			databaseId: currentDatabaseId,
			cache,
			layer,
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
			return fail(500, { error: result.error || 'Failed to create delay profile' });
		}

		throw redirect(303, `/delay-profiles/${databaseId}`);
	}
};
