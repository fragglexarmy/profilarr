/**
 * Create a delay profile operation
 */

import type { PCDCache } from '../../cache.ts';
import { writeOperation, type OperationLayer } from '../../writer.ts';
import type { PreferredProtocol } from './types.ts';

export interface CreateDelayProfileInput {
	name: string;
	tags: string[];
	preferredProtocol: PreferredProtocol;
	usenetDelay: number;
	torrentDelay: number;
	bypassIfHighestQuality: boolean;
	bypassIfAboveCfScore: boolean;
	minimumCfScore: number;
}

export interface CreateDelayProfileOptions {
	databaseId: number;
	cache: PCDCache;
	layer: OperationLayer;
	input: CreateDelayProfileInput;
}

/**
 * Create a delay profile by writing an operation to the specified layer
 */
export async function create(options: CreateDelayProfileOptions) {
	const { databaseId, cache, layer, input } = options;
	const db = cache.kb;

	const queries = [];

	// Determine delay values based on protocol (schema has CHECK constraints)
	// only_torrent -> usenet_delay must be NULL
	// only_usenet -> torrent_delay must be NULL
	const usenetDelay = input.preferredProtocol === 'only_torrent' ? null : input.usenetDelay;
	const torrentDelay = input.preferredProtocol === 'only_usenet' ? null : input.torrentDelay;

	// minimum_custom_format_score must be NULL if bypass_if_above_custom_format_score is false
	const minimumCfScore = input.bypassIfAboveCfScore ? input.minimumCfScore : null;

	// 1. Insert the delay profile
	const insertProfile = db
		.insertInto('delay_profiles')
		.values({
			name: input.name,
			preferred_protocol: input.preferredProtocol,
			usenet_delay: usenetDelay,
			torrent_delay: torrentDelay,
			bypass_if_highest_quality: input.bypassIfHighestQuality ? 1 : 0,
			bypass_if_above_custom_format_score: input.bypassIfAboveCfScore ? 1 : 0,
			minimum_custom_format_score: minimumCfScore
		})
		.compile();

	queries.push(insertProfile);

	// 2. Insert tags (create if not exist, then link)
	for (const tagName of input.tags) {
		// Insert tag if not exists
		const insertTag = db
			.insertInto('tags')
			.values({ name: tagName })
			.onConflict((oc) => oc.column('name').doNothing())
			.compile();

		queries.push(insertTag);

		// Link tag to delay profile using helper functions
		// We use raw SQL here since we need the dp() and tag() helper functions
		const linkTag = {
			sql: `INSERT INTO delay_profile_tags (delay_profile_id, tag_id) VALUES (dp('${input.name.replace(/'/g, "''")}'), tag('${tagName.replace(/'/g, "''")}'))`,
			parameters: [],
			query: {} as never
		};

		queries.push(linkTag);
	}

	// Write the operation
	const result = await writeOperation({
		databaseId,
		layer,
		description: `create-delay-profile-${input.name}`,
		queries,
		metadata: {
			operation: 'create',
			entity: 'delay_profile',
			name: input.name
		}
	});

	return result;
}
