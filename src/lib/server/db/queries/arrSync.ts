import { db } from '../db.ts';

// Types
export type SyncTrigger = 'none' | 'manual' | 'on_pull' | 'on_change' | 'schedule';

export interface ProfileSelection {
	databaseId: number;
	profileId: number;
}

export interface SyncConfig {
	trigger: SyncTrigger;
	cron: string | null;
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
				trigger: (configRow?.trigger as SyncTrigger) ?? 'none',
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
			`INSERT INTO arr_sync_quality_profiles_config (instance_id, trigger, cron)
			 VALUES (?, ?, ?)
			 ON CONFLICT(instance_id) DO UPDATE SET trigger = ?, cron = ?`,
			instanceId,
			config.trigger,
			config.cron,
			config.trigger,
			config.cron
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
				trigger: (configRow?.trigger as SyncTrigger) ?? 'none',
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
			`INSERT INTO arr_sync_delay_profiles_config (instance_id, trigger, cron)
			 VALUES (?, ?, ?)
			 ON CONFLICT(instance_id) DO UPDATE SET trigger = ?, cron = ?`,
			instanceId,
			config.trigger,
			config.cron,
			config.trigger,
			config.cron
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
			trigger: (row?.trigger as SyncTrigger) ?? 'none',
			cron: row?.cron ?? null
		};
	},

	saveMediaManagementSync(instanceId: number, data: MediaManagementSyncData): void {
		db.execute(
			`INSERT INTO arr_sync_media_management
			 (instance_id, naming_database_id, quality_definitions_database_id, media_settings_database_id, trigger, cron)
			 VALUES (?, ?, ?, ?, ?, ?)
			 ON CONFLICT(instance_id) DO UPDATE SET
			 naming_database_id = ?,
			 quality_definitions_database_id = ?,
			 media_settings_database_id = ?,
			 trigger = ?,
			 cron = ?`,
			instanceId,
			data.namingDatabaseId,
			data.qualityDefinitionsDatabaseId,
			data.mediaSettingsDatabaseId,
			data.trigger,
			data.cron,
			data.namingDatabaseId,
			data.qualityDefinitionsDatabaseId,
			data.mediaSettingsDatabaseId,
			data.trigger,
			data.cron
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
	}
};
