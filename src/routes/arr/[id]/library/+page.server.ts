import { error, redirect } from '@sveltejs/kit';
import type { ServerLoad, Actions } from '@sveltejs/kit';
import { arrInstancesQueries } from '$db/queries/arrInstances.ts';
import { pcdManager } from '$pcd/pcd.ts';
import * as qualityProfileQueries from '$pcd/queries/qualityProfiles/index.ts';
import { cache } from '$cache/cache.ts';
import { RadarrClient } from '$utils/arr/clients/radarr.ts';
import type { RadarrLibraryItem } from '$utils/arr/types.ts';
import { logger } from '$logger/logger.ts';

const LIBRARY_CACHE_TTL = 300; // 5 minutes

/**
 * Get all quality profile names from all enabled Profilarr databases
 */
async function getProfilarrProfileNames(): Promise<Set<string>> {
	const profileNames = new Set<string>();
	const databases = pcdManager.getAll().filter((db) => db.enabled);

	for (const db of databases) {
		const cache = pcdManager.getCache(db.id);
		if (!cache?.isBuilt()) continue;

		try {
			const names = await qualityProfileQueries.names(cache);
			for (const name of names) {
				profileNames.add(name);
			}
		} catch {
			// Cache query failed, skip this database
		}
	}

	return profileNames;
}

export const load: ServerLoad = async ({ params }) => {
	const id = parseInt(params.id || '', 10);

	if (isNaN(id)) {
		error(404, `Invalid instance ID: ${params.id}`);
	}

	const instance = arrInstancesQueries.getById(id);

	if (!instance) {
		error(404, `Instance not found: ${id}`);
	}

	// Only fetch library for Radarr for now
	let library: RadarrLibraryItem[] = [];
	let libraryError: string | null = null;

	if (instance.type === 'radarr') {
		const cacheKey = `library:${id}`;

		// Try to get from cache first
		const cached = cache.get<RadarrLibraryItem[]>(cacheKey);
		if (cached) {
			library = cached;
		} else {
			try {
				const profilarrProfileNames = await getProfilarrProfileNames();
				const client = new RadarrClient(instance.url, instance.api_key);
				library = await client.getLibrary(profilarrProfileNames);

				// Cache the result
				cache.set(cacheKey, library, LIBRARY_CACHE_TTL);

				await logger.info(`Fetched library for ${instance.name}`, {
					source: 'arr/library',
					meta: { instanceId: id, movieCount: library.length }
				});
			} catch (err) {
				libraryError = err instanceof Error ? err.message : 'Failed to fetch library';

				await logger.error(`Failed to fetch library for ${instance.name}`, {
					source: 'arr/library',
					meta: { instanceId: id, error: libraryError }
				});
			}
		}
	}

	// Get profiles from all databases for the "Change Profile" action
	const profilesByDatabase: { databaseId: number; databaseName: string; profiles: string[] }[] = [];
	const databases = pcdManager.getAll().filter((db) => db.enabled);

	for (const db of databases) {
		const cache = pcdManager.getCache(db.id);
		if (!cache?.isBuilt()) continue;

		try {
			const names = await qualityProfileQueries.names(cache);
			profilesByDatabase.push({
				databaseId: db.id,
				databaseName: db.name,
				profiles: names
			});
		} catch {
			// Skip if cache query fails
		}
	}

	return {
		instance,
		library,
		libraryError,
		profilesByDatabase
	};
};

export const actions: Actions = {
	refresh: ({ params }) => {
		const id = parseInt(params.id || '', 10);
		if (!isNaN(id)) {
			cache.delete(`library:${id}`);
		}
		return { success: true };
	},
	delete: ({ params }) => {
		const id = parseInt(params.id || '', 10);
		if (!isNaN(id)) {
			arrInstancesQueries.delete(id);
			cache.delete(`library:${id}`);
		}
		redirect(303, '/arr');
	}
};
