import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { databaseInstancesQueries } from '$db/queries/databaseInstances.ts';
import { Git, getRepoInfo } from '$utils/git/index.ts';
import { listDraftEntityChanges } from '$pcd/ops/draftChanges.ts';

export const GET: RequestHandler = async ({ params }) => {
	const id = parseInt(params.id || '', 10);
	const database = databaseInstancesQueries.getById(id);

	if (!database) {
		error(404, 'Database not found');
	}

	const git = new Git(database.local_path);

	// Fetch data for everyone
	const [status, incomingChanges, branches, repoInfo] = await Promise.all([
		git.status(),
		git.getIncomingChanges(),
		git.getBranches(),
		getRepoInfo(database.repository_url, database.personal_access_token)
	]);

	// Only fetch draft changes for developers
	let draftChanges = null;
	if (database.personal_access_token) {
		draftChanges = listDraftEntityChanges(id);
	}

	return json({
		status,
		incomingChanges,
		branches,
		repoInfo,
		draftChanges
	});
};
