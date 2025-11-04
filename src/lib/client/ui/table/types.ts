import type { ComponentType } from 'svelte';

/**
 * Column definition for table
 */
export interface Column<T> {
	/** Unique key for the column */
	key: string;
	/** Header text to display */
	header: string;
	/** Optional icon component to display before header text */
	headerIcon?: ComponentType;
	/** Optional width class (e.g., 'w-32', 'w-1/4') */
	width?: string;
	/** Text alignment */
	align?: 'left' | 'center' | 'right';
	/** Whether column is sortable */
	sortable?: boolean;
	/** Custom cell renderer - receives the full row object */
	cell?: (row: T) => string | ComponentType | { html: string };
}
