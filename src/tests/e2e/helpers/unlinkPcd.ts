/**
 * Unlink a PCD database instance through the UI.
 */
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { getDatabaseByName } from './db';

/**
 * Unlink a database by its ID via the settings page.
 */
export async function unlinkPcd(
  page: Page,
  databaseId: number
): Promise<void> {
  // Dismiss any beforeunload dialogs from previous dirty forms
  page.on('dialog', (dialog) => dialog.accept());

  await page.goto(`/databases/${databaseId}/settings`);
  await page.waitForLoadState('networkidle');

  // Click the Unlink button in the header
  await page.getByRole('button', { name: 'Unlink' }).first().click();

  // Confirm in the modal — the modal also has a button named "Unlink"
  const modal = page.getByRole('dialog');
  await expect(modal).toBeVisible();
  await modal.getByRole('button', { name: 'Unlink' }).click();

  // Wait for redirect back to /databases
  await page.waitForURL('**/databases', { timeout: 15_000 });
}

/**
 * Unlink a database by name. No-op if it doesn't exist.
 */
export async function unlinkPcdByName(
  page: Page,
  name: string
): Promise<void> {
  const db = getDatabaseByName(name);
  if (!db) return;
  await unlinkPcd(page, db.id);
}
