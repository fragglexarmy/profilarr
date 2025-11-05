/**
 * Utility for detecting and handling unsaved changes
 */

let hasUnsavedChanges = $state(false);
let showWarningModal = $state(false);
let resolveNavigation: ((value: boolean) => void) | null = null;

export function useUnsavedChanges() {
	return {
		/**
		 * Mark the page as having unsaved changes
		 */
		markDirty() {
			hasUnsavedChanges = true;
		},

		/**
		 * Mark the page as clean (changes saved)
		 */
		markClean() {
			hasUnsavedChanges = false;
		},

		/**
		 * Check if there are unsaved changes
		 */
		get isDirty() {
			return hasUnsavedChanges;
		},

		/**
		 * Get modal state
		 */
		get showModal() {
			return showWarningModal;
		},

		/**
		 * Request navigation confirmation
		 * Returns a promise that resolves to true if navigation should proceed
		 */
		confirmNavigation(): Promise<boolean> {
			if (!hasUnsavedChanges) {
				return Promise.resolve(true);
			}

			showWarningModal = true;

			return new Promise((resolve) => {
				resolveNavigation = resolve;
			});
		},

		/**
		 * User confirmed navigation (discard changes)
		 */
		confirmDiscard() {
			showWarningModal = false;
			hasUnsavedChanges = false;
			if (resolveNavigation) {
				resolveNavigation(true);
				resolveNavigation = null;
			}
		},

		/**
		 * User cancelled navigation (stay on page)
		 */
		cancelDiscard() {
			showWarningModal = false;
			if (resolveNavigation) {
				resolveNavigation(false);
				resolveNavigation = null;
			}
		}
	};
}
