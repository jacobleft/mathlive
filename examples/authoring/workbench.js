import '../../dist/mathlive.mjs';

await window.customElements.whenDefined('math-field');

const mathfield = document.getElementById('authoring-mathfield');
const undo = document.getElementById('undo');
const redo = document.getElementById('redo');
const keyboard = document.getElementById('keyboard');
const status = document.getElementById('editor-status');
const hint = document.getElementById('canvas-hint');

function updateControls() {
  undo.disabled = !mathfield.canUndo();
  redo.disabled = !mathfield.canRedo();
  hint.hidden = mathfield.value.length > 0;
}

for (const [button, command] of [
  [undo, 'undo'],
  [redo, 'redo'],
]) {
  button.addEventListener('click', () => {
    mathfield.executeCommand(command);
    mathfield.focus();
    updateControls();
  });
}

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
