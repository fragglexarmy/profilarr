import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { databaseInstancesQueries } from '$db/queries/databaseInstances.ts';
import { getBranch, getCommits } from '$utils/git/index.ts';

export const GET: RequestHandler = async ({ params, url }) => {
	const id = parseInt(params.id || '', 10);
	const database = databaseInstancesQueries.getById(id);

	if (!database) {
		error(404, 'Database not found');
	}

	const limit = parseInt(url.searchParams.get('limit') || '50', 10);
	const [commits, branch] = await Promise.all([
		getCommits(database.local_path, limit),
		getBranch(database.local_path)
	]);

	return json({
		commits,
		branch,
		repositoryUrl: database.repository_url
	});
};
