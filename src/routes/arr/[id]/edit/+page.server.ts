import { error, redirect, fail } from '@sveltejs/kit';
import type { ServerLoad, Actions } from '@sveltejs/kit';
import { arrInstancesQueries } from '$db/queries/arrInstances.ts';
import { logger } from '$logger/logger.ts';

export const load: ServerLoad = ({ params }) => {
	const id = parseInt(params.id || '', 10);

	// Validate ID
	if (isNaN(id)) {
		error(404, `Invalid instance ID: ${params.id}`);
	}

	// Fetch the specific instance
	const instance = arrInstancesQueries.getById(id);

	if (!instance) {
		error(404, `Instance not found: ${id}`);
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
			return fail(400, { error: 'Invalid instance ID' });
		}

		// Fetch the instance to verify it exists
		const instance = arrInstancesQueries.getById(id);

		if (!instance) {
			return fail(404, { error: 'Instance not found' });
		}

		const formData = await request.formData();
		const name = formData.get('name')?.toString().trim();
		const url = formData.get('url')?.toString().trim();
		const apiKey = formData.get('api_key')?.toString().trim();
		const tagsJson = formData.get('tags')?.toString() || '';
		const enabled = formData.get('enabled')?.toString() === '1';

		// Validate required fields
		if (!name) {
			return fail(400, { error: 'Name is required' });
		}

		if (!url) {
			return fail(400, { error: 'URL is required' });
		}

		if (!apiKey) {
			return fail(400, { error: 'API Key is required' });
		}

		// Check for duplicate name
		if (arrInstancesQueries.nameExists(name, id)) {
			return fail(400, { error: 'An instance with this name already exists' });
		}

		// Parse tags
		let tags: string[] = [];
		if (tagsJson) {
			try {
				tags = JSON.parse(tagsJson);
			} catch {
				// Ignore parse errors, use empty array
			}
		}

		try {
			arrInstancesQueries.update(id, {
				name,
				url,
				apiKey,
				tags,
				enabled
			});

			await logger.info(`Updated arr instance: ${name}`, {
				source: 'arr/[id]/edit',
				meta: { id, name, type: instance.type, url }
			});

			redirect(303, `/arr/${id}`);
		} catch (err) {
			// Re-throw redirect errors
			if (err && typeof err === 'object' && 'status' in err && 'location' in err) {
				throw err;
			}

			await logger.error('Failed to update arr instance', {
				source: 'arr/[id]/edit',
				meta: { error: err instanceof Error ? err.message : String(err) }
			});

			return fail(500, { error: 'Failed to update instance' });
		}
	},

	delete: async ({ params }) => {
		const id = parseInt(params.id || '', 10);

		// Validate ID
		if (isNaN(id)) {
			await logger.warn('Delete failed: Invalid instance ID', {
				source: 'arr/[id]/edit',
				meta: { id: params.id }
			});
			return fail(400, { error: 'Invalid instance ID' });
		}

		// Fetch the instance to verify it exists
		const instance = arrInstancesQueries.getById(id);

		if (!instance) {
			await logger.warn('Delete failed: Instance not found', {
				source: 'arr/[id]/edit',
				meta: { id }
			});
			return fail(404, { error: 'Instance not found' });
		}

		// Delete the instance
		const deleted = arrInstancesQueries.delete(id);

		if (!deleted) {
			await logger.error('Failed to delete instance', {
				source: 'arr/[id]/edit',
				meta: { id, name: instance.name, type: instance.type }
			});
			return fail(500, { error: 'Failed to delete instance' });
		}

		await logger.info(`Deleted ${instance.type} instance: ${instance.name}`, {
			source: 'arr/[id]/edit',
			meta: { id, name: instance.name, type: instance.type, url: instance.url }
		});

		// Redirect to the arr landing page
		redirect(303, '/arr');
	}
};
