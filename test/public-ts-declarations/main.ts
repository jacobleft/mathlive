import {
  MathfieldElement,
  Keybinding,
  EditorActions,
  AuthoringAction,
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
actions.dispose();
