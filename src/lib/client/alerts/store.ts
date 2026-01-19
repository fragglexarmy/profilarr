import { writable } from 'svelte/store';
import { uuid } from '$shared/uuid';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

export interface Alert {
	id: string;
	type: AlertType;
	message: string;
	duration?: number; // Auto-dismiss duration in ms (default: 5000)
}

function createAlertStore() {
	const { subscribe, update } = writable<Alert[]>([]);

	return {
		subscribe,
		add: (type: AlertType, message: string, duration = 5000) => {
			const id = uuid();
			const alert: Alert = { id, type, message, duration };

			update((alerts) => [...alerts, alert]);

			// Auto-dismiss after duration
			if (duration > 0) {
				setTimeout(() => {
					update((alerts) => alerts.filter((a) => a.id !== id));
				}, duration);
			}

			return id;
		},
		remove: (id: string) => {
			update((alerts) => alerts.filter((a) => a.id !== id));
		},
		clear: () => {
			update(() => []);
		}
	};
}

export const alertStore = createAlertStore();
