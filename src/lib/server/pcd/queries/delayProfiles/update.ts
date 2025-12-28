/**
 * Update a delay profile operation
 */

import type { PCDCache } from '../../cache.ts';
import { writeOperation, type OperationLayer } from '../../writer.ts';
import type { PreferredProtocol, DelayProfileTableRow } from './types.ts';

export interface UpdateDelayProfileInput {
	name: string;
	tags: string[];
	preferredProtocol: PreferredProtocol;
	usenetDelay: number;
	torrentDelay: number;
	bypassIfHighestQuality: boolean;
	bypassIfAboveCfScore: boolean;
	minimumCfScore: number;
}

export interface UpdateDelayProfileOptions {
	databaseId: number;
	cache: PCDCache;
	layer: OperationLayer;
	/** The current profile data (for value guards) */
	current: DelayProfileTableRow;
	/** The new values */
	input: UpdateDelayProfileInput;
}

/**
 * Escape a string for SQL
 */
function esc(value: string): string {
	return value.replace(/'/g, "''");
}

/**
 * Update a delay profile by writing an operation to the specified layer
 * Uses value guards to detect conflicts with upstream changes
 */
export async function update(options: UpdateDelayProfileOptions) {
	const { databaseId, cache, layer, current, input } = options;
	const db = cache.kb;

	const queries = [];

	// Determine delay values based on protocol (schema has CHECK constraints)
	// only_torrent -> usenet_delay must be NULL
	// only_usenet -> torrent_delay must be NULL
	const usenetDelay = input.preferredProtocol === 'only_torrent' ? null : input.usenetDelay;
	const torrentDelay = input.preferredProtocol === 'only_usenet' ? null : input.torrentDelay;

	// minimum_custom_format_score must be NULL if bypass_if_above_custom_format_score is false
	const minimumCfScore = input.bypassIfAboveCfScore ? input.minimumCfScore : null;

	// 1. Update the delay profile with value guards
	// We build the WHERE clause to include current values as guards
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

	queries.push(updateProfile);

	// 2. Handle tag changes
	const currentTagNames = current.tags.map(t => t.name);
	const newTagNames = input.tags;

	// Tags to remove
	const tagsToRemove = currentTagNames.filter(t => !newTagNames.includes(t));
	for (const tagName of tagsToRemove) {
		const removeTag = {
			sql: `DELETE FROM delay_profile_tags WHERE delay_profile_id = dp('${esc(current.name)}') AND tag_id = tag('${esc(tagName)}')`,
			parameters: [],
			query: {} as never
		};
		queries.push(removeTag);
	}

	// Tags to add
	const tagsToAdd = newTagNames.filter(t => !currentTagNames.includes(t));
	for (const tagName of tagsToAdd) {
		// Insert tag if not exists
		const insertTag = db
			.insertInto('tags')
			.values({ name: tagName })
			.onConflict((oc) => oc.column('name').doNothing())
			.compile();

		queries.push(insertTag);

		// Link tag to delay profile
		// Use current.name for lookup since the profile might have been renamed
		const profileName = input.name !== current.name ? input.name : current.name;
		const linkTag = {
			sql: `INSERT INTO delay_profile_tags (delay_profile_id, tag_id) VALUES (dp('${esc(profileName)}'), tag('${esc(tagName)}'))`,
			parameters: [],
			query: {} as never
		};

		queries.push(linkTag);
	}

	// Write the operation with metadata
	// Include previousName if this is a rename
	const isRename = input.name !== current.name;

	const result = await writeOperation({
		databaseId,
		layer,
		description: `update-delay-profile-${input.name}`,
		queries,
		metadata: {
			operation: 'update',
			entity: 'delay_profile',
			name: input.name,
			...(isRename && { previousName: current.name })
		}
	});

	return result;
}
