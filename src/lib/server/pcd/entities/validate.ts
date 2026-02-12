/**
 * Portable Entity Validation
 *
 * Validates portable data shape before deserialization.
 * Returns a string error message if invalid, null if valid.
 */

import type { EntityType } from '$shared/pcd/portable.ts';

const VALID_PROTOCOLS = new Set(['prefer_usenet', 'prefer_torrent', 'only_usenet', 'only_torrent']);

export function validatePortableData(entityType: EntityType, data: Record<string, unknown>): string | null {
	switch (entityType) {
		case 'delay_profile':
			return validateDelayProfile(data);
		default:
			return null;
	}
}

function validateDelayProfile(data: Record<string, unknown>): string | null {
	if (typeof data.name !== 'string' || !data.name.trim()) {
		return 'data.name is required and must be a non-empty string';
	}
	if (!VALID_PROTOCOLS.has(data.preferredProtocol as string)) {
		return `data.preferredProtocol must be one of: ${[...VALID_PROTOCOLS].join(', ')}`;
	}
	if (typeof data.usenetDelay !== 'number') {
		return 'data.usenetDelay must be a number';
	}
	if (typeof data.torrentDelay !== 'number') {
		return 'data.torrentDelay must be a number';
	}
	if (typeof data.bypassIfHighestQuality !== 'boolean') {
		return 'data.bypassIfHighestQuality must be a boolean';
	}
	if (typeof data.bypassIfAboveCfScore !== 'boolean') {
		return 'data.bypassIfAboveCfScore must be a boolean';
	}
	if (typeof data.minimumCfScore !== 'number') {
		return 'data.minimumCfScore must be a number';
	}
	return null;
}
