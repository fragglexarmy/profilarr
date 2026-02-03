/**
 * Helper for interacting with MarkdownInput components.
 * These render in preview mode by default — the textarea is NOT in the DOM
 * until you click "Edit" to switch to edit mode.
 */
import type { Page } from '@playwright/test';

/**
 * Fill a MarkdownInput field by its element id.
 * Switches from preview to edit mode if needed, then fills the textarea.
 */
export async function fillMarkdownInput(
  page: Page,
  id: string,
  value: string
): Promise<void> {
  // Find the outer .space-y-2 container via the label[for] attribute.
  // This works even when the textarea doesn't exist yet (preview mode).
  const container = page.locator(`.space-y-2:has(label[for="${id}"])`);

  // MarkdownInput starts in preview mode — click Edit to reveal the textarea.
  // Using click() directly so Playwright auto-waits for the element to be ready.
  await container.locator('button[title="Edit"]').click();

  // Wait for the textarea to appear in the DOM, then fill it
  const textarea = page.locator(`#${id}`);
  await textarea.waitFor({ state: 'visible' });
  await textarea.fill(value);
}
