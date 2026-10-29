import {
  MathfieldElement,
  Keybinding,
  EditorActions,
  AuthoringAction,
  SelectionContext,
  version,
} from 'mathlive';

console.log(version);
const bindings: Keybinding[] = [];
const mf = new MathfieldElement({});
mf.keybindings = bindings;
const actions = new EditorActions(mf);
const action: AuthoringAction = { type: 'insert', value: '\\frac{#0}{#?}' };
void actions.run(action);
mf.performUndoableEdit(() => mf.insert('x'));
const context: SelectionContext = mf.getSelectionContext();
if (context.structures.length) {
  void actions.run({
    type: 'select',
    selection: { ranges: [context.structures[0].range] },
  });
  const slot = context.structures[0].slots[0];
  if (slot?.role === 'cell') {
    const row: number = slot.row;
    void row;
  }
}
void actions.run({ type: 'focus' });
actions.dispose();
