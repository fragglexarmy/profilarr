/**
 * Git class - wraps git operations for a repository
 */

import type {
	GitStatus,
	UpdateInfo,
	Commit,
	IncomingChanges
} from './types.ts';
import * as repo from './repo.ts';
import * as status from './status.ts';
import * as ops from './ops.ts';

export class Git {
	constructor(private repoPath: string) {}

	// Repo commands
	fetch = () => repo.fetch(this.repoPath);
	fetchTags = () => repo.fetchTags(this.repoPath);
	pull = () => repo.pull(this.repoPath);
	push = () => repo.push(this.repoPath);
	checkout = (branch: string) => repo.checkout(this.repoPath, branch);
	resetToRemote = () => repo.resetToRemote(this.repoPath);

	// Status queries
	getBranch = () => status.getBranch(this.repoPath);
	getBranches = () => status.getBranches(this.repoPath);
	status = (options?: status.GetStatusOptions): Promise<GitStatus> =>
		status.getStatus(this.repoPath, options);
	checkForUpdates = (): Promise<UpdateInfo> => status.checkForUpdates(this.repoPath);
	getIncomingChanges = (): Promise<IncomingChanges> => status.getIncomingChanges(this.repoPath);
	getLastPushed = () => status.getLastPushed(this.repoPath);
	getCommits = (limit?: number): Promise<Commit[]> => status.getCommits(this.repoPath, limit);
	getDiff = (filepaths?: string[]): Promise<string> => status.getDiff(this.repoPath, filepaths);

	// Operation file methods
	getMaxOpNumber = () => ops.getMaxOpNumber(this.repoPath);
}
