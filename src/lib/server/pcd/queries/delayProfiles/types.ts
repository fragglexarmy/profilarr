/**
 * Delay Profile query-specific types
 */

/** Preferred protocol options */
export type PreferredProtocol = 'prefer_usenet' | 'prefer_torrent' | 'only_usenet' | 'only_torrent';

/** Delay profile data for table/card views */
export interface DelayProfileTableRow {
	id: number;
	name: string;
	preferred_protocol: PreferredProtocol;
	usenet_delay: number | null;
	torrent_delay: number | null;
	bypass_if_highest_quality: boolean;
	bypass_if_above_custom_format_score: boolean;
	minimum_custom_format_score: number | null;
	created_at: string;
	updated_at: string;
}
