import { db } from '../db.ts';

// Types
export type SyncTrigger = 'manual' | 'on_pull' | 'on_change' | 'schedule';

export interface ProfileSelection {
	databaseId: number;
	profileId: number;
}

export interface SyncConfig {
	trigger: SyncTrigger;
	cron: string | null;
	nextRunAt?: string | null;
}

export interface QualityProfilesSyncData {
	selections: ProfileSelection[];
	config: SyncConfig;
}

export interface DelayProfilesSyncData {
	selections: ProfileSelection[];
	config: SyncConfig;
}

export interface MediaManagementSyncData {
	namingDatabaseId: number | null;
	qualityDefinitionsDatabaseId: number | null;
	mediaSettingsDatabaseId: number | null;
	trigger: SyncTrigger;
	cron: string | null;
	nextRunAt?: string | null;
}

// Row types
interface ProfileSelectionRow {
	instance_id: number;
	database_id: number;
	profile_id: number;
}

interface ConfigRow {
	instance_id: number;
	trigger: string;
	cron: string | null;
}

interface MediaManagementRow {
	instance_id: number;
	naming_database_id: number | null;
	quality_definitions_database_id: number | null;
	media_settings_database_id: number | null;
	trigger: string;
	cron: string | null;
}

export const arrSyncQueries = {
	// ========== Quality Profiles ==========

	getQualityProfilesSync(instanceId: number): QualityProfilesSyncData {
		const selectionRows = db.query<ProfileSelectionRow>(
			'SELECT * FROM arr_sync_quality_profiles WHERE instance_id = ?',
			instanceId
		);

		const configRow = db.queryFirst<ConfigRow>(
			'SELECT * FROM arr_sync_quality_profiles_config WHERE instance_id = ?',
			instanceId
		);

		return {
			selections: selectionRows.map((row) => ({
				databaseId: row.database_id,
				profileId: row.profile_id
			})),
			config: {
				trigger: (configRow?.trigger as SyncTrigger) ?? 'manual',
				cron: configRow?.cron ?? null
			}
		};
	},

	saveQualityProfilesSync(
		instanceId: number,
		selections: ProfileSelection[],
		config: SyncConfig
	): void {
		// Clear existing selections
		db.execute('DELETE FROM arr_sync_quality_profiles WHERE instance_id = ?', instanceId);

		// Insert new selections
		for (const sel of selections) {
			db.execute(
				'INSERT INTO arr_sync_quality_profiles (instance_id, database_id, profile_id) VALUES (?, ?, ?)',
				instanceId,
				sel.databaseId,
				sel.profileId
			);
		}

		// Upsert config
		db.execute(
			`INSERT INTO arr_sync_quality_profiles_config (instance_id, trigger, cron, next_run_at)
			 VALUES (?, ?, ?, ?)
			 ON CONFLICT(instance_id) DO UPDATE SET trigger = ?, cron = ?, next_run_at = ?`,
			instanceId,
			config.trigger,
			config.cron,
			config.nextRunAt ?? null,
			config.trigger,
			config.cron,
			config.nextRunAt ?? null
		);
	},

	// ========== Delay Profiles ==========

	getDelayProfilesSync(instanceId: number): DelayProfilesSyncData {
		const selectionRows = db.query<ProfileSelectionRow>(
			'SELECT * FROM arr_sync_delay_profiles WHERE instance_id = ?',
			instanceId
		);

		const configRow = db.queryFirst<ConfigRow>(
			'SELECT * FROM arr_sync_delay_profiles_config WHERE instance_id = ?',
			instanceId
		);

		return {
			selections: selectionRows.map((row) => ({
				databaseId: row.database_id,
				profileId: row.profile_id
			})),
			config: {
				trigger: (configRow?.trigger as SyncTrigger) ?? 'manual',
				cron: configRow?.cron ?? null
			}
		};
	},

	saveDelayProfilesSync(
		instanceId: number,
		selections: ProfileSelection[],
		config: SyncConfig
	): void {
		// Clear existing selections
		db.execute('DELETE FROM arr_sync_delay_profiles WHERE instance_id = ?', instanceId);

		// Insert new selections
		for (const sel of selections) {
			db.execute(
				'INSERT INTO arr_sync_delay_profiles (instance_id, database_id, profile_id) VALUES (?, ?, ?)',
				instanceId,
				sel.databaseId,
				sel.profileId
			);
		}

		// Upsert config
		db.execute(
			`INSERT INTO arr_sync_delay_profiles_config (instance_id, trigger, cron, next_run_at)
			 VALUES (?, ?, ?, ?)
			 ON CONFLICT(instance_id) DO UPDATE SET trigger = ?, cron = ?, next_run_at = ?`,
			instanceId,
			config.trigger,
			config.cron,
			config.nextRunAt ?? null,
			config.trigger,
			config.cron,
			config.nextRunAt ?? null
		);
	},

	// ========== Media Management ==========

	getMediaManagementSync(instanceId: number): MediaManagementSyncData {
		const row = db.queryFirst<MediaManagementRow>(
			'SELECT * FROM arr_sync_media_management WHERE instance_id = ?',
			instanceId
		);

		return {
			namingDatabaseId: row?.naming_database_id ?? null,
			qualityDefinitionsDatabaseId: row?.quality_definitions_database_id ?? null,
			mediaSettingsDatabaseId: row?.media_settings_database_id ?? null,
			trigger: (row?.trigger as SyncTrigger) ?? 'manual',
			cron: row?.cron ?? null
		};
	},

	saveMediaManagementSync(instanceId: number, data: MediaManagementSyncData): void {
		db.execute(
			`INSERT INTO arr_sync_media_management
			 (instance_id, naming_database_id, quality_definitions_database_id, media_settings_database_id, trigger, cron, next_run_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?)
			 ON CONFLICT(instance_id) DO UPDATE SET
			 naming_database_id = ?,
			 quality_definitions_database_id = ?,
			 media_settings_database_id = ?,
			 trigger = ?,
			 cron = ?,
			 next_run_at = ?`,
			instanceId,
			data.namingDatabaseId,
			data.qualityDefinitionsDatabaseId,
			data.mediaSettingsDatabaseId,
			data.trigger,
			data.cron,
			data.nextRunAt ?? null,
			data.namingDatabaseId,
			data.qualityDefinitionsDatabaseId,
			data.mediaSettingsDatabaseId,
			data.trigger,
			data.cron,
			data.nextRunAt ?? null
		);
	},

	// ========== Full Sync Data ==========

	getFullSyncData(instanceId: number) {
		return {
			qualityProfiles: this.getQualityProfilesSync(instanceId),
			delayProfiles: this.getDelayProfilesSync(instanceId),
			mediaManagement: this.getMediaManagementSync(instanceId)
		};
	},

	// ========== Cleanup ==========

	/**
	 * Remove orphaned profile references when a profile is deleted
	 */
	removeQualityProfileReference(databaseId: number, profileId: number): number {
		return db.execute(
			'DELETE FROM arr_sync_quality_profiles WHERE database_id = ? AND profile_id = ?',
			databaseId,
			profileId
		);
	},

	removeDelayProfileReference(databaseId: number, profileId: number): number {
		return db.execute(
			'DELETE FROM arr_sync_delay_profiles WHERE database_id = ? AND profile_id = ?',
			databaseId,
			profileId
		);
	},

	/**
	 * Remove all references to a database (when database is deleted)
	 */
	removeDatabaseReferences(databaseId: number): void {
		db.execute('DELETE FROM arr_sync_quality_profiles WHERE database_id = ?', databaseId);
		db.execute('DELETE FROM arr_sync_delay_profiles WHERE database_id = ?', databaseId);
		db.execute(
			'UPDATE arr_sync_media_management SET naming_database_id = NULL WHERE naming_database_id = ?',
			databaseId
		);
		db.execute(
			'UPDATE arr_sync_media_management SET quality_definitions_database_id = NULL WHERE quality_definitions_database_id = ?',
			databaseId
		);
		db.execute(
			'UPDATE arr_sync_media_management SET media_settings_database_id = NULL WHERE media_settings_database_id = ?',
			databaseId
		);
	},

	// ========== Should Sync Flags ==========

	/**
	 * Set should_sync flag for quality profiles
	 */
	setQualityProfilesShouldSync(instanceId: number, shouldSync: boolean): void {
		db.execute(
			'UPDATE arr_sync_quality_profiles_config SET should_sync = ? WHERE instance_id = ?',
			shouldSync ? 1 : 0,
			instanceId
		);
	},

	/**
	 * Set should_sync flag for delay profiles
	 */
	setDelayProfilesShouldSync(instanceId: number, shouldSync: boolean): void {
		db.execute(
			'UPDATE arr_sync_delay_profiles_config SET should_sync = ? WHERE instance_id = ?',
			shouldSync ? 1 : 0,
			instanceId
		);
	},

	/**
	 * Set should_sync flag for media management
	 */
	setMediaManagementShouldSync(instanceId: number, shouldSync: boolean): void {
		db.execute(
			'UPDATE arr_sync_media_management SET should_sync = ? WHERE instance_id = ?',
			shouldSync ? 1 : 0,
			instanceId
		);
	},

	/**
	 * Mark all configs with a specific trigger as should_sync
	 * Used when events occur (pull, change)
	 */
	markForSync(trigger: 'on_pull' | 'on_change'): void {
		const triggers = trigger === 'on_change' ? ['on_pull', 'on_change'] : ['on_pull'];
		const placeholders = triggers.map(() => '?').join(', ');

		db.execute(
			`UPDATE arr_sync_quality_profiles_config SET should_sync = 1 WHERE trigger IN (${placeholders})`,
			...triggers
		);
		db.execute(
			`UPDATE arr_sync_delay_profiles_config SET should_sync = 1 WHERE trigger IN (${placeholders})`,
			...triggers
		);
		db.execute(
			`UPDATE arr_sync_media_management SET should_sync = 1 WHERE trigger IN (${placeholders})`,
			...triggers
		);
	},

	/**
	 * Get all configs that need syncing (should_sync = true)
	 */
	getPendingSyncs(): {
		qualityProfiles: number[];
		delayProfiles: number[];
		mediaManagement: number[];
	} {
		const qp = db.query<{ instance_id: number }>(
			'SELECT instance_id FROM arr_sync_quality_profiles_config WHERE should_sync = 1'
		);
		const dp = db.query<{ instance_id: number }>(
			'SELECT instance_id FROM arr_sync_delay_profiles_config WHERE should_sync = 1'
		);
		const mm = db.query<{ instance_id: number }>(
			'SELECT instance_id FROM arr_sync_media_management WHERE should_sync = 1'
		);

		return {
			qualityProfiles: qp.map((r) => r.instance_id),
			delayProfiles: dp.map((r) => r.instance_id),
			mediaManagement: mm.map((r) => r.instance_id)
		};
	},

	/**
	 * Get all scheduled configs that haven't been marked for sync yet
	 */
	getScheduledConfigs(): {
		qualityProfiles: { instanceId: number; cron: string | null; nextRunAt: string | null }[];
		delayProfiles: { instanceId: number; cron: string | null; nextRunAt: string | null }[];
		mediaManagement: { instanceId: number; cron: string | null; nextRunAt: string | null }[];
	} {
		const qp = db.query<{ instance_id: number; cron: string | null; next_run_at: string | null }>(
			"SELECT instance_id, cron, next_run_at FROM arr_sync_quality_profiles_config WHERE trigger = 'schedule' AND should_sync = 0"
		);
		const dp = db.query<{ instance_id: number; cron: string | null; next_run_at: string | null }>(
			"SELECT instance_id, cron, next_run_at FROM arr_sync_delay_profiles_config WHERE trigger = 'schedule' AND should_sync = 0"
		);
		const mm = db.query<{ instance_id: number; cron: string | null; next_run_at: string | null }>(
			"SELECT instance_id, cron, next_run_at FROM arr_sync_media_management WHERE trigger = 'schedule' AND should_sync = 0"
		);

		return {
			qualityProfiles: qp.map((r) => ({
				instanceId: r.instance_id,
				cron: r.cron,
				nextRunAt: r.next_run_at
			})),
			delayProfiles: dp.map((r) => ({
				instanceId: r.instance_id,
				cron: r.cron,
				nextRunAt: r.next_run_at
			})),
			mediaManagement: mm.map((r) => ({
				instanceId: r.instance_id,
				cron: r.cron,
				nextRunAt: r.next_run_at
			}))
		};
	},

	/**
	 * Update next_run_at for a quality profiles config
	 */
	setQualityProfilesNextRunAt(instanceId: number, nextRunAt: string | null): void {
		db.execute(
			'UPDATE arr_sync_quality_profiles_config SET next_run_at = ? WHERE instance_id = ?',
			nextRunAt,
			instanceId
		);
	},

	/**
	 * Update next_run_at for a delay profiles config
	 */
	setDelayProfilesNextRunAt(instanceId: number, nextRunAt: string | null): void {
		db.execute(
			'UPDATE arr_sync_delay_profiles_config SET next_run_at = ? WHERE instance_id = ?',
			nextRunAt,
			instanceId
		);
	},

	/**
	 * Update next_run_at for a media management config
	 */
	setMediaManagementNextRunAt(instanceId: number, nextRunAt: string | null): void {
		db.execute(
			'UPDATE arr_sync_media_management SET next_run_at = ? WHERE instance_id = ?',
			nextRunAt,
			instanceId
		);
	}
};
