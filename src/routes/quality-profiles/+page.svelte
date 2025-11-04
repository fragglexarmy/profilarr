<script lang="ts">
	import { Database, Plus } from 'lucide-svelte';
	import EmptyState from '$ui/state/EmptyState.svelte';
</script>

<svelte:head>
	<title>Quality Profiles - Profilarr</title>
</svelte:head>

<EmptyState
	icon={Database}
	title="No Databases Linked"
	description="Link a Profilarr Compliant Database to manage quality profiles."
	buttonText="Link Database"
	buttonHref="/databases/new"
	buttonIcon={Plus}
/>
