import { error, redirect, fail } from '@sveltejs/kit';
import type { ServerLoad, Actions } from '@sveltejs/kit';
import { arrInstancesQueries } from '$db/queries/arrInstances.ts';
import { logger } from '$logger/logger.ts';

// Valid arr types
const VALID_TYPES = ['radarr', 'sonarr', 'lidarr', 'chaptarr'];

export const load: ServerLoad = ({ params }) => {
	const type = params.type;
	const id = parseInt(params.id || '', 10);

	// Validate type
	if (!type || !VALID_TYPES.includes(type)) {
		error(404, `Invalid arr type: ${type}`);
	}

	// Validate ID
	if (isNaN(id)) {
		error(404, `Invalid instance ID: ${params.id}`);
	}

	// Fetch the specific instance
	const instance = arrInstancesQueries.getById(id);

	if (!instance) {
		error(404, `Instance not found: ${id}`);
	}

	// Verify instance type matches route type
	if (instance.type !== type) {
		error(404, `Instance ${id} is not a ${type} instance`);
	}

	return {
		type,
		instance
	};
};

export const actions: Actions = {
	delete: async ({ params }) => {
		const type = params.type;
		const id = parseInt(params.id || '', 10);

		// Validate type
		if (!type || !VALID_TYPES.includes(type)) {
			await logger.warn('Delete failed: Invalid arr type', {
				source: 'arr/[type]/[id]/edit',
				meta: { type }
			});
			return fail(400, { error: 'Invalid arr type' });
		}

		// Validate ID
		if (isNaN(id)) {
			await logger.warn('Delete failed: Invalid instance ID', {
				source: 'arr/[type]/[id]/edit',
				meta: { id: params.id }
			});
			return fail(400, { error: 'Invalid instance ID' });
		}

		// Fetch the instance to verify it exists
		const instance = arrInstancesQueries.getById(id);

		if (!instance) {
			await logger.warn('Delete failed: Instance not found', {
				source: 'arr/[type]/[id]/edit',
				meta: { id, type }
			});
			return fail(404, { error: 'Instance not found' });
		}

		// Verify instance type matches route type
		if (instance.type !== type) {
			await logger.warn('Delete failed: Instance type mismatch', {
				source: 'arr/[type]/[id]/edit',
				meta: { id, expectedType: type, actualType: instance.type }
			});
			return fail(400, { error: 'Instance type mismatch' });
		}

		// Delete the instance
		const deleted = arrInstancesQueries.delete(id);

		if (!deleted) {
			await logger.error('Failed to delete instance', {
				source: 'arr/[type]/[id]/edit',
				meta: { id, name: instance.name, type: instance.type }
			});
			return fail(500, { error: 'Failed to delete instance' });
		}

		await logger.info(`Deleted ${type} instance: ${instance.name}`, {
			source: 'arr/[type]/[id]/edit',
			meta: { id, name: instance.name, type: instance.type, url: instance.url }
		});

		// Redirect to the arr type page
		redirect(303, `/arr/${type}`);
	}
};
