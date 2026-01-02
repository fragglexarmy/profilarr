import { error, redirect, fail } from '@sveltejs/kit';
import type { ServerLoad, Actions } from '@sveltejs/kit';
import { pcdManager } from '$pcd/pcd.ts';
import { canWriteToBase } from '$pcd/writer.ts';
import * as regularExpressionQueries from '$pcd/queries/regularExpressions/index.ts';
import type { OperationLayer } from '$pcd/writer.ts';
import { logger } from '$logger/logger.ts';

export const load: ServerLoad = ({ params, url }) => {
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

	// Get preset from query params
	const preset = url.searchParams.get('preset');

	// Define preset data
	let presetData = {
		name: '',
		tags: [] as string[],
		pattern: '',
		description: '',
		regex101Id: ''
	};

	if (preset === 'release-group') {
		presetData = {
			name: '',
			tags: ['Release Group'],
			pattern: '(?<=^|[\\s.-])<group>\\b',
			description: 'Matches "<group>" when preceded by whitespace, a hyphen or dot',
			regex101Id: ''
		};
	}

	return {
		currentDatabase,
		canWriteToBase: canWriteToBase(currentDatabaseId),
		preset: presetData
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
		const pattern = formData.get('pattern') as string;
		const description = (formData.get('description') as string) || null;
		const regex101Id = (formData.get('regex101Id') as string) || null;
		const layerFromForm = formData.get('layer');
		const layer = (layerFromForm as OperationLayer) || 'user';

		await logger.debug('Create action received', {
			source: 'RegularExpressionCreate',
			meta: {
				regexName: name,
				layerFromForm,
				layerUsed: layer
			}
		});

		// Validate
		if (!name?.trim()) {
			return fail(400, { error: 'Name is required' });
		}

		if (!pattern?.trim()) {
			return fail(400, { error: 'Pattern is required' });
		}

		let tags: string[] = [];
		try {
			tags = JSON.parse(tagsJson || '[]');
		} catch {
			return fail(400, { error: 'Invalid tags format' });
		}

		// Check layer permission
		if (layer === 'base' && !canWriteToBase(currentDatabaseId)) {
			return fail(403, { error: 'Cannot write to base layer without personal access token' });
		}

		// Create the regular expression
		const result = await regularExpressionQueries.create({
			databaseId: currentDatabaseId,
			cache,
			layer,
			input: {
				name: name.trim(),
				pattern: pattern.trim(),
				tags,
				description: description?.trim() || null,
				regex101Id: regex101Id?.trim() || null
			}
		});

		if (!result.success) {
			return fail(500, { error: result.error || 'Failed to create regular expression' });
		}

		throw redirect(303, `/regular-expressions/${databaseId}`);
	}
};
