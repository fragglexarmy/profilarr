import { error, redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { pcdManager } from '$pcd/index.ts';
import { canWriteToBase } from '$pcd/index.ts';
import type { OperationLayer } from '$pcd/index.ts';
import { getRadarrByName, updateRadarrNaming, removeRadarrNaming } from '$pcd/entities/mediaManagement/naming/index.ts';
import type { RadarrNamingRow } from '$shared/pcd/display.ts';

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
	const namingConfig = await getRadarrByName(cache, decodedName);

	if (!namingConfig) {
		throw error(404, 'Naming config not found');
	}

	const parentData = await parent();

	return {
		namingConfig,
		canWriteToBase: parentData.canWriteToBase
	};
};

export const actions: Actions = {
	update: async ({ request, params }) => {
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
			return fail(404, { error: 'Naming config not found' });
		}

		const formData = await request.formData();
		const newName = formData.get('name') as string;
		const layer = (formData.get('layer') as OperationLayer) || 'user';

		if (!newName?.trim()) {
			return fail(400, { error: 'Name is required' });
		}

		if (layer === 'base' && !canWriteToBase(currentDatabaseId)) {
			return fail(403, { error: 'Cannot write to base layer without personal access token' });
		}

		const rename = formData.get('rename') === 'true';
		const movieFormat = formData.get('movieFormat') as string;
		const movieFolderFormat = formData.get('movieFolderFormat') as string;
		const replaceIllegalCharacters = formData.get('replaceIllegalCharacters') === 'true';
		const colonReplacementFormat = formData.get(
			'colonReplacementFormat'
		) as RadarrNamingRow['colon_replacement_format'];

		const result = await updateRadarrNaming({
			databaseId: currentDatabaseId,
			cache,
			layer,
			current,
			input: {
				name: newName.trim(),
				rename,
				movieFormat: movieFormat || '',
				movieFolderFormat: movieFolderFormat || '',
				replaceIllegalCharacters,
				colonReplacementFormat: colonReplacementFormat || 'delete'
			}
		});

		if (!result.success) {
			return fail(500, { error: result.error || 'Failed to update naming config' });
		}

		throw redirect(303, `/media-management/${databaseId}/naming`);
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
			return fail(404, { error: 'Naming config not found' });
		}

		const formData = await request.formData();
		const layer = (formData.get('layer') as OperationLayer) || 'user';

		if (layer === 'base' && !canWriteToBase(currentDatabaseId)) {
			return fail(403, { error: 'Cannot write to base layer without personal access token' });
		}

		const result = await removeRadarrNaming({
			databaseId: currentDatabaseId,
			cache,
			layer,
			current
		});

		if (!result.success) {
			return fail(500, { error: result.error || 'Failed to delete naming config' });
		}

		throw redirect(303, `/media-management/${databaseId}/naming`);
	}
};
