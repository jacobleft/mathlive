import { expect, test } from '@playwright/test';
import type { MathfieldElement } from '../../src/public/mathfield-element';
import type { EditorActions } from '../../src/public/editor-actions';
import type { Selection } from '../../src/public/core-types';

declare global {
  interface Window {
    editingHarness: {
      field: MathfieldElement;
      actions: EditorActions;
      clipboard: {
        value: string;
        readText(): Promise<string>;
        writeText(value: string): Promise<void>;
      };
      load(value: string, selection?: Selection): void;
    };
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto('/examples/authoring/');
  await expect(page.locator('body')).toHaveAttribute('data-ready', 'true');
  await page.evaluate(async () => {
    const moduleUrl = '/dist/mathlive.mjs';
    const { EditorActions } = (await import(
      moduleUrl
    )) as typeof import('../../src/public/mathlive');
    const field = document.getElementById(
      'authoring-mathfield'
    ) as MathfieldElement;
    const clipboard = {
      value: '',
      async readText() {
        return this.value;
      },
      async writeText(value: string) {
        this.value = value;
      },
    };
    const actions = new EditorActions(field, clipboard);
    window.editingHarness = {
      field,
      actions,
      clipboard,
      load(value, selection) {
        field.value = value;
        field.position = field.lastOffset;
        if (selection) field.selection = selection;
        field.resetUndo();
        actions.captureSelection();
      },
    };
  });
});

test('adjacent inserts and delete each have dependable undo and redo', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { load, field, actions } = window.editingHarness;
    load('x');
    await actions.run({ type: 'insert', value: '+a', selectionMode: 'after' });
    await actions.run({ type: 'insert', value: '+b', selectionMode: 'after' });
    const both = field.value;
    await actions.run({ type: 'undo' });
    const one = field.value;
    await actions.run({ type: 'undo' });
    const original = field.value;
    await actions.run({ type: 'redo' });
    await actions.run({ type: 'redo' });
    const redone = field.value;
    await actions.run({ type: 'command', command: 'deleteBackward' });
    const deleted = field.value;
    await actions.run({ type: 'undo' });
    const undoDelete = field.value;
    await actions.run({ type: 'redo' });
    const redoDelete = field.value;
    return { both, one, original, redone, deleted, undoDelete, redoDelete };
  });
  expect(result).toEqual({
    both: 'x+a+b',
    one: 'x+a',
    original: 'x',
    redone: 'x+a+b',
    deleted: 'x+a+',
    undoDelete: 'x+a+b',
    redoDelete: 'x+a+',
  });
});

test('toolbar pointer and keyboard activation preserve a backward selection', async ({
  page,
}) => {
  await page.evaluate(() => {
    const { field, load, actions } = window.editingHarness;
    load('x+y', { ranges: [[0, 1]], direction: 'backward' });
    field.focus();
    const button = document.createElement('button');
    button.textContent = 'Wrap fraction';
    button.id = 'wrap-fraction';
    document.querySelector('.toolbar')!.append(button);
    actions.bind(button, { type: 'insert', value: '\\frac{#0}{#?}' });
  });
  const button = page.locator('#wrap-fraction');
  await button.click();
  const after = await page.evaluate(() => {
    const { field } = window.editingHarness;
    return {
      value: field.value,
      selection: field.selection,
      focus: field.hasFocus(),
    };
  });
  expect(after.value).toContain('\\frac{x}');
  expect(after.value).toContain('+y');
  expect(after.focus).toBe(true);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.editingHarness.field.value))
    .toBe('x+y');
  expect(
    await page.evaluate(() => window.editingHarness.field.selection)
  ).toEqual({ ranges: [[0, 1]], direction: 'backward' });
  await button.focus();
  await button.press('Enter');
  await expect
    .poll(() => page.evaluate(() => window.editingHarness.field.value))
    .toBe(after.value);
  expect(
    await page.evaluate(() => window.editingHarness.field.hasFocus())
  ).toBe(true);
});

test('a grouped edit restores both selections and rolls back an exception', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { field, load, actions } = window.editingHarness;
    load('xy', { ranges: [[0, 1]], direction: 'backward' });
    field.performUndoableEdit(() => {
      field.insert('a', { selectionMode: 'after' });
      field.performUndoableEdit(() => {
        field.insert('b', { selectionMode: 'after' });
      });
    });
    const after = { value: field.value, selection: field.selection };
    await actions.run({ type: 'undo' });
    const before = {
      value: field.value,
      selection: field.selection,
      canUndo: field.canUndo(),
    };
    await actions.run({ type: 'redo' });
    const redo = { value: field.value, selection: field.selection };
    let error = '';
    try {
      field.performUndoableEdit(() => {
        field.insert('z');
        throw new Error('cancelled edit');
      });
    } catch (caught) {
      error = String(caught);
    }
    const rolledBack = { value: field.value, selection: field.selection };
    await actions.run({ type: 'undo' });
    return {
      before,
      after,
      redo,
      rolledBack,
      error,
      undoAfterError: field.value,
    };
  });
  expect(result.before).toEqual({
    value: 'xy',
    selection: { ranges: [[0, 1]], direction: 'backward' },
    canUndo: false,
  });
  expect(result.redo).toEqual(result.after);
  expect(result.rolledBack).toEqual(result.after);
  expect(result.error).toContain('cancelled edit');
  expect(result.undoAfterError).toBe('xy');
});

test('native keyboard history shares the toolbar action undo units', async ({
  page,
}) => {
  await page.evaluate(async () => {
    const { load, actions } = window.editingHarness;
    load('x');
    await actions.run({ type: 'insert', value: '+a', selectionMode: 'after' });
    await actions.run({ type: 'insert', value: '+b', selectionMode: 'after' });
  });
  const field = page.locator('#authoring-mathfield');
  await field.press('ControlOrMeta+z');
  await expect
    .poll(() => field.evaluate((mf: MathfieldElement) => mf.value))
    .toBe('x+a');
  await field.press('ControlOrMeta+Shift+z');
  await expect
    .poll(() => field.evaluate((mf: MathfieldElement) => mf.value))
    .toBe('x+a+b');
});

test('no-op actions preserve redo and a new edit replaces it', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { field, actions, load } = window.editingHarness;
    load('x');
    await actions.run({ type: 'insert', value: 'a' });
    await actions.run({ type: 'undo' });
    const noChange = field.performUndoableEdit(() => {});
    const redoRetained = field.canRedo();
    await actions.run({ type: 'insert', value: 'b' });
    return {
      noChange,
      redoRetained,
      replaced: field.value,
      redoAvailable: field.canRedo(),
    };
  });
  expect(result).toEqual({
    noChange: false,
    redoRetained: true,
    replaced: 'xb',
    redoAvailable: false,
  });
});

test('cancelled undo and redo keep content and history available', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { field, actions, load } = window.editingHarness;
    load('x');
    await actions.run({ type: 'insert', value: '+a', selectionMode: 'after' });
    const veto = () =>
      field.addEventListener('beforeinput', (event) => event.preventDefault(), {
        once: true,
      });
    veto();
    const undo = await actions.run({ type: 'undo' });
    const rejectedUndo = {
      changed: undo,
      value: field.value,
      canUndo: field.canUndo(),
      canRedo: field.canRedo(),
    };
    await actions.run({ type: 'undo' });
    veto();
    const redo = await actions.run({ type: 'redo' });
    const rejectedRedo = {
      changed: redo,
      value: field.value,
      canUndo: field.canUndo(),
      canRedo: field.canRedo(),
    };
    await actions.run({ type: 'redo' });
    return { rejectedUndo, rejectedRedo, redone: field.value };
  });
  expect(result.rejectedUndo).toEqual({
    changed: false,
    value: 'x+a',
    canUndo: true,
    canRedo: false,
  });
  expect(result.rejectedRedo).toEqual({
    changed: false,
    value: 'x',
    canUndo: false,
    canRedo: true,
  });
  expect(result.redone).toBe('x+a');
});

test('clipboard copy/cut/paste preserve selected structures and one-step history', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { field, actions, clipboard, load } = window.editingHarness;
    load('x+y', { ranges: [[0, 1]] });
    await actions.run({ type: 'copy' });
    const copied = clipboard.value;
    await actions.run({ type: 'cut' });
    const cut = field.value;
    await actions.run({ type: 'undo' });
    const restored = field.value;
    clipboard.value = '\\sqrt{z}';
    await actions.run({ type: 'paste' });
    const pasted = field.value;
    await actions.run({ type: 'undo' });
    const undone = field.value;
    await actions.run({ type: 'redo' });
    const redone = field.value;
    return { copied, cut, restored, pasted, undone, redone };
  });
  expect(result).toEqual({
    copied: 'x',
    cut: '+y',
    restored: 'x+y',
    pasted: '\\sqrt{z}+y',
    undone: 'x+y',
    redone: '\\sqrt{z}+y',
  });
});

test('denied clipboard write never deletes the selection', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { field, actions, clipboard, load } = window.editingHarness;
    load('x+y', { ranges: [[0, 1]] });
    clipboard.writeText = async () => {
      throw new Error('permission denied');
    };
    let error = '';
    try {
      await actions.run({ type: 'cut' });
    } catch (caught) {
      error = String(caught);
    }
    return { error, value: field.value, canUndo: field.canUndo() };
  });
  expect(result.error).toContain('permission denied');
  expect(result.value).toBe('x+y');
  expect(result.canUndo).toBe(false);
});

for (const change of ['content', 'selection', 'focus', 'dispose'] as const) {
  test(`delayed paste is cancelled after ${change} changes`, async ({
    page,
  }) => {
    const result = await page.evaluate(async (change) => {
      const { field, actions, clipboard, load } = window.editingHarness;
      load('xy');
      field.focus();
      let resolveRead!: (value: string) => void;
      clipboard.readText = () =>
        new Promise<string>((resolve) => {
          resolveRead = resolve;
        });
      const pending = actions
        .run({ type: 'paste' })
        .catch((error) => String(error));
      if (change === 'content')
        await actions.run({ type: 'insert', value: 'z' });
      if (change === 'selection') field.position = 0;
      if (change === 'focus') {
        const input = document.createElement('input');
        input.id = 'outside-input';
        document.body.append(input);
        input.focus();
      }
      if (change === 'dispose') actions.dispose();
      const before = field.value;
      resolveRead('NEVER');
      const error = await pending;
      return {
        before,
        after: field.value,
        error,
        outsideFocused: document.activeElement?.id === 'outside-input',
      };
    }, change);
    expect(result.after).toBe(result.before);
    expect(result.error).toContain('cancelled');
    if (change === 'focus') expect(result.outsideFocused).toBe(true);
  });
}

test('read-only, composition, and cancelled beforeinput reject edits', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { field, actions, load } = window.editingHarness;
    load('x');
    field.readOnly = true;
    const readOnly = await actions.run({ type: 'insert', value: 'bad' });
    await actions.run({ type: 'command', command: 'moveToPreviousChar' });
    const readOnlyPosition = field.position;
    field.readOnly = false;
    field.position = field.lastOffset;
    actions.captureSelection();
    field.dispatchEvent(new CompositionEvent('compositionstart'));
    const composing = await actions.run({ type: 'insert', value: 'bad' });
    field.dispatchEvent(new CompositionEvent('compositionend'));
    field.addEventListener('beforeinput', (event) => event.preventDefault(), {
      once: true,
    });
    const cancelled = await actions.run({ type: 'insert', value: 'bad' });
    const value = field.value;
    const history = field.canUndo();
    await actions.run({ type: 'insert', value: '+y', selectionMode: 'after' });
    return {
      readOnly,
      readOnlyPosition,
      composing,
      cancelled,
      value,
      history,
      resumed: field.value,
    };
  });
  expect(result).toEqual({
    readOnly: false,
    readOnlyPosition: 0,
    composing: false,
    cancelled: false,
    value: 'x',
    history: false,
    resumed: 'x+y',
  });
});

test('placeholder navigation and deletion preserve a nested fraction', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { field, actions, load } = window.editingHarness;
    load('');
    await actions.run({ type: 'insert', value: '\\frac{#?}{#?}' });
    await actions.run({ type: 'insert', value: 'x', selectionMode: 'after' });
    await actions.run({ type: 'command', command: 'moveToNextPlaceholder' });
    await actions.run({
      type: 'insert',
      value: '\\sqrt{y}',
      selectionMode: 'after',
    });
    const before = field.value;
    const boundaryEdit = await actions.run({
      type: 'command',
      command: 'deleteBackward',
    });
    const boundaryValue = field.value;
    // Backspace at a radical boundary first enters/selects the structure.
    // That selection-only step must not consume a content undo unit.
    const changed = await actions.run({
      type: 'command',
      command: 'deleteBackward',
    });
    const deleted = field.value;
    await actions.run({ type: 'undo' });
    const undo = field.value;
    await actions.run({ type: 'redo' });
    const redo = field.value;
    return {
      before,
      boundaryEdit,
      boundaryValue,
      changed,
      deleted,
      undo,
      redo,
    };
  });
  expect(result.before).toBe('\\frac{x}{\\sqrt{y}}');
  expect(result.boundaryEdit).toBe(false);
  expect(result.boundaryValue).toBe(result.before);
  expect(result.changed).toBe(true);
  expect(result.deleted).not.toBe(result.before);
  expect(result.undo).toBe(result.before);
  expect(result.redo).toBe(result.deleted);
});

test('serialize/reopen retain multirow content and remain undoable', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { field, actions, load } = window.editingHarness;
    load('\\begin{aligned}a&=b\\\\c&=\\sqrt{d}\\end{aligned}');
    const saved = actions.serialize();
    await actions.run({ type: 'replace', value: 'q' });
    await actions.run({ type: 'replace', value: saved });
    const reopened = field.value;
    await actions.run({ type: 'undo' });
    const previous = field.value;
    await actions.run({ type: 'redo' });
    const redone = field.value;
    return { saved, reopened, previous, redone };
  });
  expect(result.saved).toContain('\\\\');
  expect(result.reopened).toBe(result.saved);
  expect(result.previous).toBe('q');
  expect(result.redone).toBe(result.saved);
});

test('whole-equation clipboard retains aligned rows', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { field, actions, load } = window.editingHarness;
    load('\\begin{aligned}a&=b\\\\c&=\\sqrt{d}\\end{aligned}');
    const saved = field.value;
    await actions.run({ type: 'copy' });
    await actions.run({ type: 'replace', value: '' });
    await actions.run({ type: 'paste' });
    const pasted = field.value;
    await actions.run({ type: 'undo' });
    const undone = field.value;
    await actions.run({ type: 'redo' });
    return { saved, pasted, undone, redone: field.value };
  });
  expect(result.saved).toContain('\\\\');
  expect(result.pasted).toBe(result.saved);
  expect(result.undone).toBe('');
  expect(result.redone).toBe(result.saved);
});
