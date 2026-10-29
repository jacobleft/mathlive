# Authoring feature matrix

Baseline: MathLive 0.111.1, upstream commit
`8d148b4227ca057fa1aefe89c2149cdcf0591443`, inspected 2026-10-29.

This is the initial target inventory for an AxMath-style full-featured visual
editor. It is not an exhaustive inventory of AxMath and does not claim feature
parity. M0 will compare the inventory against an authorized reference catalog and
add missing capabilities. Most authoring interactions below still need runtime
verification beyond the narrow S00 checks in the
[baseline report](baseline.md). Those checks establish syntax/render/reopen
smoke evidence for 26 expressions and basic workbench input/history/keyboard
behavior. [S01](editor-actions.md) adds shared action/history checks. These
increments do not complete the feature rows below.

Priorities and execution order are defined in
[implementation order](implementation-order.md). **First delivery** identifies
the earliest increment of a capability. A row may span later tiers, and its
remaining variants and interaction checks remain required. It does not indicate
that the whole capability is finished in the named slice.

## Evidence levels

- **Source**: a relevant model operation, notation definition, or public
  interface was located. This does not establish a finished visual workflow.
- **Audit**: exact representation, interaction, or coverage needs investigation.
- **Build**: downstream interface/workflow is planned; no completion is claimed.

For implementation, track insertion, modification, selection/navigation,
undo/redo, clipboard, reopen, and rendering separately. A passing renderer test
must not automatically mark any of those interaction dimensions complete.

## Required capabilities

| ID | Capability | Baseline evidence | Planned editor work | Milestone | First delivery |
| --- | --- | --- | --- | --- | --- |
| F01 | Stacked, inline, and barless fractions | Source: fraction definitions/atoms | Palette; convert selected fraction; retain numerator/denominator | M1–M2 | P0 / S02 |
| F02 | Fraction bar thickness and generalized fractions | Source: generalized fraction support | Contextual controls; audit supported units and limits | M2 | P1 / S12 |
| F03 | Square roots and indexed radicals | Source: radical definitions/atoms | Editable degree/body slots; variant changes | M1–M2 | P0 / S02 |
| F04 | Subscripts, superscripts, and combined scripts | Source: Atom branches and navigation | Selection-aware controls; add/remove/transform slots | M1–M2 | P0 / S02 |
| F05 | Prescripts, tensors, nested and multi-position scripts | Audit | Confirm model coverage; implement missing constructions/actions | M2 | P2 / S16 |
| F06 | Sums, products, unions, and other large operators | Source: operator definitions | Searchable palette and editable bounds | M1–M2 | P0 / S02 |
| F07 | Single, double, triple, and contour integrals | Source: operator definitions | Visual variants; retain integrand and bounds | M1–M2 | P0 / S02 |
| F08 | Directed contour, surface, and volume integrals | Source: symbol/operator definitions; exact variants need audit | Variant chooser and reference comparisons | M2 | P1 / S09 |
| F09 | Side, above/below, and automatic limit placement | Source: Atom limit-placement properties | Contextual property changes on existing operators | M2 | P0 / S04 |
| F10 | Named functions and custom operators | Source: operator-name definitions | Searchable functions; editable custom name and placement | M1–M2 | P0 / S02 |
| F11 | Paired, nested, asymmetric, and middle delimiters | Source: delimiter definitions/atoms | Independent delimiter controls; preserve enclosed content | M2 | P0 / S02 |
| F12 | Automatic and explicit delimiter sizing | Source: sizing/delimiter machinery; audit exact variants | Contextual size controls | M2, M4 | P1 / S12 |
| F13 | Hats, bars, vectors, dots, and other accents | Source: accent definitions | Accent palette; replace/remove without deleting body | M1–M2 | P1 / S09 |
| F14 | Extensible arrows with labels | Source: extensible notation definitions; audit variants | Upper/lower label slots and direction controls | M2 | P1 / S09 |
| F15 | Under/over braces, annotations, and stacked expressions | Source: notation definitions; audit interaction coverage | Editable annotation slots and variant controls | M2 | P1 / S09 |
| F16 | Boxes, cancellation, and enclosures | Source: enclosure definitions | Property controls; serialization and input-validation checks | M2, M4 | P1 / S09 |
| F17 | Symbol categories, variants, and search | Source: symbol definitions | Search by name/symbol; categorized previews | M1 | P0 / S02 |
| F18 | Insert matrix with chosen dimensions | Source: matrix model and menu machinery | Dimension picker; predictable initial cell/selection | M1, M3 | P0 / S05 |
| F19 | Insert/delete matrix rows and columns | Source: public commands | Contextual controls; destructive-change behavior; undo | M3 | P0 / S05 |
| F20 | Change matrix delimiters/environment | Source: environment command | Retain cells and selection while changing style | M3 | P0 / S05 |
| F21 | Per-column alignment and row/column spacing | Source: array model/definitions; audit property-edit commands | Controls for current selection and whole matrix | M3 | P0 / S05 |
| F22 | Matrix separator rules and partitioned matrices | Audit: exact model/renderer coverage | Add missing separator operations and property controls | M3 | P1 / S10 |
| F23 | Cell, row, column, and rectangular selection/paste | Audit: available primitives need interaction checks | Selection affordances; structured paste; undo | M3 | P1 / S10 |
| F24 | Cases and piecewise definitions | Source: tabular environments | Case templates and row/condition editing | M3 | P0 / S07 |
| F25 | Aligned equations and multirow expressions | Source: tabular environments | Alignment controls; newline editing; preserve row separators | M3 | P0 / S07 |
| F26 | Nested structures in matrix/case/alignment cells | Source: structured model; runtime audit needed | Reliable navigation, insertion, and deletion | M3 | P0 / S05 |
| F27 | Upright, italic, bold, and math alphabets | Source: style interface and variants | Selection-aware controls and mixed-style indicators | M4 | P0 / S06 |
| F28 | Text within equations and math/text transitions | Source: math/text modes | Visible mode controls; sensible typing behavior | M4 | P0 / S06 |
| F29 | Sizes, inline/display style, and inherited formatting | Source: style/mode machinery | Defaults, contextual overrides, and style reset | M4 | P0 / S06 |
| F30 | Available fonts and uncommon glyph coverage | Audit | Font/symbol audit; expose working choices only | M4 | P2 / S18 |
| F31 | Foreground/background styling | Source: style interface | Selection-aware color controls; undo/reopen checks | M4 | P1 / S13 |
| F32 | Explicit spacing and operator spacing | Source: spacing definitions and layout machinery | Visual spacing controls and clear reset behavior | M4 | P1 / S13 |
| F33 | Fine position, baseline, and annotation adjustments | Audit: representability and persistence | Model/layout extensions only where required | M4 | P2 / S17 |
| F34 | Selection wrapping and template transformation | Source: insertion and selection interfaces | Retain content, slot order, focus, and history | M1–M2 | P0 / S02 |
| F35 | Keyboard navigation, deletion boundaries, and placeholders | Runtime: S01 nested fraction/root placeholder and deletion checks | Extend regressions across all construction families | M1–M6 | P0 / S01 |
| F36 | Contextual properties for an existing structure | Audit: read/write coverage varies | Panel follows selection; typed model commands for missing actions | M1–M4 | P0 / S03 |
| F37 | Undo/redo of every logical visual action | Runtime: S01 transactions, rollback, redo branches and selection restoration | Apply shared undo unit to each later visual action | M1–M6 | P0 / S01 |
| F38 | Copy/paste and save/reopen of complex equations | Runtime: S01 selected/whole-equation clipboard transport and multirow reopen | External formats, file saving and full property coverage | M5–M6 | P0 / S01 |
| F39 | Search, favorites, recent templates, and snippets | Build | Catalog filtering and local reusable snippets | M1, M5 | P0 / S02 |
| F40 | Custom visual templates with editable slots | Source: macros/template primitives; authoring workflow needs build | Create, preview, name, reuse, and revise templates | M5 | P2 / S18 |
| F41 | Local equation library with previews | Build | Save/rename/search/open using existing representation | M5 | P2 / S18 |
| F42 | Keyboard access, focus, and accessibility | Runtime: S01 pointer/keyboard action focus and stale clipboard focus checks | Accessibility audit and complete authoring workflows | M1–M6 | P0 / S01 |
| F43 | Chinese IME and input-method transitions | Audit | Test available platforms; preserve composition and focus | M6 | P0 / S08 |
| F44 | Long/nested expression performance and zoom | Source: renderer; performance/zoom behavior needs audit | Measure baseline; set budgets; check caret hit testing | M6 | P0 / S08 |

## Source map for the audit

- [Public commands](../src/public/commands.ts): matrix operations, environments,
  style and history actions.
- [Mathfield interface](../src/public/mathfield-element.ts): selection,
  insertion, element information, input/history events, and styles.
- [Core types](../src/public/core-types.ts): styles and insertion/output options.
- [Atom model](../src/core/atom-class.ts): branches, limit placement, and layout
  relationship.
- [Array editing](../src/editor-model/array.ts) and
  [array atom](../src/atoms/array.ts): matrix transformations and layout.
- [Notation definitions](../src/latex-commands): fraction, script, radical,
  delimiter, operator, accent, enclosure, environment, and symbol definitions.
- [Interaction tests](../test/playwright-tests),
  [serialization tests](../test/latex.test.ts),
  [rendering tests](../test/markup.test.ts), and
  [security tests](../test/security.test.ts): starting points for evidence.

## Completion record to introduce in M0

For each case, record its feature ID, construction/variation, initial expression,
visual actions, expected structure/properties, selection/history expectations,
and checks for clipboard and reopen. Store the baseline commit and runtime with
the results. Use explicit `pass`, `fail`, `not tested`, or `not applicable` for
each dimension, with an explanation for `not applicable`.

No aggregate coverage percentage is available yet. No complete feature row is
marked finished. See the baseline report for measured smoke checks and known
`prescript`/horizontal-matrix-rule gaps.

## Deferred scope

MathML-native storage, macOS-specific packaging, LibreOffice/ODT integration,
Word/OLE integration, and AxMath binary compatibility are not priorities or
acceptance gates for this editor plan. Obsidian embedding can follow once the
shared visual authoring workflow is useful.
