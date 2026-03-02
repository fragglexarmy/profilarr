/**
 * Affected arrs lookup
 * Determines which arr instances are affected by an entity change
 */

import { arrSyncQueries } from '$db/queries/arrSync.ts';
import { getCache } from '$pcd/index.ts';
import type { AffectedArr } from '$shared/sync/types.ts';

type EntityType = 'qualityProfile' | 'customFormat';

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
			case 'customFormat':
				return getAffectedArrsForCustomFormat(databaseId, entityName);
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

function getAffectedArrsForCustomFormat(
	databaseId: number,
	cfName: string
): AffectedArr[] {
	const cache = getCache(databaseId);
	if (!cache) return [];

	// CF → QPs that reference it (sync raw SQL to stay synchronous)
	const profileRows = cache.query<{ quality_profile_name: string }>(
		`SELECT DISTINCT quality_profile_name FROM quality_profile_custom_formats WHERE custom_format_name = ?`,
		cfName
	);

	if (profileRows.length === 0) return [];

	// For each QP, find instances that sync it — deduplicate by instance ID
	const instanceMap = new Map<number, AffectedArr>();

	for (const row of profileRows) {
		const instances = arrSyncQueries.getInstancesForQualityProfile(databaseId, row.quality_profile_name);
		for (const inst of instances) {
			if (!instanceMap.has(inst.instance_id)) {
				instanceMap.set(inst.instance_id, {
					instanceId: inst.instance_id,
					instanceName: inst.instance_name,
					sections: [
						{
							section: 'qualityProfiles' as const,
							syncStatus: inst.sync_status,
							lastSyncedAt: inst.last_synced_at
						}
					]
				});
			}
		}
	}

	return [...instanceMap.values()];
}
