import { error, redirect, fail } from '@sveltejs/kit';
import type { ServerLoad, Actions } from '@sveltejs/kit';
import { databaseInstancesQueries } from '$db/queries/databaseInstances.ts';
import { pcdManager } from '$pcd/pcd.ts';
import { logger } from '$logger/logger.ts';

export const load: ServerLoad = ({ params }) => {
	const id = parseInt(params.id || '', 10);

	// Validate ID
	if (isNaN(id)) {
		error(404, `Invalid database ID: ${params.id}`);
	}

	// Fetch the specific instance
	const instance = databaseInstancesQueries.getById(id);

	if (!instance) {
		error(404, `Database not found: ${id}`);
	}

	return {
		instance
	};
};

export const actions: Actions = {
	update: async ({ params, request }) => {
		const id = parseInt(params.id || '', 10);

		// Validate ID
		if (isNaN(id)) {
			await logger.warn('Update failed: Invalid database ID', {
				source: 'databases/[id]/edit',
				meta: { id: params.id }
			});
			return fail(400, { error: 'Invalid database ID' });
		}

		// Fetch the instance to verify it exists
		const instance = databaseInstancesQueries.getById(id);

		if (!instance) {
			await logger.warn('Update failed: Database not found', {
				source: 'databases/[id]/edit',
				meta: { id }
			});
			return fail(404, { error: 'Database not found' });
		}

		const formData = await request.formData();

		const name = formData.get('name')?.toString().trim();
		const syncStrategy = parseInt(formData.get('sync_strategy')?.toString() || '0', 10);
		const autoPull = formData.get('auto_pull') === '1';

		// Validation
		if (!name) {
			await logger.warn('Attempted to update database with missing required fields', {
				source: 'databases/[id]/edit',
				meta: { id, name }
			});

			return fail(400, {
				error: 'Name is required',
				values: { name }
			});
		}

		// Check if name already exists (excluding current instance)
		const existingWithName = databaseInstancesQueries.getAll().find(
			(db) => db.name === name && db.id !== id
		);

		if (existingWithName) {
			await logger.warn('Attempted to update database with duplicate name', {
				source: 'databases/[id]/edit',
				meta: { id, name }
			});

			return fail(400, {
				error: 'A database with this name already exists',
				values: { name }
			});
		}

		try {
			// Update the database
			const updated = databaseInstancesQueries.update(id, {
				name,
				syncStrategy,
				autoPull
			});

			if (!updated) {
				throw new Error('Update returned false');
			}

			await logger.info(`Updated database: ${name}`, {
				source: 'databases/[id]/edit',
				meta: { id, name }
			});

			// Redirect to database detail page
			redirect(303, `/databases/${id}`);
		} catch (error) {
			// Re-throw redirect errors (they're not actual errors)
			if (error && typeof error === 'object' && 'status' in error && 'location' in error) {
				throw error;
			}

			await logger.error('Failed to update database', {
				source: 'databases/[id]/edit',
				meta: { error: error instanceof Error ? error.message : String(error) }
			});

			return fail(500, {
				error: 'Failed to update database',
				values: { name }
			});
		}
	},

	delete: async ({ params }) => {
		const id = parseInt(params.id || '', 10);

		// Validate ID
		if (isNaN(id)) {
			await logger.warn('Delete failed: Invalid database ID', {
				source: 'databases/[id]/edit',
				meta: { id: params.id }
			});
			return fail(400, { error: 'Invalid database ID' });
		}

		// Fetch the instance to verify it exists
		const instance = databaseInstancesQueries.getById(id);

		if (!instance) {
			await logger.warn('Delete failed: Database not found', {
				source: 'databases/[id]/edit',
				meta: { id }
			});
			return fail(404, { error: 'Database not found' });
		}

		try {
			// Unlink the database
			await pcdManager.unlink(id);

			await logger.info(`Unlinked database: ${instance.name}`, {
				source: 'databases/[id]/edit',
				meta: { id, name: instance.name, repositoryUrl: instance.repository_url }
			});

			// Redirect to databases list
			redirect(303, '/databases');
		} catch (error) {
			// Re-throw redirect errors (they're not actual errors)
			if (error && typeof error === 'object' && 'status' in error && 'location' in error) {
				throw error;
			}

			await logger.error('Failed to unlink database', {
				source: 'databases/[id]/edit',
				meta: { error: error instanceof Error ? error.message : String(error) }
			});

			return fail(500, { error: 'Failed to unlink database' });
		}
	}
};
