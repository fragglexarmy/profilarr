<script lang="ts">
	import type { PageData } from './$types';
	import JobCard from './components/JobCard.svelte';
	import JobHistory from './components/JobHistory.svelte';

	export let data: PageData;
</script>

<div class="p-8">
	<!-- Header -->
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-neutral-900 dark:text-neutral-50">Background Jobs</h1>
		<p class="mt-3 text-lg text-neutral-600 dark:text-neutral-400">
			Manage scheduled tasks and automation workflows
		</p>
	</div>

	<!-- Jobs List -->
	<div class="mb-8 space-y-4">
		{#each data.jobs as job (job.id)}
			<JobCard {job} />
		{:else}
			<div
				class="rounded-lg border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900"
			>
				<p class="text-neutral-600 dark:text-neutral-400">No background jobs configured</p>
			</div>
		{/each}
	</div>

	<!-- Job History -->
	<JobHistory jobRuns={data.jobRuns} />
</div>
