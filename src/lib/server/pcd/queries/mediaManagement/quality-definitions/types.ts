/**
 * Quality definitions types
 */

export type ArrType = 'radarr' | 'sonarr';

export interface QualityDefinitionListItem {
	name: string;
	arr_type: ArrType;
	quality_count: number;
	updated_at: string;
}

export interface QualityDefinitionEntry {
	quality_name: string;
	min_size: number;
	max_size: number;
	preferred_size: number;
}

export interface QualityDefinitionsConfig {
	name: string;
	entries: QualityDefinitionEntry[];
}
