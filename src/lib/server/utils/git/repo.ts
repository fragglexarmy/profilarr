/**
 * Git repository commands
 */

import { execGit, execGitSafe } from './exec.ts';
import type { RepoInfo } from './types.ts';
import { getCachedRepoInfo } from '../github/cache.ts';

/**
 * Validate that a repository URL is accessible and detect if it's private
 */
async function validateRepository(
	repositoryUrl: string,
	personalAccessToken?: string
): Promise<boolean> {
	const githubPattern = /^https:\/\/github\.com\/([\w-]+)\/([\w-]+)\/?$/;
	const normalizedUrl = repositoryUrl.replace(/\.git$/, '');
	const match = normalizedUrl.match(githubPattern);

	if (!match) {
		throw new Error(
			'Repository URL must be a valid GitHub repository (https://github.com/username/repo)'
		);
	}

	const [, owner, repo] = match;
	const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;

	const headers: Record<string, string> = {
		Accept: 'application/vnd.github+json',
		'X-GitHub-Api-Version': '2022-11-28',
		'User-Agent': 'Profilarr'
	};

	// Try without auth first
	const response = await globalThis.fetch(apiUrl, { headers });

	if (response.ok) {
		const data = await response.json();
		return data.private === true;
	}

	// If 404/403 and we have PAT, try with auth
	if ((response.status === 404 || response.status === 403) && personalAccessToken) {
		const authResponse = await globalThis.fetch(apiUrl, {
			headers: { ...headers, Authorization: `Bearer ${personalAccessToken}` }
		});

		if (authResponse.ok) {
			const data = await authResponse.json();
			return data.private === true;
		}

		if (authResponse.status === 404) {
			throw new Error('Repository not found. Please check the URL.');
		}

		if (authResponse.status === 401 || authResponse.status === 403) {
			throw new Error('Unable to access repository. Please check your Personal Access Token.');
		}

		throw new Error(`GitHub API error: ${authResponse.status}`);
	}

	if (response.status === 404 || response.status === 403) {
		throw new Error(
			'Repository not found or is private. Provide a Personal Access Token for private repos.'
		);
	}

	throw new Error(`GitHub API error: ${response.status}`);
}

/**
 * Clone a git repository
 * Returns true if private, false if public
 */
export async function clone(
	repositoryUrl: string,
	targetPath: string,
	branch?: string,
	personalAccessToken?: string
): Promise<boolean> {
	const isPrivate = await validateRepository(repositoryUrl, personalAccessToken);

	const args = ['clone'];
	if (branch) args.push('--branch', branch);

	let authUrl = repositoryUrl;
	if (personalAccessToken) {
		authUrl = repositoryUrl.replace(
			'https://github.com',
			`https://${personalAccessToken}@github.com`
		);
	}

	args.push(authUrl, targetPath);

	const command = new Deno.Command('git', {
		args,
		stdout: 'piped',
		stderr: 'piped',
		env: {
			GIT_TERMINAL_PROMPT: '0',
			GIT_ASKPASS: 'echo',
			GIT_SSH_COMMAND: 'ssh -o BatchMode=yes',
			GIT_CONFIG_COUNT: '1',
			GIT_CONFIG_KEY_0: 'credential.helper',
			GIT_CONFIG_VALUE_0: ''
		}
	});

	const { code, stderr } = await command.output();
	if (code !== 0) {
		throw new Error(`Git clone failed: ${new TextDecoder().decode(stderr)}`);
	}

	return isPrivate;
}

/**
 * Fetch from remote (silent)
 */
export async function fetch(repoPath: string): Promise<void> {
	await execGitSafe(['fetch', '--quiet'], repoPath);
}

/**
 * Pull from remote
 */
export async function pull(repoPath: string): Promise<void> {
	await execGit(['pull'], repoPath);
}

/**
 * Push to remote
 */
export async function push(repoPath: string): Promise<void> {
	await execGit(['push'], repoPath);
}

/**
 * Checkout a branch
 */
export async function checkout(repoPath: string, branch: string): Promise<void> {
	await execGit(['checkout', branch], repoPath);
}

/**
 * Reset repository to match remote (discards local changes)
 */
export async function resetToRemote(repoPath: string): Promise<void> {
	const branch = await execGit(['branch', '--show-current'], repoPath);
	await execGit(['reset', '--hard', `origin/${branch}`], repoPath);
}

/**
 * Stage files
 */
export async function stage(repoPath: string, filepaths: string[]): Promise<void> {
	for (const filepath of filepaths) {
		// Convert to relative path if it starts with the repo path
		const relativePath = filepath.startsWith(repoPath + '/')
			? filepath.slice(repoPath.length + 1)
			: filepath;
		await execGit(['add', relativePath], repoPath);
	}
}

/**
 * Commit staged changes
 */
export async function commit(repoPath: string, message: string): Promise<void> {
	await execGit(['commit', '-m', message], repoPath);
}

/**
 * Get repository info from GitHub API (cached)
 */
export async function getRepoInfo(
	repositoryUrl: string,
	personalAccessToken?: string | null
): Promise<RepoInfo | null> {
	return getCachedRepoInfo(repositoryUrl, personalAccessToken);
}
