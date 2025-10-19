import { toastStore } from '$stores/toast';

export interface ApiRequestOptions extends RequestInit {
	showSuccessToast?: boolean; // Show toast on success (default: false)
	showErrorToast?: boolean; // Show toast on error (default: true)
	successMessage?: string; // Custom success message
	errorMessage?: string; // Custom error message (overrides server error)
}

export class ApiError extends Error {
	constructor(
		message: string,
		public status: number,
		public data?: unknown
	) {
		super(message);
		this.name = 'ApiError';
	}
}

/**
 * Wrapper for fetch API with automatic toast notifications
 * @param url - Request URL
 * @param options - Request options with toast configuration
 * @returns Response data (automatically parsed as JSON)
 */
export async function apiRequest<T = unknown>(
	url: string,
	options: ApiRequestOptions = {}
): Promise<T> {
	const {
		showSuccessToast = false,
		showErrorToast = true,
		successMessage,
		errorMessage,
		headers,
		...fetchOptions
	} = options;

	try {
		// Set default headers
		const defaultHeaders: HeadersInit = {
			'Content-Type': 'application/json'
		};

		const response = await fetch(url, {
			...fetchOptions,
			headers: {
				...defaultHeaders,
				...headers
			}
		});

		// Parse response
		const data = await response.json();

		// Handle HTTP errors
		if (!response.ok) {
			const message = errorMessage || data.error || data.message || `HTTP ${response.status}`;

			if (showErrorToast) {
				toastStore.add('error', message);
			}

			throw new ApiError(message, response.status, data);
		}

		// Show success toast if requested
		if (showSuccessToast && successMessage) {
			toastStore.add('success', successMessage);
		}

		return data as T;
	} catch (error) {
		// Handle network errors or other exceptions
		if (error instanceof ApiError) {
			throw error;
		}

		const message = errorMessage || (error instanceof Error ? error.message : 'Network error');

		if (showErrorToast) {
			toastStore.add('error', message);
		}

		throw new ApiError(message, 0);
	}
}
