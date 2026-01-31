import { databaseInstancesQueries } from '$db/queries/databaseInstances.ts';
import { pcdOpsQueries } from '$db/queries/pcdOps.ts';
import { pcdOpHistoryQueries } from '$db/queries/pcdOpHistory.ts';
import { logger } from '$logger/logger.ts';
import { pull, stage, commit, push, configureIdentity } from '$utils/git/write.ts';
import { compile } from '../database/compiler.ts';
import { canWriteToBase } from './writer.ts';
import { listDraftEntityChanges } from './draftChanges.ts';
import { uuid } from '$shared/utils/uuid.ts';
import { getMaxOpNumber } from '$pcd/utils/git.ts';

type ExportResult =
	| { success: true; filename: string; opId: number; dropped: number }
	| { success: false; error: string };

type ParsedMetadata = {
	operation?: string;
	entity?: string;
	name?: string;
	group_id?: string;
};

function slugify(value: string): string {
	const slug = value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 60);
	return slug.length > 0 ? slug : 'export-batch';
}

function buildHeader(message: string, opIds: number[], exportedAt: string): string {
	const ids = opIds.join(', ');
	return [
		'-- @operation: export',
		'-- @entity: batch',
		`-- @name: ${message}`,
		`-- @exportedAt: ${exportedAt}`,
		`-- @opIds: ${ids}`
	].join('\n');
}

function buildMetadataJson(message: string, opIds: number[], exportedAt: string): string {
	return JSON.stringify({
		operation: 'export',
		entity: 'batch',
		name: message,
		exported_at: exportedAt,
		op_ids: opIds
	});
}

function opLabel(op: { metadata?: string | null }): string | null {
	if (!op.metadata) return null;
	try {
		const parsed = JSON.parse(op.metadata) as ParsedMetadata;
		if (!parsed.operation || !parsed.entity || !parsed.name) return null;
		return `${parsed.operation} ${parsed.entity} "${parsed.name}"`;
	} catch {
		return null;
	}
}

function formatOpBlock(op: { id: number; metadata?: string | null; sql: string }): string {
	const label = opLabel(op);
	const trimmedSql = op.sql.trim().replace(/;\s*$/, '');
	const title = label ? ` ( ${label} )` : '';
	return [
		`-- --- BEGIN op ${op.id}${title}`,
		`${trimmedSql};`,
		`-- --- END op ${op.id}`
	].join('\n');
}

function buildChangeMaps(databaseId: number) {
	const changes = listDraftEntityChanges(databaseId);
	const changeByKey = new Map(changes.map((change) => [change.key, change]));
	const changeByOpId = new Map<number, string>();
	const groupMap = new Map<string, string[]>();

	for (const change of changes) {
		for (const op of change.ops) {
			changeByOpId.set(op.id, change.key);
		}
		if (change.groupId) {
			const entries = groupMap.get(change.groupId) ?? [];
			entries.push(change.key);
			groupMap.set(change.groupId, entries);
		}
	}

	return { changes, changeByKey, changeByOpId, groupMap };
}

export async function exportDraftOps(
	databaseId: number,
	opIds: number[],
	message: string
): Promise<ExportResult> {
	const database = databaseInstancesQueries.getById(databaseId);
	if (!database) {
		return { success: false, error: 'Database not found' };
	}

	if (!canWriteToBase(databaseId)) {
		return { success: false, error: 'This database cannot publish changes.' };
	}

	const gitUserName = database.git_user_name?.trim() ?? '';
	const gitUserEmail = database.git_user_email?.trim() ?? '';
	if (!gitUserName || !gitUserEmail) {
		return {
			success: false,
			error: 'Git author name and email are required to export changes.'
		};
	}

	const trimmedMessage = message.trim();
	if (!trimmedMessage) {
		return { success: false, error: 'Commit message is required' };
	}

	const { changeByKey, changeByOpId, groupMap } = buildChangeMaps(databaseId);
	const selectedKeys = new Set<string>();
	for (const opId of opIds) {
		const key = changeByOpId.get(opId);
		if (key) selectedKeys.add(key);
	}

	if (selectedKeys.size === 0) {
		return { success: false, error: 'No draft operations selected' };
	}

	const queue = Array.from(selectedKeys);
	while (queue.length > 0) {
		const key = queue.shift();
		if (!key) continue;
		const change = changeByKey.get(key);
		if (!change) continue;

		if (change.groupId && groupMap.has(change.groupId)) {
			for (const groupKey of groupMap.get(change.groupId) ?? []) {
				if (!selectedKeys.has(groupKey)) {
					selectedKeys.add(groupKey);
					queue.push(groupKey);
				}
			}
		}

		if (change.requires && change.requires.length > 0) {
			for (const requirement of change.requires) {
				const required = changeByKey.get(requirement.key);
				if (!required || required.operation !== 'create') continue;
				if (!selectedKeys.has(required.key)) {
					selectedKeys.add(required.key);
					queue.push(required.key);
				}
			}
		}
	}

	const opMap = new Map<number, ReturnType<typeof pcdOpsQueries.getById>>();
	for (const key of selectedKeys) {
		const change = changeByKey.get(key);
		if (!change) continue;
		for (const op of change.ops) {
			const row = pcdOpsQueries.getById(op.id);
			if (!row || row.database_id !== databaseId || row.origin !== 'base' || row.state !== 'draft') {
				continue;
			}
			opMap.set(row.id, row);
		}
	}

	const ops = Array.from(opMap.values())
		.filter((op): op is NonNullable<typeof op> => !!op)
		.sort((a, b) => (a.sequence ?? a.id) - (b.sequence ?? b.id));

	if (ops.length === 0) {
		return { success: false, error: 'No draft operations selected' };
	}

	const exportedAt = new Date().toISOString();
	const header = buildHeader(trimmedMessage, ops.map((op) => op.id), exportedAt);
	const body = ops.map((op) => formatOpBlock(op)).join('\n\n');
	const fileContent = `${header}\n\n${body}\n`;
	const dbSql = body.trim();
	const metadataJson = buildMetadataJson(trimmedMessage, ops.map((op) => op.id), exportedAt);
	const contentHash = await crypto.subtle
		.digest('SHA-256', new TextEncoder().encode(`${dbSql}\n${metadataJson}`))
		.then((hashBuffer) =>
			Array.from(new Uint8Array(hashBuffer))
				.map((b) => b.toString(16).padStart(2, '0'))
				.join('')
		);

	try {
		await pull(database.local_path);
		const maxOpNumber = await getMaxOpNumber(database.local_path);
		const opNumber = maxOpNumber + 1;
		const filename = `${opNumber}.${slugify(trimmedMessage)}.sql`;
		const opsDir = `${database.local_path}/ops`;
		const filepath = `${opsDir}/${filename}`;

		await Deno.mkdir(opsDir, { recursive: true });
		await Deno.writeTextFile(filepath, fileContent);

		try {
			await stage(database.local_path, [filepath]);
			await configureIdentity(database.local_path, gitUserName, gitUserEmail);
			await commit(database.local_path, trimmedMessage);
			await push(database.local_path);
		} catch (err) {
			try {
				await Deno.remove(filepath);
			} catch {
				// ignore cleanup failure
			}
			throw err;
		}

		const newOpId = pcdOpsQueries.create({
			databaseId,
			origin: 'base',
			state: 'published',
			source: 'repo',
			filename,
			opNumber,
			sequence: opNumber,
			sql: dbSql,
			metadata: metadataJson,
			contentHash,
			lastSeenInRepoAt: exportedAt
		});

		const batchId = uuid();
		for (const op of ops) {
			pcdOpsQueries.update(op.id, { state: 'superseded', supersededByOpId: newOpId });
			pcdOpHistoryQueries.create({
				opId: op.id,
				databaseId,
				batchId,
				status: 'superseded'
			});
		}

		if (database.enabled) {
			await compile(database.local_path, databaseId);
		}

		await logger.info('Exported draft ops to repository', {
			source: 'PCDExporter',
			meta: {
				databaseId,
				databaseName: database.name,
				filename,
				opId: newOpId,
				opsExported: ops.length
			}
		});

		return { success: true, filename, opId: newOpId, dropped: ops.length };
	} catch (error) {
		await logger.error('Failed to export draft ops', {
			source: 'PCDExporter',
			meta: { databaseId, error: String(error) }
		});
		return { success: false, error: String(error) };
	}
}
