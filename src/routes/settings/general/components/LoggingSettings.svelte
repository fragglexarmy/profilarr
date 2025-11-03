<script lang="ts">
	import { enhance } from '$app/forms';
	import { alertStore } from '$alerts/store';
	import { Save, RotateCcw } from 'lucide-svelte';
	import NumberInput from '$ui/form/NumberInput.svelte';
	import type { LogSettings } from './types';

	export let settings: LogSettings;

	// Default values
	const DEFAULTS = {
		retention_days: 30,
		min_level: 'INFO',
		enabled: true,
		file_logging: true,
		console_logging: true
	};

	// Reset to defaults (client-side only)
	function resetToDefaults() {
		settings.retention_days = DEFAULTS.retention_days;
		settings.min_level = DEFAULTS.min_level as 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
		settings.enabled = DEFAULTS.enabled;
		settings.file_logging = DEFAULTS.file_logging;
		settings.console_logging = DEFAULTS.console_logging;
	}
</script>

<div
	class="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
>
	<!-- Header -->
	<div class="border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
		<h2 class="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
			Logging Configuration
		</h2>
		<p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
			Configure how Profilarr handles application logs, rotation, and retention
		</p>
	</div>

	<!-- Form -->
	<form
		method="POST"
		action="?/updateLogs"
		class="p-6"
		use:enhance={() => {
			return async ({ result, update }) => {
				if (result.type === 'failure' && result.data) {
					alertStore.add('error', (result.data as { error?: string }).error || 'Failed to save');
				} else if (result.type === 'success') {
					alertStore.add('success', 'Log settings saved successfully!');
				}
				await update();
			};
		}}
	>
		<div class="space-y-6">
			<!-- Toggles Section -->
			<div class="space-y-3">
				<h3 class="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Enable Features</h3>
				<div class="space-y-2">
					<!-- Enable Logging -->
					<label class="flex cursor-pointer items-center gap-3">
						<input
							type="checkbox"
							name="enabled"
							bind:checked={settings.enabled}
							class="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800"
						/>
						<div class="flex-1">
							<span class="text-sm font-medium text-neutral-900 dark:text-neutral-50">
								Enable Logging
							</span>
							<p class="text-xs text-neutral-500 dark:text-neutral-400">
								Master switch for all logging functionality
							</p>
						</div>
					</label>

					<!-- File Logging -->
					<label class="flex cursor-pointer items-center gap-3">
						<input
							type="checkbox"
							name="file_logging"
							bind:checked={settings.file_logging}
							class="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800"
						/>
						<div class="flex-1">
							<span class="text-sm font-medium text-neutral-900 dark:text-neutral-50">
								File Logging
							</span>
							<p class="text-xs text-neutral-500 dark:text-neutral-400">Write logs to disk</p>
						</div>
					</label>

					<!-- Console Logging -->
					<label class="flex cursor-pointer items-center gap-3">
						<input
							type="checkbox"
							name="console_logging"
							bind:checked={settings.console_logging}
							class="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800"
						/>
						<div class="flex-1">
							<span class="text-sm font-medium text-neutral-900 dark:text-neutral-50">
								Console Logging
							</span>
							<p class="text-xs text-neutral-500 dark:text-neutral-400">Output logs to terminal</p>
						</div>
					</label>
				</div>
			</div>

			<!-- Divider -->
			<div class="border-t border-neutral-200 dark:border-neutral-800"></div>

			<!-- Log Level -->
			<div>
				<label
					for="min_level"
					class="mb-2 block text-sm font-semibold text-neutral-900 dark:text-neutral-50"
				>
					Minimum Log Level
				</label>
				<select
					id="min_level"
					name="min_level"
					bind:value={settings.min_level}
					required
					class="block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
				>
					<option value="DEBUG">DEBUG - All logs including debug information</option>
					<option value="INFO">INFO - Informational messages and above</option>
					<option value="WARN">WARN - Warnings and errors only</option>
					<option value="ERROR">ERROR - Errors only</option>
				</select>
				<p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
					Only log messages at or above this level will be recorded
				</p>
			</div>

			<!-- Divider -->
			<div class="border-t border-neutral-200 dark:border-neutral-800"></div>

			<!-- Retention -->
			<div>
				<h3 class="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-50">
					Retention Policy
				</h3>
				<div>
					<label
						for="retention_days"
						class="mb-1 block text-sm font-medium text-neutral-900 dark:text-neutral-50"
					>
						Retention (days)
					</label>
					<NumberInput
						name="retention_days"
						id="retention_days"
						bind:value={settings.retention_days}
						min={1}
						max={365}
						required
					/>
					<p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
						Keep daily log files for 1-365 days. Logs are automatically rotated daily
						(YYYY-MM-DD.log format).
					</p>
				</div>
			</div>
		</div>

		<!-- Action buttons -->
		<div
			class="mt-6 flex items-center justify-between border-t border-neutral-200 pt-6 dark:border-neutral-800"
		>
			<button
				type="button"
				on:click={resetToDefaults}
				class="flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
			>
				<RotateCcw size={16} />
				Reset to Defaults
			</button>

			<button
				type="submit"
				class="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-blue-500 dark:hover:bg-blue-600"
			>
				<Save size={16} />
				Save Settings
			</button>
		</div>
	</form>
</div>
