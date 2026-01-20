/**
 * Media management syncer
 * Syncs media management settings from PCD to arr instances
 *
 * Handles three types of configs:
 * 1. Media Settings (downloadPropersAndRepacks, enableMediaInfo)
 * 2. Naming (movie/episode naming formats, folder formats)
 * 3. Quality Definitions (TODO)
 *
 * Flow for each:
 * 1. GET existing config from arr
 * 2. Fetch settings from PCD
 * 3. Modify only the fields we care about
 * 4. PUT the full config back to arr
 */

import { BaseSyncer, type SyncResult } from './base.ts';
import { arrSyncQueries } from '$db/queries/arrSync.ts';
import { getCache, type PCDCache } from '$lib/server/pcd/cache.ts';
import { getRadarr, getSonarr } from '$pcd/queries/mediaManagement/get.ts';
import type { MediaSettings, RadarrNaming, SonarrNaming } from '$lib/shared/mediaManagement.ts';
import type { QualityDefinition } from '$pcd/queries/mediaManagement/types.ts';
import { colonReplacementToDb, multiEpisodeStyleToDb } from '$lib/shared/mediaManagement.ts';
import type {
	ArrType,
	ArrPropersAndRepacks,
	RadarrNamingConfig,
	SonarrNamingConfig
} from '$arr/types.ts';
import { logger } from '$logger/logger.ts';

export class MediaManagementSyncer extends BaseSyncer {
	private instanceType: ArrType;

	constructor(
		client: ConstructorParameters<typeof BaseSyncer>[0],
		instanceId: number,
		instanceName: string,
		instanceType: ArrType
	) {
		super(client, instanceId, instanceName);
		this.instanceType = instanceType;
	}

	protected get syncType(): string {
		return 'media management';
	}

	/**
	 * Override sync to handle multiple config types
	 */
	override async sync(): Promise<SyncResult> {
		const syncConfig = arrSyncQueries.getMediaManagementSync(this.instanceId);
		let totalSynced = 0;
		const errors: string[] = [];

		await logger.info(`Starting media management sync for "${this.instanceName}"`, {
			source: 'Sync:MediaManagement',
			meta: {
				instanceId: this.instanceId,
				hasMediaSettings: !!syncConfig.mediaSettingsDatabaseId,
				hasNaming: !!syncConfig.namingDatabaseId,
				hasQualityDefs: !!syncConfig.qualityDefinitionsDatabaseId
			}
		});

		// Sync media settings if configured
		if (syncConfig.mediaSettingsDatabaseId) {
			try {
				const synced = await this.syncMediaSettings(syncConfig.mediaSettingsDatabaseId);
				if (synced) totalSynced++;
			} catch (error) {
				const msg = error instanceof Error ? error.message : 'Unknown error';
				errors.push(`Media settings: ${msg}`);
				await logger.error(`Failed to sync media settings`, {
					source: 'Sync:MediaManagement',
					meta: { instanceId: this.instanceId, error: msg }
				});
			}
		}

		// Sync naming if configured
		if (syncConfig.namingDatabaseId) {
			try {
				const synced = await this.syncNaming(syncConfig.namingDatabaseId);
				if (synced) totalSynced++;
			} catch (error) {
				const msg = error instanceof Error ? error.message : 'Unknown error';
				errors.push(`Naming: ${msg}`);
				await logger.error(`Failed to sync naming`, {
					source: 'Sync:MediaManagement',
					meta: { instanceId: this.instanceId, error: msg }
				});
			}
		}

		// Sync quality definitions if configured
		if (syncConfig.qualityDefinitionsDatabaseId) {
			try {
				const synced = await this.syncQualityDefinitions(syncConfig.qualityDefinitionsDatabaseId);
				if (synced) totalSynced++;
			} catch (error) {
				const msg = error instanceof Error ? error.message : 'Unknown error';
				errors.push(`Quality definitions: ${msg}`);
				await logger.error(`Failed to sync quality definitions`, {
					source: 'Sync:MediaManagement',
					meta: { instanceId: this.instanceId, error: msg }
				});
			}
		}

		const success = errors.length === 0;
		const result: SyncResult = {
			success,
			itemsSynced: totalSynced,
			error: errors.length > 0 ? errors.join('; ') : undefined
		};

		await logger.info(`Completed media management sync for "${this.instanceName}"`, {
			source: 'Sync:MediaManagement',
			meta: { instanceId: this.instanceId, ...result }
		});

		return result;
	}

	// =========================================================================
	// Media Settings
	// =========================================================================

	private async syncMediaSettings(databaseId: number): Promise<boolean> {
		const cache = getCache(databaseId);
		if (!cache) {
			await logger.warn(`PCD cache not found for database ${databaseId}`, {
				source: 'Sync:MediaSettings',
				meta: { instanceId: this.instanceId }
			});
			return false;
		}

		// Fetch from PCD
		let mediaSettings: MediaSettings | null = null;
		if (this.instanceType === 'radarr') {
			mediaSettings = (await getRadarr(cache)).mediaSettings;
		} else if (this.instanceType === 'sonarr') {
			mediaSettings = (await getSonarr(cache)).mediaSettings;
		}

		if (!mediaSettings) {
			await logger.debug('No media settings found in PCD', {
				source: 'Sync:MediaSettings',
				meta: { instanceId: this.instanceId }
			});
			return false;
		}

		// GET existing config
		const existingConfig = await this.client.getMediaManagementConfig();

		// Transform and update
		const updatedConfig = {
			...existingConfig,
			downloadPropersAndRepacks: this.mapPropersRepacks(mediaSettings.propers_repacks),
			enableMediaInfo: mediaSettings.enable_media_info
		};

		await logger.debug('Updating media settings', {
			source: 'Sync:MediaSettings',
			meta: {
				instanceId: this.instanceId,
				propersRepacks: updatedConfig.downloadPropersAndRepacks,
				enableMediaInfo: updatedConfig.enableMediaInfo
			}
		});

		await this.client.updateMediaManagementConfig(updatedConfig);
		return true;
	}

	private mapPropersRepacks(pcdValue: string): ArrPropersAndRepacks {
		const mapping: Record<string, ArrPropersAndRepacks> = {
			doNotPrefer: 'doNotPrefer',
			preferAndUpgrade: 'preferAndUpgrade',
			doNotUpgradeAutomatically: 'doNotUpgrade'
		};
		return mapping[pcdValue] ?? 'doNotPrefer';
	}

	// =========================================================================
	// Naming
	// =========================================================================

	private async syncNaming(databaseId: number): Promise<boolean> {
		const cache = getCache(databaseId);
		if (!cache) {
			await logger.warn(`PCD cache not found for database ${databaseId}`, {
				source: 'Sync:Naming',
				meta: { instanceId: this.instanceId }
			});
			return false;
		}

		if (this.instanceType === 'radarr') {
			return this.syncRadarrNaming(cache, databaseId);
		} else if (this.instanceType === 'sonarr') {
			return this.syncSonarrNaming(cache, databaseId);
		}

		await logger.warn(`Unsupported instance type for naming sync: ${this.instanceType}`, {
			source: 'Sync:Naming',
			meta: { instanceId: this.instanceId }
		});
		return false;
	}

	private async syncRadarrNaming(
		cache: ReturnType<typeof getCache>,
		databaseId: number
	): Promise<boolean> {
		if (!cache) return false;

		const naming = (await getRadarr(cache)).naming;
		if (!naming) {
			await logger.debug('No Radarr naming found in PCD', {
				source: 'Sync:Naming',
				meta: { instanceId: this.instanceId, databaseId }
			});
			return false;
		}

		// GET existing config
		const existingConfig = (await this.client.getNamingConfig()) as RadarrNamingConfig;

		// Transform and update
		const updatedConfig: RadarrNamingConfig = {
			...existingConfig,
			renameMovies: naming.rename,
			replaceIllegalCharacters: naming.replace_illegal_characters,
			colonReplacementFormat: naming.colon_replacement_format,
			standardMovieFormat: naming.movie_format,
			movieFolderFormat: naming.movie_folder_format
		};

		await logger.debug('Updating Radarr naming', {
			source: 'Sync:Naming',
			meta: {
				instanceId: this.instanceId,
				renameMovies: updatedConfig.renameMovies,
				colonReplacementFormat: updatedConfig.colonReplacementFormat
			}
		});

		await this.client.updateNamingConfig(updatedConfig);
		return true;
	}

	private async syncSonarrNaming(
		cache: ReturnType<typeof getCache>,
		databaseId: number
	): Promise<boolean> {
		if (!cache) return false;

		const naming = (await getSonarr(cache)).naming;
		if (!naming) {
			await logger.debug('No Sonarr naming found in PCD', {
				source: 'Sync:Naming',
				meta: { instanceId: this.instanceId, databaseId }
			});
			return false;
		}

		// GET existing config
		const existingConfig = (await this.client.getNamingConfig()) as SonarrNamingConfig;

		// Transform and update - Sonarr uses integers for enums
		const updatedConfig: SonarrNamingConfig = {
			...existingConfig,
			renameEpisodes: naming.rename,
			replaceIllegalCharacters: naming.replace_illegal_characters,
			colonReplacementFormat: colonReplacementToDb(naming.colon_replacement_format),
			customColonReplacementFormat: naming.custom_colon_replacement_format,
			multiEpisodeStyle: multiEpisodeStyleToDb(naming.multi_episode_style),
			standardEpisodeFormat: naming.standard_episode_format,
			dailyEpisodeFormat: naming.daily_episode_format,
			animeEpisodeFormat: naming.anime_episode_format,
			seriesFolderFormat: naming.series_folder_format,
			seasonFolderFormat: naming.season_folder_format
		};

		await logger.debug('Updating Sonarr naming', {
			source: 'Sync:Naming',
			meta: {
				instanceId: this.instanceId,
				renameEpisodes: updatedConfig.renameEpisodes,
				colonReplacementFormat: updatedConfig.colonReplacementFormat,
				multiEpisodeStyle: updatedConfig.multiEpisodeStyle
			}
		});

		await this.client.updateNamingConfig(updatedConfig);
		return true;
	}

	// =========================================================================
	// Quality Definitions
	// =========================================================================

	private async syncQualityDefinitions(databaseId: number): Promise<boolean> {
		const cache = getCache(databaseId);
		if (!cache) {
			await logger.warn(`PCD cache not found for database ${databaseId}`, {
				source: 'Sync:QualityDefinitions',
				meta: { instanceId: this.instanceId }
			});
			return false;
		}

		// Fetch quality definitions from PCD
		let pcdDefinitions: QualityDefinition[] = [];
		if (this.instanceType === 'radarr') {
			pcdDefinitions = (await getRadarr(cache)).qualityDefinitions;
		} else if (this.instanceType === 'sonarr') {
			pcdDefinitions = (await getSonarr(cache)).qualityDefinitions;
		}

		if (pcdDefinitions.length === 0) {
			await logger.debug('No quality definitions found in PCD', {
				source: 'Sync:QualityDefinitions',
				meta: { instanceId: this.instanceId }
			});
			return false;
		}

		// Get quality API mappings from PCD (maps quality_name -> api_name)
		const apiMappings = await this.getQualityApiMappings(cache);

		// GET existing quality definitions from ARR
		const arrDefinitions = await this.client.getQualityDefinitions();

		// Build map of ARR quality name (lowercase) -> definition
		const arrDefMap = new Map<string, (typeof arrDefinitions)[0]>();
		for (const def of arrDefinitions) {
			if (def.quality.name) {
				arrDefMap.set(def.quality.name.toLowerCase(), def);
			}
		}

		// Update ARR definitions with PCD values
		let updatedCount = 0;
		for (const pcdDef of pcdDefinitions) {
			// Get the API name for this quality
			const apiName = apiMappings.get(pcdDef.quality_name.toLowerCase());
			if (!apiName) {
				await logger.debug(`No API mapping found for quality "${pcdDef.quality_name}"`, {
					source: 'Sync:QualityDefinitions',
					meta: { instanceId: this.instanceId, qualityName: pcdDef.quality_name }
				});
				continue;
			}

			// Find matching ARR definition
			const arrDef = arrDefMap.get(apiName.toLowerCase());
			if (!arrDef) {
				await logger.debug(`No ARR definition found for quality "${apiName}"`, {
					source: 'Sync:QualityDefinitions',
					meta: { instanceId: this.instanceId, apiName }
				});
				continue;
			}

			// Update the definition
			arrDef.minSize = pcdDef.min_size;
			arrDef.maxSize = pcdDef.max_size;
			arrDef.preferredSize = pcdDef.preferred_size;
			updatedCount++;
		}

		if (updatedCount === 0) {
			await logger.debug('No quality definitions matched for update', {
				source: 'Sync:QualityDefinitions',
				meta: { instanceId: this.instanceId }
			});
			return false;
		}

		await logger.debug(`Updating ${updatedCount} quality definitions`, {
			source: 'Sync:QualityDefinitions',
			meta: { instanceId: this.instanceId, updatedCount }
		});

		// PUT the full array back
		await this.client.updateQualityDefinitions(arrDefinitions);
		return true;
	}

	/**
	 * Get quality API mappings from PCD
	 * Returns a map of quality_name (lowercase) -> api_name
	 */
	private async getQualityApiMappings(cache: PCDCache): Promise<Map<string, string>> {
		const arrType = this.instanceType;
		const rows = await cache.kb
			.selectFrom('quality_api_mappings as qam')
			.where('qam.arr_type', '=', arrType)
			.select(['qam.quality_name', 'qam.api_name'])
			.execute();

		const map = new Map<string, string>();
		for (const row of rows) {
			map.set(row.quality_name.toLowerCase(), row.api_name);
		}
		return map;
	}

	// =========================================================================
	// Base class abstract methods (not used since we override sync())
	// =========================================================================

	protected async fetchFromPcd(): Promise<unknown[]> {
		return [];
	}

	protected transformToArr(_pcdData: unknown[]): unknown[] {
		return [];
	}

	protected async pushToArr(_arrData: unknown[]): Promise<void> {
		// Not used
	}
}
