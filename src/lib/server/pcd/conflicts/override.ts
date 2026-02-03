import { databaseInstancesQueries } from '$db/queries/databaseInstances.ts';
import { pcdOpsQueries } from '$db/queries/pcdOps.ts';
import { compile } from '$pcd/index.ts';
import type { WriteResult } from '$pcd/index.ts';
import { logger } from '$logger/logger.ts';
import {
	parseJson,
	parseOpIdFromFilepath,
	supersedeOp,
	dropOp,
	type StoredOpMetadata,
	type StoredDesiredState
} from './overrideUtils.ts';
import {
	overrideCreate as cfOverrideCreate,
	overrideUpdate as cfOverrideUpdate
} from '$pcd/entities/customFormats/override/index.ts';
import {
	overrideCreate as qpOverrideCreate,
	overrideUpdate as qpOverrideUpdate
} from '$pcd/entities/qualityProfiles/override/index.ts';
import {
	overrideCreate as reOverrideCreate,
	overrideUpdate as reOverrideUpdate
} from '$pcd/entities/regularExpressions/override.ts';
import {
	overrideCreate as dpOverrideCreate,
	overrideUpdate as dpOverrideUpdate
} from '$pcd/entities/delayProfiles/override.ts';
import {
	overrideCreate as namingOverrideCreate,
	overrideUpdate as namingOverrideUpdate
} from '$pcd/entities/mediaManagement/naming/override.ts';
import {
	overrideCreate as msOverrideCreate,
	overrideUpdate as msOverrideUpdate
} from '$pcd/entities/mediaManagement/media-settings/override.ts';
import {
	overrideCreate as qdOverrideCreate,
	overrideUpdate as qdOverrideUpdate
} from '$pcd/entities/mediaManagement/quality-definitions/override.ts';

type OverrideConflictResult = {
	success: boolean;
	error?: string;
};

async function overrideEntity(
	databaseId: number,
	metadata: StoredOpMetadata | null,
	desiredState: StoredDesiredState | null,
	operation: string
): Promise<WriteResult> {
	const entity = metadata?.entity;

	switch (entity) {
		case 'custom_format':
			return operation === 'create'
				? cfOverrideCreate(databaseId, metadata, desiredState)
				: cfOverrideUpdate(databaseId, metadata, desiredState);
		case 'quality_profile':
			return operation === 'create'
				? qpOverrideCreate(databaseId, metadata, desiredState)
				: qpOverrideUpdate(databaseId, metadata, desiredState);
		case 'regular_expression':
			return operation === 'create'
				? reOverrideCreate(databaseId, metadata, desiredState)
				: reOverrideUpdate(databaseId, metadata, desiredState);
		case 'delay_profile':
			return operation === 'create'
				? dpOverrideCreate(databaseId, metadata, desiredState)
				: dpOverrideUpdate(databaseId, metadata, desiredState);
		case 'radarr_naming':
		case 'sonarr_naming':
			return operation === 'create'
				? namingOverrideCreate(databaseId, metadata, desiredState)
				: namingOverrideUpdate(databaseId, metadata, desiredState);
		case 'radarr_media_settings':
		case 'sonarr_media_settings':
			return operation === 'create'
				? msOverrideCreate(databaseId, metadata, desiredState)
				: msOverrideUpdate(databaseId, metadata, desiredState);
		case 'radarr_quality_definitions':
		case 'sonarr_quality_definitions':
			return operation === 'create'
				? qdOverrideCreate(databaseId, metadata, desiredState)
				: qdOverrideUpdate(databaseId, metadata, desiredState);
		default:
			return { success: false, error: `Override not yet implemented for entity: ${entity}` };
	}
}

export async function overrideConflict(input: {
	databaseId: number;
	opId: number;
}): Promise<OverrideConflictResult> {
	const { databaseId, opId } = input;

	const op = pcdOpsQueries.getById(opId);
	if (!op || op.database_id !== databaseId) {
		return { success: false, error: 'Conflict operation not found' };
	}

	if (op.origin !== 'user' || op.state !== 'published') {
		return { success: false, error: 'Only published user operations can be overridden' };
	}

	const metadata = parseJson<StoredOpMetadata>(op.metadata);
	const desiredState = parseJson<StoredDesiredState>(op.desired_state);
	const operation = metadata?.operation ?? 'update';

	let result: WriteResult;

	if (operation === 'delete') {
		const dropped = await dropOp(databaseId, opId);
		if (!dropped) {
			return { success: false, error: 'Failed to drop conflicting delete operation' };
		}
		const instance = databaseInstancesQueries.getById(databaseId);
		if (instance?.enabled) {
			await compile(instance.local_path, databaseId);
		}
		result = { success: true };
	} else {
		result = await overrideEntity(databaseId, metadata, desiredState, operation);
	}

	if (!result.success) {
		return { success: false, error: result.error || 'Failed to override conflict' };
	}

	const newOpId = parseOpIdFromFilepath(result.filepath ?? null);
	let resolved = false;
	if (newOpId) {
		resolved = await supersedeOp(databaseId, opId, newOpId);
	} else {
		resolved = await dropOp(databaseId, opId);
	}

	if (resolved) {
		const instance = databaseInstancesQueries.getById(databaseId);
		if (instance?.enabled) {
			await compile(instance.local_path, databaseId);
		}
	}

	await logger.info('Overrode conflict', {
		source: 'PCDConflicts',
		meta: { databaseId, opId, newOpId }
	});

	return { success: true };
}
