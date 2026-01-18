/**
 * Git operations for PCD operation files
 */

import { execGitSafe } from './exec.ts';
import { pull, stage, commit, push } from './repo.ts';
import type { OperationFile, CommitResult } from './types.ts';

/**
 * Parse metadata from an operation file header
 */
async function parseOperationMetadata(filepath: string): Promise<Partial<OperationFile>> {
	try {
		const content = await Deno.readTextFile(filepath);
		const lines = content.split('\n');
		const metadata: Partial<OperationFile> = {};

		for (const line of lines) {
			if (!line.startsWith('-- @')) break;

			const match = line.match(/^-- @(\w+): (.+)$/);
			if (match) {
				const [, key, value] = match;
				if (key === 'operation') metadata.operation = value;
				if (key === 'entity') metadata.entity = value;
				if (key === 'name') metadata.name = value;
				if (key === 'previous_name') metadata.previousName = value;
			}
		}

		return metadata;
	} catch {
		return {};
	}
}

/**
 * Extract leading number from filename for natural sorting
 */
function extractOpNumber(filename: string): number {
	const match = filename.match(/^(\d+)\./);
	return match ? parseInt(match[1], 10) : Infinity;
}

/**
 * Get metadata for known config files
 */
function getConfigFileMetadata(filename: string, status: string): Partial<OperationFile> {
	const isNew = status.includes('?') || status.includes('A');
	const operation = isNew ? 'create' : 'update';

	if (filename === 'pcd.json') {
		return { operation, entity: 'manifest', name: 'pcd.json' };
	}
	if (filename === 'README.md') {
		return { operation, entity: 'readme', name: 'README.md' };
	}
	if (filename.startsWith('tweaks/') && filename.endsWith('.sql')) {
		return { operation, entity: 'tweak', name: filename.replace('tweaks/', '') };
	}

	return { operation, entity: null, name: filename };
}

/**
 * Get uncommitted files from the repository (excludes user_ops/ and deps/)
 */
export async function getUncommittedOps(repoPath: string): Promise<OperationFile[]> {
	const files: OperationFile[] = [];

	const output = await execGitSafe(['status', '--porcelain'], repoPath);
	if (!output) return files;

	for (const line of output.split('\n')) {
		if (!line.trim()) continue;

		const status = line.substring(0, 2);
		// Git porcelain format: XY PATH (2 char status + variable whitespace + path)
		const rawFilename = line.substring(2).trimStart();

		// Skip user_ops and deps directories
		if (rawFilename.startsWith('user_ops/') || rawFilename.startsWith('deps/')) continue;

		// Only include new/modified files
		if (status.includes('?') || status.includes('A') || status.includes('M')) {
			const filepath = `${repoPath}/${rawFilename}`;

			let metadata: Partial<OperationFile> = {};

			if (rawFilename.startsWith('ops/') && rawFilename.endsWith('.sql')) {
				// Parse metadata from SQL file header
				metadata = await parseOperationMetadata(filepath);
			} else {
				// Get metadata for config files
				metadata = getConfigFileMetadata(rawFilename, status);
			}

			files.push({
				filename: rawFilename.startsWith('ops/') ? rawFilename.replace('ops/', '') : rawFilename,
				filepath,
				operation: metadata.operation || null,
				entity: metadata.entity || null,
				name: metadata.name || null,
				previousName: metadata.previousName || null
			});
		}
	}

	// Sort: ops/ files by number first, then other files alphabetically
	files.sort((a, b) => {
		const aIsOps = a.filepath.includes('/ops/');
		const bIsOps = b.filepath.includes('/ops/');

		if (aIsOps && bIsOps) {
			return extractOpNumber(a.filename) - extractOpNumber(b.filename);
		}
		if (aIsOps) return -1;
		if (bIsOps) return 1;
		return a.filename.localeCompare(b.filename);
	});

	return files;
}

/**
 * Get the highest operation number from COMMITTED files in ops/
 */
export async function getMaxOpNumber(repoPath: string): Promise<number> {
	let maxNum = 0;

	// Use git ls-tree to only count committed files
	const output = await execGitSafe(['ls-tree', '--name-only', 'HEAD', 'ops/'], repoPath);
	if (!output) return maxNum;

	for (const filename of output.split('\n')) {
		if (!filename.trim() || !filename.endsWith('.sql')) continue;
		const basename = filename.replace('ops/', '');
		const match = basename.match(/^(\d+)\./);
		if (match) {
			const num = parseInt(match[1], 10);
			if (num > maxNum) maxNum = num;
		}
	}

	return maxNum;
}

/**
 * Discard uncommitted files (restore or delete them)
 */
export async function discardOps(repoPath: string, filepaths: string[]): Promise<void> {
	for (const filepath of filepaths) {
		// Security: ensure file is within repo and not in user_ops or deps
		if (
			!filepath.startsWith(repoPath + '/') ||
			filepath.startsWith(repoPath + '/user_ops/') ||
			filepath.startsWith(repoPath + '/deps/')
		) {
			continue;
		}

		try {
			// Check if file is tracked by git
			const relativePath = filepath.replace(repoPath + '/', '');
			const isTracked = await execGitSafe(['ls-files', relativePath], repoPath);

			if (isTracked?.trim()) {
				// Tracked file - restore from git
				await execGitSafe(['checkout', 'HEAD', '--', relativePath], repoPath);
			} else {
				// Untracked file - delete it
				await Deno.remove(filepath);
			}
		} catch {
			// File might already be deleted or restored
		}
	}
}

/**
 * Add files: pull, renumber ops if needed, commit, push
 *
 * TODO: This functionality needs to be redesigned. The current approach of
 * pull -> renumber -> commit -> push has race conditions and edge cases that
 * can leave files in inconsistent states if any step fails mid-way. We also want to better
 * choose when / how renumbering happens (e.g., only when there are conflicts).
 */
export async function addOps(
	repoPath: string,
	filepaths: string[],
	message: string
): Promise<CommitResult> {
	if (!message?.trim()) {
		return { success: false, error: 'Commit message is required' };
	}

	if (filepaths.length === 0) {
		return { success: false, error: 'No files selected' };
	}

	try {
		// 1. Pull latest
		await pull(repoPath);

		// 2. Get max op number after pull
		let maxNum = await getMaxOpNumber(repoPath);

		// 3. Process files - renumber ops/, keep others as-is
		const filesToStage: string[] = [];
		const opsPath = `${repoPath}/ops`;

		for (const filepath of filepaths) {
			// Security: ensure file is within repo and not in user_ops or deps
			if (
				!filepath.startsWith(repoPath + '/') ||
				filepath.startsWith(repoPath + '/user_ops/') ||
				filepath.startsWith(repoPath + '/deps/')
			) {
				continue;
			}

			// Handle ops/ files with renumbering
			if (filepath.startsWith(repoPath + '/ops/')) {
				const filename = filepath.split('/').pop()!;
				const match = filename.match(/^(\d+)\.(.+)$/);

				if (match) {
					const currentNum = parseInt(match[1], 10);
					const rest = match[2];

					if (currentNum <= maxNum) {
						// Need to renumber
						maxNum++;
						const newFilename = `${maxNum}.${rest}`;
						const newFilepath = `${opsPath}/${newFilename}`;
						await Deno.rename(filepath, newFilepath);
						filesToStage.push(newFilepath);
					} else {
						maxNum = Math.max(maxNum, currentNum);
						filesToStage.push(filepath);
					}
				} else {
					filesToStage.push(filepath);
				}
			} else {
				// Non-ops files - stage as-is
				filesToStage.push(filepath);
			}
		}

		// 4. Stage files
		await stage(repoPath, filesToStage);

		// 5. Commit
		await commit(repoPath, message.trim());

		// 6. Push
		await push(repoPath);

		return { success: true };
	} catch (err) {
		return { success: false, error: String(err) };
	}
}
