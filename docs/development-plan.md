# Development plan: a full-featured visual equation editor

Status: S00–S02 implemented with the workbench, shared actions, grouped history
and a searchable common-template palette; see the [baseline](baseline.md),
[S01 report](editor-actions.md) and [S02 report](template-palette.md).
Later slices are planned.
Date: 2026-10-29.
Upstream baseline: MathLive 0.111.1 at
`8d148b4227ca057fa1aefe89c2149cdcf0591443`.

Execution order: [feature priorities and implementation slices](implementation-order.md).
Use that queue to choose the next task; the milestones below group the eventual
deliverables and acceptance gates. Implementation proceeds in increments across
families rather than completing every template before its editing controls.

## Product objective

Build a full-featured visual equation editor with the authoring breadth and
editing convenience expected from AxMath. A user must be able to insert a
structure, fill its slots, change its properties, and revise an existing equation
through visible controls and keyboard navigation. Typing command syntax must be
optional throughout these workflows.

The priority is the editor itself: templates, contextual properties, structure
transformations, matrices, alignment, typography, and dependable interaction.
Existing MathLive notation support is a starting point, not evidence of finished
authoring workflows.

MathML storage, macOS-specific packaging, LibreOffice/ODT integration, Word/OLE
integration, and AxMath binary compatibility are deferred. They do not block the
editor milestones or dictate the first editor architecture. No new renderer,
document format, computation engine, OCR service, or AI service is required for
the first usable release.

## Decisions established for this fork

1. Fork [arnog/mathlive](https://github.com/arnog/mathlive) on GitHub under
   [jacobleft/mathlive](https://github.com/jacobleft/mathlive).
2. Retain MathLive's equation tree, renderer, and editing machinery. Extend them
   where the feature audit identifies a concrete gap.
3. Build an original authoring interface with categorized visual templates and
   contextual controls. AxMath is the capability reference; its icons, artwork,
   and source code are not project assets.
4. Use MathLive's existing LaTeX value for initial load/save and clipboard
   workflows. Visual editing acts on MathLive's model; it does not invoke an
   external TeX compiler. This is not a claim of MathML-native editing.
5. Establish a standalone browser workbench as the first editor host. An
   Obsidian integration can reuse the finished editor later. Do not fork or
   absorb the Obsidian plugin as part of this initial setup.
6. Maintain a small upstream patch set. Introduce application structure only
   where it serves an actual editor workflow.

## What is known at the baseline

Source inspection establishes the following available machinery:

- [MathfieldElement](../src/public/mathfield-element.ts) exposes selection,
  insertion, style changes, commands, element information, and history events.
- [Commands](../src/public/commands.ts) include undo/redo, matrix row/column
  operations, and environment changes.
- [Atom](../src/core/atom-class.ts) stores structured equation content, scripts,
  and limit placement, with graphical layout represented separately.
- [Array editing](../src/editor-model/array.ts) and
  [array atoms](../src/atoms/array.ts) implement matrix behavior.
- [Notation definitions](../src/latex-commands) and
  [virtual keyboard code](../src/virtual-keyboard) offer a base for visual
  templates, symbols, and insertion behavior.
- Existing tests include serialization, rendering, public declarations,
  security, and Playwright interaction tests for Chromium, Firefox, and WebKit.

The [S00 baseline report](baseline.md) records the implemented workbench,
test-runner fixes, measured tests, and remaining failures. See the
[feature matrix](feature-matrix.md) for evidence levels.

Two baseline concerns identified during planning have been addressed in S00:

- GitHub workflows now also target `development`.
- [scripts/test.sh](../scripts/test.sh) accumulates a failure in `exit_code` but
  finishes with a production rebuild without explicitly returning that code.
  S00 adds the explicit exit and a regression that first reproduced the false
  success, then passed after the correction.

## Editor design

### One workbench, one editing model

The workbench combines a category palette, the equation canvas, a contextual
property panel, and a searchable symbol/template browser. The property panel
follows the selection and exposes properties appropriate to the current
structure. The virtual keyboard remains available but is not the sole interface
for discovering advanced features.

Start with one equation canvas and a small set of document-level controls. A
multi-document application, cloud account, and host-specific features are not
prerequisites for validating authoring behavior.

### Templates describe authoring behavior

A template entry needs an identifier, category, search terms, rendered preview,
insertion definition, slot order, and an editing example. The preview and inserted
result must agree. Wrapping a selection in a fraction or root must retain that
selection in the expected slot. Nested structures remain editable.

Template definitions may use MathLive's existing insertion syntax internally.
Users interact with previews and slots. A template is not complete merely
because its source string renders correctly.

### Actions own changes and history

Palette clicks, shortcuts, and contextual controls share editor actions. Each
action handles selection, focus, the model change, and the intended undo unit.
Changing a property must preserve the equation content and avoid resetting the
entire expression through `setValue()` on every adjustment.

Use existing public interfaces where they suffice. When a needed operation
cannot be expressed reliably, add a narrow model command with tests for its
content, selection, and history effects. Keep private Atom access inside that
implementation rather than spreading it through interface controls. Do not use
regular-expression surgery on the full serialized equation as a general
structure-editing mechanism.

### Existing code stays recognizable

Proposed locations, to be created during implementation:

- `src/authoring/`: template catalog, authoring actions, contextual controls, and
  workbench behavior.
- `examples/authoring/`: runnable standalone workbench and usage examples.
- Existing `src/editor-model/`, `src/atoms/`, and `src/latex-commands/`: narrow
  changes required for genuinely missing operations or constructions.
- Existing `test/` suites: model/serialization checks and browser interaction
  scenarios. Add authoring fixtures alongside these suites.

Do not create a universal editor abstraction or serialize private Atom objects
as a new permanent document format during the initial implementation.

## Milestones and acceptance gates

### M0 — Establish the baseline and feature inventory

Deliverables:

- Reproducible dependency installation and build using the existing lockfile;
  record the exact runtime, commit, commands, and results.
- Reliable failing exit status from test commands and CI coverage for
  `development` and pull requests targeting it.
- A feature catalog derived from the equation families in the matrix and an
  authorized AxMath feature/preset comparison. Use original fixture content;
  keep vendor binaries, copied palettes, and personal documents out of the fork.
- A measured baseline for each feature: notation exists, insertion works,
  contextual modification works, and interaction/serialization are tested.

Acceptance: the baseline report separates passes, known failures, and untested
items. A deliberately failing regression must fail CI. Record limitations of the
comparison corpus rather than declaring complete AxMath parity.

### M1 — Deliver the visual workbench and template catalog

Deliverables:

- Category palette for fractions, scripts, radicals, operators/integrals,
  delimiters, accents/arrows, matrices, and multirow constructions.
- Live template previews, searchable names/symbols, placeholder navigation,
  tooltips, and keyboard access to the palette.
- Shared actions for insertion, wrapping a selection, focus restoration,
  cut/copy/paste, and undo/redo.
- A contextual panel that identifies the current structure and exposes only
  meaningful actions; controls show disabled or mixed states explicitly.

Acceptance: a user can construct and revise a nested expression across every
listed family without entering command syntax. Insertion does not lose a
selection or strand the caret. One logical action has a predictable undo unit.

### M2 — Complete structure transformations and operator properties

Deliverables:

- Fraction variants, bar visibility/thickness where representable, indexed
  radicals, script positions, and combined/nested scripts.
- Sum/product/integral variants, directed contour/surface/volume variants, and
  visual controls for lower/upper slots and side versus above/below limits.
- Paired/asymmetric/middle delimiters; accents, extensible arrows, under/over
  annotations, braces, boxes, and common multi-level constructions.
- Converting an existing structure between supported variants while retaining
  its children and preserving a sensible selection.
- Narrow model/renderer additions for audited gaps, with explicit unsupported
  states where full behavior has not been implemented.

Acceptance: the same structure can be created, selected, transformed, edited,
undone, and reopened with its children and properties intact. Required variants
must be reachable through the interface; a glyph appearing in a symbol list is
insufficient.

### M3 — Complete matrices, arrays, cases, and alignment

Deliverables:

- Matrix size picker; insert/delete rows and columns relative to the caret;
  preserve existing cell content when resizing.
- Delimiter changes, column alignment, row/column spacing, and separator rules.
- Cell/row/column selection and rectangular paste, including explicit behavior
  for uneven clipboard rows and destructive size changes.
- Cases, equation arrays, multi-line alignment, and nested structures in cells.
- Visual alignment controls that modify existing content rather than inserting
  a fresh template over it.

Acceptance: nested cell expressions survive resizing, delimiter/alignment
changes, paste, and undo/redo. Multirow copy retains row separators. Separator
rules remain editable and serialize consistently.

### M4 — Add precise typography and layout controls

Deliverables:

- Upright/italic/bold and supported math alphabets; math/text mode and available
  size/style controls; color and background styling where appropriate.
- Operator spacing, explicit spacing, baseline/position adjustments where the
  model can represent them, accent/annotation placement, and delimiter sizing.
- Consistent rules for selection, inherited style, mixed styles, and defaults.
- Font/glyph coverage audit for unusual symbols. Expose only working font
  choices; arbitrary system-font support is a separate engine task if needed.

Acceptance: edits match the canvas preview, survive save/reopen, and participate
in history. Supported visual precision is documented with examples; unimplemented
positioning or font features are not presented as complete.

### M5 — Complete authoring efficiency and reusable content

Deliverables:

- Favorites, recent templates, reusable formula snippets, and a custom-template
  workflow with previews and editable slots.
- Complete the shortcut, context-menu, and reuse experience on top of the
  navigation, focus, history, zoom, and clipboard behavior established in P0.
- Extend equation open/save and copy/paste coverage to the advanced constructions
  using the existing MathLive representation; basic preservation is a P0 gate.
- A basic local formula library with rename/search/preview. Avoid introducing a
  server or account requirement for equation editing.

Acceptance: a user can repeatedly create, reuse, modify, save, and reopen complex
equations through the visual workflow. Custom templates obey the same selection,
placeholder, and history behavior as built-in templates.

### M6 — Qualify the first editor release

Deliverables:

- Run the complete feature matrix through interaction and rendering checks;
  publish remaining gaps and any intentional differences from AxMath.
- Regression checks for deletion boundaries, selection extension, history,
  clipboard, incomplete equations, focus changes, and long/nested expressions.
- Measure interaction/rendering performance on representative small and large
  equations; establish budgets from the measured baseline.
- Expanded keyboard accessibility and Chinese IME checks on available supported
  environments, building on the P0 checks. Browser-engine testing does not count
  as testing every OS.
- Reproducible fork build and a documented upstream update procedure.

Acceptance: full-target qualification requires passing evidence for every
required matrix row. Earlier beta releases may list unfinished advanced items,
but those items remain in scope and block full-target qualification. No silent
content loss is accepted in transformation, clipboard, undo/redo, or reopen
workflows. Full parity is claimed only against the explicitly enumerated
comparison catalog.

## Verification strategy

Verify behavior at the interface users exercise. Use model/serialization tests
for structure transformations and browser tests for caret, selection, focus,
property controls, and undo. Rendering checks complement these tests rather than
substitute for them.

For each construction, test creation, nested editing, changing properties,
copy/paste, undo/redo, and save/reopen. Include partially filled expressions;
they are normal editor states. Preserve structure/style/layout semantics rather
than require byte-for-byte identical LaTeX serialization.

Use the existing Chromium/Firefox/WebKit configuration for cross-engine
regressions. Native macOS and LibreOffice validation remain outside the current
release gates. No computer-use automation is required; programmatic browser
tests may exercise the editor when implementation begins.

Do not count symbol definitions, parser acceptance, or successful static
rendering alone as completed editor features. Matrix evidence is case-specific;
avoid a single coverage percentage that hides missing interactions.

## Prioritized implementation queue

The [implementation-order document](implementation-order.md) replaces the
initial E01–E10 queue with S00–S19. It specifies the order within every family,
the first delivery tier of each feature, dependency minima, and concrete
acceptance examples.

| Tier | Slices | Delivery |
| --- | --- | --- |
| P0 | S00–S08 | Reliable baseline and actions; common templates, contextual properties and transformations; basic matrices, alignment and typography; first-usable-editor gate |
| P1 | S09–S15 | Broad notation, advanced matrices/alignment, complete common property controls, rich typography, efficient reuse, and the authoring-beta gate |
| P2 | S16–S19 | Tensors and uncommon constructions, fine positioning, audited fonts, custom templates/library, and full-target qualification |

Dependable editing is required from S01 onward. Basic typography, clipboard,
reopen, and composition checks are included in P0. They do not wait for the
completion of all structure or matrix variants. Every new action includes its
selection, focus, content-preservation, and undo/redo verification.

All tiers remain in scope. S00 is implemented with the limitations documented in
the baseline report; S01–S19 are planned. No schedule estimate is committed for
the remaining work without measuring the relevant gaps.

## Fork maintenance

- `upstream` points to `https://github.com/arnog/mathlive.git`; `origin` points
  to `https://github.com/jacobleft/mathlive.git`.
- Keep `master` at upstream history and perform editor work on `development`.
  Use small topic branches for implementation changes.
- Fetch upstream, inspect changes, merge into `development`, and run the
  regression suite before adopting updates. Preserve upstream tags unchanged.
- Keep fork planning/product notes separate from upstream release notes.
  Maintain a downstream change log once implementation starts.
- Preserve MIT notices and audit bundled font/asset notices before distributing
  a product. Use original interface assets.
- Contribution proposals to upstream are optional future work; this setup does
  not send messages or open pull requests in the upstream project.

## Deferred backlog

After the editor is useful, reconsider Obsidian integration, MathML persistence,
native application packaging, and LibreOffice/Word integration based on actual
needs. None is an implementation dependency of the milestones above.
