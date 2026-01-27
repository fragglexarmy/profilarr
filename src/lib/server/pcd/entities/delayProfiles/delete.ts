/**
 * Delete a delay profile operation
 */

import type { PCDCache } from '$pcd/index.ts';
import { writeOperation, type OperationLayer } from '$pcd/index.ts';
import type { DelayProfilesRow } from '$shared/pcd/display.ts';

interface DeleteDelayProfileOptions {
	databaseId: number;
	cache: PCDCache;
	layer: OperationLayer;
	/** The current profile data (for value guards) */
	current: DelayProfilesRow;
}

/**
 * Delete a delay profile by writing an operation to the specified layer
 * Uses value guards to detect conflicts with upstream changes
 */
export async function remove(options: DeleteDelayProfileOptions) {
	const { databaseId, cache, layer, current } = options;
	const db = cache.kb;

	// Delete the delay profile with value guards
	const deleteProfile = db
		.deleteFrom('delay_profiles')
		.where('id', '=', current.id)
		// Value guards - ensure this is the profile we expect
		.where('name', '=', current.name)
		.where('preferred_protocol', '=', current.preferred_protocol)
		.compile();

	const result = await writeOperation({
		databaseId,
		layer,
		description: `delete-delay-profile-${current.name}`,
		queries: [deleteProfile],
		metadata: {
			operation: 'delete',
			entity: 'delay_profile',
			name: current.name
		}
	});

	return result;
}
