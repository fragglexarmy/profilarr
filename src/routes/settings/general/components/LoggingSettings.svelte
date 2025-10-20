<script lang="ts">
	import { enhance } from '$app/forms';
	import { toastStore } from '$stores/toast';
	import { Save, RotateCcw } from 'lucide-svelte';
	import NumberInput from '$components/form/NumberInput.svelte';
	import type { LogSettings } from './types';

	export let settings: LogSettings;

	// Default values
	const DEFAULTS = {
		rotation_strategy: 'daily',
		retention_days: 30,
		max_file_size: 100,
		min_level: 'INFO',
		enabled: true,
		file_logging: true,
		console_logging: true
	};

	// Reset to defaults (client-side only)
	function resetToDefaults() {
		settings.rotation_strategy = DEFAULTS.rotation_strategy as 'daily' | 'size' | 'both';
		settings.retention_days = DEFAULTS.retention_days;
		settings.max_file_size = DEFAULTS.max_file_size;
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
					toastStore.add('error', (result.data as { error?: string }).error || 'Failed to save');
				} else if (result.type === 'success') {
					toastStore.add('success', 'Log settings saved successfully!');
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
					<label class="flex items-center gap-3 cursor-pointer">
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
					<label class="flex items-center gap-3 cursor-pointer">
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
					<label class="flex items-center gap-3 cursor-pointer">
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
							<p class="text-xs text-neutral-500 dark:text-neutral-400">
								Output logs to terminal
							</p>
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
					class="block text-sm font-semibold text-neutral-900 dark:text-neutral-50 mb-2"
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

			<!-- Rotation & Retention -->
			<div>
				<h3 class="text-sm font-semibold text-neutral-900 dark:text-neutral-50 mb-3">
					Rotation & Retention
				</h3>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<!-- Rotation Strategy -->
					<div>
						<label
							for="rotation_strategy"
							class="block text-sm font-medium text-neutral-900 dark:text-neutral-50 mb-1"
						>
							Rotation Strategy
						</label>
						<select
							id="rotation_strategy"
							name="rotation_strategy"
							bind:value={settings.rotation_strategy}
							required
							class="block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
						>
							<option value="daily">Daily</option>
							<option value="size">Size</option>
							<option value="both">Both</option>
						</select>
						<p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
							How to rotate log files
						</p>
					</div>

					<!-- Retention Days -->
					<div>
						<label
							for="retention_days"
							class="block text-sm font-medium text-neutral-900 dark:text-neutral-50 mb-1"
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
							Keep logs for 1-365 days
						</p>
					</div>

					<!-- Max File Size -->
					<div class="md:col-span-2">
						<label
							for="max_file_size"
							class="block text-sm font-medium text-neutral-900 dark:text-neutral-50 mb-1"
						>
							Max File Size (MB)
						</label>
						<NumberInput
							name="max_file_size"
							id="max_file_size"
							bind:value={settings.max_file_size}
							min={1}
							max={1000}
							required
						/>
						<p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
							Maximum size before rotation (1-1000 MB)
						</p>
					</div>
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
				class="flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
			>
				<RotateCcw size={16} />
				Reset to Defaults
			</button>

			<button
				type="submit"
				class="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600"
			>
				<Save size={16} />
				Save Settings
			</button>
		</div>
	</form>
</div>
