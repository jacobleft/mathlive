import '../src/public/mathlive-ssr';
import { Atom } from '../src/core/atom-class';
import { parseLatex } from '../src/core/parser';
import type { ModelState } from '../src/editor-model/types';
import { UndoManager } from '../src/editor/undo';

function state(value: string, position = 0): ModelState {
  return {
    content: new Atom({ type: 'root', body: parseLatex(value) }).toJson(),
    selection: { ranges: [[position, position]] },
    mode: 'math',
  };
}

function fixture() {
  const model = {
    state: state('a'),
    getState(): ModelState {
      return structuredClone(this.state);
    },
    setState(next: ModelState): boolean {
      this.state = structuredClone(next);
      return true;
    },
  };
  const undo = new UndoManager(model);
  undo.startRecording();
  undo.snapshot();
  return { model, undo };
}

test('internal snapshots become one content-and-selection undo unit', () => {
  const { model, undo } = fixture();
  const before = state('a', 1);
  model.state = before;
  const after = state('bc', 2);
  expect(
    undo.transact(() => {
      undo.snapshot('delete');
      model.state = state('b');
      undo.snapshot('insert-mord');
      model.state = after;
    })
  ).toBe(true);
  expect(undo.undo()).toBe(true);
  expect(model.state).toEqual(before);
  expect(undo.canUndo()).toBe(false);
  expect(undo.redo()).toBe(true);
  expect(model.state).toEqual(after);
});

test('adjacent transactions do not coalesce', () => {
  const { model, undo } = fixture();
  for (const value of ['b', 'c']) {
    undo.transact(() => {
      model.state = state(value);
      undo.snapshot('insert-mord');
    });
  }
  undo.undo();
  expect(model.state).toEqual(state('b'));
  undo.undo();
  expect(model.state).toEqual(state('a'));
});

test('no-op and failed edits preserve an existing redo branch', () => {
  const { model, undo } = fixture();
  undo.transact(() => {
    model.state = state('b');
  });
  undo.undo();
  expect(
    undo.transact(() => {
      undo.snapshot();
    })
  ).toBe(false);
  expect(() =>
    undo.transact(() => {
      model.state = state('c');
      undo.reset();
      throw new Error('edit failed');
    })
  ).toThrow('edit failed');
  expect(model.state).toEqual(state('a'));
  expect(undo.redo()).toBe(true);
  expect(model.state).toEqual(state('b'));
});

test('a new edit replaces the redo branch', () => {
  const { model, undo } = fixture();
  undo.transact(() => {
    model.state = state('b');
  });
  undo.undo();
  undo.transact(() => {
    model.state = state('c');
  });
  expect(undo.canRedo()).toBe(false);
  undo.undo();
  expect(model.state).toEqual(state('a'));
  undo.redo();
  expect(model.state).toEqual(state('c'));
});

test('nested transactions join their enclosing edit', () => {
  const { model, undo } = fixture();
  undo.transact(() => {
    model.state = state('b');
    undo.transact(() => {
      model.state = state('c');
    });
  });
  undo.undo();
  expect(model.state).toEqual(state('a'));
  expect(undo.canUndo()).toBe(false);
  undo.redo();
  expect(model.state).toEqual(state('c'));
});

test('history navigation inside an edit is rejected and rolled back', () => {
  const { model, undo } = fixture();
  undo.transact(() => {
    model.state = state('b');
  });
  expect(() =>
    undo.transact(() => {
      model.state = state('c');
      undo.undo();
    })
  ).toThrow('Cannot undo');
  expect(model.state).toEqual(state('b'));
  undo.undo();
  expect(model.state).toEqual(state('a'));
});

test('paused recording stays paused after an edit', () => {
  const { model, undo } = fixture();
  undo.stopRecording();
  undo.transact(() => {
    model.state = state('b');
  });
  expect(undo.snapshot()).toBe(false);
  expect(undo.canUndo()).toBe(false);
});

test('cancelled history navigation preserves the history pointer', () => {
  const { model, undo } = fixture();
  undo.transact(() => {
    model.state = state('b');
  });
  const restore = model.setState.bind(model);
  model.setState = () => false;
  expect(undo.undo()).toBe(false);
  expect(model.state).toEqual(state('b'));
  expect(undo.canUndo()).toBe(true);
  expect(undo.canRedo()).toBe(false);
  model.setState = restore;
  undo.undo();
  model.setState = () => false;
  expect(undo.redo()).toBe(false);
  expect(model.state).toEqual(state('a'));
  expect(undo.canRedo()).toBe(true);
  model.setState = restore;
  undo.redo();
  expect(model.state).toEqual(state('b'));
});
