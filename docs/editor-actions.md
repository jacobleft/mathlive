# S01: shared editing actions and history

Date: 2026-10-29. Continues the [S00 baseline](baseline.md).

## Delivered behavior

The workbench's Undo, Redo, Copy, Cut and Paste controls use the exported
[`EditorActions`](../src/public/editor-actions.ts) controller. The same
controller accepts insertion/replacement and a small set of navigation/deletion
commands for the upcoming template palette and contextual controls.

Pointer activation keeps the equation focused. Keyboard activation returns to
the bookmarked equation selection, including its direction. A bookmark is never
restored onto a different equation value. Read-only selections and active input
composition reject content edits. Navigation remains available in read-only
mode.

Clipboard reads and writes are asynchronous. Cut deletes only after a successful
write. Paste and cut cancel if another action, observed selection/content
change, external focus change, or controller disposal invalidates their target
while they wait. A delayed response cannot overwrite the new selection or take
focus back from another input. Clipboard errors appear in the workbench status.

The basic clipboard contract uses the current LaTeX value: a selection copies
its content, and Copy with a collapsed selection copies the equation. Paste
accepts that representation. Structured HTML, external application
interoperability, rectangular matrix paste and file saving are later work.

## One action, one undo unit

[`MathfieldElement.performUndoableEdit()`](../src/public/mathfield-element.ts)
groups synchronous content edits into one undo/redo unit. It records the actual
before and after model states, including selection and editing mode. Nested
calls join the enclosing unit. An exception restores content, selection, pending
style and history. No-op edits and selection-only movement preserve redo;
successful edits start a new branch after undo. Undo/redo inside a transaction
is rejected. A cancelled history `beforeinput` leaves the history pointer in
place. Callbacks must be synchronous.

Two observed programmatic-command problems motivated this small engine patch:

- Consecutive insertions of the same kind previously coalesced into one step.
- A raw programmatic delete recorded its pre-delete state; redo could restore
  that state rather than the deletion.

Shared actions now enclose content commands in this transaction. Native keyboard
history continues to use the same history stack. Raw callers of `insert()` and
`executeCommand()` retain their existing behavior; use the transaction for new
visual editing controls. Selection-only boundary deletion creates no history
entry and still notifies selection observers.

## Reuse

```ts
import { EditorActions, MathfieldElement } from 'mathlive';

const field = document.querySelector<MathfieldElement>('math-field')!;
const actions = new EditorActions(field);
const unbind = actions.bind(fractionButton, {
  type: 'insert',
  value: '\\frac{#0}{#?}',
});

// Initialization outside the action layer: explicitly refresh its bookmark.
field.value = savedEquation;
field.resetUndo();
actions.captureSelection();

const saved = actions.serialize();
// Restore through an undoable action when revising an open equation.
await actions.run({ type: 'replace', value: saved });

// On host teardown:
unbind();
actions.dispose();
```

`state` exposes `canUndo`, `canRedo`, `canEdit` and `pending`. Subscribe to
`state-change` to refresh controls and `action-error` for errors from bound
buttons. Direct `run()` callers receive rejected promises for clipboard errors.
The boolean result indicates a content/history change or a handled navigation
command; Copy returns false because it does not edit content. The optional
clipboard dependency allows deterministic transport tests without changing the
real equation editor or history implementation.

The controller lives in `src/public` so its declaration and types ship with the
existing public declaration build. It has no private model imports. The only
engine-facing addition is `performUndoableEdit()` and its history
implementation.

## Verification

Local environment: Windows x64, Node.js 26.8.1, npm 11.15.0, Git Bash 5.3.9 and
Playwright 1.63.0, continuing the S00 toolchain.

| Check                                         | Result                                                                             |
| --------------------------------------------- | ---------------------------------------------------------------------------------- |
| Production build                              | Passed; eight existing documentation warnings                                      |
| Source and packaged public declaration checks | Passed, including the new exported controller/action types and transaction API     |
| Unit suite                                    | 389 passed, two existing TODO, 256 snapshots passed; eight new history regressions |
| Lint on changed source/tests                  | Zero errors; three existing warnings in model/mathfield files                      |
| Workbench viewport                            | Toolbar fits at 390 px with no horizontal page overflow                            |

The S01 browser suite against the production build passed all 48 checks: 16
cases each in Chromium, Firefox and WebKit.

Reproduce after building with `npx jest test/ --runInBand`,
`npx tsc --noEmit --baseUrl ./dist/types ./test/public-ts-declarations/main.ts`
and `npx playwright test editor-actions.spec.ts --workers=1`. On Windows, place
Git Bash ahead of the WSL launcher on `PATH` for the shell-runner tests.

The transaction unit tests exercise the real history manager with serialized
MathLive atoms. Browser tests use the actual editor, renderer, selection,
toolbar events and native history shortcuts in Chromium, Firefox and WebKit.
Only the clipboard transport is injected in the S01 suite; browser permission
prompts and OS clipboard integration are not established by those tests.

New regression cases cover adjacent insertions and deletion redo, backward
selection wrapping with pointer/keyboard activation, native history shortcuts,
nested edits and exception rollback, redo branch behavior, cut/paste undo,
clipboard denial, four stale-paste cases, read-only/composition/beforeinput
guards, cancelled undo/redo, nested placeholder navigation and deletion
boundaries, multirow reopen, and whole-equation multirow clipboard preservation.

Composition checks dispatch composition events to verify the action guard. A
real Chinese IME session remains part of S08/platform qualification. The S00
`prescript` and horizontal-matrix-rule gaps remain open. No complete feature
family or AxMath parity is claimed by this increment.
