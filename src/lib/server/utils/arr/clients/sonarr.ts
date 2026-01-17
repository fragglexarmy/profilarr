import { BaseArrClient } from '../base.ts';
import type { SonarrSeries, SonarrRelease, ArrCommand, RenamePreviewItem } from '../types.ts';

/**
 * Sonarr API client
 * Extends BaseArrClient with Sonarr-specific API methods
 */
export class SonarrClient extends BaseArrClient {
	// =========================================================================
	// Series Methods
	// =========================================================================

	/**
	 * Get all series
	 */
	getAllSeries(): Promise<SonarrSeries[]> {
		return this.get<SonarrSeries[]>(`/api/${this.apiVersion}/series`);
	}

	/**
	 * Get a specific series by ID
	 * Includes season information with statistics
	 */
	getSeries(seriesId: number): Promise<SonarrSeries> {
		return this.get<SonarrSeries>(`/api/${this.apiVersion}/series/${seriesId}`);
	}

	// =========================================================================
	// Search Methods
	// =========================================================================

	/**
	 * Get releases for a series/season (interactive search)
	 * Queries all configured indexers and returns available releases
	 * Note: This can take several seconds as it searches indexers in real-time
	 *
	 * @param seriesId - The series ID
	 * @param seasonNumber - The season number to search
	 * @returns Array of releases from indexers
	 */
	getReleases(seriesId: number, seasonNumber: number): Promise<SonarrRelease[]> {
		return this.get<SonarrRelease[]>(
			`/api/${this.apiVersion}/release?seriesId=${seriesId}&seasonNumber=${seasonNumber}`
		);
	}

	/**
	 * Get only season pack releases (fullSeason: true)
	 * Filters out individual episode releases
	 */
	async getSeasonPackReleases(seriesId: number, seasonNumber: number): Promise<SonarrRelease[]> {
		const releases = await this.getReleases(seriesId, seasonNumber);
		return releases.filter((r) => r.fullSeason);
	}

	// =========================================================================
	// Rename Methods
	// =========================================================================

	/**
	 * Get rename preview for a series
	 * Shows what files would be renamed without making changes
	 */
	getRenamePreview(seriesId: number): Promise<RenamePreviewItem[]> {
		return this.get<RenamePreviewItem[]>(`/api/${this.apiVersion}/rename?seriesId=${seriesId}`);
	}

	/**
	 * Trigger rename for series
	 * Renames all files that need renaming for the given series IDs
	 */
	renameSeries(seriesIds: number[]): Promise<ArrCommand> {
		return this.post<ArrCommand>(`/api/${this.apiVersion}/command`, {
			name: 'RenameSeries',
			seriesIds
		});
	}

	/**
	 * Refresh series (update metadata from sources)
	 * Required after folder rename to update paths
	 */
	refreshSeries(seriesIds: number[]): Promise<ArrCommand> {
		return this.post<ArrCommand>(`/api/${this.apiVersion}/command`, {
			name: 'RefreshSeries',
			seriesIds
		});
	}

	/**
	 * Rename series folders using the series editor endpoint
	 * Bulk updates series root folder paths
	 */
	renameSeriesFolders(seriesIds: number[], rootFolderPath: string): Promise<void> {
		return this.put<void>(`/api/${this.apiVersion}/series/editor`, {
			seriesIds,
			rootFolderPath,
			moveFiles: true
		});
	}
}
