/**
 * Git utility types
 */

export interface GitStatus {
	branch: string;
	isDirty: boolean;
	ahead: number;
	behind: number;
	untracked: string[];
	modified: string[];
	staged: string[];
}

export interface OperationFile {
	filename: string;
	filepath: string;
	operation: string | null;
	entity: string | null;
	name: string | null;
	previousName: string | null;
}

export interface CommitResult {
	success: boolean;
	error?: string;
}

export interface UpdateInfo {
	hasUpdates: boolean;
	commitsBehind: number;
	commitsAhead: number;
	latestRemoteCommit: string;
	currentLocalCommit: string;
}

export interface RepoInfo {
	owner: string;
	repo: string;
	description: string | null;
	stars: number;
	forks: number;
	openIssues: number;
	ownerAvatarUrl: string;
	ownerType: 'User' | 'Organization';
	htmlUrl: string;
}
