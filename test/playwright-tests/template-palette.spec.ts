import { expect, test, type Page } from '@playwright/test';
import {
  templates,
  templateCategories,
} from '../../examples/authoring/templates';
import type { MathfieldElement } from '../../src/public/mathfield-element';
import type { Selection } from '../../src/public/core-types';

async function load(page: Page, value: string, selection?: Selection) {
  await page.locator('#authoring-mathfield').evaluate(
    (field: MathfieldElement, input) => {
      field.value = input.value;
      field.position = field.lastOffset;
      if (input.selection) field.selection = input.selection;
      field.resetUndo();
      field.focus();
      field.dispatchEvent(new Event('selection-change'));
    },
    { value, selection }
  );
}

async function value(page: Page) {
  return page
    .locator('#authoring-mathfield')
    .evaluate((field: MathfieldElement) => field.value);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/examples/authoring/');
  await expect(page.locator('body')).toHaveAttribute('data-ready', 'true');
});

for (const category of templateCategories) {
  test(`catalog insertion/history/reopen: ${category.label}`, async ({
    page,
  }) => {
    await page
      .getByRole('group', { name: 'Template categories' })
      .getByRole('button', { name: category.label, exact: true })
      .click();
    for (const template of templates.filter(
      (item) => item.category === category.id
    )) {
      await load(page, '');
      await page.locator(`[data-template="${template.id}"]`).click();
      const inserted = await value(page);
      expect(inserted, template.id).not.toBe('');
      expect(
        await page
          .locator('#authoring-mathfield')
          .evaluate((field: MathfieldElement) => ({
            errors: field.errors,
            focus: field.hasFocus(),
          }))
      ).toEqual({ errors: [], focus: true });
      await page.getByRole('button', { name: 'Undo', exact: true }).click();
      expect(await value(page), template.id).toBe('');
      await page.getByRole('button', { name: 'Redo', exact: true }).click();
      expect(await value(page), template.id).toBe(inserted);
      const reopened = await page
        .locator('#authoring-mathfield')
        .evaluate((field: MathfieldElement, saved) => {
          field.value = '';
          field.value = saved;
          return { value: field.value, errors: field.errors };
        }, inserted);
      expect(reopened, template.id).toEqual({ value: inserted, errors: [] });
    }
  });
}

test('search crosses categories and preserves a backward selection for wrapping', async ({
  page,
}) => {
  await load(page, 'x+y', { ranges: [[0, 1]], direction: 'backward' });
  const search = page.getByRole('searchbox', { name: 'Search templates' });
  await search.fill('square root');
  await expect(page.locator('.template-button')).toHaveCount(1);
  await expect(page.locator('[data-category="all"]')).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  await page
    .getByRole('button', { name: 'Insert square root', exact: true })
    .click();
  expect(await value(page)).toBe('\\sqrt{x}+y');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect(await value(page)).toBe('x+y');
  expect(
    await page
      .locator('#authoring-mathfield')
      .evaluate((field: MathfieldElement) => field.selection)
  ).toEqual({ ranges: [[0, 1]], direction: 'backward' });
});

test('fraction slots accept a nested root and each palette insertion undoes once', async ({
  page,
}) => {
  await load(page, 'x+y', { ranges: [[0, 3]] });
  await page
    .getByRole('button', { name: 'Insert fraction', exact: true })
    .click();
  const field = page.locator('#authoring-mathfield');
  await page
    .getByRole('button', { name: 'Insert square root', exact: true })
    .click();
  await field.pressSequentially('z');
  expect(await value(page)).toBe('\\frac{x+y}{\\sqrt{z}}');
  await field.press('ControlOrMeta+z');
  expect(await value(page)).toBe('\\frac{x+y}{\\sqrt{\\placeholder{}}}');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect(await value(page)).toBe('\\frac{x+y}{\\placeholder{}}');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect(await value(page)).toBe('x+y');
});

test('wrapping retains nested content, styling and unaffected siblings', async ({
  page,
}) => {
  await load(page, '\\frac{a}{b}+c');
  await page
    .locator('#authoring-mathfield')
    .evaluate((field: MathfieldElement) => {
      field.selection = { ranges: [[0, field.lastOffset]] };
    });
  await page.locator('[data-category="delimiters"]').click();
  await page
    .getByRole('button', { name: 'Insert square brackets', exact: true })
    .click();
  expect(await value(page)).toBe('\\left[\\frac{a}{b}+c\\right]');
  await load(page, '\\mathbf{x}+y', { ranges: [[0, 1]] });
  await page.locator('[data-category="fractions"]').click();
  await page
    .getByRole('button', { name: 'Insert square root', exact: true })
    .click();
  expect(await value(page)).toBe('\\sqrt{\\mathbf{x}}+y');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect(await value(page)).toBe('\\mathbf{x}+y');
  await load(page, 'x+y', { ranges: [[0, 3]] });
  await page
    .getByRole('button', { name: 'Insert indexed root', exact: true })
    .click();
  await page.locator('#authoring-mathfield').pressSequentially('3');
  expect(await value(page)).toBe('\\sqrt[3]{x+y}');
});

test('scripts attach to the preceding operand and accept both indices', async ({
  page,
}) => {
  await load(page, 'x');
  await page.locator('[data-category="scripts"]').click();
  await page
    .getByRole('button', { name: 'Insert sub- and superscript', exact: true })
    .click();
  const field = page.locator('#authoring-mathfield');
  await field.pressSequentially('i');
  await field.press('Tab');
  await field.pressSequentially('n');
  expect(await value(page)).toBe('{x}_{i}^{n}');
});

test('the first edit of a reopened placeholder undoes without an empty intermediate step', async ({
  page,
}) => {
  await load(page, '\\placeholder{}', { ranges: [[0, 1]] });
  const field = page.locator('#authoring-mathfield');
  await field.pressSequentially('x');
  expect(await value(page)).toBe('x');
  await field.press('ControlOrMeta+z');
  expect(await value(page)).toBe('\\placeholder{}');
  await expect(
    page.getByRole('button', { name: 'Undo', exact: true })
  ).toBeDisabled();
  await field.press('ControlOrMeta+Shift+z');
  expect(await value(page)).toBe('x');
});

test('a definite integral has editable bounds, integrand and differential slots', async ({
  page,
}) => {
  await load(page, '');
  await page.locator('[data-category="operators"]').click();
  await page
    .getByRole('button', { name: 'Insert definite integral', exact: true })
    .click();
  const field = page.locator('#authoring-mathfield');
  for (const [index, text] of ['0', '1', 'x', 'x'].entries()) {
    await field.pressSequentially(text);
    if (index < 3) await field.press('Tab');
  }
  const result = await value(page);
  expect(result).toContain('\\int');
  expect(result).toContain('_0');
  expect(result).toContain('^1');
  expect(result).not.toContain('\\placeholder');
  expect(result).toContain('x');
  expect(result.match(/x/g)).toHaveLength(2);
  expect(result).toContain('\\mathrm{d}');
});

test('search and template previews are keyboard accessible', async ({
  page,
}) => {
  await load(page, 'x+y', { ranges: [[0, 3]] });
  const search = page.getByRole('searchbox', { name: 'Search templates' });
  await search.fill('fraction');
  await search.press('ArrowDown');
  await expect(page.locator('[data-template="fraction"]')).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(
    page.locator('[data-template="display-fraction"]')
  ).toBeFocused();
  await page.keyboard.press('End');
  await expect(page.locator('[data-template="inline-fraction"]')).toBeFocused();
  await page.keyboard.press('Home');
  await page.keyboard.press('Enter');
  expect(await value(page)).toBe('\\frac{x+y}{\\placeholder{}}');
  expect(
    await page
      .locator('#authoring-mathfield')
      .evaluate((field: MathfieldElement) => field.hasFocus())
  ).toBe(true);
});

test('empty search results and read-only/composition states are non-destructive', async ({
  page,
}) => {
  await load(page, 'x');
  const search = page.getByRole('searchbox', { name: 'Search templates' });
  await search.fill('no such template');
  await expect(page.locator('.template-empty')).toBeVisible();
  await search.press('Escape');
  await expect(page.locator('.template-empty')).toBeHidden();
  await expect(page.locator('.template-button')).toHaveCount(templates.length);
  await search.press('Escape');
  await expect
    .poll(() =>
      page
        .locator('#authoring-mathfield')
        .evaluate((mf: MathfieldElement) => mf.hasFocus())
    )
    .toBe(true);
  const fraction = page.getByRole('button', {
    name: 'Insert fraction',
    exact: true,
  });
  const field = page.locator('#authoring-mathfield');
  await field.evaluate((mf: MathfieldElement) => {
    mf.readOnly = true;
  });
  await expect(fraction).toBeDisabled();
  await field.evaluate((mf: MathfieldElement) => {
    mf.readOnly = false;
    mf.dispatchEvent(new CompositionEvent('compositionstart'));
  });
  await expect(fraction).toBeDisabled();
  await field.evaluate((mf: MathfieldElement) =>
    mf.dispatchEvent(new CompositionEvent('compositionend'))
  );
  await expect(fraction).toBeEnabled();
  expect(await value(page)).toBe('x');
});

test('the palette fits a narrow viewport and every preview renders locally', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-category="operators"]').click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390
  );
  await expect(page.locator('.template-preview .ML__latex')).toHaveCount(4);
  expect(
    await page.evaluate(() =>
      window.performance
        .getEntriesByType('resource')
        .filter(
          (entry) => new URL(entry.name).origin !== window.location.origin
        )
        .map((entry) => entry.name)
    )
  ).toEqual([]);
});
