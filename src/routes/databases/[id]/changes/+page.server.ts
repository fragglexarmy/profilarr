import type { PageServerLoad, Actions } from './$types';
import { databaseInstancesQueries } from '$db/queries/databaseInstances.ts';
import { Git } from '$utils/git/index.ts';
import { logger } from '$logger/logger.ts';
import { compile, startWatch } from '$lib/server/pcd/cache.ts';
import { pcdManager } from '$pcd/pcd.ts';

export const load: PageServerLoad = async ({ parent }) => {
	const { database } = await parent();

	return {
		isDeveloper: !!database.personal_access_token
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

		// Recompile cache directly instead of relying on file watcher
		if (database.enabled) {
			try {
				await compile(database.local_path, id);
				await startWatch(database.local_path, id);
			} catch (err) {
				await logger.error('Failed to recompile cache after discard', {
					source: 'changes',
					meta: { databaseId: id, error: String(err) }
				});
			}
		}

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
	},

	pull: async ({ params }) => {
		const id = parseInt(params.id || '', 10);
		const database = databaseInstancesQueries.getById(id);

		if (!database) {
			return { success: false, error: 'Database not found' };
		}

		try {
			const result = await pcdManager.sync(id);

			if (result.success) {
				await logger.info('Database synced', {
					source: 'changes',
					meta: { databaseId: id, commitsPulled: result.commitsBehind }
				});
			}

			return result;
		} catch (err) {
			await logger.error('Failed to pull changes', {
				source: 'changes',
				meta: { databaseId: id, error: String(err) }
			});
			return {
				success: false,
				error: err instanceof Error ? err.message : 'Failed to pull'
			};
		}
	}
};
