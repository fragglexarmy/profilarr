<script lang="ts">
	import { Bold, Italic, List, ListOrdered, Link, Code, Eye, Edit3 } from 'lucide-svelte';
	import { marked } from 'marked';
	import { onMount } from 'svelte';

	// Props
	export let value: string = '';
	export let placeholder: string = '';
	export let label: string = '';
	export let description: string = '';
	export let rows: number = 4;
	export let minRows: number = 2;
	export let multiline: boolean = true;
	export let markdown: boolean = true;
	export let required: boolean = false;
	export let disabled: boolean = false;
	export let name: string = '';
	export let id: string = name;
	export let autoResize: boolean = true;
	export let onchange: ((value: string) => void) | undefined = undefined;

	// State
	let showPreview = true;
	let textareaElement: HTMLTextAreaElement;
	let inputElement: HTMLInputElement;

	// Auto-resize textarea to fit content
	function resizeTextarea() {
		if (!textareaElement || !autoResize || !multiline) return;

		// Reset height to auto to get the correct scrollHeight
		textareaElement.style.height = 'auto';

		// Calculate min height based on minRows
		const lineHeight = parseFloat(getComputedStyle(textareaElement).lineHeight) || 20;
		const paddingTop = parseFloat(getComputedStyle(textareaElement).paddingTop) || 8;
		const paddingBottom = parseFloat(getComputedStyle(textareaElement).paddingBottom) || 8;
		const minHeight = lineHeight * minRows + paddingTop + paddingBottom;

		// Set height to scrollHeight (actual content height) or minHeight
		const newHeight = Math.max(textareaElement.scrollHeight, minHeight);
		textareaElement.style.height = `${newHeight}px`;
	}

	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement | HTMLTextAreaElement;
		value = target.value;
		onchange?.(value);
		resizeTextarea();
	}

	// Resize on mount and when value changes externally
	onMount(() => {
		resizeTextarea();
	});

	$: if (textareaElement && value !== undefined) {
		// Use requestAnimationFrame to ensure DOM is updated
		requestAnimationFrame(resizeTextarea);
	}

	function insertMarkdown(before: string, after: string = '') {
		const element = multiline ? textareaElement : inputElement;
		if (!element) return;

		const start = element.selectionStart ?? 0;
		const end = element.selectionEnd ?? 0;
		const selectedText = value.substring(start, end);

		const newValue =
			value.substring(0, start) + before + selectedText + after + value.substring(end);

		value = newValue;
		onchange?.(value);

		// Restore cursor position and resize
		requestAnimationFrame(() => {
			element.focus();
			element.setSelectionRange(start + before.length, start + before.length + selectedText.length);
			resizeTextarea();
		});
	}

	function insertBold() {
		insertMarkdown('**', '**');
	}

	function insertItalic() {
		insertMarkdown('*', '*');
	}

	function insertCode() {
		insertMarkdown('`', '`');
	}

	function insertLink() {
		const element = multiline ? textareaElement : inputElement;
		if (!element) return;

		const start = element.selectionStart ?? 0;
		const end = element.selectionEnd ?? 0;
		const selectedText = value.substring(start, end);

		if (selectedText) {
			insertMarkdown('[', '](url)');
		} else {
			insertMarkdown('[link text](url)');
		}
	}

	function insertList() {
		const element = multiline ? textareaElement : inputElement;
		if (!element) return;

		const start = element.selectionStart ?? 0;
		const lines = value.substring(0, start).split('\n');
		const isStartOfLine = lines[lines.length - 1].length === 0 || start === 0;

		if (isStartOfLine) {
			insertMarkdown('- ');
		} else {
			insertMarkdown('\n- ');
		}
	}

	function insertOrderedList() {
		const element = multiline ? textareaElement : inputElement;
		if (!element) return;

		const start = element.selectionStart ?? 0;
		const lines = value.substring(0, start).split('\n');
		const isStartOfLine = lines[lines.length - 1].length === 0 || start === 0;

		if (isStartOfLine) {
			insertMarkdown('1. ');
		} else {
			insertMarkdown('\n1. ');
		}
	}

	// Markdown to HTML renderer for preview using marked
	function renderMarkdown(text: string): string {
		if (!text)
			return '<p class="text-neutral-400 dark:text-neutral-500 italic">Nothing to preview</p>';
		return marked.parse(text) as string;
	}

	const toolbarButtons = [
		{ action: insertBold, icon: Bold, title: 'Bold (Ctrl+B)', shortcut: 'b' },
		{ action: insertItalic, icon: Italic, title: 'Italic (Ctrl+I)', shortcut: 'i' },
		{ action: insertCode, icon: Code, title: 'Code', shortcut: null },
		{ action: insertLink, icon: Link, title: 'Link', shortcut: null },
		{ action: insertList, icon: List, title: 'Bullet List', shortcut: null },
		{ action: insertOrderedList, icon: ListOrdered, title: 'Numbered List', shortcut: null }
	];

	function handleKeydown(e: KeyboardEvent) {
		if (!markdown) return;

		if (e.ctrlKey || e.metaKey) {
			switch (e.key.toLowerCase()) {
				case 'b':
					e.preventDefault();
					insertBold();
					break;
				case 'i':
					e.preventDefault();
					insertItalic();
					break;
			}
		}
	}
</script>

<div class="space-y-2">
	{#if label}
		<label for={id} class="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
			{label}
			{#if required}
				<span class="text-red-500">*</span>
			{/if}
		</label>
	{/if}

	{#if description}
		<p class="text-xs text-neutral-500 dark:text-neutral-400">
			{description}
		</p>
	{/if}

	<!-- Input container - no gap between toolbar and input -->
	<div>
		{#if markdown}
			<!-- Toolbar -->
			<div
				class="flex items-center justify-between rounded-t-lg border border-neutral-300 bg-neutral-50 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-800/50 {showPreview
					? 'border-b-0'
					: ''}"
			>
				<div class="flex items-center gap-1">
					{#each toolbarButtons as btn}
						<button
							type="button"
							onclick={btn.action}
							title={btn.title}
							disabled={disabled || showPreview}
							class="rounded p-1.5 text-neutral-600 transition-colors hover:bg-neutral-200 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-50 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-100"
						>
							<svelte:component this={btn.icon} size={16} />
						</button>
					{/each}
				</div>
				<button
					type="button"
					onclick={() => (showPreview = !showPreview)}
					title={showPreview ? 'Edit' : 'Preview'}
					class="flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors {showPreview
						? 'bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-400'
						: 'text-neutral-600 hover:bg-neutral-200 dark:text-neutral-400 dark:hover:bg-neutral-700'}"
				>
					{#if showPreview}
						<Edit3 size={14} />
						Edit
					{:else}
						<Eye size={14} />
						Preview
					{/if}
				</button>
			</div>
		{/if}

		{#if showPreview && markdown}
			<!-- Preview -->
			<div
				class="prose prose-sm max-w-none rounded-b-lg border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
				style="min-height: {minRows * 1.5}rem"
			>
				{@html renderMarkdown(value)}
			</div>
			{#if name}
				<input type="hidden" {name} {value} />
			{/if}
		{:else if multiline}
			<!-- Textarea -->
			<textarea
				bind:this={textareaElement}
				{id}
				{name}
				{value}
				{placeholder}
				rows={autoResize ? minRows : rows}
				{disabled}
				{required}
				oninput={handleInput}
				onkeydown={handleKeydown}
				class="{markdown ? 'rounded-t-none rounded-b-lg border-t-0' : 'rounded-lg'} {autoResize
					? 'resize-none overflow-hidden'
					: ''} block w-full border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 transition-colors focus:outline-none disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500 dark:disabled:bg-neutral-900 dark:disabled:text-neutral-600"
			></textarea>
		{:else}
			<!-- Single-line input -->
			<input
				bind:this={inputElement}
				type="text"
				{id}
				{name}
				{value}
				{placeholder}
				{disabled}
				{required}
				oninput={handleInput}
				onkeydown={handleKeydown}
				class="{markdown
					? 'rounded-t-none rounded-b-lg border-t-0'
					: 'rounded-lg'} block w-full border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 transition-colors focus:outline-none disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500 dark:disabled:bg-neutral-900 dark:disabled:text-neutral-600"
			/>
		{/if}
	</div>
</div>
