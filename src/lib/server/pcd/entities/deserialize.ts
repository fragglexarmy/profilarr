/**
 * Entity Deserialization
 *
 * Creates entities from portable format by calling existing PCD create functions.
 * Used by clone (serialize → rename → deserialize) and future import.
 */

import type { PCDCache } from '$pcd/index.ts';
import type { OperationLayer } from '$pcd/index.ts';
import type { PortableDelayProfile } from '$shared/pcd/portable.ts';
import * as delayProfileQueries from './delayProfiles/index.ts';

// ============================================================================
// COMMON OPTIONS
// ============================================================================

interface DeserializeOptions<T> {
	databaseId: number;
	cache: PCDCache;
	layer: OperationLayer;
	portable: T;
}

// ============================================================================
// DELAY PROFILES
// ============================================================================

export async function deserializeDelayProfile(options: DeserializeOptions<PortableDelayProfile>) {
	const { databaseId, cache, layer, portable } = options;

	return delayProfileQueries.create({
		databaseId,
		cache,
		layer,
		input: portable
	});
}
