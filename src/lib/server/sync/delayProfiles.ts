/**
 * Delay profile syncer
 * Syncs delay profiles from PCD to arr instances
 *
 * Profile ordering is derived from selection order (first selected = highest priority)
 */

import { BaseSyncer } from './base.ts';
import { arrSyncQueries } from '$db/queries/arrSync.ts';
import { getCache } from '$lib/server/pcd/cache.ts';
import { get as getDelayProfile } from '$lib/server/pcd/queries/delayProfiles/get.ts';
import type { DelayProfileTableRow } from '$lib/server/pcd/queries/delayProfiles/types.ts';
import { logger } from '$logger/logger.ts';

/**
 * Intermediate type for transformed profiles (before tag ID resolution)
 */
interface TransformedDelayProfile {
	name: string;
	enableUsenet: boolean;
	enableTorrent: boolean;
	preferredProtocol: string;
	usenetDelay: number;
	torrentDelay: number;
	bypassIfHighestQuality: boolean;
	bypassIfAboveCustomFormatScore: boolean;
	minimumCustomFormatScore: number;
	tagNames: string[];
}

export class DelayProfileSyncer extends BaseSyncer {
	protected get syncType(): string {
		return 'delay profiles';
	}

	protected async fetchFromPcd(): Promise<DelayProfileTableRow[]> {
		const syncConfig = arrSyncQueries.getDelayProfilesSync(this.instanceId);

		await logger.debug(`Starting fetch - ${syncConfig.selections.length} selections configured`, {
			source: 'Sync:DelayProfiles:fetch',
			meta: {
				instanceId: this.instanceId,
				selections: syncConfig.selections
			}
		});

		if (syncConfig.selections.length === 0) {
			return [];
		}

		const profiles: DelayProfileTableRow[] = [];

		for (const selection of syncConfig.selections) {
			await logger.debug(
				`Fetching profile ${selection.profileId} from database ${selection.databaseId}`,
				{
					source: 'Sync:DelayProfiles:fetch',
					meta: { instanceId: this.instanceId, ...selection }
				}
			);

			const cache = getCache(selection.databaseId);

			if (!cache) {
				await logger.warn(`PCD cache not found for database ${selection.databaseId}`, {
					source: 'Sync:DelayProfiles:fetch',
					meta: { instanceId: this.instanceId, databaseId: selection.databaseId }
				});
				continue;
			}

			const profile = await getDelayProfile(cache, selection.profileId);

			if (!profile) {
				await logger.warn(`Profile ${selection.profileId} not found`, {
					source: 'Sync:DelayProfiles:fetch',
					meta: { instanceId: this.instanceId, ...selection }
				});
				continue;
			}

			await logger.debug(`Found profile: "${profile.name}" (${profile.preferred_protocol})`, {
				source: 'Sync:DelayProfiles:fetch',
				meta: {
					instanceId: this.instanceId,
					profileId: profile.id,
					name: profile.name,
					protocol: profile.preferred_protocol,
					usenetDelay: profile.usenet_delay,
					torrentDelay: profile.torrent_delay,
					tags: profile.tags.map((t) => t.name)
				}
			});

			profiles.push(profile);
		}

		await logger.debug(`Fetch complete - ${profiles.length} profiles retrieved`, {
			source: 'Sync:DelayProfiles:fetch',
			meta: {
				instanceId: this.instanceId,
				profiles: profiles.map((p) => p.name)
			}
		});

		return profiles;
	}

	protected transformToArr(pcdData: DelayProfileTableRow[]): TransformedDelayProfile[] {
		// Note: transformToArr is sync but logger is async - we'll log in pushToArr instead
		return pcdData.map((profile) => {
			let enableUsenet = true;
			let enableTorrent = true;
			let preferredProtocol = 'usenet';

			switch (profile.preferred_protocol) {
				case 'prefer_usenet':
					enableUsenet = true;
					enableTorrent = true;
					preferredProtocol = 'usenet';
					break;
				case 'prefer_torrent':
					enableUsenet = true;
					enableTorrent = true;
					preferredProtocol = 'torrent';
					break;
				case 'only_usenet':
					enableUsenet = true;
					enableTorrent = false;
					preferredProtocol = 'usenet';
					break;
				case 'only_torrent':
					enableUsenet = false;
					enableTorrent = true;
					preferredProtocol = 'torrent';
					break;
			}

			return {
				name: profile.name,
				enableUsenet,
				enableTorrent,
				preferredProtocol,
				usenetDelay: profile.usenet_delay ?? 0,
				torrentDelay: profile.torrent_delay ?? 0,
				bypassIfHighestQuality: profile.bypass_if_highest_quality,
				bypassIfAboveCustomFormatScore: profile.bypass_if_above_custom_format_score,
				minimumCustomFormatScore: profile.minimum_custom_format_score ?? 0,
				tagNames: profile.tags.map((t) => t.name)
			};
		});
	}

	protected async pushToArr(arrData: TransformedDelayProfile[]): Promise<void> {
		await logger.debug(`Starting push - ${arrData.length} profiles to sync`, {
			source: 'Sync:DelayProfiles:push',
			meta: {
				instanceId: this.instanceId,
				profiles: arrData.map((p) => ({
					name: p.name,
					enableUsenet: p.enableUsenet,
					enableTorrent: p.enableTorrent,
					preferredProtocol: p.preferredProtocol,
					usenetDelay: p.usenetDelay,
					torrentDelay: p.torrentDelay,
					tags: p.tagNames
				}))
			}
		});

		// Get existing delay profiles and tags from arr
		const existingProfiles = await this.client.getDelayProfiles();
		const existingTags = await this.client.getTags();

		await logger.debug(
			`Found ${existingProfiles.length} existing profiles, ${existingTags.length} tags in arr`,
			{
				source: 'Sync:DelayProfiles:push',
				meta: {
					instanceId: this.instanceId,
					existingProfiles: existingProfiles.map((p) => ({ id: p.id, tags: p.tags })),
					existingTags: existingTags.map((t) => ({ id: t.id, label: t.label }))
				}
			}
		);

		// Delete all non-default delay profiles (id !== 1)
		const profilesToDelete = existingProfiles.filter((p) => p.id !== 1);

		if (profilesToDelete.length > 0) {
			await logger.debug(`Deleting ${profilesToDelete.length} existing profiles`, {
				source: 'Sync:DelayProfiles:push',
				meta: { instanceId: this.instanceId, deletingIds: profilesToDelete.map((p) => p.id) }
			});

			for (const profile of profilesToDelete) {
				await this.client.deleteDelayProfile(profile.id);
			}

			await logger.debug(`Deleted ${profilesToDelete.length} profiles`, {
				source: 'Sync:DelayProfiles:push',
				meta: { instanceId: this.instanceId }
			});
		}

		// Build tag name -> ID map
		const tagMap = new Map<string, number>();
		for (const tag of existingTags) {
			tagMap.set(tag.label.toLowerCase(), tag.id);
		}

		// Create new profiles with explicit ordering (lower order = higher priority)
		for (let i = 0; i < arrData.length; i++) {
			const profile = arrData[i];
			// Resolve tag names to IDs, creating missing tags
			const tagIds: number[] = [];

			for (const tagName of profile.tagNames) {
				let tagId = tagMap.get(tagName.toLowerCase());

				if (tagId === undefined) {
					await logger.debug(`Creating missing tag "${tagName}"`, {
						source: 'Sync:DelayProfiles:push',
						meta: { instanceId: this.instanceId, tagName }
					});

					const newTag = await this.client.createTag(tagName);
					tagId = newTag.id;
					tagMap.set(tagName.toLowerCase(), tagId);

					await logger.debug(`Created tag "${tagName}" with id=${tagId}`, {
						source: 'Sync:DelayProfiles:push',
						meta: { instanceId: this.instanceId, tagName, tagId }
					});
				}

				tagIds.push(tagId);
			}

			const profileData = {
				enableUsenet: profile.enableUsenet,
				enableTorrent: profile.enableTorrent,
				preferredProtocol: profile.preferredProtocol,
				usenetDelay: profile.usenetDelay,
				torrentDelay: profile.torrentDelay,
				bypassIfHighestQuality: profile.bypassIfHighestQuality,
				bypassIfAboveCustomFormatScore: profile.bypassIfAboveCustomFormatScore,
				minimumCustomFormatScore: profile.minimumCustomFormatScore,
				order: i + 1, // Selection order determines priority (1 = highest)
				tags: tagIds
			};

			await logger.debug(`Creating profile "${profile.name}"`, {
				source: 'Sync:DelayProfiles:push',
				meta: { instanceId: this.instanceId, profileData }
			});

			const created = await this.client.createDelayProfile(profileData);

			await logger.debug(`Created profile "${profile.name}" with id=${created.id}`, {
				source: 'Sync:DelayProfiles:push',
				meta: { instanceId: this.instanceId, createdId: created.id }
			});
		}

		await logger.debug(`Push complete - ${arrData.length} profiles created`, {
			source: 'Sync:DelayProfiles:push',
			meta: { instanceId: this.instanceId }
		});
	}
}
