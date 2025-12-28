/**
 * Quality profile syncer
 * Syncs quality profiles from PCD to arr instances
 */

import { BaseSyncer } from './base.ts';
import { arrSyncQueries } from '$db/queries/arrSync.ts';

export class QualityProfileSyncer extends BaseSyncer {
	protected get syncType(): string {
		return 'quality profiles';
	}

	protected async fetchFromPcd(): Promise<unknown[]> {
		const syncConfig = arrSyncQueries.getQualityProfilesSync(this.instanceId);

		if (syncConfig.selections.length === 0) {
			return [];
		}

		// TODO: Implement
		// For each selection (databaseId, profileId):
		// 1. Get the PCD cache for the database
		// 2. Fetch the quality profile by ID
		// 3. Also fetch dependent custom formats

		throw new Error('Not implemented: fetchFromPcd');
	}

	protected transformToArr(pcdData: unknown[]): unknown[] {
		// TODO: Implement
		// Transform PCD quality profile format to arr API format
		// This includes:
		// - Quality profile structure
		// - Custom format mappings
		// - Quality tier configurations

		throw new Error('Not implemented: transformToArr');
	}

	protected async pushToArr(arrData: unknown[]): Promise<void> {
		// TODO: Implement
		// 1. First sync custom formats (dependencies)
		// 2. Then sync quality profiles
		// 3. Handle create vs update (check if profile exists by name)

		throw new Error('Not implemented: pushToArr');
	}
}
