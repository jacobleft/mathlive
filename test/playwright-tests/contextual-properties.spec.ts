import { expect, test, type Page } from '@playwright/test';
import type { MathfieldElement } from '../../src/public/mathfield-element';
import type { Selection } from '../../src/public/core-types';

const equation = '\\frac{\\sqrt{x}+y}{z}';
const backward: Selection = { ranges: [[2, 3]], direction: 'backward' };
const field = (page: Page) => page.locator('#authoring-mathfield');
const panel = (page: Page) =>
  page.getByRole('complementary', { name: 'Contextual properties' });

async function load(
  page: Page,
  value = equation,
  selection: Selection = backward
) {
  await field(page).evaluate(
    (mf: MathfieldElement, input) => {
      mf.value = input.value;
      mf.selection = input.selection;
      mf.resetUndo();
      mf.focus();
      mf.dispatchEvent(new Event('selection-change'));
    },
    { value, selection }
  );
}

async function state(page: Page) {
  return field(page).evaluate((mf: MathfieldElement) => ({
    value: mf.value,
    selection: mf.selection,
    mode: mf.mode,
    canUndo: mf.canUndo(),
    canRedo: mf.canRedo(),
  }));
}

async function expectEquationFocus(page: Page) {
  await expect
    .poll(() => field(page).evaluate((mf: MathfieldElement) => mf.hasFocus()))
    .toBe(true);
  await expect
    .poll(() => page.evaluate(() => document.activeElement?.id))
    .toBe('authoring-mathfield');
}

test.beforeEach(async ({ page }) => {
  await page.goto('/examples/authoring/');
  await expect(page.locator('body')).toHaveAttribute('data-ready', 'true');
});

test('pointer inspection preserves a backward selection, focus, content and history', async ({
  page,
}) => {
  await load(page);
  const before = await state(page);
  await expect(panel(page)).toHaveAttribute('data-target', 'root');
  await expect(panel(page).locator('.structure-values')).toHaveText(
    'FormSquare root'
  );
  await panel(page)
    .getByRole('button', { name: 'Inspect fraction', exact: true })
    .click();
  await expect(panel(page)).toHaveAttribute('data-target', 'fraction');
  await expect(panel(page).locator('.structure-values')).toContainText(
    'BarVisible'
  );
  expect(await state(page)).toEqual(before);
  await expectEquationFocus(page);
  await panel(page)
    .getByRole('button', { name: 'Inspect root', exact: true })
    .click();
  expect(await state(page)).toEqual(before);
  await expectEquationFocus(page);
});

test('keyboard inspection retains control focus and Escape restores the original target', async ({
  page,
}) => {
  await load(page);
  const before = await state(page);
  const ancestor = panel(page).getByRole('button', {
    name: 'Inspect fraction',
    exact: true,
  });
  await ancestor.focus();
  await ancestor.press('Enter');
  await expect(ancestor).toBeFocused();
  await expect(ancestor).toHaveAttribute('aria-pressed', 'true');
  expect(await state(page)).toEqual(before);
  await ancestor.press('Escape');
  await expectEquationFocus(page);
  expect(await state(page)).toEqual(before);
});

test('whole-structure selection targets only the inner root', async ({
  page,
}) => {
  await load(page);
  const select = panel(page).getByRole('button', {
    name: 'Select structure',
    exact: true,
  });
  await select.focus();
  await select.press('Enter');
  expect(await state(page)).toMatchObject({
    value: equation,
    selection: { ranges: [[1, 4]] },
    canUndo: false,
    canRedo: false,
  });
  expect(
    await field(page).evaluate((mf: MathfieldElement) =>
      mf.getValue(mf.selection)
    )
  ).toBe('\\sqrt{x}');
  await expectEquationFocus(page);
  const radicand = panel(page).getByRole('button', {
    name: 'Select radicand',
    exact: true,
  });
  await radicand.focus();
  await radicand.press('Enter');
  await expectEquationFocus(page);
  expect(await state(page)).toMatchObject({
    value: equation,
    selection: { ranges: [[2, 3]] },
    canUndo: false,
  });
});

test('a slot can be edited and undone without changing its siblings', async ({
  page,
}) => {
  await load(page);
  await panel(page)
    .getByRole('button', { name: 'Inspect fraction', exact: true })
    .click();
  await panel(page)
    .getByRole('button', { name: 'Select denominator', exact: true })
    .click();
  expect(await state(page)).toMatchObject({
    value: equation,
    selection: { ranges: [[7, 8]] },
    canUndo: false,
  });
  await expectEquationFocus(page);
  await field(page).pressSequentially('q');
  expect((await state(page)).value).toBe('\\frac{\\sqrt{x}+y}{q}');
  await field(page).press('ControlOrMeta+z');
  expect((await state(page)).value).toBe(equation);
});

test('typing in another filled slot starts a separate undo group', async ({
  page,
}) => {
  await load(page, '\\frac{x}{z}', { ranges: [[2, 2]] });
  await field(page).pressSequentially('a');
  await panel(page)
    .getByRole('button', { name: 'Select denominator', exact: true })
    .click();
  await field(page).pressSequentially('b');
  expect((await state(page)).value).toBe('\\frac{xa}{b}');
  await field(page).press('ControlOrMeta+z');
  expect((await state(page)).value).toBe('\\frac{xa}{z}');
  await field(page).press('ControlOrMeta+z');
  expect((await state(page)).value).toBe('\\frac{x}{z}');
});

test('inspection and selection navigation preserve an existing redo branch', async ({
  page,
}) => {
  await load(page);
  await field(page).evaluate((mf: MathfieldElement) =>
    mf.performUndoableEdit(() => {
      mf.position = mf.lastOffset;
      mf.insert('+a', { selectionMode: 'after' });
    })
  );
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  const before = await state(page);
  expect(before.canRedo).toBe(true);
  await panel(page)
    .getByRole('button', { name: 'Inspect fraction', exact: true })
    .click();
  await panel(page)
    .getByRole('button', { name: 'Return to equation', exact: true })
    .click();
  await expectEquationFocus(page);
  expect(await state(page)).toEqual(before);
  await panel(page)
    .getByRole('button', { name: 'Select numerator', exact: true })
    .click();
  expect((await state(page)).canRedo).toBe(true);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  expect((await state(page)).value).toBe(equation + '+a');
});

test('the context follows caret movement and clears when the caret exits the structure', async ({
  page,
}) => {
  await load(page);
  await field(page).evaluate((mf: MathfieldElement) => {
    mf.position = 4;
  });
  await expect(panel(page)).toHaveAttribute('data-target', 'fraction');
  await field(page).evaluate((mf: MathfieldElement) => {
    mf.position = mf.lastOffset;
  });
  await expect(panel(page)).toHaveAttribute('data-context', 'none');
  await expect(
    panel(page).getByRole('button', { name: 'Select structure', exact: true })
  ).toBeDisabled();
});

test('mixed and multi-range selections expose no arbitrary target', async ({
  page,
}) => {
  await load(page, '\\frac{\\sqrt{x}+\\sqrt{y}}{z}', {
    ranges: [[1, 8]],
    direction: 'backward',
  });
  await expect(panel(page)).toHaveAttribute('data-context', 'ambiguous');
  await expect(panel(page).locator('.structure-trail button')).toHaveCount(0);
  await expect(
    panel(page).getByRole('button', { name: 'Select structure', exact: true })
  ).toBeDisabled();
  const before = await state(page);
  await panel(page)
    .getByRole('button', { name: 'Return to equation', exact: true })
    .click();
  await expectEquationFocus(page);
  expect(await state(page)).toEqual(before);
  await field(page).evaluate((mf: MathfieldElement) => {
    mf.selection = {
      ranges: [
        [0, 1],
        [3, 4],
      ],
    };
  });
  await expect(panel(page)).toHaveAttribute('data-context', 'ambiguous');
});

test('read-only, disabled and composition states disable context navigation', async ({
  page,
}) => {
  await load(page);
  const select = panel(page).getByRole('button', {
    name: 'Select structure',
    exact: true,
  });
  await field(page).evaluate((mf: MathfieldElement) => {
    mf.readOnly = true;
  });
  await expect(select).toBeDisabled();
  await expect(panel(page).locator('.structure-message')).toContainText(
    'read-only'
  );
  await field(page).evaluate((mf: MathfieldElement) => {
    mf.readOnly = false;
    mf.dispatchEvent(new CompositionEvent('compositionstart'));
  });
  await expect(select).toBeDisabled();
  await field(page).evaluate((mf: MathfieldElement) =>
    mf.dispatchEvent(new CompositionEvent('compositionend'))
  );
  await expect(select).toBeEnabled();
  await field(page).evaluate((mf: MathfieldElement) => {
    mf.disabled = true;
  });
  await expect(select).toBeDisabled();
  await expect(
    panel(page).getByRole('button', { name: 'Return to equation', exact: true })
  ).toBeDisabled();
  expect((await state(page)).value).toBe(equation);
  await field(page).evaluate((mf: MathfieldElement) => {
    mf.disabled = false;
    mf.executeCommand(['switchMode', 'latex']);
  });
  await expect(select).toBeDisabled();
  await expect(panel(page).locator('.structure-message')).toContainText(
    'Finish the current command'
  );
});

test('common structures show native properties and real slots', async ({
  page,
}) => {
  for (const fixture of [
    {
      value: '\\sqrt[n]{x}',
      position: 4,
      kind: 'root',
      property: 'Indexed root',
      slot: 'Index',
      selected: 'n',
    },
    {
      value: 'x_i^n',
      position: 3,
      kind: 'scripts',
      property: 'SubscriptPresent',
      slot: 'Superscript',
      selected: 'n',
    },
    {
      value: 'x_i^n',
      position: 3,
      kind: 'scripts',
      property: 'SubscriptPresent',
      slot: 'Base',
      selected: 'x',
    },
    {
      value: '\\left[x\\right]',
      position: 2,
      kind: 'delimiters',
      property: 'Bracket [',
      slot: 'Body',
      selected: 'x',
    },
    {
      value: '\\int\\nolimits_a^b x',
      position: 2,
      kind: 'operator',
      property: 'Beside operator',
      slot: 'Upper limit',
      selected: 'b',
    },
    {
      value: '\\begin{bmatrix}a&b\\\\c&d\\end{bmatrix}',
      position: 8,
      kind: 'array',
      property: 'Rows2Columns2',
      slot: 'Cell 2, 2',
      selected: 'd',
    },
  ]) {
    await load(page, fixture.value, {
      ranges: [[fixture.position, fixture.position]],
    });
    await expect(panel(page)).toHaveAttribute('data-target', fixture.kind);
    await expect(panel(page).locator('.structure-values')).toContainText(
      fixture.property
    );
    await panel(page)
      .getByRole('button', {
        name: `Select ${fixture.slot.toLowerCase()}`,
        exact: true,
      })
      .click();
    expect(
      await field(page).evaluate((mf: MathfieldElement) =>
        mf.getValue(mf.selection)
      )
    ).toBe(fixture.selected);
    expect((await state(page)).canUndo).toBe(false);
  }
  await field(page).evaluate((mf: MathfieldElement) => {
    mf.macros = { ...mf.macros, contextdemo: 'x+1' };
    mf.value = '\\sqrt{\\contextdemo}';
    mf.selection = { ranges: [[0, mf.lastOffset]] };
    mf.dispatchEvent(new Event('selection-change'));
  });
  await expect(panel(page)).toHaveAttribute('data-target', 'root');
  await expect(panel(page).locator('.ML__error')).toHaveCount(0);
  await expect(panel(page).locator('.structure-preview')).toContainText('1');
});

test('unsupported structures require an explicit enclosing choice', async ({
  page,
}) => {
  await load(page, '\\frac{\\boxed{x}}{y}', { ranges: [[3, 3]] });
  await expect(panel(page)).toHaveAttribute('data-context', 'unsupported');
  await expect(
    panel(page).getByRole('button', { name: 'Select structure', exact: true })
  ).toBeDisabled();
  const before = await state(page);
  await panel(page)
    .getByRole('button', { name: 'Inspect fraction', exact: true })
    .click();
  await expect(panel(page)).toHaveAttribute('data-target', 'fraction');
  expect(await state(page)).toEqual(before);
});

test('a stale slot button cannot select offsets in a silently replaced equation', async ({
  page,
}) => {
  await load(page);
  const before = await panel(page)
    .getByRole('button', { name: 'Select radicand', exact: true })
    .evaluate((button) => {
      const mf = document.getElementById(
        'authoring-mathfield'
      ) as MathfieldElement;
      mf.value = 'abc';
      mf.selection = { ranges: [[0, 1]], direction: 'backward' };
      const expected = { value: mf.value, selection: mf.selection };
      (button as HTMLButtonElement).click();
      return expected;
    });
  expect(await state(page)).toMatchObject(before);
  await expect(panel(page)).toHaveAttribute('data-context', 'none');
});

test('deferred return never takes focus back from another input', async ({
  page,
}) => {
  await load(page);
  const back = panel(page).getByRole('button', {
    name: 'Return to equation',
    exact: true,
  });
  await back.focus();
  await back.evaluate(async (button) => {
    const outside = document.createElement('input');
    outside.id = 'outside-context-input';
    document.body.append(outside);
    (button as HTMLButtonElement).click();
    outside.focus();
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    );
  });
  await expect(page.locator('#outside-context-input')).toBeFocused();
  expect((await state(page)).value).toBe(equation);
});

test('inspection is detached and passive, including when the field disconnects', async ({
  page,
}) => {
  await load(page);
  const before = await state(page);
  const status = await field(page).evaluate((mf: MathfieldElement) => {
    const context = mf.getSelectionContext();
    context.selection.ranges[0][0] = 999;
    context.structures[0].slots[0].range[0] = 999;
    return mf.getSelectionContext().status;
  });
  expect(status).toBe('supported');
  expect(await state(page)).toEqual(before);
  const disconnected = await field(page).evaluate((mf: MathfieldElement) => {
    mf.remove();
    return mf.getSelectionContext().status;
  });
  expect(disconnected).toBe('unavailable');
});

test('the property panel and long previews fit a narrow viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await load(
    page,
    `\\left(${Array.from({ length: 70 }, () => 'x').join('+')}\\right)`,
    { ranges: [[2, 2]] }
  );
  await expect(panel(page)).toHaveAttribute('data-target', 'delimiters');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390
  );
  const before = await state(page);
  await panel(page)
    .getByRole('button', { name: 'Return to equation', exact: true })
    .click();
  await expectEquationFocus(page);
  expect(await state(page)).toEqual(before);
});
