/**
 * Helpers for syncing — pulling incoming changes and exporting/pushing outgoing changes.
 */
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Navigate to the changes tab and pull incoming changes.
 * Waits for the pull to complete and verifies success.
 */
export async function pullChanges(
  page: Page,
  databaseId: number
): Promise<void> {
  await page.goto(`/databases/${databaseId}/changes`);
  await page.waitForLoadState('networkidle');

  // Wait for the page to finish loading (skeleton disappears)
  await expect(page.getByText('Incoming Changes')).toBeVisible();

  // Click the Pull button (text is "Pull X commit(s)")
  const pullButton = page.getByRole('button', { name: /^Pull \d+ commit/ });
  await expect(pullButton).toBeVisible({ timeout: 15_000 });
  await pullButton.click();

  // Wait for pull to finish — button disappears and "Up to date" appears
  await expect(page.getByText('Up to date')).toBeVisible({ timeout: 30_000 });
}

/**
 * Export and push outgoing changes on the dev database.
 * Selects all changes, fills commit message, previews, and confirms.
 */
export async function exportAndPush(
  page: Page,
  databaseId: number,
  commitMessage: string
): Promise<void> {
  await page.goto(`/databases/${databaseId}/changes`);
  await page.waitForLoadState('networkidle');

  // Wait for outgoing changes table to load
  await expect(page.getByText('Outgoing Changes')).toBeVisible();

  const noChanges = page.getByText('No unpublished changes');
  const selectAllButton = page.getByRole('button', { name: /Select all/ });

  await expect(selectAllButton).toBeVisible({ timeout: 15_000 });

  await expect
    .poll(async () => {
      if (await noChanges.isVisible()) return 'none';
      const text = await selectAllButton.innerText();
      const match = text.match(/\((\d+)\)/);
      if (match && Number(match[1]) > 0) return 'ready';
      const rowCount = await page.locator('table tbody tr').count();
      return rowCount > 0 ? 'rows' : 'wait';
    }, { timeout: 15_000 })
    .not.toBe('wait');

  if (await noChanges.isVisible()) {
    throw new Error('No unpublished changes to export.');
  }

  const selectAllText = await selectAllButton.innerText();
  const selectAllMatch = selectAllText.match(/\((\d+)\)/);
  const selectableCount = selectAllMatch ? Number(selectAllMatch[1]) : 0;
  if (selectableCount === 0) {
    throw new Error('No selectable changes to export.');
  }

  // Click "Select all" to select all draft changes
  await selectAllButton.click();

  // Fill the commit message
  await page.getByPlaceholder('Commit message...').fill(commitMessage);

  // Click the Preview button (upload icon, title "Preview export")
  await page.getByTitle('Preview export').click();

  // Wait for preview modal to load
  const modal = page.getByRole('dialog');
  await expect(modal).toBeVisible();

  // Wait for preview to finish loading (Approve button becomes enabled)
  await expect(
    modal.getByRole('button', { name: 'Approve & Export' })
  ).toBeEnabled({ timeout: 15_000 });

  // Click Approve & Export
  await modal.getByRole('button', { name: 'Approve & Export' }).click();

  // Wait for success — modal closes and changes list refreshes
  await expect(modal).not.toBeVisible({ timeout: 15_000 });
}

/**
 * Check if there are incoming changes without pulling them.
 */
export async function hasIncomingChanges(
  page: Page,
  databaseId: number
): Promise<boolean> {
  await page.goto(`/databases/${databaseId}/changes`);
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('Incoming Changes')).toBeVisible();

  const pullButton = page.getByRole('button', { name: /^Pull \d+ commit/ });
  return await pullButton.isVisible();
}
