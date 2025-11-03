import { fail, redirect } from '@sveltejs/kit';
import type { Actions, ServerLoad } from '@sveltejs/kit';
import { pcdManager } from '$pcd/pcd.ts';
import { databaseInstancesQueries } from '$db/queries/databaseInstances.ts';
import { logger } from '$logger/logger.ts';

export const load: ServerLoad = ({ url }) => {
	const name = url.searchParams.get('name') || '';
	const branch = url.searchParams.get('branch') || '';
	const syncStrategy = url.searchParams.get('sync_strategy') || '';
	const autoPull = url.searchParams.get('auto_pull') || '';

	return {
		formData: {
			name,
			branch,
			syncStrategy,
			autoPull
		}
	};
};

export const actions = {
	default: async ({ request }) => {
		const formData = await request.formData();

		const name = formData.get('name')?.toString().trim();
		const repositoryUrl = formData.get('repository_url')?.toString().trim();
		const branch = formData.get('branch')?.toString().trim() || undefined;
		const syncStrategy = parseInt(formData.get('sync_strategy')?.toString() || '0', 10);
		const autoPull = formData.get('auto_pull') === '1';
		const personalAccessToken = formData.get('personal_access_token')?.toString().trim() || undefined;

		// Validation
		if (!name || !repositoryUrl) {
			await logger.warn('Attempted to link database with missing required fields', {
				source: 'databases/new',
				meta: { name, repositoryUrl }
			});

			return fail(400, {
				error: 'Name and repository URL are required',
				values: { name, repository_url: repositoryUrl }
			});
		}

		// Check for common non-GitHub URLs and redirect to bruh page
		const bruhParams = new URLSearchParams({
			name: name,
			branch: branch || '',
			sync_strategy: syncStrategy.toString(),
			auto_pull: autoPull ? '1' : '0'
		});

		if (repositoryUrl.includes('youtube.com') || repositoryUrl.includes('youtu.be')) {
			redirect(303, `/databases/bruh?url=${encodeURIComponent(repositoryUrl)}&type=youtube&${bruhParams.toString()}`);
		}
		if (repositoryUrl.includes('twitter.com') || repositoryUrl.includes('x.com')) {
			redirect(303, `/databases/bruh?url=${encodeURIComponent(repositoryUrl)}&type=twitter&${bruhParams.toString()}`);
		}
		if (repositoryUrl.includes('reddit.com')) {
			redirect(303, `/databases/bruh?url=${encodeURIComponent(repositoryUrl)}&type=reddit&${bruhParams.toString()}`);
		}

		// Check if name already exists
		if (databaseInstancesQueries.nameExists(name)) {
			await logger.warn('Attempted to link database with duplicate name', {
				source: 'databases/new',
				meta: { name }
			});

			return fail(400, {
				error: 'A database with this name already exists',
				values: { name, repository_url: repositoryUrl }
			});
		}

		try {
			// Link the database
			const instance = await pcdManager.link({
				name,
				repositoryUrl,
				branch,
				syncStrategy,
				autoPull,
				personalAccessToken
			});

			await logger.info(`Linked new database: ${name}`, {
				source: 'databases/new',
				meta: { id: instance.id, name, repositoryUrl }
			});

			// Redirect to databases list
			redirect(303, '/databases');
		} catch (error) {
			// Re-throw redirect errors (they're not actual errors)
			if (error && typeof error === 'object' && 'status' in error && 'location' in error) {
				throw error;
			}

			await logger.error('Failed to link database', {
				source: 'databases/new',
				meta: { error: error instanceof Error ? error.message : String(error) }
			});

			return fail(500, {
				error: error instanceof Error ? error.message : 'Failed to link database',
				values: { name, repository_url: repositoryUrl }
			});
		}
	}
} satisfies Actions;
