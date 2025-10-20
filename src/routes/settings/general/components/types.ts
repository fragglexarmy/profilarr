/**
 * Types for settings/general components
 */

export interface LogSettings {
	rotation_strategy: 'daily' | 'size' | 'both';
	retention_days: number;
	max_file_size: number;
	min_level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
	enabled: boolean;
	file_logging: boolean;
	console_logging: boolean;
}

export interface BackupSettings {
	schedule: string;
	retention_days: number;
	enabled: boolean;
	include_database: boolean;
	compression_enabled: boolean;
}
