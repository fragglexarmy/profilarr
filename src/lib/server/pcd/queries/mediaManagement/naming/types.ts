/**
 * Naming query-specific types
 */

export type ArrType = 'radarr' | 'sonarr';

export interface NamingListItem {
	name: string;
	arr_type: ArrType;
	rename: boolean;
	updated_at: string;
}
