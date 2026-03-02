/**
 * Targeted entity sync
 * Pushes a single entity to an arr instance (inline, no job queue)
 */

import { arrInstancesQueries } from '$db/queries/arrInstances.ts';
import { arrSyncQueries } from '$db/queries/arrSync.ts';
import { createArrClient } from '$utils/arr/factory.ts';
import { getCache } from '$pcd/index.ts';
import { logger } from '$logger/logger.ts';
import type { ArrType } from '$utils/arr/types.ts';
import type { SyncArrType } from './mappings.ts';

// Quality profile imports
import {
	fetchQualityProfileFromPcd,
	getQualityApiMappings,
	transformQualityProfile
} from './qualityProfiles/transformer.ts';
import { getCustomFormatsForProfile } from '$pcd/references.ts';
import { fetchCustomFormatFromPcd, transformCustomFormat, syncCustomFormats, type PcdCustomFormat } from './customFormats/index.ts';

interface SyncResult {
	success: boolean;
	error?: string;
}

/**
 * Sync a single quality profile to an arr instance
 */
export async function syncQualityProfile(
	instanceId: number,
	databaseId: number,
	profileName: string
): Promise<SyncResult> {
	const instance = arrInstancesQueries.getById(instanceId);
	if (!instance) return { success: false, error: 'Instance not found' };

	const cache = getCache(databaseId);
	if (!cache) return { success: false, error: `PCD cache not found for database ${databaseId}` };

	const instanceType = instance.type as SyncArrType;
	const client = createArrClient(instance.type as ArrType, instance.url, instance.api_key);

	try {
		// Fetch the QP from PCD
		const pcdProfile = await fetchQualityProfileFromPcd(cache, profileName, instanceType);
		if (!pcdProfile) {
			return { success: false, error: `Quality profile "${profileName}" not found in PCD` };
		}

		// Check if QP already exists on arr
		const existingProfiles = await client.getQualityProfiles();
		const existingProfile = existingProfiles.find((p) => p.name === profileName);

		let formatIdMap: Map<string, number>;

		if (existingProfile) {
			// Update path: build formatIdMap from existing arr CFs (no CF sync needed)
			const existingFormats = await client.getCustomFormats();
			formatIdMap = new Map(existingFormats.map((f) => [f.name, f.id!]));
		} else {
			// First-time path: sync referenced CFs first, then create QP
			const referencedNames = await getCustomFormatsForProfile(cache, profileName, instanceType);
			const pcdFormats = new Map<string, PcdCustomFormat>();
			for (const name of referencedNames) {
				const pcdFormat = await fetchCustomFormatFromPcd(cache, name);
				if (pcdFormat) {
					pcdFormats.set(name, pcdFormat);
				}
			}
			formatIdMap = await syncCustomFormats(client, instanceId, instanceType, pcdFormats);
		}

		// Get quality API mappings
		const qualityMappings = await getQualityApiMappings(cache, instanceType);

		// Transform
		const arrProfile = transformQualityProfile(pcdProfile, instanceType, qualityMappings, formatIdMap);
		arrProfile.name = profileName;

		// Push
		if (existingProfile) {
			arrProfile.id = existingProfile.id;
			await client.updateQualityProfile(existingProfile.id, arrProfile);
			await logger.info(`Entity sync: updated quality profile "${profileName}"`, {
				source: 'EntitySync:QualityProfile',
				meta: { instanceId, databaseId, profileName, action: 'updated' }
			});
		} else {
			await client.createQualityProfile(arrProfile);
			await logger.info(`Entity sync: created quality profile "${profileName}"`, {
				source: 'EntitySync:QualityProfile',
				meta: { instanceId, databaseId, profileName, action: 'created' }
			});
		}

		arrSyncQueries.touchSectionLastSynced(instanceId, 'qualityProfiles');

		return { success: true };
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : 'Unknown error';
		await logger.error(`Entity sync failed for quality profile "${profileName}"`, {
			source: 'EntitySync:QualityProfile',
			meta: { instanceId, databaseId, profileName, error: errorMsg }
		});
		return { success: false, error: errorMsg };
	} finally {
		client.close();
	}
}

/**
 * Sync a single custom format to an arr instance
 */
export async function syncCustomFormat(
	instanceId: number,
	databaseId: number,
	formatName: string
): Promise<SyncResult> {
	const instance = arrInstancesQueries.getById(instanceId);
	if (!instance) return { success: false, error: 'Instance not found' };

	const cache = getCache(databaseId);
	if (!cache) return { success: false, error: `PCD cache not found for database ${databaseId}` };

	const instanceType = instance.type as SyncArrType;
	const client = createArrClient(instance.type as ArrType, instance.url, instance.api_key);

	try {
		const pcdFormat = await fetchCustomFormatFromPcd(cache, formatName);
		if (!pcdFormat) {
			return { success: false, error: `Custom format "${formatName}" not found in PCD` };
		}

		const existingFormats = await client.getCustomFormats();
		const existing = existingFormats.find((f) => f.name === formatName);

		const arrFormat = transformCustomFormat(pcdFormat, instanceType);
		arrFormat.name = formatName;

		if (existing) {
			arrFormat.id = existing.id;
			await client.updateCustomFormat(existing.id!, arrFormat);
			await logger.info(`Entity sync: updated custom format "${formatName}"`, {
				source: 'EntitySync:CustomFormat',
				meta: { instanceId, databaseId, formatName, action: 'updated' }
			});
		} else {
			await client.createCustomFormat(arrFormat);
			await logger.info(`Entity sync: created custom format "${formatName}"`, {
				source: 'EntitySync:CustomFormat',
				meta: { instanceId, databaseId, formatName, action: 'created' }
			});
		}

		arrSyncQueries.touchSectionLastSynced(instanceId, 'qualityProfiles');

		return { success: true };
	} catch (error) {
		const errorMsg = error instanceof Error ? error.message : 'Unknown error';
		await logger.error(`Entity sync failed for custom format "${formatName}"`, {
			source: 'EntitySync:CustomFormat',
			meta: { instanceId, databaseId, formatName, error: errorMsg }
		});
		return { success: false, error: errorMsg };
	} finally {
		client.close();
	}
}
