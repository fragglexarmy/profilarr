import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { pcdManager, canWriteToBase } from '$pcd/index.ts';
import type { OperationLayer } from '$pcd/index.ts';
import { ENTITY_TYPES } from '$shared/pcd/portable.ts';
import type { EntityType } from '$shared/pcd/portable.ts';
import { deserializeDelayProfile } from '$pcd/entities/deserialize.ts';

const VALID_ENTITY_TYPES: ReadonlySet<string> = new Set(ENTITY_TYPES);

const VALID_LAYERS: Set<string> = new Set(['user', 'base']);

export const POST: RequestHandler = async ({ request }) => {
	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const { databaseId, layer, entityType, data } = body;

	if (databaseId === undefined || !layer || !entityType || !data) {
		return json({ error: 'Missing required fields: databaseId, layer, entityType, data' }, { status: 400 });
	}

	if (typeof databaseId !== 'number' || !Number.isInteger(databaseId)) {
		return json({ error: 'Invalid databaseId' }, { status: 400 });
	}

	if (!VALID_LAYERS.has(layer as string)) {
		return json({ error: `Invalid layer: ${layer}` }, { status: 400 });
	}

	if (!VALID_ENTITY_TYPES.has(entityType as string)) {
		return json({ error: `Invalid entityType: ${entityType}` }, { status: 400 });
	}

	if (layer === 'base' && !canWriteToBase(databaseId as number)) {
		return json({ error: 'Cannot write to base layer' }, { status: 403 });
	}

	const cache = pcdManager.getCache(databaseId as number);
	if (!cache) {
		return json({ error: 'Database cache not available' }, { status: 500 });
	}

	try {
		await deserialize({
			databaseId: databaseId as number,
			cache,
			layer: layer as OperationLayer,
			entityType: entityType as EntityType,
			data: data as Record<string, unknown>
		});
		return json({ success: true });
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Import failed';
		return json({ error: message }, { status: 400 });
	}
};

interface DeserializeArgs {
	databaseId: number;
	cache: Parameters<typeof deserializeDelayProfile>[0]['cache'];
	layer: OperationLayer;
	entityType: EntityType;
	data: Record<string, unknown>;
}

async function deserialize({ databaseId, cache, layer, entityType, data }: DeserializeArgs) {
	switch (entityType) {
		case 'delay_profile':
			return deserializeDelayProfile({ databaseId, cache, layer, portable: data as never });
		default:
			throw new Error(`Import not yet implemented for entity type: ${entityType}`);
	}
}
