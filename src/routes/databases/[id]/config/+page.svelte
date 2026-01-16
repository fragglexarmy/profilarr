<script lang="ts">
	import type { PageData } from './$types';
	import NumberInput from '$ui/form/NumberInput.svelte';
	import KeyValueList from '$ui/form/KeyValueList.svelte';
	import TagInput from '$ui/form/TagInput.svelte';
	import MarkdownInput from '$ui/form/MarkdownInput.svelte';
	import { alertStore } from '$lib/client/alerts/store';

	export let data: PageData;

	let manifest = data.manifest;
	let readme = data.readmeRaw ?? '';

	function update<K extends keyof NonNullable<typeof manifest>>(key: K, value: NonNullable<typeof manifest>[K]) {
		if (!manifest) return;
		manifest = { ...manifest, [key]: value };
	}

	function updateProfilarr(key: 'minimum_version', value: string) {
		if (!manifest) return;
		manifest = {
			...manifest,
			profilarr: { ...manifest.profilarr, [key]: value }
		};
	}

	function parseVersion(v: string): [number, number, number] {
		const parts = v.split('.').map((p) => parseInt(p, 10) || 0);
		return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
	}

	function updateVersionPart(current: string, part: 0 | 1 | 2, value: number): string {
		const parts = parseVersion(current);
		parts[part] = value;
		return parts.join('.');
	}

	$: [vMajor, vMinor, vPatch] = manifest ? parseVersion(manifest.version) : [0, 0, 0];
	$: [pvMajor, pvMinor, pvPatch] = manifest ? parseVersion(manifest.profilarr.minimum_version) : [0, 0, 0];
</script>

<svelte:head>
	<title>Config - {data.database.name} - Profilarr</title>
</svelte:head>

<div class="mt-6">
		{#if manifest}
			<div class="space-y-5">
				<!-- Name -->
				<div class="space-y-1">
					<label for="name" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
						Name <span class="text-red-500">*</span>
					</label>
					<p class="text-xs text-neutral-500 dark:text-neutral-400">
						Unique identifier for the database (lowercase, hyphens preferred)
					</p>
					<input
						type="text"
						id="name"
						value={manifest.name}
						oninput={(e) => update('name', (e.target as HTMLInputElement).value)}
						placeholder="my-database"
						class="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 transition-colors focus:border-neutral-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500 dark:focus:border-neutral-500"
					/>
				</div>

				<!-- Description -->
				<div class="space-y-1">
					<label for="description" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
						Description <span class="text-red-500">*</span>
					</label>
					<p class="text-xs text-neutral-500 dark:text-neutral-400">
						Short summary of what the database provides
					</p>
					<input
						type="text"
						id="description"
						value={manifest.description}
						oninput={(e) => update('description', (e.target as HTMLInputElement).value)}
						placeholder="My custom Arr configurations"
						class="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 transition-colors focus:border-neutral-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500 dark:focus:border-neutral-500"
					/>
				</div>

				<!-- Version -->
				<div class="space-y-1">
					<span class="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
						Version <span class="text-red-500">*</span>
					</span>
					<p class="text-xs text-neutral-500 dark:text-neutral-400">
						Semantic version of the database (MAJOR.MINOR.PATCH)
					</p>
					<div class="mt-1 flex items-center gap-1">
						<div class="w-20">
							<NumberInput
								name="version-major"
								value={vMajor}
								min={1}
								font="mono"
								onchange={(v) => update('version', updateVersionPart(manifest.version, 0, v))}
								onMinBlocked={() => alertStore.add('warning', 'Database version must be at least 1.0.0')}
							/>
						</div>
						<span class="text-lg font-medium text-neutral-400 dark:text-neutral-500">.</span>
						<div class="w-20">
							<NumberInput
								name="version-minor"
								value={vMinor}
								min={0}
								font="mono"
								onchange={(v) => update('version', updateVersionPart(manifest.version, 1, v))}
							/>
						</div>
						<span class="text-lg font-medium text-neutral-400 dark:text-neutral-500">.</span>
						<div class="w-20">
							<NumberInput
								name="version-patch"
								value={vPatch}
								min={0}
								font="mono"
								onchange={(v) => update('version', updateVersionPart(manifest.version, 2, v))}
							/>
						</div>
					</div>
				</div>

				<!-- Minimum Profilarr Version -->
				<div class="space-y-1">
					<span class="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
						Minimum Profilarr Version <span class="text-red-500">*</span>
					</span>
					<p class="text-xs text-neutral-500 dark:text-neutral-400">
						Minimum Profilarr version required to use this database
					</p>
					<div class="mt-1 flex items-center gap-1">
						<div class="w-20">
							<NumberInput
								name="profilarr-version-major"
								value={pvMajor}
								min={2}
								font="mono"
								onchange={(v) => updateProfilarr('minimum_version', updateVersionPart(manifest.profilarr.minimum_version, 0, v))}
								onMinBlocked={() => alertStore.add('warning', 'Minimum Profilarr version must be at least 2.0.0')}
							/>
						</div>
						<span class="text-lg font-medium text-neutral-400 dark:text-neutral-500">.</span>
						<div class="w-20">
							<NumberInput
								name="profilarr-version-minor"
								value={pvMinor}
								min={0}
								font="mono"
								onchange={(v) => updateProfilarr('minimum_version', updateVersionPart(manifest.profilarr.minimum_version, 1, v))}
							/>
						</div>
						<span class="text-lg font-medium text-neutral-400 dark:text-neutral-500">.</span>
						<div class="w-20">
							<NumberInput
								name="profilarr-version-patch"
								value={pvPatch}
								min={0}
								font="mono"
								onchange={(v) => updateProfilarr('minimum_version', updateVersionPart(manifest.profilarr.minimum_version, 2, v))}
							/>
						</div>
					</div>
				</div>

				<!-- Arr Types -->
				<div class="space-y-1">
					<span class="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
						Arr Types
					</span>
					<p class="text-xs text-neutral-500 dark:text-neutral-400">
						Which arr applications this database supports. Leave empty if all are supported.
					</p>
					<div class="mt-1">
						<TagInput
							tags={manifest.arr_types ?? []}
							placeholder="Add arr type (radarr, sonarr, etc.)"
							onchange={(tags) => update('arr_types', tags)}
						/>
					</div>
				</div>

				<!-- Tags -->
				<div class="space-y-1">
					<span class="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Tags</span>
					<p class="text-xs text-neutral-500 dark:text-neutral-400">
						Descriptive keywords for discovery
					</p>
					<div class="mt-1">
						<TagInput
							tags={manifest.tags ?? []}
							placeholder="Add tags..."
							onchange={(tags) => update('tags', tags)}
						/>
					</div>
				</div>

				<!-- License -->
				<div class="space-y-1">
					<label for="license" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
						License
					</label>
					<p class="text-xs text-neutral-500 dark:text-neutral-400">
						SPDX license identifier (e.g., MIT, Apache-2.0)
					</p>
					<input
						type="text"
						id="license"
						value={manifest.license ?? ''}
						oninput={(e) => update('license', (e.target as HTMLInputElement).value || undefined)}
						placeholder="MIT"
						class="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 transition-colors focus:border-neutral-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500 dark:focus:border-neutral-500"
					/>
				</div>

				<!-- Repository -->
				<div class="space-y-1">
					<label for="repository" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
						Repository
					</label>
					<p class="text-xs text-neutral-500 dark:text-neutral-400">
						Git repository URL
					</p>
					<input
						type="url"
						id="repository"
						value={manifest.repository ?? ''}
						oninput={(e) => update('repository', (e.target as HTMLInputElement).value || undefined)}
						placeholder="https://github.com/user/repo"
						class="mt-1 block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 transition-colors focus:border-neutral-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500 dark:focus:border-neutral-500"
					/>
				</div>

				<!-- Dependencies -->
				<KeyValueList
					label="Dependencies"
					description="Dependencies this database requires. All PCDs must depend on schema at minimum. Additional dependencies coming in a future version."
					keyLabel="Package"
					valueLabel="Version"
					keyPlaceholder="package-name"
					valueType="version"
					versionMinMajor={1}
					value={manifest.dependencies ?? {}}
					onchange={(v) => update('dependencies', v)}
					lockedFirst={{ key: 'https://github.com/Dictionarry-Hub/schema', value: '1.0.0', minMajor: 1 }}
					onLockedEditAttempt={() => alertStore.add('warning', 'The schema package URL cannot be changed')}
					onLockedDeleteAttempt={() => alertStore.add('warning', 'The schema dependency is required and cannot be removed')}
					onLockedVersionMinBlocked={() => alertStore.add('warning', 'Schema version must be at least 1.0.0')}
					addDisabled={true}
					onAddBlocked={() => alertStore.add('info', 'Additional dependencies are not available yet. Coming in a future version.')}
				/>

				<!-- README -->
				<div class="space-y-1">
					<span class="block text-sm font-medium text-neutral-700 dark:text-neutral-300">README</span>
					<p class="text-xs text-neutral-500 dark:text-neutral-400">
						Documentation for your database
					</p>
					<div class="mt-1">
						<MarkdownInput
							bind:value={readme}
							placeholder="Write your README here..."
							rows={12}
							autoResize={false}
						/>
					</div>
				</div>
			</div>
		{:else}
			<p class="text-sm text-neutral-500 dark:text-neutral-400">No manifest found</p>
		{/if}
</div>
