export type SyncSection = 'qualityProfiles' | 'delayProfiles' | 'mediaManagement';

export interface AffectedSection {
	section: SyncSection;
	syncStatus: string;
	lastSyncedAt: string | null;
}

export interface AffectedArr {
	instanceId: number;
	instanceName: string;
	sections: AffectedSection[];
}
