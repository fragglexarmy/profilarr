/**
 * Arr Client Types
 */

export type ArrType = 'radarr' | 'sonarr' | 'lidarr' | 'chaptarr';

/**
 * System status response from /api/v3/system/status
 * Based on actual Radarr API response
 */
export interface ArrSystemStatus {
	appName: string;
	instanceName: string;
	version: string;
	buildTime: string;
	isDebug: boolean;
	isProduction: boolean;
	isAdmin: boolean;
	isUserInteractive: boolean;
	startupPath: string;
	appData: string;
	osName: string;
	osVersion: string;
	isNetCore: boolean;
	isLinux: boolean;
	isOsx: boolean;
	isWindows: boolean;
	isDocker: boolean;
	mode: 'console' | string;
	branch: string;
	databaseType: 'sqLite' | string;
	databaseVersion: string;
	authentication: 'none' | 'basic' | 'forms' | string;
	migrationVersion: number;
	urlBase: string;
	runtimeVersion: string;
	runtimeName: string;
	startTime: string;
	packageVersion: string;
	packageAuthor: string;
	packageUpdateMechanism: 'builtIn' | string;
	packageUpdateMechanismMessage: string;
}
