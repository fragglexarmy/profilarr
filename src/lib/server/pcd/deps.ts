/**
 * PCD Dependency Resolution
 * Handles cloning and managing PCD dependencies
 */

import * as git from '$utils/git/git.ts';
import { loadManifest } from './manifest.ts';

/**
 * Extract repository name from GitHub URL
 * https://github.com/Dictionarry-Hub/schema -> schema
 */
function getRepoName(repoUrl: string): string {
	const parts = repoUrl.split('/');
	return parts[parts.length - 1];
}

/**
 * Get dependency path
 */
function getDependencyPath(pcdPath: string, repoName: string): string {
	return `${pcdPath}/deps/${repoName}`;
}

/**
 * Clone and checkout a single dependency
 */
async function cloneDependency(
	pcdPath: string,
	repoUrl: string,
	version: string
): Promise<void> {
	const repoName = getRepoName(repoUrl);
	const depPath = getDependencyPath(pcdPath, repoName);

	// Clone the dependency repository
	await git.clone(repoUrl, depPath);

	// Checkout the specific version tag
	await git.checkout(depPath, version);
}

/**
 * Process all dependencies for a PCD
 * Clones dependencies and validates their manifests
 */
export async function processDependencies(pcdPath: string): Promise<void> {
	// Load the PCD's manifest
	const manifest = await loadManifest(pcdPath);

	// Skip if no dependencies
	if (!manifest.dependencies || Object.keys(manifest.dependencies).length === 0) {
		return;
	}

	// Create deps directory
	const depsDir = `${pcdPath}/deps`;
	await Deno.mkdir(depsDir, { recursive: true });

	// Process each dependency
	for (const [repoUrl, version] of Object.entries(manifest.dependencies)) {
		// Clone and checkout the dependency
		await cloneDependency(pcdPath, repoUrl, version);

		// Validate the dependency's manifest
		const repoName = getRepoName(repoUrl);
		const depPath = getDependencyPath(pcdPath, repoName);
		await loadManifest(depPath);

		// TODO (post-2.0): Recursively process nested dependencies
		// For now, we only support one level of dependencies
	}
}

/**
 * Check if all dependencies are present and valid
 */
export async function validateDependencies(pcdPath: string): Promise<boolean> {
	try {
		const manifest = await loadManifest(pcdPath);

		// If no dependencies, validation passes
		if (!manifest.dependencies || Object.keys(manifest.dependencies).length === 0) {
			return true;
		}

		for (const [repoUrl] of Object.entries(manifest.dependencies)) {
			const repoName = getRepoName(repoUrl);
			const depPath = getDependencyPath(pcdPath, repoName);

			// Check if dependency directory exists
			try {
				await Deno.stat(depPath);
			} catch {
				return false;
			}

			// Validate dependency manifest
			await loadManifest(depPath);
		}

		return true;
	} catch {
		return false;
	}
}
