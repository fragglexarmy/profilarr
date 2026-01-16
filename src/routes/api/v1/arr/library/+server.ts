import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { arrInstancesQueries } from '$db/queries/arrInstances.ts';
import { RadarrClient } from '$utils/arr/clients/radarr.ts';
import { SonarrClient } from '$utils/arr/clients/sonarr.ts';

/**
 * GET /api/v1/arr/library
 *
 * Get movies or series from an Arr instance's library.
 * Returns a simplified list for selection/matching.
 *
 * Query params:
 * - instanceId: Arr instance ID (required)
 */
export const GET: RequestHandler = async ({ url }) => {
	const instanceId = url.searchParams.get('instanceId');

	if (!instanceId) {
		return json({ error: 'instanceId is required' }, { status: 400 });
	}

	const instanceIdNum = parseInt(instanceId, 10);
	if (isNaN(instanceIdNum)) {
		return json({ error: 'Invalid instanceId' }, { status: 400 });
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
				const movies = await client.getMovies();
				return json({
					type: 'radarr',
					items: movies.map((m) => ({
						id: m.id,
						title: m.title,
						year: m.year,
						tmdbId: m.tmdbId
					}))
				});
			} finally {
				client.close();
			}
		} else if (instance.type === 'sonarr') {
			const client = new SonarrClient(instance.url, instance.api_key);
			try {
				const series = await client.getAllSeries();
				return json({
					type: 'sonarr',
					items: series.map((s) => ({
						id: s.id,
						title: s.title,
						year: s.year,
						tvdbId: s.tvdbId,
						seasons: s.seasons
							.map((season) => season.seasonNumber)
							.filter((n) => n > 0) // Exclude "specials" (season 0)
							.sort((a, b) => a - b)
					}))
				});
			} finally {
				client.close();
			}
		} else {
			return json({ error: `Unsupported instance type: ${instance.type}` }, { status: 400 });
		}
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Failed to fetch library';
		return json({ error: message }, { status: 500 });
	}
};
