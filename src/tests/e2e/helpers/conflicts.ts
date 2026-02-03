/**
 * Helpers for viewing and resolving conflicts through the UI.
 */
import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Navigate to the conflicts page for a database.
 */
export async function goToConflicts(
  page: Page,
  databaseId: number
): Promise<void> {
  await page.goto(`/databases/${databaseId}/conflicts`);
  await page.waitForLoadState('networkidle');
}

/**
 * Get the number of conflict rows visible in the table.
 */
export async function getConflictCount(page: Page): Promise<number> {
  // If "No conflicts detected" is shown, count is 0
  const empty = page.getByText('No conflicts detected');
  if (await empty.isVisible()) return 0;

  // Count data rows (exclude header row)
  const rows = page.locator('table tbody tr');
  return await rows.count();
}

/**
 * Find a conflict row by entity name.
 * Returns the table row locator.
 */
export function findConflictRow(page: Page, entityName: string): Locator {
  return page.locator('table tbody tr', { hasText: entityName });
}

/**
 * Click the Align button on a conflict row identified by entity name.
 */
export async function alignConflict(
  page: Page,
  entityName: string
): Promise<void> {
  const row = findConflictRow(page, entityName);
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Align' }).click();
  await page.waitForLoadState('networkidle');
}

/**
 * Click the Override button on a conflict row identified by entity name.
 */
export async function overrideConflict(
  page: Page,
  entityName: string
): Promise<void> {
  const row = findConflictRow(page, entityName);
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Override' }).click();
  await page.waitForLoadState('networkidle');
}

/**
 * Assert that a conflict exists for the given entity name.
 */
export async function expectConflict(
  page: Page,
  entityName: string
): Promise<void> {
  const row = findConflictRow(page, entityName);
  await expect(row).toBeVisible();
}

/**
 * Assert that no conflict exists for the given entity name.
 */
export async function expectNoConflict(
  page: Page,
  entityName: string
): Promise<void> {
  const row = findConflictRow(page, entityName);
  await expect(row).not.toBeVisible();
}
