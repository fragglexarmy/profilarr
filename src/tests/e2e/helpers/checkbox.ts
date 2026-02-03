/**
 * Helpers for IconCheckbox-style toggles.
 * These are <button role="checkbox"> elements without explicit labels.
 */
import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

function getCheckboxBySectionLabel(page: Page, label: string): Locator {
  const section = page.locator('div.space-y-2', { hasText: label }).first();
  return section.locator('button[role="checkbox"]');
}

export async function isIconCheckboxCheckedByLabel(
  page: Page,
  label: string
): Promise<boolean> {
  const checkbox = getCheckboxBySectionLabel(page, label);
  await expect(checkbox).toBeVisible();
  return (await checkbox.getAttribute('aria-checked')) === 'true';
}

export async function setIconCheckboxByLabel(
  page: Page,
  label: string,
  enabled: boolean
): Promise<void> {
  const checkbox = getCheckboxBySectionLabel(page, label);
  await expect(checkbox).toBeVisible();
  const isChecked = (await checkbox.getAttribute('aria-checked')) === 'true';
  if (isChecked !== enabled) {
    await checkbox.click();
  }
}
