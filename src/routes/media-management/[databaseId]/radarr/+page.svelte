<script lang="ts">
	import { beforeNavigate, goto } from '$app/navigation';
	import QualityDefinitionsSection from '../components/QualityDefinitionsSection.svelte';
	import NamingSection from '../components/NamingSection.svelte';
	import MediaSettingsSection from '../components/MediaSettingsSection.svelte';
	import Modal from '$ui/modal/Modal.svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	$: hasAnyData =
		data.mediaManagement.qualityDefinitions.length > 0 ||
		data.mediaManagement.naming !== null ||
		data.mediaManagement.mediaSettings !== null;

	// Dirty tracking state from child sections
	let qualityIsEditing = false;
	let qualityHasChanges = false;
	let namingIsEditing = false;
	let namingHasChanges = false;
	let mediaIsEditing = false;
	let mediaHasChanges = false;

	// Aggregate dirty state
	$: pageIsDirty =
		(qualityIsEditing && qualityHasChanges) ||
		(namingIsEditing && namingHasChanges) ||
		(mediaIsEditing && mediaHasChanges);

	// Navigation blocking
	let showDirtyModal = false;
	let pendingNavigationUrl: string | null = null;

	beforeNavigate((navigation) => {
		if (pageIsDirty) {
			navigation.cancel();
			pendingNavigationUrl = navigation.to?.url.pathname || null;
			showDirtyModal = true;
		}
	});

	function handleDiscardChanges() {
		showDirtyModal = false;
		if (pendingNavigationUrl) {
			// Reset all editing states before navigating
			qualityIsEditing = false;
			namingIsEditing = false;
			mediaIsEditing = false;
			goto(pendingNavigationUrl);
		}
		pendingNavigationUrl = null;
	}

	function handleStayOnPage() {
		showDirtyModal = false;
		pendingNavigationUrl = null;
	}
</script>

<div class="space-y-8">
	{#if !hasAnyData}
		<div
			class="rounded-lg border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900"
		>
			<p class="text-neutral-600 dark:text-neutral-400">
				No Radarr media management settings configured
			</p>
		</div>
	{:else}
		<QualityDefinitionsSection
			definitions={data.mediaManagement.qualityDefinitions}
			arrType="radarr"
			canWriteToBase={data.canWriteToBase}
			bind:isEditing={qualityIsEditing}
			bind:hasChanges={qualityHasChanges}
		/>

		<NamingSection
			naming={data.mediaManagement.naming}
			arrType="radarr"
			canWriteToBase={data.canWriteToBase}
			bind:isEditing={namingIsEditing}
			bind:hasChanges={namingHasChanges}
		/>

		<MediaSettingsSection
			settings={data.mediaManagement.mediaSettings}
			arrType="radarr"
			canWriteToBase={data.canWriteToBase}
			bind:isEditing={mediaIsEditing}
			bind:hasChanges={mediaHasChanges}
		/>
	{/if}
</div>

<Modal
	open={showDirtyModal}
	header="Unsaved Changes"
	bodyMessage="You have unsaved changes. Are you sure you want to leave this page? Your changes will be lost."
	confirmText="Discard Changes"
	cancelText="Stay on Page"
	confirmDanger={true}
	on:confirm={handleDiscardChanges}
	on:cancel={handleStayOnPage}
/>
