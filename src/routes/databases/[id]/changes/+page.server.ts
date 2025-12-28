import { error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { databaseInstancesQueries } from '$db/queries/databaseInstances.ts';
import { Git, getRepoInfo } from '$utils/git/index.ts';
import { logger } from '$logger/logger.ts';

export const load: PageServerLoad = async ({ parent }) => {
	const { database } = await parent();

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

	return {
		status,
		uncommittedOps,
		lastPushed,
		branches,
		repoInfo
	};
};

export const actions: Actions = {
	discard: async ({ request, params }) => {
		const id = parseInt(params.id || '', 10);
		const database = databaseInstancesQueries.getById(id);

		if (!database) {
			return { success: false, error: 'Database not found' };
		}

		const formData = await request.formData();
		const files = formData.getAll('files') as string[];

		if (files.length === 0) {
			return { success: false, error: 'No files selected' };
		}

		const git = new Git(database.local_path);
		await git.discardOps(files);

		return { success: true };
	},

	add: async ({ request, params }) => {
		const id = parseInt(params.id || '', 10);
		const database = databaseInstancesQueries.getById(id);

		if (!database) {
			return { success: false, error: 'Database not found' };
		}

		const formData = await request.formData();
		const files = formData.getAll('files') as string[];
		const message = formData.get('message') as string;

		const git = new Git(database.local_path);
		const result = await git.addOps(files, message);

		if (result.success) {
			await logger.info('Changes committed and pushed', {
				source: 'changes',
				meta: { databaseId: id, files: files.length, message }
			});
		} else {
			await logger.error('Failed to add changes', {
				source: 'changes',
				meta: { databaseId: id, error: result.error, files }
			});
		}

		return result;
	},

	checkout: async ({ request, params }) => {
		const id = parseInt(params.id || '', 10);
		const database = databaseInstancesQueries.getById(id);

		if (!database) {
			return { success: false, error: 'Database not found' };
		}

		const formData = await request.formData();
		const branch = formData.get('branch') as string;

		if (!branch) {
			return { success: false, error: 'No branch specified' };
		}

		try {
			const git = new Git(database.local_path);
			await git.checkout(branch);
			return { success: true };
		} catch (err) {
			return { success: false, error: err instanceof Error ? err.message : 'Failed to switch branch' };
		}
	}
};
