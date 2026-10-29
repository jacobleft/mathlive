# S03: selection-aware contextual properties

Date: 2026-10-29. Continues [S01 shared actions](editor-actions.md) and the
[S02 template palette](template-palette.md).

## Delivered

The workbench has a Properties panel alongside the equation, stacking below it
on narrow screens. It follows the caret or a single selected structure and shows
its current properties, a preview, and selectable content slots.

The containing-structure breadcrumb lets a user inspect an outer fraction while
the selection stays inside an inner root. Pointer inspection keeps focus in the
equation. Keyboard inspection keeps focus on the chosen panel button; Return to
equation or Escape restores the equation selection and focus.

| Structure                   | Current properties                                | Content navigation           |
| --------------------------- | ------------------------------------------------- | ---------------------------- |
| Fraction                    | Automatic/display/inline layout and bar state     | Numerator, denominator       |
| Root                        | Square/indexed form                               | Radicand, index when present |
| Scripts                     | Subscript/superscript presence                    | Base, subscript, superscript |
| Paired delimiters           | Left/right delimiter and automatic right matching | Enclosed body                |
| Operator                    | Name, limit placement and bound presence          | Existing lower/upper limits  |
| Matrix/cases/equation array | Form and row/column counts                        | Current cell                 |

Select structure highlights the target structure. Selecting a slot highlights
its contents, or places the caret in an empty slot, so ordinary equation input
can edit it. Inspection and selection navigation create no undo units and
preserve an existing redo branch. A slot edit remains undoable.

Mixed selections across structures/slots and multiple ranges have an explicit
unavailable state. Unsupported structures require an explicit enclosing choice.
Read-only, disabled, composition and raw-command-entry states disable the
navigation controls. A stale control rechecks its target before selecting any
offsets. A deferred focus return stops if another input takes focus or the
target changes.

Property values are read-only in S03. S04 adds property changes and structural
transformations; this panel provides their targeting and interaction foundation.

## API and implementation

[`MathfieldElement.getSelectionContext()`](../src/public/mathfield-element.ts)
returns a detached, serializable snapshot containing status, selection,
structure kinds, ranges, typed properties and slots. Structures are ordered from
inner to outer. Cell coordinates are zero-based. The public declaration build
includes these types without references to private model classes.

The [native inspector](../src/editor-mathfield/selection-context.ts) reads the
actual equation tree. Target identification and property inspection do not
reparse LaTeX or depend on renderer DOM structure. Branch ranges follow native
navigation order. Script contexts include their base; array contexts expose the
current cell rather than creating controls for every cell in a large matrix. The
[public context types](../src/public/selection-context.ts) expose no live model
objects. Refresh a snapshot after content or selection changes.

```ts
const context = field.getSelectionContext();
if (context.status === 'supported') {
  const target = context.structures[0];
  const slot = target.slots.find((item) => item.role === 'radicand');
  if (slot) {
    await actions.run({ type: 'select', selection: { ranges: [slot.range] } });
  }
}
await actions.run({ type: 'focus' });
```

The [panel](../examples/authoring/contextual-properties.js) uses these snapshots
and shared `select`/`focus` actions. It revalidates value and context before
navigation, and retains the target while informational controls have focus.
Hosts loading a value outside shared actions call `actions.captureSelection()`
to refresh the bookmark and inspector. Previews use MathLive with the field's
macros and registers. Property text is assigned as text, never interpreted as
HTML. Focus handoff retries briefly through MathLive's asynchronous focus
transition, with owner/target guards.

The native `setSelection` command performs selection navigation with the same
shortcut-buffer, pending-style and undo-group bookkeeping as other native
navigation. This closes a reproduced bug where editing two filled slots could
coalesce both edits into one undo group. Native input also seeds empty history
before the first edit after a reset, retaining the original slot contents for
undo. Both changes reuse the existing history machinery.

## Verification

Eighteen native-tree tests cover ancestry and boundaries, full/backward/mixed
selections, unsupported structures, empty slots, script bases, native
properties, array cells, detached snapshots and configured fraction navigation
order.

Browser tests use real panel buttons, native equation input and physical
keyboard history shortcuts. They check both logical and actual DOM focus,
backward selections, keyboard ancestor inspection, whole/slot selection,
single-step slot undo, separate typing groups, redo retention, caret tracking,
unavailable states, macro-aware previews, stale targets, deferred focus
cancellation, disconnected fields and 390 px layouts with long previews.

Local checks include the 41-test Chromium physical-keyboard suite, the S03
scenarios across Chromium/Firefox/WebKit, and the accumulated unit suite of 452
passing tests and 256 snapshots (two existing TODO).

The
[full integration workflow](https://github.com/jacobleft/mathlive/actions/runs/40828695543)
passed on commit `72f38441404d712f55ac93489a31bb1d79fe7898`: all 452 unit tests,
256 snapshots and 486 browser tests passed, including all 45 S03 cases across
Chromium, Firefox and WebKit. The browser suite retained 12 existing skips.

The production build and packaged public-declaration consumer check pass. Lint
has zero errors and two existing unused-import warnings in modified upstream
files; the build retains eight existing documentation warnings. No dependency or
storage-format change was introduced.

Reproduce after building with:

```sh
npx jest test/ --runInBand
npx tsc --noEmit --baseUrl ./dist/types ./test/public-ts-declarations/main.ts
npx playwright test contextual-properties.spec.ts --workers=1
npx playwright test physical-keyboard.spec.ts --project=chromium --workers=1
```

## Next increment

S04 uses this targeting layer for fraction/root/script/bracket/operator property
changes that retain children and have one logical undo unit. Mixed/inherited
property editing, comprehensive screen-reader/IME qualification, advanced
notation and performance gates remain in their scheduled slices. No complete
feature-family or AxMath parity claim is implied by S03.
