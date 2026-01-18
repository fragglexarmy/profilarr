import { error, fail } from '@sveltejs/kit';
import type { ServerLoad, Actions } from '@sveltejs/kit';
import { pcdManager } from '$pcd/pcd.ts';
import { canWriteToBase } from '$pcd/writer.ts';
import * as qualityProfileQueries from '$pcd/queries/qualityProfiles/index.ts';
import * as languageQueries from '$pcd/queries/languages.ts';
import type { OperationLayer } from '$pcd/writer.ts';

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

	// Get profile name from ID
	const profile = await cache.kb
		.selectFrom('quality_profiles')
		.select('name')
		.where('id', '=', profileId)
		.executeTakeFirst();

	if (!profile) {
		throw error(404, 'Quality profile not found');
	}

	// Load languages for the quality profile
	const languagesData = await qualityProfileQueries.languages(cache, profile.name);

	// Load all available languages
	const availableLanguages = languageQueries.list(cache);

	return {
		languages: languagesData.languages,
		availableLanguages,
		canWriteToBase: canWriteToBase(currentDatabaseId)
	};
};

export const actions: Actions = {
	update: async ({ request, params }) => {
		const { databaseId, id } = params;

		if (!databaseId || !id) {
			return fail(400, { error: 'Missing required parameters' });
		}

		const currentDatabaseId = parseInt(databaseId, 10);
		if (isNaN(currentDatabaseId)) {
			return fail(400, { error: 'Invalid database ID' });
		}

		const profileId = parseInt(id, 10);
		if (isNaN(profileId)) {
			return fail(400, { error: 'Invalid profile ID' });
		}

		const cache = pcdManager.getCache(currentDatabaseId);
		if (!cache) {
			return fail(500, { error: 'Database cache not available' });
		}

		const formData = await request.formData();

		// Parse form data
		const layer = (formData.get('layer') as OperationLayer) || 'user';
		const languageName = formData.get('languageName') as string | null;
		const type = (formData.get('type') as 'must' | 'only' | 'not' | 'simple') || 'simple';

		// Check layer permission
		if (layer === 'base' && !canWriteToBase(currentDatabaseId)) {
			return fail(403, { error: 'Cannot write to base layer without personal access token' });
		}

		// Get profile name for metadata
		const profile = await cache.kb
			.selectFrom('quality_profiles')
			.select('name')
			.where('id', '=', profileId)
			.executeTakeFirst();

		if (!profile) {
			return fail(404, { error: 'Quality profile not found' });
		}

		// Update the languages
		const result = await qualityProfileQueries.updateLanguages({
			databaseId: currentDatabaseId,
			cache,
			layer,
			profileName: profile.name,
			input: {
				languageName,
				type
			}
		});

		if (!result.success) {
			return fail(500, { error: result.error || 'Failed to update languages' });
		}

		return { success: true };
	}
};
