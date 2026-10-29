import { EditorActions } from '../../dist/mathlive.mjs';

await window.customElements.whenDefined('math-field');

const mathfield = document.getElementById('authoring-mathfield');
const undo = document.getElementById('undo');
const redo = document.getElementById('redo');
const keyboard = document.getElementById('keyboard');
const status = document.getElementById('editor-status');
const hint = document.getElementById('canvas-hint');
const actions = new EditorActions(mathfield);

function updateControls() {
  undo.disabled = !actions.state.canEdit || !actions.state.canUndo;
  redo.disabled = !actions.state.canEdit || !actions.state.canRedo;
  document.getElementById('cut').disabled =
    !actions.state.canEdit || mathfield.selectionIsCollapsed;
  document.getElementById('paste').disabled =
    !actions.state.canEdit || actions.state.pending;
  hint.hidden = mathfield.value.length > 0;
}

for (const [button, command] of [
  [undo, 'undo'],
  [redo, 'redo'],
  [document.getElementById('copy'), 'copy'],
  [document.getElementById('cut'), 'cut'],
  [document.getElementById('paste'), 'paste'],
])
  actions.bind(button, { type: command });

actions.addEventListener('state-change', updateControls);
actions.addEventListener('action-error', (event) => {
  status.textContent = event.detail;
});

keyboard.disabled = false;
keyboard.addEventListener('click', () => {
  mathfield.focus();
  if (window.mathVirtualKeyboard.visible) window.mathVirtualKeyboard.hide();
  else window.mathVirtualKeyboard.show();
});
window.mathVirtualKeyboard.addEventListener('virtual-keyboard-toggle', () => {
  keyboard.setAttribute(
    'aria-pressed',
    String(window.mathVirtualKeyboard.visible)
  );
});

mathfield.addEventListener('undo-state-change', updateControls);
mathfield.addEventListener('input', () => {
  status.textContent = 'Editing';
  updateControls();
});
mathfield.addEventListener('change', () => {
  status.textContent = 'Ready';
});
updateControls();
status.textContent = 'Ready';
document.body.dataset.ready = 'true';
