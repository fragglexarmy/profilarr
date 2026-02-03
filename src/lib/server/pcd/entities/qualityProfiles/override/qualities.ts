import { getCache } from '$pcd/index.ts';
import type { WriteResult } from '$pcd/index.ts';
import type { OrderedItem } from '$shared/pcd/display.ts';
import { qualities as readQualities } from '../qualities/read.ts';
import { updateQualities } from '../qualities/update.ts';
import type { StoredOpMetadata, StoredDesiredState } from '$pcd/conflicts/overrideUtils.ts';
import { orderedItemsEqual } from '$pcd/conflicts/overrideUtils.ts';
import { resolveProfileName } from './resolve.ts';

/**
 * Extract the desired ordered items from the op's desired_state.
 * Qualities ops store: ordered_items: { from: [...], to: [...] }
 */
function resolveOrderedItems(desiredState: StoredDesiredState): OrderedItem[] | null {
	const field = desiredState.ordered_items;
	if (!field) return null;

	// { from, to } diff — take the "to" side
	if (typeof field === 'object' && 'to' in field) {
		const to = (field as { to: unknown }).to;
		if (Array.isArray(to)) return to as OrderedItem[];
	}

	// Flat array (unlikely but handle it)
	if (Array.isArray(field)) return field as OrderedItem[];

	return null;
}

export async function overrideQualities(
	databaseId: number,
	metadata: StoredOpMetadata | null,
	desiredState: StoredDesiredState | null
): Promise<WriteResult> {
	if (!desiredState) {
		return { success: false, error: 'Missing desired state for qualities override' };
	}

	const cache = getCache(databaseId);
	if (!cache) {
		return { success: false, error: 'Cache not available' };
	}

	const profileName = await resolveProfileName(cache, databaseId, metadata, desiredState);
	if (!profileName) {
		return { success: false, error: 'Quality profile not found for qualities override' };
	}

	const desiredItems = resolveOrderedItems(desiredState);
	if (!desiredItems) {
		return { success: true };
	}

	// Read current qualities to compare
	const currentData = await readQualities(cache, databaseId, profileName);
	if (orderedItemsEqual(currentData.orderedItems, desiredItems)) {
		return { success: true };
	}

	return updateQualities({
		databaseId,
		cache,
		layer: 'user',
		profileName,
		input: { orderedItems: desiredItems }
	});
}
