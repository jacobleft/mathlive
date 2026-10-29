# Feature priorities and implementation order

Status: planned. Updated 2026-10-29.

This document is the execution order for the
[development plan](development-plan.md). Its slices cross feature families so
that each increment produces usable authoring behavior. The M0–M6 milestones
describe the eventual completion of each workstream; they are not a requirement
to finish an entire family before beginning another.

## Priority rules

- **P0 — First usable editor:** common equations, visual revision of existing
  structures, basic matrices/alignment/typography, and dependable editing.
- **P1 — Broad authoring beta:** richer notation, complete common property
  controls, advanced matrices/alignment, and efficient discovery/reuse.
- **P2 — Advanced completeness:** uncommon constructions, precise positioning,
  advanced font requirements, custom templates, and the local formula library.

All three tiers remain in scope. P2 means later implementation, not an optional
exclusion from the eventual full-featured target. Neither P0 nor P1 establishes
AxMath parity. Prioritize frequency, dependency value, content preservation, and
the effort needed to complete an actual workflow.

Audit all families in S00, including early representability checks for tensors,
separator rules, font choices, and fine positioning. Discover engine risks early
without building every advanced interface first. A newly discovered structural
dependency may move its prerequisite earlier; record the reason.

Dependable editing is a prerequisite and a continuous acceptance requirement.
Do not postpone undo, focus, selection, or content preservation to final polish.

## Order within each feature family

Numbers in each row are the implementation order within that family. See the
slice queue below for the global sequence and dependencies.

| Family | P0: implement first | P1: extend next | P2: complete later |
| --- | --- | --- | --- |
| Dependable editing | 1. Action/history transaction; restore focus and selection. 2. Placeholder/Tab/arrow navigation and safe deletion. 3. Basic clipboard and save/reopen checks. 4. Input composition and keyboard-access smoke checks. | 5. Nested/multirow/mixed-selection regressions. 6. Stress, accessibility, and performance qualification. | 7. Apply the same checks to every advanced construction; close the remaining catalog gaps. |
| Templates | 1. Fractions, square/indexed roots, scripts, brackets, common symbols and functions. 2. Sums/products and single integrals with editable bounds. 3. Basic matrices, cases, and aligned rows. | 4. Accents, labeled arrows, under/over annotations, boxes/cancellation. 5. Multiple, contour, directed, surface, and volume integrals; less-common delimiters/operators. 6. Favorites, recents, and reusable snippets. | 7. Prescripts/tensors and remaining audited constructions. 8. User-created templates and the equation library. |
| Contextual properties | 1. Identify the selected structure/ancestor and preserve the selection while using controls. 2. Fraction/root/script/bracket properties. 3. Operator bounds/limit placement and basic matrix properties. 4. Basic style controls with clear availability. | 5. Mixed/inherited states and the full common property set. 6. Rules, spacing, delimiter sizing, annotations, and advanced operator controls. | 7. Fine positioning and audited font-specific properties. |
| Structure transformations | 1. Wrap a selection in a fraction/root/delimiter. 2. Change fraction/root/script variants without losing children. 3. Replace paired delimiters and change limits/operators. | 4. Add/replace/remove accents, arrows, annotations, and enclosures. 5. Complete conversions among supported common variants. | 6. Tensor/prescript transformations and remaining uncommon conversions. |
| Matrices | 1. Size picker, cell navigation, and nested cell content. 2. Insert/delete rows/columns with undo and content preservation. 3. Delimiters and column alignment. | 4. Row/column spacing and partition/separator rules. 5. Row/column/rectangular selection and paste. 6. Irregular paste and resize edge cases. | 7. Remaining unusual matrix variants identified by the reference audit. |
| Alignment | 1. Add/delete equation rows and align a basic equation array. 2. Cases with expression/condition columns. 3. Preserve row separators during clipboard/reopen. | 4. Multiple alignment points, per-column alignment, and nested multirow layouts. 5. Row gaps and supported intercolumn layout controls. | 6. Remaining specialized layouts and fine alignment adjustments. |
| Typography | 1. Upright/italic/bold and math/text mode. 2. Basic size and inline/display style. | 3. Math alphabets and mixed/inherited styles. 4. Color/background and explicit/operator spacing. 5. Supported delimiter/annotation sizing. | 6. Baseline/nudging and precise placement. 7. Audited font/glyph choices and advanced defaults. |

### Scope of the first authoring controls

Property controls operate on an existing structure, not only on the next
insertion. Initially expose a small, useful set:

- Fraction: common layout variant and bar visibility where represented.
- Root: square versus indexed form, preserving radicand and an existing index.
- Scripts: add/edit subscript and superscript; preserve both when switching form.
- Delimiters: pair/side choice with enclosed content intact.
- Operator: bound slots and automatic/side/above-below limit placement.
- Matrix: dimensions, row/column actions, delimiters, and column alignment.
- Style: upright/italic/bold, math/text mode, and basic size/display style.

The contextual panel can initially show one selected structure. Mixed-selection
property editing is P1, but P0 must safely disable ambiguous actions and must not
apply a property to an arbitrary nearby structure.

## Global implementation queue

Execute in the order shown unless an independent slice is deliberately taken
early after its dependencies pass. The table gives dependency minima, not a
requirement for a large framework or a fully finished preceding workstream.
Every slice includes implementation and its verification; checks do not form a
separate cleanup phase.

| Slice | Priority | Increment to deliver | Feature IDs | Depends on | Acceptance example |
| --- | --- | --- | --- | --- | --- |
| S00 | P0 | Reproducible baseline, reliable test exit status, CI on `development`, minimal canvas, and initial feature/risk fixtures | Foundation; all rows audited | Fork | An intentional failing test fails CI; an editable equation mounts; baseline results identify untested cases. |
| S01 | P0 | Shared actions with focus, selection, undo units, safe deletion/navigation, and basic clipboard/reopen contracts | F35, F37, F38, F42 | S00 | Insert a nested fraction, move through slots, undo/redo, copy, and reopen without losing content or selection intent. |
| S02 | P0 | Common template catalog and category palette: fractions, roots, scripts, brackets, functions, sums/products, single integrals; basic search | F01, F03, F04, F06, F07, F10, F11, F17, F34, F39 | S01 | Wrap a selected expression, fill placeholders, and build a bounded integral through visual controls. |
| S03 | P0 | Selection-aware contextual panel, structure targeting, disabled states, and selection-preserving control interaction | F36 | S02 | Select an inner root, open its controls, and return to the same target without changing the surrounding fraction. |
| S04 | P0 | Common property edits and content-preserving fraction/root/script/delimiter/operator transformations | F01, F03, F04, F09, F11, F34, F36 | S03 | Change an integral's limit placement or a root's form, retaining children and supporting one-step undo. |
| S05 | P0 | Basic matrix/case template insertion, dimensions, nested cell navigation, row/column operations, delimiters, and column alignment | F18, F19, F20, F21, F26 | S03 | Resize and restyle a matrix containing a fraction; retain unaffected cells and undo a destructive row deletion. |
| S06 | P0 | Basic typography: upright/italic/bold, math/text mode, size, and inline/display style | F27, F28, F29 | S03 | Style a selected variable and enter condition text; surrounding content and selection remain intact. |
| S07 | P0 | Basic equation arrays/cases, row insertion/deletion, common alignment, and row-separator preservation | F24, F25, F26, F38 | S05 | Edit a two-row derivation and piecewise expression; copy and reopen them with row structure intact. |
| S08 | P0 | First-usable-editor gate: composition/input smoke checks, keyboard access, common clipboard/reopen cases, nested-expression and zoom/performance baseline | F35, F37, F38, F42, F43, F44 | S02–S07 | Complete a nested expression, a bounded integral, a matrix, and a two-row derivation visually; revise, undo, copy, and reopen each. |
| S09 | P1 | Remaining common template families and transformations: accents, arrows, annotations, enclosures, richer delimiters/operators and integral variants | F07, F08, F10, F11, F13, F14, F15, F16 | S08 | Replace an accent and change a directed integral variant without replacing its body or bounds. |
| S10 | P1 | Advanced matrices: spacing, separator/partition rules, rectangular selection/paste, and irregular input handling | F21, F22, F23, F26 | S08, S05 | Paste a rectangular block into a partitioned matrix and undo it without losing rules or unaffected cells. |
| S11 | P1 | Advanced alignment: multiple alignment points, column alignment, cases/arrays with nested layouts, and row/intercolumn gaps | F21, F24, F25, F26 | S08, S07 | Align a multi-step derivation and change row spacing without flattening nested structures or changing row content. |
| S12 | P1 | Complete common contextual properties: mixed/inherited states, generalized fractions, delimiter sizing, annotations, bounds and variant conversions | F02, F09, F12, F13, F14, F15, F16, F36 | S08, S04, S09 | Change a generalized fraction's properties and distinguish mixed selections from inherited/default values. |
| S13 | P1 | Rich typography: math alphabets, style inheritance/reset, color/background, explicit spacing, and supported annotation/delimiter sizing | F12, F27, F28, F29, F31, F32 | S08, S06 | Apply and reset a style to a nested selection; reopen it with the intended styling and spacing preserved. |
| S14 | P1 | Efficient discovery/reuse: full catalog search, favorites, recent templates, snippets, and authoring shortcuts | F17, F34, F39 | S08, S02 | Find, favorite, reuse, and revise a common template without entering source commands. |
| S15 | P1 | Broad-authoring-beta gate: complete P1 interaction regressions, accessibility checks, and measured performance budgets | F35, F37, F38, F42, F43, F44 | S09–S14 | All P1 cases pass their content/history/clipboard/reopen checks; remaining advanced gaps are listed. |
| S16 | P2 | Prescripts, tensors, multi-position scripts, uncommon operators/constructions, and their transformations | F05; audited additions to F06–F16 | S15 | Revise a tensor's script positions visually while preserving its base, remaining scripts, and history. |
| S17 | P2 | Fine positioning: supported baseline/nudge adjustments, annotation placement, and specialized alignment | F12, F15, F25, F33 | S15, S12, S13 | Adjust placement, reset it, undo it, and reopen it without changing unrelated layout properties. |
| S18 | P2 | Audited font/glyph choices, custom visual templates with editable slots, and the local equation library | F30, F40, F41 | S15, S13, S14 | Create a reusable custom template, save a formula, then reopen and edit it through the same visual actions. |
| S19 | P2 | Full-target qualification against the enumerated reference catalog | All required rows | S16–S18 | Every required case passes; unfinished required gaps block qualification; parity is scoped to the enumerated catalog. |

S05 and S06 can be developed independently after S03. S10/S11/S13/S14 can
proceed independently after their prerequisites. S12 requires the relevant S09
structures, but unrelated property controls need not wait for all S09 families.
S16–S18 can proceed independently after their stated prerequisites.

## Gates applied to every feature increment

Before a feature increment is accepted:

1. It is discoverable and operable visually, with keyboard access to new controls.
2. Creation and modification of an existing structure both work where applicable.
3. Children, unaffected siblings, focus, and selection intent are preserved.
4. One logical action has a predictable undo/redo result.
5. Clipboard and reopen preserve relevant content, style, and row structure.
6. Invalid values and ambiguous selections have explicit, non-destructive
   behavior. Incomplete expressions remain editable.

Exercise each new action across the available configured browser engines. At
each tier gate, run the accumulated suite. Failure in an already delivered
workflow blocks acceptance of the new increment; adding more template icons
does not compensate for a regression.

Tests for capabilities already supplied by upstream may initially establish
their behavior without changing the engine. Extend the model only when a
specific authoring action cannot be implemented reliably through its existing
interface. Do not build every template first and leave structural editing,
history, or nested cell behavior until the end.

## Priority and evidence are separate

The [feature matrix](feature-matrix.md) records the first delivery tier/slice for
each row. Several rows span tiers: a single integral starts in S02, whereas its
multiple/contour variants arrive in S09; basic style arrives in S06, whereas
math alphabets and mixed styles arrive in S13. The within-family table and slice
queue define these increments. First delivery does not mean the whole row is
complete.

No slice has been implemented by this planning update. No runtime test pass or
feature-completion percentage is implied by the priorities.

## Current next action

Start **S00**, then **S01**. The first visible authoring delivery is **S02–S04**:
create common structures, select them, and change them through contextual
controls with content-preserving undo/redo. Advance through **S05–S08** to
include everyday matrix, alignment, and typography workflows before expanding
advanced notation.

MathML storage, macOS-specific packaging, LibreOffice/ODT integration, and
Word/OLE integration remain deferred and do not alter this order.
