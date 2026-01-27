/**
 * Quality definitions queries
 */

// Read
export { list, getRadarrByName, getSonarrByName, getAvailableQualities } from './read.ts';

// Create
export { createRadarrQualityDefinitions, createSonarrQualityDefinitions } from './create.ts';

// Update
export { updateRadarrQualityDefinitions, updateSonarrQualityDefinitions } from './update.ts';

// Delete
export { removeRadarrQualityDefinitions, removeSonarrQualityDefinitions } from './delete.ts';
