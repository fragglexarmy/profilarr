/**
 * Git status queries (read-only)
 */

import { execGit, execGitSafe } from './exec.ts';
import { fetch } from './repo.ts';
import type { GitStatus, UpdateInfo } from './types.ts';

/**
 * Get current branch name
 */
export async function getBranch(repoPath: string): Promise<string> {
	return await execGit(['branch', '--show-current'], repoPath);
}

/**
 * Get full repository status
 */
export async function getStatus(repoPath: string): Promise<GitStatus> {
	const branch = await getBranch(repoPath);

	// Fetch to get accurate ahead/behind
	await fetch(repoPath);

	// Get ahead/behind
	let ahead = 0;
	let behind = 0;
	const revOutput = await execGitSafe(
		['rev-list', '--left-right', '--count', `origin/${branch}...HEAD`],
		repoPath
	);
	if (revOutput) {
		const parts = revOutput.split('\t').map(n => parseInt(n, 10) || 0);
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

	const behindOutput = await execGitSafe(['rev-list', '--count', `HEAD..${remoteBranch}`], repoPath);
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
