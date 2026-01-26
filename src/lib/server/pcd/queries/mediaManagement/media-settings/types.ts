/**
 * Media settings query-specific types
 */

export type ArrType = 'radarr' | 'sonarr';

export interface MediaSettingsListItem {
	name: string;
	arr_type: ArrType;
	propers_repacks: string;
	enable_media_info: boolean;
	updated_at: string;
}
