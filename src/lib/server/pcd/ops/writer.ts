/**
 * PCD Operation Writer (DB-first)
 * Writes operations to pcd_ops instead of filesystem layers.
 */

import { databaseInstancesQueries } from '$db/queries/databaseInstances.ts';
import { pcdOpsQueries } from '$db/queries/pcdOps.ts';
import type { PcdOpOrigin } from '$db/queries/pcdOps.ts';
import { logger } from '$logger/logger.ts';
import { compiledQueryToSql } from '../utils/sql.ts';
import { compile } from '../database/compiler.ts';
import { getCache } from '../database/registry.ts';
import type { OperationMetadata, OperationType, WriteOptions, WriteResult } from '../core/types.ts';

function buildMetadataJson(metadata?: OperationMetadata): string | null {
	if (!metadata) return null;
	const payload: Record<string, unknown> = {
		operation: metadata.operation,
		entity: metadata.entity,
		name: metadata.name
	};
	if (metadata.previousName) {
		payload.previous_name = metadata.previousName;
	}
	if (metadata.summary) {
		payload.summary = metadata.summary;
	}
	if (metadata.title) {
		payload.title = metadata.title;
	}
	if (metadata.changedFields && metadata.changedFields.length > 0) {
		payload.changed_fields = metadata.changedFields;
	}
	if (metadata.stableKey) {
		payload.stable_key = metadata.stableKey;
	}
	return JSON.stringify(payload);
}

function serializeDesiredState(desiredState?: Record<string, unknown> | null): string | null {
	if (!desiredState) return null;
	return JSON.stringify(desiredState);
}

async function hashContent(sql: string, metadataJson: string | null): Promise<string> {
	const payload = `${sql}\n${metadataJson ?? ''}`;
	const data = new TextEncoder().encode(payload);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function cancelOutCreate(
	databaseId: number,
	origin: PcdOpOrigin,
	metadata: OperationMetadata
): Promise<boolean> {
	if (metadata.operation !== 'delete') {
		return false;
	}

	const candidates = pcdOpsQueries.listByDatabaseAndOrigin(databaseId, origin, {
		source: 'local',
		states: ['published', 'draft']
	});

	for (let i = candidates.length - 1; i >= 0; i--) {
		const candidate = candidates[i];
		if (!candidate.metadata) continue;

		let parsed: Record<string, string>;
		try {
			parsed = JSON.parse(candidate.metadata) as Record<string, string>;
		} catch {
			continue;
		}

		if (
			parsed.operation === 'create' &&
			parsed.entity === metadata.entity &&
			parsed.name === metadata.name
		) {
			pcdOpsQueries.update(candidate.id, { state: 'dropped' });
			await logger.info('Cancelled out local create operation with delete', {
				source: 'PCDWriter',
				meta: { databaseId, opId: candidate.id, entity: metadata.entity, name: metadata.name }
			});
			return true;
		}
	}

	return false;
}

/**
 * Write operations to a PCD layer in the database
 *
 * For base layer: inserts a draft base op (origin=base, state=draft)
 * For user layer: inserts a published user op (origin=user, state=published)
 */
export async function writeOperation(options: WriteOptions): Promise<WriteResult> {
	const { databaseId, layer, description, queries, metadata, desiredState } = options;

	try {
		const instance = databaseInstancesQueries.getById(databaseId);
		if (!instance) {
			return { success: false, error: 'Database instance not found' };
		}

		if (layer === 'base' && (!instance.personal_access_token || instance.local_ops_enabled)) {
			return {
				success: false,
				error: 'Base layer requires a personal access token and local ops must be disabled'
			};
		}

		// Convert queries to SQL first (needed for validation)
		const sqlStatements = queries.map(compiledQueryToSql);

		// Validate against current cache
		const cache = getCache(databaseId);
		if (cache) {
			const validation = cache.validateSql(sqlStatements);
			if (!validation.valid) {
				await logger.error('Operation validation failed - refusing to write', {
					source: 'PCDWriter',
					meta: {
						databaseId,
						layer,
						description,
						error: validation.error,
						queries: sqlStatements
					}
				});
				return {
					success: false,
					error: `Validation failed: ${validation.error}`
				};
			}
		} else {
			await logger.warn('No cache available for validation - proceeding without validation', {
				source: 'PCDWriter',
				meta: { databaseId, description }
			});
		}

		if (metadata && (await cancelOutCreate(databaseId, layer, metadata))) {
			await compile(instance.local_path, instance.id);
			return { success: true };
		}

		const sqlContent = `${sqlStatements.join(';\n\n')};`.trim();
		const metadataJson = buildMetadataJson(metadata);
		const desiredStateJson = serializeDesiredState(desiredState);
		const contentHash = await hashContent(sqlContent, metadataJson);

		const origin: PcdOpOrigin = layer === 'base' ? 'base' : 'user';
		const state = layer === 'base' ? 'draft' : 'published';

		const opId = pcdOpsQueries.create({
			databaseId,
			origin,
			state,
			source: 'local',
			sql: sqlContent,
			metadata: metadataJson,
			desiredState: desiredStateJson,
			contentHash
		});

		const opType = metadata?.operation ?? 'write';
		const entity = metadata?.entity?.replace(/_/g, ' ') ?? 'operation';
		const entityName = metadata?.name ?? '';
		const message = `${opType.charAt(0).toUpperCase() + opType.slice(1)} ${entity} "${entityName}" in ${origin} layer`;

		await logger.info(message, {
			source: 'PCDWriter',
			meta: {
				database: {
					id: databaseId,
					name: instance.name,
					layer
				},
				opId,
				operation: metadata
					? {
							type: metadata.operation,
							entity: metadata.entity,
							name: metadata.name,
							...(metadata.previousName && { previousName: metadata.previousName })
						}
					: null,
				queries: sqlStatements
			}
		});

		await compile(instance.local_path, instance.id);

		await logger.debug('Cache recompiled after write', {
			source: 'PCDWriter',
			meta: { databaseId }
		});

		return { success: true, filepath: `pcd_ops:${opId}` };
	} catch (error) {
		await logger.error('Failed to write operation', {
			source: 'PCDWriter',
			meta: { error: String(error), databaseId, layer, description }
		});
		return { success: false, error: String(error) };
	}
}

/**
 * Check if a database instance can write to the base layer
 */
export function canWriteToBase(databaseId: number): boolean {
	const instance = databaseInstancesQueries.getById(databaseId);
	return !!instance?.personal_access_token && !instance?.local_ops_enabled;
}

// Re-export types for convenience
export type { OperationType, OperationMetadata, WriteOptions, WriteResult };
