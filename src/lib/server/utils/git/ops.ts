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
 * Get uncommitted operation files from ops/ directory
 */
export async function getUncommittedOps(repoPath: string): Promise<OperationFile[]> {
	const files: OperationFile[] = [];

	const output = await execGitSafe(['status', '--porcelain', 'ops/'], repoPath);
	if (!output) return files;

	for (const line of output.split('\n')) {
		if (!line.trim()) continue;

		const status = line.substring(0, 2);
		const filename = line.substring(3).trim();

		// Only include new/modified .sql files
		if ((status.includes('?') || status.includes('A') || status.includes('M')) && filename.endsWith('.sql')) {
			const filepath = `${repoPath}/${filename}`;
			const metadata = await parseOperationMetadata(filepath);

			files.push({
				filename: filename.replace('ops/', ''),
				filepath,
				operation: metadata.operation || null,
				entity: metadata.entity || null,
				name: metadata.name || null,
				previousName: metadata.previousName || null
			});
		}
	}

	return files;
}

/**
 * Get the highest operation number in ops/
 */
export async function getMaxOpNumber(repoPath: string): Promise<number> {
	let maxNum = 0;
	const opsPath = `${repoPath}/ops`;

	try {
		for await (const entry of Deno.readDir(opsPath)) {
			if (entry.isFile && entry.name.endsWith('.sql')) {
				const match = entry.name.match(/^(\d+)\./);
				if (match) {
					const num = parseInt(match[1], 10);
					if (num > maxNum) maxNum = num;
				}
			}
		}
	} catch {
		// Directory might not exist
	}

	return maxNum;
}

/**
 * Discard operation files (delete them)
 */
export async function discardOps(repoPath: string, filepaths: string[]): Promise<void> {
	for (const filepath of filepaths) {
		// Security: ensure file is within ops directory
		if (!filepath.startsWith(repoPath + '/ops/')) {
			continue;
		}

		try {
			await Deno.remove(filepath);
		} catch {
			// File might already be deleted
		}
	}
}

/**
 * Add operation files: pull, renumber if needed, commit, push
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

		// 3. Renumber and collect files to stage
		const filesToStage: string[] = [];
		const opsPath = `${repoPath}/ops`;

		for (const filepath of filepaths) {
			if (!filepath.startsWith(repoPath + '/ops/')) continue;

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
