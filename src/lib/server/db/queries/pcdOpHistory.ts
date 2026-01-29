import { db } from '../db.ts';

export type PcdOpHistoryStatus =
	| 'applied'
	| 'skipped'
	| 'conflicted'
	| 'conflicted_pending'
	| 'error'
	| 'dropped'
	| 'superseded';

export interface PcdOpHistory {
	id: number;
	op_id: number;
	database_id: number;
	batch_id: string;
	status: PcdOpHistoryStatus;
	rowcount: number | null;
	conflict_reason: string | null;
	error: string | null;
	details: string | null;
	applied_at: string;
}

export interface CreatePcdOpHistoryInput {
	opId: number;
	databaseId: number;
	batchId: string;
	status: PcdOpHistoryStatus;
	rowcount?: number | null;
	conflictReason?: string | null;
	error?: string | null;
	details?: string | null;
}

export const pcdOpHistoryQueries = {
	create(input: CreatePcdOpHistoryInput): number {
		db.execute(
			`INSERT INTO pcd_op_history (
				op_id, database_id, batch_id, status,
				rowcount, conflict_reason, error, details
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?)` ,
			input.opId,
			input.databaseId,
			input.batchId,
			input.status,
			input.rowcount ?? null,
			input.conflictReason ?? null,
			input.error ?? null,
			input.details ?? null
		);

		const result = db.queryFirst<{ id: number }>('SELECT last_insert_rowid() as id');
		return result?.id ?? 0;
	},

	listByOp(opId: number): PcdOpHistory[] {
		return db.query<PcdOpHistory>(
			'SELECT * FROM pcd_op_history WHERE op_id = ? ORDER BY applied_at DESC, id DESC',
			opId
		);
	},

	listByDatabase(databaseId: number): PcdOpHistory[] {
		return db.query<PcdOpHistory>(
			'SELECT * FROM pcd_op_history WHERE database_id = ? ORDER BY applied_at DESC, id DESC',
			databaseId
		);
	}
};
