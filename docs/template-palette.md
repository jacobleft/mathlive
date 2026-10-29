# S02: common template palette

Date: 2026-10-29. Builds on [S01 shared actions](editor-actions.md).

## Delivered

The [workbench](../examples/authoring/index.html) has a gallery of 41 editable
templates in six categories. Every button displays a preview rendered by the
same MathLive engine as the equation canvas, using local assets.

| Category          | Templates                                                                                                       |
| ----------------- | --------------------------------------------------------------------------------------------------------------- |
| Fractions & roots | Stacked, display and inline fractions; square, indexed and cube roots                                           |
| Scripts           | Subscript, superscript and combined scripts                                                                     |
| Brackets          | Parentheses, square brackets, braces, absolute value, norm, angle brackets, floor and ceiling                   |
| Functions         | Sine, cosine, tangent, natural logarithm, logarithm, logarithm with base, exponential and limit                 |
| Sums & integrals  | Summation, product, indefinite and definite single integrals                                                    |
| Symbols           | Pi, alpha, beta, theta, infinity, plus/minus, multiplication, division, equality and three inequality relations |

The initial category is Fractions & roots. Search starts across the entire
catalog, matching names, command aliases, symbols and selected Chinese keywords.
Multiple words narrow the results together. Category buttons can further filter
a search. An empty result explains how to recover.

Structure buttons wrap an explicit selection. Script buttons also accept the
preceding operand when the selection is collapsed. Symbol buttons replace a
selection as normal character insertion does. Empty argument slots remain
editable. A wrapped fraction selects its denominator; a wrapped indexed root
selects its degree. Bounded operators provide lower, upper and body slots;
integrals also provide a differential-variable slot.

Search and category interaction retain the equation's selection bookmark.
Insertion returns focus to the equation and uses S01's single undo unit.
Existing nested content, styling and unaffected siblings are retained.

Keyboard access uses ordinary category buttons and a toolbar with one Tab stop
for the preview gallery. Arrow keys move among previews; Home/End choose the
first/last result; Enter/Space inserts. Arrow Down from search enters the
gallery. Escape clears search, then returns focus to the equation. Read-only,
disabled and active-composition states disable insertion controls.

The gallery scrolls within a bounded area and wraps down to a 390 px viewport.
No framework, remote service, icon collection or dependency was added.

## Implementation boundary

- [`templates.js`](../examples/authoring/templates.js) owns catalog entries,
  categories and pure filtering. Each entry has a stable ID, label, insertion
  expression, preview and search aliases.
- [`template-palette.js`](../examples/authoring/template-palette.js) owns the
  gallery's DOM, filtering, availability and keyboard behavior. It uses the
  existing `EditorActions.bind()` API for content changes. It does not read or
  mutate private model objects. Refiltering removes old action bindings.
- Preview markup comes only from the bundled catalog and MathLive renderer;
  search text is never interpreted as markup or as an equation to insert.
- The engine patch is limited to physical-keyboard placeholder replacement.
  Previously the keyboard handler recorded placeholder removal separately from
  typing. Undoing a filled slot therefore exposed an empty intermediate state.
  Replacement now separates the typing group while retaining the pre-edit
  placeholder state, so an ordinary typed character undoes once. An
  empty-history guard seeds the pre-edit state after a history reset without
  adding duplicate steps. The handler also retains the selected slot's insertion
  style before deleting it. Integral templates explicitly use normal math style
  for the variable after the upright d.

The catalog uses MathLive's existing insertion expressions and placeholder
mechanism. No external equation compiler or new storage format is involved.

## Verification

The catalog suite validates all 41 previews and filled insertion expressions,
unique IDs/categories, and search by names, aliases, Unicode and Chinese terms.
The full unit suite passes 434 tests and 256 snapshots, with two existing TODO.

Browser coverage uses real palette buttons and keyboard input. Six category
cases iterate all 41 entries, checking insertion, focus, undo/redo, syntax and
reopen. Additional cases cover backward selection after search, nested
fraction/root slots, preservation of styled and nested content, indexed roots,
combined scripts, all four definite-integral slots, keyboard gallery navigation,
read-only/composition guards, empty results and a local-only mobile layout.

The Chromium run of the full physical-keyboard suite and the initial palette
suite passed 55 tests, including the existing placeholder-typing regression.
Additional three-engine runs passed six focus/availability checks and three
history-reset checks after the final corrections. The production build and
packaged public declaration check pass. New files pass lint; the modified
upstream keyboard file retains one existing unused-import warning. The build
retains eight existing documentation warnings.

The
[full GitHub workflow](https://github.com/jacobleft/mathlive/actions/runs/40820986138)
passed on Node.js 22/Linux for code commit
`a2b49bc69fdb020cff10600de4294de930f3a4aa`: 434 unit tests, 256 snapshots, the
public declaration check, and 441 browser tests passed. All 45 S02 browser
checks passed across Chromium, Firefox and WebKit, including the category loops
over every template. Twelve existing browser skips and two unit TODO remain. The
final production rebuild also succeeded.

Reproduce with:

```sh
npx jest test/ --runInBand
npx playwright test template-palette.spec.ts editor-actions.spec.ts authoring.spec.ts --workers=1
npx playwright test physical-keyboard.spec.ts --project=chromium --workers=1
```

## Remaining work

S03 adds selection-aware contextual properties for structures already in the
equation; S04 adds common property changes and transformations. This increment
does not provide those controls. Matrices, cases and aligned-row authoring are
S05/S07. Advanced notation and full catalog discovery/reuse follow their
scheduled slices. Real IME qualification, OS clipboard interoperability and
broader accessibility/performance gates remain as recorded in the development
plan. S00's prescript and horizontal-matrix-rule gaps remain open.
