<script lang="ts">
	import { enhance } from '$app/forms';
	import { alertStore } from '$alerts/store';
	import { Save } from 'lucide-svelte';
	import type { PageData } from './$types';

	export let data: PageData;
	export let form: any = undefined;

	// Form values
	let description = form?.values?.description ?? data.job.description ?? '';
	let schedule = form?.values?.schedule ?? data.job.schedule ?? '';
</script>

<div class="p-8">
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-neutral-900 dark:text-neutral-50">
			Edit Job: {data.job.name}
		</h1>
		<p class="mt-3 text-lg text-neutral-600 dark:text-neutral-400">
			Update job configuration and schedule
		</p>
	</div>

	<div class="max-w-2xl">
		<form
			method="POST"
			class="space-y-6"
			use:enhance={() => {
				return async ({ result, update }) => {
					if (result.type === 'failure' && result.data) {
						alertStore.add(
							'error',
							(result.data as { error?: string }).error || 'Failed to update job'
						);
					} else if (result.type === 'redirect') {
						alertStore.add('success', 'Job updated successfully!');
					}
					await update();
				};
			}}
		>
			<!-- Job Name (Read-only) -->
			<div>
				<label for="name" class="block text-sm font-medium text-neutral-900 dark:text-neutral-50">
					Job Name
				</label>
				<input
					type="text"
					id="name"
					value={data.job.name}
					disabled
					class="mt-1 block w-full rounded-lg border border-neutral-300 bg-neutral-100 px-3 py-2 text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400"
				/>
				<p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
					Job name cannot be changed
				</p>
			</div>

			<!-- Description -->
			<div>
				<label
					for="description"
					class="block text-sm font-medium text-neutral-900 dark:text-neutral-50"
				>
					Description
				</label>
				<textarea
					id="description"
					name="description"
					bind:value={description}
					rows="3"
					placeholder="Brief description of what this job does"
					class="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder-neutral-400 focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50 dark:placeholder-neutral-500 dark:focus:border-neutral-500 dark:focus:ring-neutral-500"
				></textarea>
			</div>

			<!-- Schedule -->
			<div>
				<label
					for="schedule"
					class="block text-sm font-medium text-neutral-900 dark:text-neutral-50"
				>
					Schedule <span class="text-red-500">*</span>
				</label>
				<input
					type="text"
					id="schedule"
					name="schedule"
					bind:value={schedule}
					required
					placeholder="* * * * *"
					class="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 font-mono text-neutral-900 placeholder-neutral-400 focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50 dark:placeholder-neutral-500 dark:focus:border-neutral-500 dark:focus:ring-neutral-500"
				/>
				<div class="mt-2 space-y-2">
					<p class="text-sm text-neutral-600 dark:text-neutral-400">
						Cron expression: <code class="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs dark:bg-neutral-800">minute hour day month weekday</code>
					</p>
					<div class="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-neutral-600 dark:text-neutral-400">
						<div class="flex items-center gap-2">
							<code class="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs dark:bg-neutral-800">* * * * *</code>
							<span>Every minute</span>
						</div>
						<div class="flex items-center gap-2">
							<code class="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs dark:bg-neutral-800">*/5 * * * *</code>
							<span>Every 5 minutes</span>
						</div>
						<div class="flex items-center gap-2">
							<code class="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs dark:bg-neutral-800">0 * * * *</code>
							<span>Every hour</span>
						</div>
						<div class="flex items-center gap-2">
							<code class="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs dark:bg-neutral-800">0 0 * * *</code>
							<span>Daily at midnight</span>
						</div>
						<div class="flex items-center gap-2">
							<code class="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs dark:bg-neutral-800">0 6 * * 1</code>
							<span>Mondays at 6am</span>
						</div>
						<div class="flex items-center gap-2">
							<code class="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs dark:bg-neutral-800">0 0 1 * *</code>
							<span>First of month</span>
						</div>
					</div>
				</div>
			</div>

			<!-- Action Buttons -->
			<div class="flex gap-3 border-t border-neutral-200 pt-6 dark:border-neutral-800">
				<button
					type="submit"
					class="flex items-center gap-2 rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-700 dark:bg-accent-500 dark:hover:bg-accent-600"
				>
					<Save size={16} />
					Save Changes
				</button>
				<a
					href="/settings/jobs"
					class="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
				>
					Cancel
				</a>
			</div>
		</form>
	</div>
</div>
