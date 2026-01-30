import type { OperationType } from '../core/types.ts';
import { pcdOpsQueries } from '$db/queries/pcdOps.ts';

type ParsedMetadata = {
	operation?: OperationType;
	entity?: string;
	name?: string;
	previousName?: string;
	summary?: string;
	title?: string;
	changed_fields?: string[];
	stable_key?: { key: string; value: string };
};

export type DraftOpDetails = {
	id: number;
	operation: OperationType;
	title: string;
	summary?: string;
	createdAt: string;
	sequence: number | null;
};

type FieldAggregate = {
	field: string;
	label: string;
	before?: unknown;
	after?: unknown;
	add?: unknown[];
	remove?: unknown[];
	items?: unknown[];
	beforeItems?: unknown[];
	afterItems?: unknown[];
};

export type DraftEntitySectionRow =
	| {
			kind: 'field';
			field: string;
			label: string;
			before?: unknown;
			after?: unknown;
			add?: unknown[];
			remove?: unknown[];
	  }
	| {
			kind: 'custom_format_scores';
			field: string;
			label: string;
			rows: Array<{
				custom_format_name: string;
				arr_type: string;
				before: number | null;
				after: number | null;
			}>;
	  }
	| {
			kind: 'ordered_items';
			field: string;
			label: string;
			beforeItems?: Array<{
				type: string;
				name: string;
				position: number;
				enabled: boolean;
				upgradeUntil: boolean;
				members?: Array<{ name: string }>;
			}>;
			afterItems?: Array<{
				type: string;
				name: string;
				position: number;
				enabled: boolean;
				upgradeUntil: boolean;
				members?: Array<{ name: string }>;
			}>;
	  };

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

const FIELD_LABELS: Record<string, string> = {
	quality_profile_name: 'Quality profile',
	custom_format_name: 'Custom format',
	delay_profile_name: 'Delay profile',
	regular_expression_name: 'Regular expression',
	ordered_items: 'Ordered items',
	tags: 'Tags',
	include_in_rename: 'Include in rename',
	preferred_protocol: 'Preferred protocol',
	usenet_delay: 'Usenet delay',
	torrent_delay: 'Torrent delay',
	bypass_if_highest_quality: 'Bypass if highest quality',
	bypass_if_above_custom_format_score: 'Bypass if above score',
	minimum_custom_format_score: 'Minimum score',
	upgrade_until_score: 'Upgrade until score',
	upgrade_score_increment: 'Upgrade score increment'
};

function parseJson<T>(value: string | null): T | null {
	if (!value) return null;
	try {
		return JSON.parse(value) as T;
	} catch {
		return null;
	}
}

function humanizeKey(value: string): string {
	const trimmed = value.replace(/[_-]+/g, ' ').trim();
	return trimmed.replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatFieldLabel(field: string): string {
	return FIELD_LABELS[field] ?? humanizeKey(field);
}

function buildSummary(operation: OperationType, fields: string[]): string {
	if (operation === 'create') return 'Created';
	if (operation === 'delete') return 'Deleted';
	if (fields.length === 0) return 'Updated';
	if (fields.length === 1) return `Updated ${formatFieldLabel(fields[0])}`;
	if (fields.length === 2) {
		return `Updated ${formatFieldLabel(fields[0])} + ${formatFieldLabel(fields[1])}`;
	}
	return `Updated ${fields.length} fields`;
}

function ensureField(map: Map<string, FieldAggregate>, field: string): FieldAggregate {
	const existing = map.get(field);
	if (existing) return existing;
	const created: FieldAggregate = { field, label: formatFieldLabel(field) };
	map.set(field, created);
	return created;
}

function mergeValues(target: FieldAggregate, value: unknown) {
	if (target.field === 'tags' && Array.isArray(value)) {
		target.add = Array.from(new Set(value.map((tag) => String(tag))));
		return;
	}

	if (value && typeof value === 'object' && !Array.isArray(value)) {
		const record = value as Record<string, unknown>;
		if ('from' in record || 'to' in record) {
			if (target.before === undefined && record.from !== undefined) {
				target.before = record.from;
			}
			if (record.to !== undefined) {
				target.after = record.to;
			}
			return;
		}
		if ('add' in record || 'remove' in record) {
			const addValues = Array.isArray(record.add) ? record.add : record.add ? [record.add] : [];
			const removeValues = Array.isArray(record.remove)
				? record.remove
				: record.remove
					? [record.remove]
					: [];
			target.add = Array.from(new Set([...(target.add ?? []), ...addValues]));
			target.remove = Array.from(new Set([...(target.remove ?? []), ...removeValues]));
			return;
		}
	}

	target.after = value;
	if (target.before === undefined) {
		target.before = undefined;
	}
}

function mergeCustomFormatScores(target: FieldAggregate, value: unknown) {
	if (!Array.isArray(value)) return;
	const map = new Map<
		string,
		{ custom_format_name: string; arr_type: string; before: number | null; after: number | null }
	>();
	if (Array.isArray(target.items)) {
		for (const item of target.items as Array<{
			custom_format_name: string;
			arr_type: string;
			before: number | null;
			after: number | null;
		}>) {
			map.set(`${item.custom_format_name}::${item.arr_type}`, { ...item });
		}
	}

	for (const entry of value) {
		if (!entry || typeof entry !== 'object') continue;
		const record = entry as Record<string, unknown>;
		if (!record.custom_format_name || !record.arr_type) continue;
		const key = `${record.custom_format_name}::${record.arr_type}`;
		const current = map.get(key);
		const next = {
			custom_format_name: record.custom_format_name as string,
			arr_type: record.arr_type as string,
			before: (record.from ?? current?.before ?? null) as number | null,
			after: (record.to ?? current?.after ?? null) as number | null
		};
		map.set(key, next);
	}

	target.items = Array.from(map.values());
}

function mergeOrderedItems(target: FieldAggregate, value: unknown) {
	if (Array.isArray(value)) {
		target.afterItems = value as Array<{
			type: string;
			name: string;
			position: number;
			enabled: boolean;
			upgradeUntil: boolean;
			members?: Array<{ name: string }>;
		}>;
		return;
	}

	if (value && typeof value === 'object' && !Array.isArray(value)) {
		const record = value as Record<string, unknown>;
		if (Array.isArray(record.from)) {
			target.beforeItems = record.from as Array<{
				type: string;
				name: string;
				position: number;
				enabled: boolean;
				upgradeUntil: boolean;
				members?: Array<{ name: string }>;
			}>;
		}
		if (Array.isArray(record.to)) {
			target.afterItems = record.to as Array<{
				type: string;
				name: string;
				position: number;
				enabled: boolean;
				upgradeUntil: boolean;
				members?: Array<{ name: string }>;
			}>;
		}
	}
}

function buildSections(entity: string, aggregates: Map<string, FieldAggregate>): DraftEntitySection[] {
	if (aggregates.size === 0) return [];

	if (entity === 'quality_profile') {
		const generalFields = ['name', 'description', 'tags', 'language'];
		const scoringFields = [
			'minimum_custom_format_score',
			'upgrade_until_score',
			'upgrade_score_increment',
			'custom_format_scores'
		];
		const qualitiesFields = ['ordered_items'];

		const sections: DraftEntitySection[] = [];

		const buildSectionRows = (fields: string[]): DraftEntitySectionRow[] => {
			const rows: DraftEntitySectionRow[] = [];
			for (const field of fields) {
				const aggregate = aggregates.get(field);
				if (!aggregate) continue;
				if (field === 'custom_format_scores') {
					rows.push({
						kind: 'custom_format_scores',
						field,
						label: aggregate.label,
						rows: (aggregate.items ?? []) as Array<{
							custom_format_name: string;
							arr_type: string;
							before: number | null;
							after: number | null;
						}>
					});
					continue;
				}
				if (field === 'ordered_items') {
					rows.push({
						kind: 'ordered_items',
						field,
						label: aggregate.label,
						beforeItems: (aggregate.beforeItems ?? []) as Array<{
							type: string;
							name: string;
							position: number;
							enabled: boolean;
							upgradeUntil: boolean;
							members?: Array<{ name: string }>;
						}>,
						afterItems: (aggregate.afterItems ?? []) as Array<{
							type: string;
							name: string;
							position: number;
							enabled: boolean;
							upgradeUntil: boolean;
							members?: Array<{ name: string }>;
						}>
					});
					continue;
				}
				rows.push({
					kind: 'field',
					field,
					label: aggregate.label,
					before: aggregate.before,
					after: aggregate.after,
					add: aggregate.add,
					remove: aggregate.remove
				});
			}
			return rows;
		};

		const generalRows = buildSectionRows(generalFields);
		if (generalRows.length > 0) sections.push({ id: 'general', title: 'General', rows: generalRows });

		const scoringRows = buildSectionRows(scoringFields);
		if (scoringRows.length > 0) sections.push({ id: 'scoring', title: 'Scoring', rows: scoringRows });

		const qualitiesRows = buildSectionRows(qualitiesFields);
		if (qualitiesRows.length > 0) sections.push({ id: 'qualities', title: 'Qualities', rows: qualitiesRows });

		return sections;
	}

	const fallbackRows: DraftEntitySectionRow[] = [];
	for (const aggregate of aggregates.values()) {
		fallbackRows.push({
			kind: 'field',
			field: aggregate.field,
			label: aggregate.label,
			before: aggregate.before,
			after: aggregate.after,
			add: aggregate.add,
			remove: aggregate.remove
		});
	}

	return [{ id: 'changes', title: 'Changes', rows: fallbackRows }];
}

export function listDraftEntityChanges(databaseId: number): DraftEntityChange[] {
	const ops = pcdOpsQueries.listByDatabaseAndOrigin(databaseId, 'base', { states: ['draft'] });
	const parsedOps = ops.map((op) => ({
		op,
		metadata: parseJson<ParsedMetadata>(op.metadata)
	}));
	const nameAliases = new Map<string, string>();
	for (const { metadata } of parsedOps) {
		if (!metadata?.name) continue;
		const previousName = metadata.previousName;
		if (previousName) {
			nameAliases.set(metadata.name, previousName);
		}
	}

	const resolveAlias = (value: string): string => {
		let current = value;
		const seen = new Set<string>();
		while (nameAliases.has(current) && !seen.has(current)) {
			seen.add(current);
			current = nameAliases.get(current) ?? current;
		}
		return current;
	};
	const groups = new Map<string, DraftEntityChange>();
	const aggregates = new Map<string, Map<string, FieldAggregate>>();

	for (const { op, metadata } of parsedOps) {
		if (!metadata?.entity || !metadata?.name || !metadata.operation) {
			continue;
		}

		const desiredState = parseJson<Record<string, unknown>>(op.desired_state);
		const stableKey = metadata.stable_key?.value ?? metadata.name;
		const groupKey = `${metadata.entity}:${resolveAlias(stableKey)}`;

		const existing = groups.get(groupKey);
		const updatedAt = op.updated_at ?? op.created_at;

		const opDetails: DraftOpDetails = {
			id: op.id,
			operation: metadata.operation,
			title: metadata.title ?? `${humanizeKey(metadata.operation)} ${metadata.entity}`,
			summary: metadata.summary ?? undefined,
			createdAt: op.created_at,
			sequence: op.sequence
		};

		if (!existing) {
			groups.set(groupKey, {
				key: groupKey,
				entity: metadata.entity,
				name: metadata.name,
				operation: metadata.operation,
				summary: '',
				changedFields: [],
				updatedAt,
				ops: [opDetails],
				sections: []
			});
		} else {
			existing.ops.push(opDetails);
			existing.updatedAt = existing.updatedAt > updatedAt ? existing.updatedAt : updatedAt;
			existing.name = metadata.name;
		}

		if (desiredState) {
			let fieldMap = aggregates.get(groupKey);
			if (!fieldMap) {
				fieldMap = new Map();
				aggregates.set(groupKey, fieldMap);
			}

			for (const [field, value] of Object.entries(desiredState)) {
				const aggregate = ensureField(fieldMap, field);
				if (field === 'custom_format_scores') {
					mergeCustomFormatScores(aggregate, value);
					continue;
				}
				if (field === 'ordered_items') {
					mergeOrderedItems(aggregate, value);
					continue;
				}
				mergeValues(aggregate, value);
			}
		}
	}

	const results: DraftEntityChange[] = [];

	for (const group of groups.values()) {
		group.ops.sort((a, b) => {
			const aSeq = a.sequence ?? a.id;
			const bSeq = b.sequence ?? b.id;
			return aSeq - bSeq;
		});

		const hasCreate = group.ops.some((op) => op.operation === 'create');
		const hasDelete = group.ops.some((op) => op.operation === 'delete');
		group.operation = hasCreate ? 'create' : hasDelete ? 'delete' : 'update';

		const fieldMap = aggregates.get(group.key);
		const fieldSet = new Set<string>();
		if (fieldMap) {
			for (const field of fieldMap.keys()) {
				fieldSet.add(field);
			}
		}
		group.changedFields = Array.from(fieldSet);
		group.summary = buildSummary(group.operation, group.changedFields);
		group.sections = buildSections(group.entity, fieldMap ?? new Map());

		results.push(group);
	}

	results.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
	return results;
}
