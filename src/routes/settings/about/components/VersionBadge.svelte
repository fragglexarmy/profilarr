<script lang="ts">
	import { FlaskConical } from 'lucide-svelte';
	import type { ComponentType } from 'svelte';
	import Label from '$ui/label/Label.svelte';

	export let status: 'up-to-date' | 'out-of-date' | 'dev-build';

	type StatusConfig = {
		label: string;
		variant: 'success' | 'danger';
		icon?: ComponentType | null;
	};

	const statusConfig: Record<'up-to-date' | 'out-of-date' | 'dev-build', StatusConfig> = {
		'up-to-date': {
			label: 'Up to date',
			variant: 'success',
			icon: null
		},
		'out-of-date': {
			label: 'Out of date',
			variant: 'danger',
			icon: null
		},
		'dev-build': {
			label: 'Dev build',
			variant: 'success',
			icon: FlaskConical
		}
	};

	const config = statusConfig[status];
</script>

<Label variant={config.variant} size="md" rounded="md">
	{#if config.icon}
		<svelte:component this={config.icon} size={12} />
	{/if}
	{config.label}
</Label>
