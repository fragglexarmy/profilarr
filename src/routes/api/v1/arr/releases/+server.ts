import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { arrInstancesQueries } from '$db/queries/arrInstances.ts';
import { RadarrClient } from '$utils/arr/clients/radarr.ts';
import { SonarrClient } from '$utils/arr/clients/sonarr.ts';
import { groupRadarrReleases, groupSonarrReleases } from '$utils/arr/releaseImport.ts';

/**
 * GET /api/v1/arr/releases
 *
 * Search for releases from an Arr instance.
 * Triggers an interactive search and returns grouped/deduplicated results.
 *
 * Query params:
 * - instanceId: Arr instance ID (required)
 * - itemId: Movie ID (Radarr) or Series ID (Sonarr) (required)
 * - season: Season number for Sonarr (optional, defaults to 1)
 *
 * Note: For Sonarr, this searches the specified season and filters for season packs only.
 */
export const GET: RequestHandler = async ({ url }) => {
	const instanceId = url.searchParams.get('instanceId');
	const itemId = url.searchParams.get('itemId');
	const season = url.searchParams.get('season');

	if (!instanceId) {
		return json({ error: 'instanceId is required' }, { status: 400 });
	}

	if (!itemId) {
		return json({ error: 'itemId is required' }, { status: 400 });
	}

	const instanceIdNum = parseInt(instanceId, 10);
	const itemIdNum = parseInt(itemId, 10);

	if (isNaN(instanceIdNum)) {
		return json({ error: 'Invalid instanceId' }, { status: 400 });
	}

	if (isNaN(itemIdNum)) {
		return json({ error: 'Invalid itemId' }, { status: 400 });
	}

	// Get the Arr instance
	const instance = arrInstancesQueries.getById(instanceIdNum);
	if (!instance) {
		return json({ error: 'Instance not found' }, { status: 404 });
	}

	try {
		if (instance.type === 'radarr') {
			const client = new RadarrClient(instance.url, instance.api_key);
			try {
				const releases = await client.getReleases(itemIdNum);
				const grouped = groupRadarrReleases(releases);
				return json({
					type: 'radarr',
					rawCount: releases.length,
					releases: grouped
				});
			} finally {
				client.close();
			}
		} else if (instance.type === 'sonarr') {
			const client = new SonarrClient(instance.url, instance.api_key);
			try {
				// Search specified season (default to 1) and filter for season packs
				const seasonNum = season ? parseInt(season, 10) : 1;
				const releases = await client.getSeasonPackReleases(
					itemIdNum,
					isNaN(seasonNum) ? 1 : seasonNum
				);
				const grouped = groupSonarrReleases(releases);
				return json({
					type: 'sonarr',
					rawCount: releases.length,
					releases: grouped
				});
			} finally {
				client.close();
			}
		} else {
			return json({ error: `Unsupported instance type: ${instance.type}` }, { status: 400 });
		}
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Failed to fetch releases';
		return json({ error: message }, { status: 500 });
	}
};
