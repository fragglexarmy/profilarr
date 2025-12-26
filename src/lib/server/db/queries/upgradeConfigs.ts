import { db } from '../db.ts';
import type { FilterConfig, FilterMode, UpgradeConfig } from '$lib/shared/filters';

/**
 * Database row type for upgrade_configs table
 */
interface UpgradeConfigRow {
	id: number;
	arr_instance_id: number;
	enabled: number;
	schedule: number;
	filter_mode: string;
	filters: string;
	current_filter_index: number;
	created_at: string;
	updated_at: string;
}

/**
 * Input for creating/updating an upgrade config
 */
export interface UpgradeConfigInput {
	enabled?: boolean;
	schedule?: number;
	filterMode?: FilterMode;
	filters?: FilterConfig[];
	currentFilterIndex?: number;
}

/**
 * Convert database row to UpgradeConfig
 */
function rowToConfig(row: UpgradeConfigRow): UpgradeConfig {
	return {
		id: row.id,
		arrInstanceId: row.arr_instance_id,
		enabled: row.enabled === 1,
		schedule: row.schedule,
		filterMode: row.filter_mode as FilterMode,
		filters: JSON.parse(row.filters) as FilterConfig[],
		currentFilterIndex: row.current_filter_index,
		createdAt: row.created_at,
		updatedAt: row.updated_at
	};
}

/**
 * All queries for upgrade_configs table
 */
export const upgradeConfigsQueries = {
	/**
	 * Get upgrade config by arr instance ID
	 */
	getByArrInstanceId(arrInstanceId: number): UpgradeConfig | undefined {
		const row = db.queryFirst<UpgradeConfigRow>(
			'SELECT * FROM upgrade_configs WHERE arr_instance_id = ?',
			arrInstanceId
		);
		return row ? rowToConfig(row) : undefined;
	},

	/**
	 * Get all upgrade configs
	 */
	getAll(): UpgradeConfig[] {
		const rows = db.query<UpgradeConfigRow>('SELECT * FROM upgrade_configs');
		return rows.map(rowToConfig);
	},

	/**
	 * Get all enabled upgrade configs
	 */
	getEnabled(): UpgradeConfig[] {
		const rows = db.query<UpgradeConfigRow>(
			'SELECT * FROM upgrade_configs WHERE enabled = 1'
		);
		return rows.map(rowToConfig);
	},

	/**
	 * Create or update an upgrade config for an arr instance
	 * Uses upsert pattern since there's one config per instance
	 */
	upsert(arrInstanceId: number, input: UpgradeConfigInput): UpgradeConfig {
		const existing = this.getByArrInstanceId(arrInstanceId);

		if (existing) {
			// Update existing
			this.update(arrInstanceId, input);
			return this.getByArrInstanceId(arrInstanceId)!;
		}

		// Create new
		const enabled = input.enabled !== undefined ? (input.enabled ? 1 : 0) : 0;
		const schedule = input.schedule ?? 360;
		const filterMode = input.filterMode ?? 'round_robin';
		const filters = JSON.stringify(input.filters ?? []);
		const currentFilterIndex = input.currentFilterIndex ?? 0;

		db.execute(
			`INSERT INTO upgrade_configs
			(arr_instance_id, enabled, schedule, filter_mode, filters, current_filter_index)
			VALUES (?, ?, ?, ?, ?, ?)`,
			arrInstanceId,
			enabled,
			schedule,
			filterMode,
			filters,
			currentFilterIndex
		);

		return this.getByArrInstanceId(arrInstanceId)!;
	},

	/**
	 * Update an upgrade config
	 */
	update(arrInstanceId: number, input: UpgradeConfigInput): boolean {
		const updates: string[] = [];
		const params: (string | number)[] = [];

		if (input.enabled !== undefined) {
			updates.push('enabled = ?');
			params.push(input.enabled ? 1 : 0);
		}
		if (input.schedule !== undefined) {
			updates.push('schedule = ?');
			params.push(input.schedule);
		}
		if (input.filterMode !== undefined) {
			updates.push('filter_mode = ?');
			params.push(input.filterMode);
		}
		if (input.filters !== undefined) {
			updates.push('filters = ?');
			params.push(JSON.stringify(input.filters));
		}
		if (input.currentFilterIndex !== undefined) {
			updates.push('current_filter_index = ?');
			params.push(input.currentFilterIndex);
		}

		if (updates.length === 0) {
			return false;
		}

		updates.push('updated_at = CURRENT_TIMESTAMP');
		params.push(arrInstanceId);

		const affected = db.execute(
			`UPDATE upgrade_configs SET ${updates.join(', ')} WHERE arr_instance_id = ?`,
			...params
		);

		return affected > 0;
	},

	/**
	 * Delete an upgrade config
	 */
	delete(arrInstanceId: number): boolean {
		const affected = db.execute(
			'DELETE FROM upgrade_configs WHERE arr_instance_id = ?',
			arrInstanceId
		);
		return affected > 0;
	},

	/**
	 * Increment the current filter index (for round-robin mode)
	 * Wraps around to 0 when reaching the end
	 */
	incrementFilterIndex(arrInstanceId: number): number {
		const config = this.getByArrInstanceId(arrInstanceId);
		if (!config) return 0;

		const enabledFilters = config.filters.filter((f) => f.enabled);
		if (enabledFilters.length === 0) return 0;

		const nextIndex = (config.currentFilterIndex + 1) % enabledFilters.length;

		db.execute(
			'UPDATE upgrade_configs SET current_filter_index = ?, updated_at = CURRENT_TIMESTAMP WHERE arr_instance_id = ?',
			nextIndex,
			arrInstanceId
		);

		return nextIndex;
	},

	/**
	 * Reset the filter index to 0
	 */
	resetFilterIndex(arrInstanceId: number): void {
		db.execute(
			'UPDATE upgrade_configs SET current_filter_index = 0, updated_at = CURRENT_TIMESTAMP WHERE arr_instance_id = ?',
			arrInstanceId
		);
	}
};
