<script lang="ts">
	import { beforeNavigate, goto } from '$app/navigation';
	import Modal from './Modal.svelte';
	import { useUnsavedChanges } from '$lib/client/utils/unsavedChanges.svelte';

	const unsavedChanges = useUnsavedChanges();
	let pendingNavigationUrl: string | null = null;

	beforeNavigate(async (navigation) => {
		if (unsavedChanges.isDirty) {
			navigation.cancel();
			pendingNavigationUrl = navigation.to?.url.pathname || null;
			const shouldNavigate = await unsavedChanges.confirmNavigation();
			if (shouldNavigate && pendingNavigationUrl) {
				goto(pendingNavigationUrl);
			}
			pendingNavigationUrl = null;
		}
	});
</script>

<Modal
	open={unsavedChanges.showModal}
	header="Unsaved Changes"
	bodyMessage="You have unsaved changes. Are you sure you want to leave this page? Your changes will be lost."
	confirmText="Discard Changes"
	cancelText="Stay on Page"
	confirmDanger={true}
	on:confirm={() => unsavedChanges.confirmDiscard()}
	on:cancel={() => unsavedChanges.cancelDiscard()}
/>
