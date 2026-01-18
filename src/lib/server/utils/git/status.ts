/**
 * Git status queries (read-only)
 */

import { execGit, execGitSafe } from './exec.ts';
import { fetch } from './repo.ts';
import type { GitStatus, UpdateInfo, Commit, IncomingChanges } from './types.ts';

/**
 * Get current branch name
 */
export async function getBranch(repoPath: string): Promise<string> {
	return await execGit(['branch', '--show-current'], repoPath);
}

export interface GetStatusOptions {
	/** Whether to fetch from remote first (slower but accurate ahead/behind) */
	fetch?: boolean;
}

/**
 * Get full repository status
 */
export async function getStatus(
	repoPath: string,
	options: GetStatusOptions = {}
): Promise<GitStatus> {
	const branch = await getBranch(repoPath);

	// Optionally fetch to get accurate ahead/behind
	if (options.fetch) {
		await fetch(repoPath);
	}

	// Get ahead/behind
	let ahead = 0;
	let behind = 0;
	const revOutput = await execGitSafe(
		['rev-list', '--left-right', '--count', `origin/${branch}...HEAD`],
		repoPath
	);
	if (revOutput) {
		const parts = revOutput.split('\t').map((n) => parseInt(n, 10) || 0);
		behind = parts[0] || 0;
		ahead = parts[1] || 0;
	}

	// Get file status
	const statusOutput = await execGit(['status', '--porcelain'], repoPath);
	const untracked: string[] = [];
	const modified: string[] = [];
	const staged: string[] = [];

	for (const line of statusOutput.split('\n')) {
		if (!line.trim()) continue;

		const status = line.substring(0, 2);
		const file = line.substring(3);

		if (status.startsWith('??')) {
			untracked.push(file);
		} else if (status[1] === 'M' || status[1] === 'D') {
			modified.push(file);
		}
		if (status[0] === 'M' || status[0] === 'A' || status[0] === 'D') {
			staged.push(file);
		}
	}

	const isDirty = untracked.length > 0 || modified.length > 0 || staged.length > 0;

	return { branch, isDirty, ahead, behind, untracked, modified, staged };
}

/**
 * Check for updates from remote
 */
export async function checkForUpdates(repoPath: string): Promise<UpdateInfo> {
	await fetch(repoPath);

	const branch = await getBranch(repoPath);
	const remoteBranch = `origin/${branch}`;

	const currentLocalCommit = await execGit(['rev-parse', 'HEAD'], repoPath);

	let latestRemoteCommit: string;
	try {
		latestRemoteCommit = await execGit(['rev-parse', remoteBranch], repoPath);
	} catch {
		return {
			hasUpdates: false,
			commitsBehind: 0,
			commitsAhead: 0,
			latestRemoteCommit: currentLocalCommit,
			currentLocalCommit
		};
	}

	const behindOutput = await execGitSafe(
		['rev-list', '--count', `HEAD..${remoteBranch}`],
		repoPath
	);
	const commitsBehind = parseInt(behindOutput || '0') || 0;

	const aheadOutput = await execGitSafe(['rev-list', '--count', `${remoteBranch}..HEAD`], repoPath);
	const commitsAhead = parseInt(aheadOutput || '0') || 0;

	return {
		hasUpdates: commitsBehind > 0,
		commitsBehind,
		commitsAhead,
		latestRemoteCommit,
		currentLocalCommit
	};
}

/**
 * Get the last push timestamp (approximate via remote HEAD)
 */
export async function getLastPushed(repoPath: string): Promise<string | null> {
	const branch = await getBranch(repoPath);
	const output = await execGitSafe(['log', '-1', '--format=%cI', `origin/${branch}`], repoPath);
	return output || null;
}

/**
 * Get all local and remote branches
 */
export async function getBranches(repoPath: string): Promise<string[]> {
	// Get all branches (local and remote tracking)
	const output = await execGit(['branch', '-a', '--format=%(refname:short)'], repoPath);
	const branches = output
		.split('\n')
		.map((b) => b.trim())
		.filter((b) => b && !b.includes('HEAD'))
		.map((b) => b.replace(/^origin\//, ''))
		.filter((b, i, arr) => arr.indexOf(b) === i); // dedupe

	return branches;
}

/**
 * Check if a file is uncommitted (untracked or staged but not yet committed)
 */
export async function isFileUncommitted(repoPath: string, filepath: string): Promise<boolean> {
	// Get relative path from repo root
	const relativePath = filepath.startsWith(repoPath + '/')
		? filepath.slice(repoPath.length + 1)
		: filepath;

	const output = await execGitSafe(['status', '--porcelain', relativePath], repoPath);
	if (!output) return false;

	const status = output.substring(0, 2);
	// ?? = untracked, A = added (staged), AM = added and modified
	return status.startsWith('??') || status[0] === 'A';
}

/**
 * Get diff for specific files (or all uncommitted changes if no files specified)
 * Handles both tracked (modified) and untracked (new) files
 */
export async function getDiff(repoPath: string, filepaths?: string[]): Promise<string> {
	const diffs: string[] = [];

	if (filepaths && filepaths.length > 0) {
		for (const filepath of filepaths) {
			const relativePath = filepath.startsWith(repoPath + '/')
				? filepath.slice(repoPath.length + 1)
				: filepath;

			// Check if file is untracked
			const status = await execGitSafe(['status', '--porcelain', relativePath], repoPath);
			const isUntracked = status?.startsWith('??');

			if (isUntracked) {
				// For untracked files, show as new file diff
				try {
					const content = await Deno.readTextFile(`${repoPath}/${relativePath}`);
					diffs.push(`diff --git a/${relativePath} b/${relativePath}
new file mode 100644
--- /dev/null
+++ b/${relativePath}
@@ -0,0 +1,${content.split('\n').length} @@
${content
	.split('\n')
	.map((line) => '+' + line)
	.join('\n')}`);
				} catch {
					// File doesn't exist or can't be read
				}
			} else {
				// For tracked files, use git diff
				const diff = await execGitSafe(['diff', 'HEAD', '--', relativePath], repoPath);
				if (diff) {
					diffs.push(diff);
				}
			}
		}
	} else {
		// No specific files, get all changes
		const diff = await execGitSafe(['diff', 'HEAD'], repoPath);
		if (diff) {
			diffs.push(diff);
		}
	}

	return diffs.join('\n\n');
}

/**
 * Get commit history
 */
export async function getCommits(repoPath: string, limit: number = 50): Promise<Commit[]> {
	// Format: hash|shortHash|message|author|email|date
	const format = '%H|%h|%s|%an|%ae|%cI';
	const output = await execGit(['log', `--format=${format}`, `-${limit}`], repoPath);

	if (!output.trim()) {
		return [];
	}

	const commits: Commit[] = [];

	for (const line of output.split('\n')) {
		if (!line.trim()) continue;

		const [hash, shortHash, message, author, authorEmail, date] = line.split('|');

		// Get files changed for this commit
		const statOutput = await execGitSafe(
			['diff-tree', '--no-commit-id', '--name-only', '-r', hash],
			repoPath
		);
		const files = statOutput ? statOutput.split('\n').filter((f) => f.trim()) : [];

		commits.push({
			hash,
			shortHash,
			message,
			author,
			authorEmail,
			date,
			files
		});
	}

	return commits;
}

/**
 * Get incoming changes (commits available to pull from remote)
 */
export async function getIncomingChanges(repoPath: string): Promise<IncomingChanges> {
	await fetch(repoPath);

	const branch = await getBranch(repoPath);
	const remoteBranch = `origin/${branch}`;

	// Count commits behind
	const countOutput = await execGitSafe(['rev-list', '--count', `HEAD..${remoteBranch}`], repoPath);
	const commitsBehind = parseInt(countOutput || '0') || 0;

	if (commitsBehind === 0) {
		return { hasUpdates: false, commitsBehind: 0, commits: [] };
	}

	// Get commit details for incoming commits
	const format = '%H|%h|%s|%an|%ae|%cI';
	const output = await execGit(['log', `--format=${format}`, `HEAD..${remoteBranch}`], repoPath);

	const commits: Commit[] = [];

	for (const line of output.split('\n')) {
		if (!line.trim()) continue;

		const [hash, shortHash, message, author, authorEmail, date] = line.split('|');

		// Get files changed for this commit
		const filesOutput = await execGitSafe(
			['diff-tree', '--no-commit-id', '--name-only', '-r', hash],
			repoPath
		);
		const files = filesOutput ? filesOutput.split('\n').filter((f) => f.trim()) : [];

		commits.push({
			hash,
			shortHash,
			message,
			author,
			authorEmail,
			date,
			files
		});
	}

	return { hasUpdates: true, commitsBehind, commits };
}
