/**
 * Sync module - handles syncing PCD profiles to arr instances
 *
 * Used by:
 * - Sync job (automatic, triggered by should_sync flag)
 * - Manual sync (Sync Now button)
 */

// Base class
export { BaseSyncer, type SyncResult } from './base.ts';

// Syncer implementations
export { QualityProfileSyncer } from './qualityProfiles.ts';
export { DelayProfileSyncer } from './delayProfiles.ts';
export { MediaManagementSyncer } from './mediaManagement.ts';

// Processor functions
export { processPendingSyncs, syncInstance, type ProcessSyncsResult } from './processor.ts';
