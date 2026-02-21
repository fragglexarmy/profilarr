<script lang="ts">
	import NotificationServiceForm from '../../components/NotificationServiceForm.svelte';
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<svelte:head>
	<title>{data.service.name} - Notifications - Profilarr</title>
</svelte:head>

<div class="p-4 md:p-8">
	<NotificationServiceForm
		mode="edit"
		initialData={{
			name: data.service.name,
			serviceType: data.service.serviceType,
			config: data.service.config,
			enabledTypes: data.service.enabledTypes
		}}
	/>
</div>
