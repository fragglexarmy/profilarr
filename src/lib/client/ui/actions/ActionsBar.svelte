<script lang="ts">
	export let className: string = '';
</script>

<div class="actions-bar flex w-full justify-center mx-auto md:w-auto md:mx-0 {className}">
	<slot />
</div>

<style>
	.actions-bar :global(> *:not(:first-child)) {
		margin-left: -1px;
	}

	/* Apply rounding to the actual bordered elements inside first/last children */
	.actions-bar :global(> *:first-child > *) {
		border-top-left-radius: 0.5rem !important;
		border-bottom-left-radius: 0.5rem !important;
	}

	.actions-bar :global(> *:first-child > button) {
		border-top-left-radius: 0.5rem !important;
		border-bottom-left-radius: 0.5rem !important;
	}

	.actions-bar :global(> *:last-child > *) {
		border-top-right-radius: 0.5rem !important;
		border-bottom-right-radius: 0.5rem !important;
	}

	.actions-bar :global(> *:last-child > button) {
		border-top-right-radius: 0.5rem !important;
		border-bottom-right-radius: 0.5rem !important;
	}

	.actions-bar :global(> *:last-child > * > button) {
		border-top-right-radius: 0.5rem !important;
		border-bottom-right-radius: 0.5rem !important;
	}

	.actions-bar :global(> *:only-child > *) {
		border-radius: 0.5rem !important;
	}
</style>
