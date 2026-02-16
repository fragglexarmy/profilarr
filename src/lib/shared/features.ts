/**
 * Feature flags for gating unreleased functionality.
 * Flip to `true` when ready to ship.
 */

export const FEATURES = {
	/** PCD entity import/export */
	importExport: false
} as const;
