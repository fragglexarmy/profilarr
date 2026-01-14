/**
 * Entity test list queries
 */

import type { PCDCache } from '../../cache.ts';

/**
 * Get all test entities with their releases
 */
export async function list(cache: PCDCache) {
	const db = cache.kb;

	// 1. Get all test entities
	const entities = await db
		.selectFrom('test_entities')
		.select([
			'id',
			'type',
			'tmdb_id',
			'title',
			'year',
			'poster_path',
			'created_at',
			'updated_at'
		])
		.orderBy('title')
		.execute();

	if (entities.length === 0) return [];

	const entityIds = entities.map((e) => e.id);

	// 2. Get all releases for all entities
	const allReleases = await db
		.selectFrom('test_releases')
		.select([
			'id',
			'test_entity_id',
			'title',
			'size_bytes',
			'languages',
			'indexers',
			'flags',
			'created_at',
			'updated_at'
		])
		.where('test_entity_id', 'in', entityIds)
		.orderBy('test_entity_id')
		.orderBy('title')
		.execute();

	// Build releases map
	const releasesMap = new Map<number, typeof allReleases>();
	for (const release of allReleases) {
		if (!releasesMap.has(release.test_entity_id)) {
			releasesMap.set(release.test_entity_id, []);
		}
		releasesMap.get(release.test_entity_id)!.push(release);
	}

	// Build the final result
	return entities.map((entity) => ({
		...entity,
		releases: (releasesMap.get(entity.id) || []).map((r) => ({
			id: r.id,
			title: r.title,
			size_bytes: r.size_bytes !== null ? Number(r.size_bytes) : null,
			languages: JSON.parse(r.languages) as string[],
			indexers: JSON.parse(r.indexers) as string[],
			flags: JSON.parse(r.flags) as string[],
			created_at: r.created_at,
			updated_at: r.updated_at
		}))
	}));
}
