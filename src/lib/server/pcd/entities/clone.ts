/**
 * Entity Clone
 *
 * Orchestrates serialize → rename → deserialize for any entity type.
 * The existing create functions handle name uniqueness validation.
 */

import type { PCDCache } from '$pcd/index.ts';
import type { OperationLayer } from '$pcd/index.ts';
import type { EntityType } from '$shared/pcd/portable.ts';
import { serializeDelayProfile } from './serialize.ts';
import { deserializeDelayProfile } from './deserialize.ts';

interface CloneOptions {
	databaseId: number;
	cache: PCDCache;
	layer: OperationLayer;
	entityType: EntityType;
	/** Source entity name (used for name-based lookups) */
	sourceName: string;
	/** Name for the cloned entity */
	newName: string;
}

export async function clone(options: CloneOptions) {
	const { databaseId, cache, layer, entityType, sourceName, newName } = options;

	switch (entityType) {
		case 'delay_profile': {
			const portable = await serializeDelayProfile(cache, sourceName);
			portable.name = newName;
			return deserializeDelayProfile({ databaseId, cache, layer, portable });
		}

		default:
			throw new Error(`Clone not yet implemented for entity type: ${entityType}`);
	}
}
