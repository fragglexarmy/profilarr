/**
 * Git utility functions for managing database repositories
 */

export interface GitStatus {
	currentBranch: string;
	isDirty: boolean;
	untracked: string[];
	modified: string[];
	staged: string[];
}

export interface UpdateInfo {
	hasUpdates: boolean;
	commitsBehind: number;
	commitsAhead: number;
	latestRemoteCommit: string;
	currentLocalCommit: string;
}

/**
 * Execute a git command with sandboxed environment (no system credentials)
 */
async function execGit(args: string[], cwd?: string): Promise<string> {
	const command = new Deno.Command('git', {
		args,
		cwd,
		stdout: 'piped',
		stderr: 'piped',
		env: {
			// Disable all credential helpers and interactive prompts
			GIT_TERMINAL_PROMPT: '0',       // Fail instead of prompting (git 2.3+)
			GIT_ASKPASS: 'echo',            // Return empty on credential requests
			GIT_SSH_COMMAND: 'ssh -o BatchMode=yes',  // Disable SSH password prompts
			// Clear credential helpers via environment config
			GIT_CONFIG_COUNT: '1',
			GIT_CONFIG_KEY_0: 'credential.helper',
			GIT_CONFIG_VALUE_0: ''
		}
	});

	const { code, stdout, stderr } = await command.output();

	if (code !== 0) {
		const errorMessage = new TextDecoder().decode(stderr);
		throw new Error(`Git command failed: ${errorMessage}`);
	}

	return new TextDecoder().decode(stdout).trim();
}

/**
 * Validate that a repository URL is accessible and detect if it's private using GitHub API
 * Returns true if the repository is private, false if public
 */
async function validateRepository(repositoryUrl: string, personalAccessToken?: string): Promise<boolean> {
	// Validate GitHub URL format and extract owner/repo
	const githubPattern = /^https:\/\/github\.com\/([\w-]+)\/([\w-]+)\/?$/;
	const normalizedUrl = repositoryUrl.replace(/\.git$/, '');
	const match = normalizedUrl.match(githubPattern);

	if (!match) {
		throw new Error('Repository URL must be a valid GitHub repository (https://github.com/username/repo)');
	}

	const [, owner, repo] = match;
	const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;

	// First try without authentication to check if it's public
	try {
		const response = await globalThis.fetch(apiUrl, {
			headers: {
				'Accept': 'application/vnd.github+json',
				'X-GitHub-Api-Version': '2022-11-28',
				'User-Agent': 'Profilarr'
			}
		});

		if (response.ok) {
			const data = await response.json();
			// Repository is accessible without auth
			return data.private === true;
		}

		// 404 or 403 means repo doesn't exist or is private
		if (response.status === 404 || response.status === 403) {
			// If we have a PAT, try with authentication
			if (personalAccessToken) {
				const authResponse = await globalThis.fetch(apiUrl, {
					headers: {
						'Accept': 'application/vnd.github+json',
						'Authorization': `Bearer ${personalAccessToken}`,
						'X-GitHub-Api-Version': '2022-11-28',
						'User-Agent': 'Profilarr'
					}
				});

				if (authResponse.ok) {
					const data = await authResponse.json();
					return data.private === true;
				}

				if (authResponse.status === 404) {
					throw new Error('Repository not found. Please check the URL.');
				}

				if (authResponse.status === 401 || authResponse.status === 403) {
					throw new Error('Unable to access repository. Please check your Personal Access Token has the correct permissions (repo scope required).');
				}

				throw new Error(`GitHub API error: ${authResponse.status} ${authResponse.statusText}`);
			}

			throw new Error('Repository not found or is private. Please provide a Personal Access Token if this is a private repository.');
		}

		throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
	} catch (error) {
		if (error instanceof Error && (
			error.message.includes('Repository not found') ||
			error.message.includes('Unable to access') ||
			error.message.includes('GitHub API error')
		)) {
			throw error;
		}
		throw new Error(`Failed to validate repository: ${error instanceof Error ? error.message : String(error)}`);
	}
}

/**
 * Clone a git repository
 * Returns true if the repository is private, false if public
 */
export async function clone(
	repositoryUrl: string,
	targetPath: string,
	branch?: string,
	personalAccessToken?: string
): Promise<boolean> {
	// Validate repository exists and detect if it's private
	const isPrivate = await validateRepository(repositoryUrl, personalAccessToken);

	const args = ['clone'];

	if (branch) {
		args.push('--branch', branch);
	}

	// Inject personal access token into URL if provided (for private repos or push access)
	let authUrl = repositoryUrl;
	if (personalAccessToken) {
		// Format: https://TOKEN@github.com/username/repo
		authUrl = repositoryUrl.replace('https://github.com', `https://${personalAccessToken}@github.com`);
	}

	args.push(authUrl, targetPath);

	await execGit(args);

	return isPrivate;
}

/**
 * Pull latest changes from remote
 */
export async function pull(repoPath: string): Promise<void> {
	await execGit(['pull'], repoPath);
}

/**
 * Fetch from remote without merging
 */
export async function fetchRemote(repoPath: string): Promise<void> {
	await execGit(['fetch'], repoPath);
}

/**
 * Get current branch name
 */
export async function getCurrentBranch(repoPath: string): Promise<string> {
	return await execGit(['branch', '--show-current'], repoPath);
}

/**
 * Checkout a branch
 */
export async function checkout(repoPath: string, branch: string): Promise<void> {
	await execGit(['checkout', branch], repoPath);
}

/**
 * Get repository status
 */
export async function getStatus(repoPath: string): Promise<GitStatus> {
	const currentBranch = await getCurrentBranch(repoPath);

	// Get short status
	const statusOutput = await execGit(['status', '--short'], repoPath);

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
		} else if (status[0] === 'M' || status[0] === 'A' || status[0] === 'D') {
			staged.push(file);
		}
	}

	const isDirty = untracked.length > 0 || modified.length > 0 || staged.length > 0;

	return {
		currentBranch,
		isDirty,
		untracked,
		modified,
		staged
	};
}

/**
 * Check for updates from remote
 */
export async function checkForUpdates(repoPath: string): Promise<UpdateInfo> {
	// Fetch latest from remote
	await fetchRemote(repoPath);

	const currentBranch = await getCurrentBranch(repoPath);
	const remoteBranch = `origin/${currentBranch}`;

	// Get current commit
	const currentLocalCommit = await execGit(['rev-parse', 'HEAD'], repoPath);

	// Get remote commit
	let latestRemoteCommit: string;
	try {
		latestRemoteCommit = await execGit(['rev-parse', remoteBranch], repoPath);
	} catch {
		// Remote branch doesn't exist or hasn't been fetched
		return {
			hasUpdates: false,
			commitsBehind: 0,
			commitsAhead: 0,
			latestRemoteCommit: currentLocalCommit,
			currentLocalCommit
		};
	}

	// Count commits behind
	let commitsBehind = 0;
	try {
		const behindOutput = await execGit(
			['rev-list', '--count', `HEAD..${remoteBranch}`],
			repoPath
		);
		commitsBehind = parseInt(behindOutput) || 0;
	} catch {
		commitsBehind = 0;
	}

	// Count commits ahead
	let commitsAhead = 0;
	try {
		const aheadOutput = await execGit(
			['rev-list', '--count', `${remoteBranch}..HEAD`],
			repoPath
		);
		commitsAhead = parseInt(aheadOutput) || 0;
	} catch {
		commitsAhead = 0;
	}

	return {
		hasUpdates: commitsBehind > 0,
		commitsBehind,
		commitsAhead,
		latestRemoteCommit,
		currentLocalCommit
	};
}

/**
 * Reset repository to match remote (discards local changes)
 */
export async function resetToRemote(repoPath: string): Promise<void> {
	const currentBranch = await getCurrentBranch(repoPath);
	const remoteBranch = `origin/${currentBranch}`;

	await execGit(['reset', '--hard', remoteBranch], repoPath);
}
