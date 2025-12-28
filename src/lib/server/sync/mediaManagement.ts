/**
 * Media management syncer
 * Syncs media management settings from PCD to arr instances
 */

import { BaseSyncer } from './base.ts';
import { arrSyncQueries } from '$db/queries/arrSync.ts';

export class MediaManagementSyncer extends BaseSyncer {
	protected get syncType(): string {
		return 'media management';
	}

	protected async fetchFromPcd(): Promise<unknown[]> {
		const syncConfig = arrSyncQueries.getMediaManagementSync(this.instanceId);

		// Check if any settings are configured
		if (
			!syncConfig.namingDatabaseId &&
			!syncConfig.qualityDefinitionsDatabaseId &&
			!syncConfig.mediaSettingsDatabaseId
		) {
			return [];
		}

		// TODO: Implement
		// Fetch each configured setting from PCD:
		// 1. Naming settings (if namingDatabaseId is set)
		// 2. Quality definitions (if qualityDefinitionsDatabaseId is set)
		// 3. Media settings (if mediaSettingsDatabaseId is set)

		throw new Error('Not implemented: fetchFromPcd');
	}

	protected transformToArr(pcdData: unknown[]): unknown[] {
		// TODO: Implement
		// Transform PCD settings to arr API format
		// Each setting type has different structure:
		// - Naming: renaming rules, folder format, etc.
		// - Quality definitions: min/max sizes per quality
		// - Media settings: file management options

		throw new Error('Not implemented: transformToArr');
	}

	protected async pushToArr(arrData: unknown[]): Promise<void> {
		// TODO: Implement
		// Push settings to arr instance
		// These are typically PUT operations to update existing config
		// rather than creating new items

		throw new Error('Not implemented: pushToArr');
	}
}
