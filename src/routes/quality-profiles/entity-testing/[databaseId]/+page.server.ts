import { error, fail } from '@sveltejs/kit';
import type { ServerLoad, Actions } from '@sveltejs/kit';
import { pcdManager } from '$pcd/pcd.ts';
import { canWriteToBase } from '$pcd/writer.ts';
import { tmdbSettingsQueries } from '$db/queries/tmdbSettings.ts';
import * as entityTestQueries from '$pcd/queries/entityTests/index.ts';
import * as qualityProfileQueries from '$pcd/queries/qualityProfiles/index.ts';
import { isParserHealthy, parseWithCacheBatch, matchPatterns } from '$lib/server/utils/arr/parser/index.ts';
import { getAllConditionsForEvaluation } from '$pcd/queries/customFormats/allConditions.ts';
import { evaluateCustomFormat, getParsedInfo, extractAllPatterns } from '$pcd/queries/customFormats/evaluator.ts';
import type { MediaType } from '$lib/server/utils/arr/parser/types.ts';

export const load: ServerLoad = async ({ params }) => {
	const { databaseId } = params;

	// Validate params exist
	if (!databaseId) {
		throw error(400, 'Missing database ID');
	}

	// Get all databases for tabs
	const databases = pcdManager.getAll();

	// Parse and validate the database ID
	const currentDatabaseId = parseInt(databaseId, 10);
	if (isNaN(currentDatabaseId)) {
		throw error(400, 'Invalid database ID');
	}

	// Get the current database instance
	const currentDatabase = databases.find((db) => db.id === currentDatabaseId);

	if (!currentDatabase) {
		throw error(404, 'Database not found');
	}

	// Get the cache for the database
	const cache = pcdManager.getCache(currentDatabaseId);
	if (!cache) {
		throw error(500, 'Database cache not available');
	}

	const testEntities = await entityTestQueries.list(cache);
	const qualityProfiles = await qualityProfileQueries.select(cache);
	const cfScoresData = await qualityProfileQueries.allCfScores(cache);

	// Check if TMDB API key is configured
	const tmdbSettings = tmdbSettingsQueries.get();
	const tmdbConfigured = !!tmdbSettings?.api_key;

	// Check parser availability
	const parserAvailable = await isParserHealthy();

	// Evaluate all releases against all custom formats
	type ReleaseEvaluation = {
		releaseId: number;
		parsed: ReturnType<typeof getParsedInfo> | null;
		cfMatches: Record<number, boolean>;
	};
	const evaluations: Record<number, ReleaseEvaluation> = {};

	if (parserAvailable && testEntities.length > 0) {
		// Collect all releases with their entity type
		const allReleases: Array<{ id: number; title: string; type: MediaType }> = [];
		for (const entity of testEntities) {
			for (const release of entity.releases) {
				allReleases.push({
					id: release.id,
					title: release.title,
					type: entity.type
				});
			}
		}

		if (allReleases.length > 0) {
			// Parse all releases (uses cache)
			const parseResults = await parseWithCacheBatch(
				allReleases.map((r) => ({ title: r.title, type: r.type }))
			);

			// Get all custom formats with conditions
			const customFormats = await getAllConditionsForEvaluation(cache);

			// Extract all unique patterns for batch matching
			const allPatterns = extractAllPatterns(customFormats);

			// Pre-compute pattern matches for each release title using .NET regex
			const patternMatchesByRelease = new Map<number, Map<string, boolean>>();
			if (allPatterns.length > 0) {
				for (const release of allReleases) {
					const matches = await matchPatterns(release.title, allPatterns);
					if (matches) {
						patternMatchesByRelease.set(release.id, matches);
					}
				}
			}

			// Evaluate each release
			for (const release of allReleases) {
				const cacheKey = `${release.title}:${release.type}`;
				const parsed = parseResults.get(cacheKey);

				if (!parsed) {
					evaluations[release.id] = {
						releaseId: release.id,
						parsed: null,
						cfMatches: {}
					};
					continue;
				}

				// Get pre-computed pattern matches for this release
				const patternMatches = patternMatchesByRelease.get(release.id);

				// Evaluate against all custom formats
				const cfMatches: Record<number, boolean> = {};
				for (const cf of customFormats) {
					if (cf.conditions.length === 0) {
						cfMatches[cf.id] = false;
						continue;
					}
					const result = evaluateCustomFormat(cf.conditions, parsed, release.title, patternMatches);
					cfMatches[cf.id] = result.matches;
				}

				evaluations[release.id] = {
					releaseId: release.id,
					parsed: getParsedInfo(parsed),
					cfMatches
				};
			}
		}
	}

	return {
		databases,
		currentDatabase,
		tmdbConfigured,
		parserAvailable,
		testEntities,
		qualityProfiles,
		cfScoresData,
		evaluations,
		canWriteToBase: canWriteToBase(currentDatabaseId)
	};
};

export const actions: Actions = {
	addEntities: async ({ request, params }) => {
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
		const entitiesJson = formData.get('entities') as string;
		const layer = (formData.get('layer') as 'user' | 'base') || 'user';

		if (layer === 'base' && !canWriteToBase(currentDatabaseId)) {
			return fail(403, { error: 'Cannot write to base layer for this database' });
		}

		let entities: Array<{
			type: 'movie' | 'series';
			tmdbId: number;
			title: string;
			year: number | null;
			posterPath: string | null;
		}>;

		try {
			entities = JSON.parse(entitiesJson || '[]');
		} catch {
			return fail(400, { error: 'Invalid entities format' });
		}

		if (entities.length === 0) {
			return fail(400, { error: 'No entities to add' });
		}

		const result = await entityTestQueries.create({
			databaseId: currentDatabaseId,
			cache,
			layer,
			inputs: entities
		});

		if (!result.success) {
			return fail(500, { error: result.error || 'Failed to add entities' });
		}

		return {
			success: true,
			added: result.added,
			skipped: result.skipped
		};
	},

	deleteEntity: async ({ request, params }) => {
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
		const entityId = parseInt(formData.get('entityId') as string, 10);
		const layer = (formData.get('layer') as 'user' | 'base') || 'user';

		if (isNaN(entityId)) {
			return fail(400, { error: 'Invalid entity ID' });
		}

		if (layer === 'base' && !canWriteToBase(currentDatabaseId)) {
			return fail(403, { error: 'Cannot write to base layer for this database' });
		}

		const result = await entityTestQueries.remove({
			databaseId: currentDatabaseId,
			cache,
			layer,
			entityId
		});

		if (!result.success) {
			return fail(500, { error: result.error || 'Failed to delete entity' });
		}

		return { success: true };
	},

	createRelease: async ({ request, params }) => {
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
		const releaseJson = formData.get('release') as string;
		const layer = (formData.get('layer') as 'user' | 'base') || 'user';

		if (layer === 'base' && !canWriteToBase(currentDatabaseId)) {
			return fail(403, { error: 'Cannot write to base layer for this database' });
		}

		let release: {
			entityId: number;
			title: string;
			size_bytes: number | null;
			languages: string[];
			indexers: string[];
			flags: string[];
		};

		try {
			release = JSON.parse(releaseJson || '{}');
		} catch {
			return fail(400, { error: 'Invalid release format' });
		}

		if (!release.title) {
			return fail(400, { error: 'Release title is required' });
		}

		const result = await entityTestQueries.createRelease({
			databaseId: currentDatabaseId,
			cache,
			layer,
			input: release
		});

		if (!result.success) {
			return fail(500, { error: result.error || 'Failed to create release' });
		}

		return { success: true };
	},

	updateRelease: async ({ request, params }) => {
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
		const releaseJson = formData.get('release') as string;
		const layer = (formData.get('layer') as 'user' | 'base') || 'user';

		if (layer === 'base' && !canWriteToBase(currentDatabaseId)) {
			return fail(403, { error: 'Cannot write to base layer for this database' });
		}

		let release: {
			id: number;
			title: string;
			size_bytes: number | null;
			languages: string[];
			indexers: string[];
			flags: string[];
		};

		try {
			release = JSON.parse(releaseJson || '{}');
		} catch {
			return fail(400, { error: 'Invalid release format' });
		}

		if (!release.id) {
			return fail(400, { error: 'Release ID is required' });
		}

		if (!release.title) {
			return fail(400, { error: 'Release title is required' });
		}

		const result = await entityTestQueries.updateRelease({
			databaseId: currentDatabaseId,
			cache,
			layer,
			input: release
		});

		if (!result.success) {
			return fail(500, { error: result.error || 'Failed to update release' });
		}

		return { success: true };
	},

	deleteRelease: async ({ request, params }) => {
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
		const releaseId = parseInt(formData.get('releaseId') as string, 10);
		const layer = (formData.get('layer') as 'user' | 'base') || 'user';

		if (isNaN(releaseId)) {
			return fail(400, { error: 'Invalid release ID' });
		}

		if (layer === 'base' && !canWriteToBase(currentDatabaseId)) {
			return fail(403, { error: 'Cannot write to base layer for this database' });
		}

		const result = await entityTestQueries.deleteRelease({
			databaseId: currentDatabaseId,
			cache,
			layer,
			releaseId
		});

		if (!result.success) {
			return fail(500, { error: result.error || 'Failed to delete release' });
		}

		return { success: true };
	}
};
