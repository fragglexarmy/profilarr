<script lang="ts">
	import Label from '$ui/label/Label.svelte';

	export let row: { level: string };

	const levelLabelClasses: Record<string, string> = {
		DEBUG: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
		INFO: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
		WARN: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
		ERROR: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
	};

	$: labelClasses =
		levelLabelClasses[row.level] ||
		'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300';
</script>

<Label customVariant={labelClasses} size="sm" rounded="md">
	{row.level}
</Label>
