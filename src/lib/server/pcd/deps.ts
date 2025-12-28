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

	// Clean up dependency - keep only ops folder and pcd.json
	const keepItems = new Set(['ops', 'pcd.json']);

	for await (const entry of Deno.readDir(depPath)) {
		if (!keepItems.has(entry.name)) {
			const itemPath = `${depPath}/${entry.name}`;
			await Deno.remove(itemPath, { recursive: true });
		}
	}
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
 * Get the installed version of a dependency from its manifest
 */
async function getInstalledVersion(pcdPath: string, repoName: string): Promise<string | null> {
	const depManifestPath = `${pcdPath}/deps/${repoName}/pcd.json`;
	try {
		const content = await Deno.readTextFile(depManifestPath);
		const manifest = JSON.parse(content);
		return manifest.version ?? null;
	} catch {
		return null;
	}
}

/**
 * Sync dependencies - update any that have changed versions in the manifest
 * Called after pulling updates to ensure dependencies match manifest requirements
 */
export async function syncDependencies(pcdPath: string): Promise<void> {
	const manifest = await loadManifest(pcdPath);

	if (!manifest.dependencies || Object.keys(manifest.dependencies).length === 0) {
		return;
	}

	// Ensure deps directory exists
	const depsDir = `${pcdPath}/deps`;
	await Deno.mkdir(depsDir, { recursive: true });

	for (const [repoUrl, requiredVersion] of Object.entries(manifest.dependencies)) {
		const repoName = getRepoName(repoUrl);
		const depPath = getDependencyPath(pcdPath, repoName);
		const installedVersion = await getInstalledVersion(pcdPath, repoName);

		if (installedVersion === requiredVersion) {
			// Already at correct version, skip
			continue;
		}

		// Version changed or not installed - remove old and clone new
		try {
			await Deno.remove(depPath, { recursive: true });
		} catch {
			// Didn't exist, that's fine
		}

		// Clone and checkout the new version
		await cloneDependency(pcdPath, repoUrl, requiredVersion);

		// Validate the dependency's manifest
		await loadManifest(depPath);
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
