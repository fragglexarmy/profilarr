/**
 * Update a delay profile operation
 */

import type { PCDCache } from '../../cache.ts';
import { writeOperation, type OperationLayer } from '../../writer.ts';
import type { DelayProfilesRow, PreferredProtocol } from '$shared/pcd/display.ts';
import { logger } from '$logger/logger.ts';

interface UpdateDelayProfileInput {
	name: string;
	preferredProtocol: PreferredProtocol;
	usenetDelay: number;
	torrentDelay: number;
	bypassIfHighestQuality: boolean;
	bypassIfAboveCfScore: boolean;
	minimumCfScore: number;
}

interface UpdateDelayProfileOptions {
	databaseId: number;
	cache: PCDCache;
	layer: OperationLayer;
	/** The current profile data (for value guards) */
	current: DelayProfilesRow;
	/** The new values */
	input: UpdateDelayProfileInput;
}

/**
 * Update a delay profile by writing an operation to the specified layer
 * Uses value guards to detect conflicts with upstream changes
 */
export async function update(options: UpdateDelayProfileOptions) {
	const { databaseId, cache, layer, current, input } = options;
	const db = cache.kb;

	// Determine delay values based on protocol (schema has CHECK constraints)
	// only_torrent -> usenet_delay must be NULL
	// only_usenet -> torrent_delay must be NULL
	const usenetDelay = input.preferredProtocol === 'only_torrent' ? null : input.usenetDelay;
	const torrentDelay = input.preferredProtocol === 'only_usenet' ? null : input.torrentDelay;

	// minimum_custom_format_score must be NULL if bypass_if_above_custom_format_score is false
	const minimumCfScore = input.bypassIfAboveCfScore ? input.minimumCfScore : null;

	// Update the delay profile with value guards
	const updateProfile = db
		.updateTable('delay_profiles')
		.set({
			name: input.name,
			preferred_protocol: input.preferredProtocol,
			usenet_delay: usenetDelay,
			torrent_delay: torrentDelay,
			bypass_if_highest_quality: input.bypassIfHighestQuality ? 1 : 0,
			bypass_if_above_custom_format_score: input.bypassIfAboveCfScore ? 1 : 0,
			minimum_custom_format_score: minimumCfScore
		})
		.where('id', '=', current.id)
		// Value guards - ensure current values match what we expect
		.where('name', '=', current.name)
		.where('preferred_protocol', '=', current.preferred_protocol)
		.compile();

	// Log what's being changed
	const changes: Record<string, { from: unknown; to: unknown }> = {};

	if (current.name !== input.name) {
		changes.name = { from: current.name, to: input.name };
	}
	if (current.preferred_protocol !== input.preferredProtocol) {
		changes.preferredProtocol = { from: current.preferred_protocol, to: input.preferredProtocol };
	}
	if (current.usenet_delay !== usenetDelay) {
		changes.usenetDelay = { from: current.usenet_delay, to: usenetDelay };
	}
	if (current.torrent_delay !== torrentDelay) {
		changes.torrentDelay = { from: current.torrent_delay, to: torrentDelay };
	}
	if (current.bypass_if_highest_quality !== input.bypassIfHighestQuality) {
		changes.bypassIfHighestQuality = {
			from: current.bypass_if_highest_quality,
			to: input.bypassIfHighestQuality
		};
	}
	if (current.bypass_if_above_custom_format_score !== input.bypassIfAboveCfScore) {
		changes.bypassIfAboveCfScore = {
			from: current.bypass_if_above_custom_format_score,
			to: input.bypassIfAboveCfScore
		};
	}
	if (current.minimum_custom_format_score !== minimumCfScore) {
		changes.minimumCfScore = { from: current.minimum_custom_format_score, to: minimumCfScore };
	}

	await logger.info(`Save delay profile "${input.name}"`, {
		source: 'DelayProfile',
		meta: {
			id: current.id,
			changes
		}
	});

	// Write the operation with metadata
	const isRename = input.name !== current.name;

	const result = await writeOperation({
		databaseId,
		layer,
		description: `update-delay-profile-${input.name}`,
		queries: [updateProfile],
		metadata: {
			operation: 'update',
			entity: 'delay_profile',
			name: input.name,
			...(isRename && { previousName: current.name })
		}
	});

	return result;
}
