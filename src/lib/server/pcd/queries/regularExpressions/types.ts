/**
 * Regular Expression query-specific types
 */

import type { Tag } from '../../types.ts';

/** Regular expression data for table/card views */
export interface RegularExpressionTableRow {
	id: number;
	name: string;
	pattern: string;
	regex101_id: string | null;
	description: string | null;
	tags: Tag[];
	created_at: string;
	updated_at: string;
}
