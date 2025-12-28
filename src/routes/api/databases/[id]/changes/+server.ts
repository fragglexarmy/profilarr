import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { databaseInstancesQueries } from '$db/queries/databaseInstances.ts';
import { Git, getRepoInfo } from '$utils/git/index.ts';

export const GET: RequestHandler = async ({ params }) => {
	const id = parseInt(params.id || '', 10);
	const database = databaseInstancesQueries.getById(id);

	if (!database) {
		error(404, 'Database not found');
	}

	if (!database.personal_access_token) {
		error(403, 'Changes page requires a personal access token');
	}

	const git = new Git(database.local_path);

	const [status, uncommittedOps, lastPushed, branches, repoInfo] = await Promise.all([
		git.status(),
		git.getUncommittedOps(),
		git.getLastPushed(),
		git.getBranches(),
		getRepoInfo(database.repository_url, database.personal_access_token)
	]);

	return json({
		status,
		uncommittedOps,
		lastPushed,
		branches,
		repoInfo
	});
};
