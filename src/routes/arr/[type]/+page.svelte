<script lang="ts">
	import type { PageData } from './$types';
	import { Plus, Inbox } from 'lucide-svelte';
	import EmptyState from '$ui/state/EmptyState.svelte';

	export let data: PageData;

	// Capitalize first letter for display
	$: displayName = data.type ? data.type.charAt(0).toUpperCase() + data.type.slice(1) : '';
</script>

<EmptyState
	icon={Inbox}
	title="No {displayName} instances yet"
	description="Get started by adding your first {displayName} instance to begin managing your media library."
	buttonText="Add {displayName} Instance"
	buttonHref="/arr/new?type={data.type}"
	buttonIcon={Plus}
/>
