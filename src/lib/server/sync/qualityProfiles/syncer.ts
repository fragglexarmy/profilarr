/**
 * Quality profile syncer
 * Syncs quality profiles from PCD to arr instances
 *
 * Sync order:
 * 1. Fetch quality profiles and their referenced custom formats from PCD
 * 2. Transform custom formats to arr API format
 * 3. Sync custom formats to arr (create or update by name)
 * 4. Get updated format ID map from arr
 * 5. Transform quality profiles to arr API format (with correct format IDs)
 * 6. Sync quality profiles to arr (create or update by name)
 */

import { BaseSyncer, type SyncResult } from '../base.ts';
import { arrSyncQueries } from '$db/queries/arrSync.ts';
import { getCache, getCachedDatabaseIds } from '$pcd/index.ts';
import { databaseInstancesQueries } from '$db/queries/databaseInstances.ts';
import { logger } from '$logger/logger.ts';
import type { SyncArrType } from '../mappings.ts';

// Custom formats
import {
	fetchCustomFormatFromPcd,
	syncCustomFormats,
	type PcdCustomFormat
} from '../customFormats/index.ts';
import {
	fetchQualityProfileFromPcd,
	getQualityApiMappings,
	getReferencedCustomFormatNames,
	transformQualityProfile,
	type PcdQualityProfile
} from './transformer.ts';

// Internal types for sync data
interface ProfileSyncData {
	pcdProfile: PcdQualityProfile;
	referencedFormatNames: string[];
}

interface SyncBatch {
	profiles: ProfileSyncData[];
	customFormats: Map<string, PcdCustomFormat>; // deduped by format name
}

interface SyncedProfileSummary {
	name: string;
	action: 'created' | 'updated';
	language: string;
	cutoffFormatScore: number;
	minFormatScore: number;
	formats: { name: string; score: number }[];
}

export class QualityProfileSyncer extends BaseSyncer {
	private instanceType: SyncArrType;

	constructor(
		client: ConstructorParameters<typeof BaseSyncer>[0],
		instanceId: number,
		instanceName: string,
		instanceType: SyncArrType
	) {
		super(client, instanceId, instanceName);
		this.instanceType = instanceType;
	}

	protected get syncType(): string {
		return 'quality profiles';
	}

	/**
	 * Override sync to handle the complex quality profile sync flow
	 */
	override async sync(): Promise<SyncResult> {
		try {
			await logger.info(`Starting quality profile sync for "${this.instanceName}"`, {
				source: 'Sync:QualityProfiles',
				meta: { instanceId: this.instanceId, instanceType: this.instanceType }
			});

			// 1. Fetch all profiles and their custom formats from PCD
			const syncBatch = await this.fetchSyncBatch();

			if (syncBatch.profiles.length === 0) {
				await logger.debug(`No quality profiles to sync for "${this.instanceName}"`, {
					source: 'Sync:QualityProfiles',
					meta: { instanceId: this.instanceId }
				});
				return { success: true, itemsSynced: 0 };
			}

			// 2. Sync custom formats first (profiles depend on format IDs)
			const formatIdMap = await syncCustomFormats(
				this.client,
				this.instanceId,
				this.instanceType,
				syncBatch.customFormats
			);

			// 3. Get quality API mappings for this arr type
			// Use the first database's cache (all should have same mappings)
			const firstSelection = arrSyncQueries.getQualityProfilesSync(this.instanceId).selections[0];
			const cache = getCache(firstSelection.databaseId);
			if (!cache) {
				// Debug: gather info about why cache is missing
				const cachedIds = getCachedDatabaseIds();
				const dbInstance = databaseInstancesQueries.getById(firstSelection.databaseId);

				await logger.error(`PCD cache not found for database ${firstSelection.databaseId}`, {
					source: 'Sync:QualityProfiles',
					meta: {
						requestedDatabaseId: firstSelection.databaseId,
						cachedDatabaseIds: cachedIds,
						databaseExists: !!dbInstance,
						databaseEnabled: dbInstance?.enabled ?? null,
						databaseName: dbInstance?.name ?? null
					}
				});

				throw new Error(`PCD cache not found for database ${firstSelection.databaseId}`);
			}
			const qualityMappings = await getQualityApiMappings(cache, this.instanceType);

			// 4. Sync quality profiles
			const syncedProfiles = await this.syncQualityProfiles(
				syncBatch.profiles,
				formatIdMap,
				qualityMappings
			);

			await logger.info(`Completed quality profile sync for "${this.instanceName}"`, {
				source: 'Sync:QualityProfiles',
				meta: {
					instanceId: this.instanceId,
					formatsSynced: syncBatch.customFormats.size,
					profilesSynced: syncedProfiles.length,
					profiles: syncedProfiles
				}
			});

			return { success: true, itemsSynced: syncedProfiles.length };
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : 'Unknown error';

			await logger.error(`Failed quality profile sync for "${this.instanceName}"`, {
				source: 'Sync:QualityProfiles',
				meta: { instanceId: this.instanceId, error: errorMsg }
			});

			return { success: false, itemsSynced: 0, error: errorMsg };
		}
	}

	/**
	 * Fetch all quality profiles and their dependent custom formats from PCD
	 */
	private async fetchSyncBatch(): Promise<SyncBatch> {
		const syncConfig = arrSyncQueries.getQualityProfilesSync(this.instanceId);

		if (syncConfig.selections.length === 0) {
			return { profiles: [], customFormats: new Map() };
		}

		const profiles: ProfileSyncData[] = [];
		const customFormats = new Map<string, PcdCustomFormat>();

		for (const selection of syncConfig.selections) {
			const cache = getCache(selection.databaseId);
			if (!cache) {
				// Debug: gather info about why cache is missing
				const cachedIds = getCachedDatabaseIds();
				const dbInstance = databaseInstancesQueries.getById(selection.databaseId);

				await logger.warn(`PCD cache not found for database ${selection.databaseId}`, {
					source: 'Sync:QualityProfiles',
					meta: {
						instanceId: this.instanceId,
						requestedDatabaseId: selection.databaseId,
						cachedDatabaseIds: cachedIds,
						databaseExists: !!dbInstance,
						databaseEnabled: dbInstance?.enabled ?? null,
						databaseName: dbInstance?.name ?? null
					}
				});
				continue;
			}

			// Fetch the quality profile
			const pcdProfile = await fetchQualityProfileFromPcd(
				cache,
				selection.profileName,
				this.instanceType
			);
			if (!pcdProfile) {
				await logger.warn(
					`Quality profile "${selection.profileName}" not found in database ${selection.databaseId}`,
					{
						source: 'Sync:QualityProfiles',
						meta: { instanceId: this.instanceId, profileName: selection.profileName }
					}
				);
				continue;
			}

			// Get referenced custom format names
			const referencedFormatNames = await getReferencedCustomFormatNames(
				cache,
				selection.profileName,
				this.instanceType
			);

			profiles.push({ pcdProfile, referencedFormatNames });

			// Fetch custom formats (dedupe by name)
			for (const formatName of referencedFormatNames) {
				if (!customFormats.has(formatName)) {
					const pcdFormat = await fetchCustomFormatFromPcd(cache, formatName);
					if (pcdFormat) {
						customFormats.set(formatName, pcdFormat);
					}
				}
			}
		}

		return { profiles, customFormats };
	}

	/**
	 * Sync quality profiles to arr instance
	 * Returns array of synced profile summaries for logging
	 */
	private async syncQualityProfiles(
		profiles: ProfileSyncData[],
		formatIdMap: Map<string, number>,
		qualityMappings: Map<string, string>
	): Promise<SyncedProfileSummary[]> {
		// Get existing profiles from arr
		const existingProfiles = await this.client.getQualityProfiles();
		const existingMap = new Map(existingProfiles.map((p) => [p.name, p.id]));

		const syncedProfiles: SyncedProfileSummary[] = [];

		for (const { pcdProfile } of profiles) {
			const arrProfile = transformQualityProfile(
				pcdProfile,
				this.instanceType,
				qualityMappings,
				formatIdMap
			);

			await logger.debug(`Compiled quality profile "${arrProfile.name}"`, {
				source: 'Compile:QualityProfile',
				meta: {
					instanceId: this.instanceId,
					profile: arrProfile
				}
			});

			try {
				const isUpdate = existingMap.has(arrProfile.name);
				if (isUpdate) {
					// Update existing
					const existingId = existingMap.get(arrProfile.name)!;
					arrProfile.id = existingId;
					await this.client.updateQualityProfile(existingId, arrProfile);
					await logger.debug(`Updated quality profile "${arrProfile.name}"`, {
						source: 'Sync:QualityProfiles',
						meta: { instanceId: this.instanceId, profileId: existingId }
					});
				} else {
					// Create new
					const response = await this.client.createQualityProfile(arrProfile);
					await logger.debug(`Created quality profile "${arrProfile.name}"`, {
						source: 'Sync:QualityProfiles',
						meta: { instanceId: this.instanceId, profileId: response.id }
					});
				}

				// Build summary for completion log
				const scoredFormats = arrProfile.formatItems
					.filter((f) => f.score !== 0)
					.map((f) => ({ name: f.name, score: f.score }));

				syncedProfiles.push({
					name: arrProfile.name,
					action: isUpdate ? 'updated' : 'created',
					language: arrProfile.language?.name ?? 'N/A',
					cutoffFormatScore: arrProfile.cutoffFormatScore,
					minFormatScore: arrProfile.minFormatScore,
					formats: scoredFormats
				});
			} catch (error) {
				const errorDetails = this.extractErrorDetails(error);
				await logger.error(`Failed to sync quality profile "${arrProfile.name}"`, {
					source: 'Sync:QualityProfiles',
					meta: {
						instanceId: this.instanceId,
						profileName: arrProfile.name,
						request: arrProfile,
						...errorDetails
					}
				});
			}
		}

		return syncedProfiles;
	}

	/**
	 * Extract error details from HTTP errors for logging
	 * Attempts to get response body, status, etc.
	 */
	private extractErrorDetails(error: unknown): Record<string, unknown> {
		const details: Record<string, unknown> = {
			error: error instanceof Error ? error.message : 'Unknown error'
		};

		// Check if it's an HTTP error with response details
		if (error && typeof error === 'object') {
			const err = error as Record<string, unknown>;

			// Common HTTP client error properties
			if ('status' in err) details.status = err.status;
			if ('statusText' in err) details.statusText = err.statusText;
			if ('response' in err) details.response = err.response;
			if ('body' in err) details.responseBody = err.body;
			if ('data' in err) details.responseData = err.data;

			// If error has a cause, include it
			if (err.cause) details.cause = err.cause;
		}

		return details;
	}

	// Base class abstract methods - implemented but not used since we override sync()
	protected async fetchFromPcd(): Promise<unknown[]> {
		return [];
	}

	protected transformToArr(_pcdData: unknown[]): unknown[] {
		return [];
	}

	protected async pushToArr(_arrData: unknown[]): Promise<void> {
		// Not used - logic is in sync()
	}
}
