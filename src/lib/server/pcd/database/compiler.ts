/**
 * PCD Database Compiler
 * Handles compiling and invalidating PCD caches
 */

import { PCDCache } from './cache.ts';
import { setCache, getCache, deleteCache, getCachedDatabaseIds } from './registry.ts';
import type { CacheBuildStats } from '../core/types.ts';

/**
 * Compile a PCD into an in-memory cache
 * Returns build stats for logging
 */
export async function compile(
	pcdPath: string,
	databaseInstanceId: number
): Promise<CacheBuildStats> {
	// Close existing cache if present
	const existing = getCache(databaseInstanceId);
	if (existing) {
		existing.close();
	}

	// Create and build new cache
	const cache = new PCDCache(pcdPath, databaseInstanceId);
	const stats = await cache.build();

	// Store in registry
	setCache(databaseInstanceId, cache);

	return stats;
}

/**
 * Invalidate a cache (close and remove from registry)
 */
export function invalidate(databaseInstanceId: number): void {
	const cache = getCache(databaseInstanceId);
	if (cache) {
		cache.close();
		deleteCache(databaseInstanceId);
	}
}

/**
 * Invalidate all caches
 */
export function invalidateAll(): void {
	const ids = getCachedDatabaseIds();
	for (const id of ids) {
		invalidate(id);
	}
}
