/**
 * Affected arrs lookup
 * Determines which arr instances are affected by an entity change
 */

import { arrSyncQueries } from '$db/queries/arrSync.ts';
import type { AffectedArr } from '$shared/sync/types.ts';

type EntityType = 'qualityProfile';

/**
 * Find all arr instances affected by an entity change
 */
export function getAffectedArrs({
	entityType,
	databaseId,
	entityName
}: {
	entityType: EntityType;
	databaseId: number;
	entityName: string;
}): AffectedArr[] {
	try {
		switch (entityType) {
			case 'qualityProfile':
				return getAffectedArrsForQualityProfile(databaseId, entityName);
			default:
				return [];
		}
	} catch {
		return [];
	}
}

function getAffectedArrsForQualityProfile(
	databaseId: number,
	profileName: string
): AffectedArr[] {
	const rows = arrSyncQueries.getInstancesForQualityProfile(databaseId, profileName);

	return rows.map((row) => ({
		instanceId: row.instance_id,
		instanceName: row.instance_name,
		sections: [
			{
				section: 'qualityProfiles' as const,
				syncStatus: row.sync_status,
				lastSyncedAt: row.last_synced_at
			}
		]
	}));
}
