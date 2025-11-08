/**
 * Quality profile qualities queries
 */

import type { PCDCache } from '../../cache.ts';

export interface QualityMember {
	id: number;
	name: string;
}

export interface OrderedItem {
	id: number; // quality_profile_qualities.id
	type: 'quality' | 'group';
	referenceId: number; // quality_id or quality_group_id
	name: string;
	position: number;
	enabled: boolean;
	upgradeUntil: boolean;
	members?: QualityMember[];
}

export interface QualityGroup {
	id: number;
	name: string;
	members: QualityMember[];
}

export interface QualitiesPageData {
	orderedItems: OrderedItem[];
	availableQualities: QualityMember[];
	allQualities: QualityMember[];
	groups: QualityGroup[];
}

/**
 * Get quality profile qualities data
 */
export async function qualities(cache: PCDCache, _databaseId: number, profileId: number): Promise<QualitiesPageData> {
	const db = cache.kb;

	// 1. Get all qualities
	const allQualities = await db
		.selectFrom('qualities')
		.select(['id', 'name'])
		.orderBy('name')
		.execute();

	// 2. Get all groups for this profile
	const groups = await db
		.selectFrom('quality_groups')
		.select(['id', 'name'])
		.where('quality_profile_id', '=', profileId)
		.execute();

	// 3. Get group members
	const groupMembers = await db
		.selectFrom('quality_group_members')
		.innerJoin('qualities', 'qualities.id', 'quality_group_members.quality_id')
		.innerJoin('quality_groups', 'quality_groups.id', 'quality_group_members.quality_group_id')
		.where('quality_groups.quality_profile_id', '=', profileId)
		.select([
			'quality_group_members.quality_group_id',
			'qualities.id as quality_id',
			'qualities.name as quality_name'
		])
		.execute();

	// Build groups with members
	const groupsMap = new Map<number, QualityGroup>();
	for (const group of groups) {
		groupsMap.set(group.id, {
			id: group.id,
			name: group.name,
			members: []
		});
	}

	for (const member of groupMembers) {
		const group = groupsMap.get(member.quality_group_id);
		if (group) {
			group.members.push({
				id: member.quality_id,
				name: member.quality_name
			});
		}
	}

	// 4. Get ordered list (quality_profile_qualities)
	const orderedList = await db
		.selectFrom('quality_profile_qualities')
		.leftJoin('qualities', 'qualities.id', 'quality_profile_qualities.quality_id')
		.leftJoin('quality_groups', 'quality_groups.id', 'quality_profile_qualities.quality_group_id')
		.where('quality_profile_qualities.quality_profile_id', '=', profileId)
		.select([
			'quality_profile_qualities.id',
			'quality_profile_qualities.quality_id',
			'quality_profile_qualities.quality_group_id',
			'quality_profile_qualities.position',
			'quality_profile_qualities.enabled',
			'quality_profile_qualities.upgrade_until',
			'qualities.name as quality_name',
			'quality_groups.name as group_name'
		])
		.orderBy('quality_profile_qualities.position')
		.execute();

	// Build ordered items
	const orderedItems: OrderedItem[] = orderedList.map(item => {
		const isGroup = item.quality_group_id !== null;
		const referenceId = isGroup ? item.quality_group_id! : item.quality_id!;
		const name = isGroup ? item.group_name! : item.quality_name!;

		const orderedItem: OrderedItem = {
			id: item.id,
			type: isGroup ? 'group' : 'quality',
			referenceId,
			name,
			position: item.position,
			enabled: item.enabled === 1,
			upgradeUntil: item.upgrade_until === 1
		};

		// Add members if it's a group
		if (isGroup) {
			const group = groupsMap.get(referenceId);
			orderedItem.members = group?.members || [];
		}

		return orderedItem;
	});

	// 5. Find available qualities (not in ordered list and not in any group)
	const usedQualityIds = new Set<number>();

	// Mark qualities in ordered list
	for (const item of orderedItems) {
		if (item.type === 'quality') {
			usedQualityIds.add(item.referenceId);
		} else {
			// Mark all members of groups as used
			item.members?.forEach(member => usedQualityIds.add(member.id));
		}
	}

	const availableQualities = allQualities
		.filter(q => !usedQualityIds.has(q.id))
		.map(q => ({ id: q.id, name: q.name }));

	return {
		orderedItems,
		availableQualities,
		allQualities: allQualities.map(q => ({ id: q.id, name: q.name })),
		groups: Array.from(groupsMap.values())
	};
}
