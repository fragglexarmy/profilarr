/**
 * PCD Operation Writer - Write operations to PCD layers using Kysely
 */

import type { CompiledQuery } from 'kysely';
import { getBaseOpsPath, getUserOpsPath } from './ops.ts';
import { databaseInstancesQueries } from '$db/queries/databaseInstances.ts';
import { logger } from '$logger/logger.ts';
import { compile } from './cache.ts';
import { isFileUncommitted } from '$utils/git/status.ts';

export type OperationLayer = 'base' | 'user';
export type OperationType = 'create' | 'update' | 'delete';

/**
 * Metadata for an operation - used for optimization and tracking
 */
export interface OperationMetadata {
	/** The type of operation */
	operation: OperationType;
	/** The entity type (e.g., 'delay_profile', 'quality_profile') */
	entity: string;
	/** The entity name (current name for create/update, name being deleted for delete) */
	name: string;
	/** Previous name if this is a rename operation */
	previousName?: string;
}

export interface WriteOptions {
	/** The database instance ID */
	databaseId: number;
	/** Which layer to write to */
	layer: OperationLayer;
	/** Description for the operation (used in filename) */
	description: string;
	/** The compiled Kysely queries to write */
	queries: CompiledQuery[];
	/** Metadata for optimization and tracking */
	metadata?: OperationMetadata;
}

export interface WriteResult {
	success: boolean;
	filepath?: string;
	error?: string;
}

/**
 * Convert a compiled Kysely query to executable SQL
 * Replaces ? placeholders with actual values
 *
 * Note: We can't use simple string.replace() because parameter values
 * might contain '?' characters (e.g., regex patterns like '(?<=...)')
 * which would get incorrectly replaced on subsequent iterations.
 */
function compiledQueryToSql(compiled: CompiledQuery): string {
	const sql = compiled.sql;
	const params = compiled.parameters as unknown[];

	if (params.length === 0) {
		return sql;
	}

	// Build result by finding each ? placeholder and replacing with the next param
	// We track our position to avoid replacing ? inside already-substituted values
	const result: string[] = [];
	let paramIndex = 0;
	let i = 0;

	while (i < sql.length) {
		if (sql[i] === '?' && paramIndex < params.length) {
			// Replace this placeholder with the formatted parameter value
			result.push(formatValue(params[paramIndex]));
			paramIndex++;
			i++;
		} else {
			result.push(sql[i]);
			i++;
		}
	}

	return result.join('');
}

/**
 * Format a value for SQL insertion
 */
function formatValue(value: unknown): string {
	if (value === null || value === undefined) {
		return 'NULL';
	}
	if (typeof value === 'number') {
		return String(value);
	}
	if (typeof value === 'boolean') {
		return value ? '1' : '0';
	}
	if (typeof value === 'string') {
		// Escape single quotes by doubling them
		return `'${value.replace(/'/g, "''")}'`;
	}
	// For other types, convert to string and quote
	return `'${String(value).replace(/'/g, "''")}'`;
}

/**
 * Get the next available operation number for a directory
 */
async function getNextOperationNumber(dirPath: string): Promise<number> {
	try {
		let maxNumber = 0;

		for await (const entry of Deno.readDir(dirPath)) {
			if (!entry.isFile || !entry.name.endsWith('.sql')) continue;

			const match = entry.name.match(/^(\d+)\./);
			if (match) {
				const num = parseInt(match[1], 10);
				if (num > maxNumber) maxNumber = num;
			}
		}

		return maxNumber + 1;
	} catch {
		// Directory doesn't exist yet
		return 1;
	}
}

/**
 * Ensure a directory exists
 */
async function ensureDir(path: string): Promise<void> {
	try {
		await Deno.mkdir(path, { recursive: true });
	} catch (error) {
		if (!(error instanceof Deno.errors.AlreadyExists)) {
			throw error;
		}
	}
}

/**
 * Slugify a description for use in filename
 */
function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.substring(0, 50);
}

/**
 * Generate a metadata header for the SQL file
 */
function generateMetadataHeader(metadata: OperationMetadata): string {
	const lines = [
		`-- @operation: ${metadata.operation}`,
		`-- @entity: ${metadata.entity}`,
		`-- @name: ${metadata.name}`
	];

	if (metadata.previousName) {
		lines.push(`-- @previous_name: ${metadata.previousName}`);
	}

	return lines.join('\n') + '\n\n';
}

/**
 * Parse metadata from an operation file
 */
async function parseOperationMetadata(filepath: string): Promise<OperationMetadata | null> {
	try {
		const content = await Deno.readTextFile(filepath);
		const operationMatch = content.match(/^-- @operation:\s*(\w+)/m);
		const entityMatch = content.match(/^-- @entity:\s*(\w+)/m);
		const nameMatch = content.match(/^-- @name:\s*(.+)$/m);
		const previousNameMatch = content.match(/^-- @previous_name:\s*(.+)$/m);

		if (!operationMatch || !entityMatch || !nameMatch) {
			return null;
		}

		return {
			operation: operationMatch[1] as OperationType,
			entity: entityMatch[1],
			name: nameMatch[1].trim(),
			previousName: previousNameMatch?.[1]?.trim()
		};
	} catch {
		return null;
	}
}

/**
 * Find and remove a matching create operation for a delete
 * Returns true if a create was found and removed (no delete needed)
 * Only cancels out if the create file is uncommitted (untracked or staged)
 */
async function cancelOutCreate(
	targetDir: string,
	repoPath: string,
	metadata: OperationMetadata
): Promise<boolean> {
	if (metadata.operation !== 'delete') {
		return false;
	}

	try {
		for await (const entry of Deno.readDir(targetDir)) {
			if (!entry.isFile || !entry.name.endsWith('.sql')) continue;

			const filepath = `${targetDir}/${entry.name}`;
			const fileMeta = await parseOperationMetadata(filepath);

			// Check if this is a create operation for the same entity/name
			if (
				fileMeta &&
				fileMeta.operation === 'create' &&
				fileMeta.entity === metadata.entity &&
				fileMeta.name === metadata.name
			) {
				// Only cancel out if the file is uncommitted
				const uncommitted = await isFileUncommitted(repoPath, filepath);
				if (!uncommitted) {
					// File has been committed - don't cancel, proceed with delete operation
					continue;
				}

				// Remove the create file - it cancels out with the delete
				await Deno.remove(filepath);
				await logger.info('Cancelled out uncommitted create operation with delete', {
					source: 'PCDWriter',
					meta: { filepath, entity: metadata.entity, name: metadata.name }
				});
				return true;
			}
		}
	} catch {
		// Directory doesn't exist or other error - proceed with normal write
	}

	return false;
}

/**
 * Write operations to a PCD layer
 *
 * For base layer: writes to ops/, user must manually commit/push
 * For user layer: writes to user_ops/, stays local
 */
export async function writeOperation(options: WriteOptions): Promise<WriteResult> {
	const { databaseId, layer, description, queries, metadata } = options;

	try {
		// Get the database instance
		const instance = databaseInstancesQueries.getById(databaseId);
		if (!instance) {
			return { success: false, error: 'Database instance not found' };
		}

		// Check if base layer is allowed (requires PAT)
		if (layer === 'base' && !instance.personal_access_token) {
			return { success: false, error: 'Base layer requires a personal access token' };
		}

		// Get the target directory
		const targetDir =
			layer === 'base' ? getBaseOpsPath(instance.local_path) : getUserOpsPath(instance.local_path);

		// Ensure directory exists
		await ensureDir(targetDir);

		// Optimization: if this is a delete and there's an uncommitted create, just remove the create
		if (metadata && (await cancelOutCreate(targetDir, instance.local_path, metadata))) {
			// Recompile the cache after removing the create file
			await compile(instance.local_path, instance.id);
			return { success: true };
		}

		// Get next operation number
		const opNumber = await getNextOperationNumber(targetDir);

		// Generate filename
		const slug = slugify(description);
		const filename = `${opNumber}.${slug}.sql`;
		const filepath = `${targetDir}/${filename}`;

		// Convert queries to SQL
		const sqlStatements = queries.map(compiledQueryToSql);
		const sqlContent = sqlStatements.join(';\n\n') + ';\n';

		// Build final content with optional metadata header
		const content = metadata ? generateMetadataHeader(metadata) + sqlContent : sqlContent;

		// Write the file
		await Deno.writeTextFile(filepath, content);

		// Build descriptive message
		const opType = metadata?.operation ?? 'write';
		const entity = metadata?.entity?.replace(/_/g, ' ') ?? 'operation';
		const entityName = metadata?.name ?? '';
		const layerDir = layer === 'base' ? 'ops' : 'user_ops';
		const message = `${opType.charAt(0).toUpperCase() + opType.slice(1)} ${entity} "${entityName}" in layer "${layerDir}"`;

		await logger.info(message, {
			source: 'PCDWriter',
			meta: {
				database: {
					id: databaseId,
					name: instance.name,
					layer
				},
				filename,
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

		// Recompile the cache immediately so the new operation is available
		// This avoids waiting for the file watcher's debounce delay
		await compile(instance.local_path, instance.id);

		await logger.debug('Cache recompiled after write', {
			source: 'PCDWriter',
			meta: { databaseId }
		});

		return { success: true, filepath };
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
	return !!instance?.personal_access_token;
}
