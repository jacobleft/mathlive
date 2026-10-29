import { expect, test } from '@playwright/test';
import type { MathfieldElement } from '../../src/public/mathfield-element';
import fixtures from '../authoring/fixtures.json';

test.beforeEach(async ({ page }) => {
  await page.goto('/examples/authoring/');
  await expect(page.locator('body')).toHaveAttribute('data-ready', 'true');
});

test('canvas accepts physical keyboard input without a remote service', async ({
  page,
}) => {
  const mathfield = page.locator('#authoring-mathfield');
  await expect(mathfield).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Undo', exact: true })
  ).toBeDisabled();
  await mathfield.pressSequentially('x+1');
  await expect
    .poll(() => mathfield.evaluate((mf: MathfieldElement) => mf.value))
    .toBe('x+1');
  await expect(page.locator('#canvas-hint')).toBeHidden();
  await expect(page.locator('#editor-status')).toHaveText('Editing');
  const remoteResources = await page.evaluate(() =>
    window.performance
      .getEntriesByType('resource')
      .filter((entry) => {
        const url = new URL(entry.name);
        return (
          url.protocol.startsWith('http') &&
          url.origin !== window.location.origin
        );
      })
      .map((entry) => entry.name)
  );
  expect(remoteResources).toEqual([]);
});

test('history controls update the content and return focus to the equation', async ({
  page,
}) => {
  const mathfield = page.locator('#authoring-mathfield');
  await mathfield.pressSequentially('x+1');
  const before = await mathfield.evaluate((mf: MathfieldElement) => mf.value);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect
    .poll(() => mathfield.evaluate((mf: MathfieldElement) => mf.value))
    .not.toBe(before);
  await expect
    .poll(() => mathfield.evaluate((mf: MathfieldElement) => mf.hasFocus()))
    .toBe(true);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect
    .poll(() => mathfield.evaluate((mf: MathfieldElement) => mf.value))
    .toBe(before);
});

test('math keyboard toggle reflects its visible state', async ({ page }) => {
  const toggle = page.getByRole('button', {
    name: 'Math keyboard',
    exact: true,
  });
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
});

for (const fixture of fixtures) {
  test(`notation/reopen smoke: ${fixture.id}`, async ({ page }) => {
    test.fixme(!!fixture.gap, fixture.gap ?? '');
    const mathfield = page.locator('#authoring-mathfield');
    const first = await mathfield.evaluate((mf: MathfieldElement, value) => {
      mf.value = value;
      return { saved: mf.value, errors: mf.errors };
    }, fixture.latex);
    expect(first.errors).toEqual([]);
    expect(first.saved).not.toBe('');
    const reopened = await mathfield.evaluate((mf: MathfieldElement, saved) => {
      mf.value = '';
      mf.value = saved;
      return { saved: mf.value, errors: mf.errors };
    }, first.saved);
    expect(reopened).toEqual(first);
  });
}
