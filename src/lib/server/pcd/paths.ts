/**
 * Helper functions for PCD paths
 */

import { config } from '$config';

/**
 * Get the filesystem path for a PCD repository
 */
export function getPCDPath(uuid: string): string {
	return `${config.paths.databases}/${uuid}`;
}

/**
 * Get the manifest file path for a PCD repository
 */
export function getManifestPath(uuid: string): string {
	return `${getPCDPath(uuid)}/pcd.json`;
}
