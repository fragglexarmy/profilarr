import type { QualityProfileCustomFormatsRow } from '$shared/pcd/types';
import type { OrderedItem } from '$shared/pcd/display';

export type OperationType = 'create' | 'update' | 'delete';

export type DraftOpDetails = {
	id: number;
	operation: OperationType;
	title: string;
	summary?: string;
	createdAt: string;
	sequence: number | null;
};

export type FieldRow = {
	kind: 'field';
	field: string;
	label: string;
	before?: unknown;
	after?: unknown;
	add?: unknown[];
	remove?: unknown[];
};

export type CustomFormatScoreDiff = Pick<
	QualityProfileCustomFormatsRow,
	'custom_format_name' | 'arr_type'
> & {
	before: number | null;
	after: number | null;
};

export type CustomFormatScoresRow = {
	kind: 'custom_format_scores';
	field: string;
	label: string;
	rows: CustomFormatScoreDiff[];
};

export type OrderedItemsRow = {
	kind: 'ordered_items';
	field: string;
	label: string;
	beforeItems?: OrderedItem[];
	afterItems?: OrderedItem[];
};

export type DraftEntitySectionRow = FieldRow | CustomFormatScoresRow | OrderedItemsRow;

export type DraftEntitySection = {
	id: string;
	title: string;
	rows: DraftEntitySectionRow[];
};

export type DraftEntityChange = {
	key: string;
	entity: string;
	name: string;
	operation: OperationType;
	summary: string;
	changedFields: string[];
	updatedAt: string;
	ops: DraftOpDetails[];
	sections: DraftEntitySection[];
};
