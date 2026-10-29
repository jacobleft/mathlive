# S00: editor and verification baseline

Date: 2026-10-29. Upstream: MathLive 0.111.1 at
`8d148b4227ca057fa1aefe89c2149cdcf0591443`.

## Implemented

- A standalone [equation workbench](../examples/authoring/index.html), using the
  locally built MathLive module and fonts. It provides an editable canvas,
  undo/redo controls, and a math-keyboard toggle. No cloud service or external
  equation compiler is needed. Saving, templates, and contextual properties are
  later slices.
- The test runner returns its accumulated failure status after the final
  production rebuild. A successful rebuild can no longer hide failed unit,
  declaration, or browser tests.
- GitHub workflows check pushes to `development` and pull requests targeting it.
- Playwright starts its server directly rather than launching the Bash/npm/
  TypeScript-watch chain. This avoids the observed orphaned watch processes
  preventing local browser-test teardown from completing.
- `check-node-version` is pinned at 4.2.1 in the dependency lockfile. The upstream
  build previously downloaded it through `npx` without a locked version.
- Initial [notation/risk fixtures](../test/authoring/fixtures.json), with unit
  syntax/render checks and browser serialization/reopen smoke checks.

## Local environment and commands

The recorded run used Windows x64, Node.js 26.8.1, npm 11.15.0, and Git for
Windows 2.54.0 with Bash 5.3.9 and Playwright 1.63.0. The GitHub workflows retain
upstream's Node.js 22/Linux configuration;
local Windows results do not establish native macOS or LibreOffice behavior.

```sh
npm ci
npx jest --runInBand
npx tsc --noEmit --baseUrl ./dist/types ./test/public-ts-declarations/main.ts
npx playwright install
npx playwright test --workers=3 --reporter=line
npx playwright test authoring.spec.ts --workers=3 --reporter=line
```

`npm ci` runs the production build through the existing `prepare` script. The
build still emits eight upstream documentation warnings. Generated API
documentation is not a downstream source change.

## Measured results

| Check | Result | What it establishes |
| --- | --- | --- |
| Upstream production build | Passed | The baseline builds in the recorded environment |
| Upstream unit tests | 348 passed; 256 snapshots passed | Existing unit baseline before adding downstream tests |
| Public declaration check | Passed | Published declarations resolve in the consumer fixture |
| Failure-propagation regression before the fix | Five failed, two passed | Failed Jest/TypeScript/Playwright stages and coverage/snapshot variants were incorrectly returning success |
| Failure-propagation regression after the fix | Seven passed | Actual shell runner preserves stage failures and still reports success for a successful pipeline |
| Unit tests with S00 additions | 381 passed; two TODO; 256 snapshots passed | Existing tests, runner regressions, and 26 notation syntax/render smoke cases |
| Existing browser suite, local parallel baseline | 260 passed; four skipped; three failed | Baseline behavior across Chromium, Firefox, and WebKit, including clipboard failures listed below |
| New workbench/browser suite | 87 passed; six skipped | Three workbench interaction checks and 26 notation/reopen checks per browser; two known gaps skipped per browser |
| Focused checks after server-startup change | Nine passed with automatic exit | Input, history, and keyboard toggle across three engines; test-server teardown completes without manual cleanup |
| Isolated Chromium clipboard case | Passed with one worker | The Chromium failure from the parallel baseline did not reproduce in isolation |
| Source types and targeted lint | Passed | Library type check, declaration-consumer check, and lint for the new code; lint project now includes test and example files |

The browser baseline was collected before adding the new browser test file, so
its 267 cases are distinct from the 93 new workbench cases. The initial
browser runs required manual cleanup of task-owned TypeScript watch processes
after tests finished; direct server startup addresses that test-harness issue.
The final focused run verified automatic teardown without that cleanup.

This is smoke evidence, not complete visual authoring coverage. A parser or
serialization pass does not establish that a user can insert, transform,
configure, or navigate every variant through the planned interface. No AxMath
feature-parity percentage is claimed.

## Known notation gaps and remaining audit

The 28 expression fixtures probe the planned construction families. Twenty-six
parse and render without syntax errors. Two have explicit, unimplemented gaps:

| Fixture | Observed gap | Planned follow-up |
| --- | --- | --- |
| `tensor-prescripts` / F05 | `\prescript` is unknown | S16: investigate alternative representations and implement the required visual tensor/prescript operation |
| `partitioned-matrix` / F22 | `\hline` is unknown; vertical separators already have model/renderer support | S10: horizontal rule representation, editing, rendering, and preservation |

These are two specific syntax/construction probes. They do not prove that all
prescript placements or all partitioned matrices are impossible. The fixtures
are marked TODO/skipped rather than counted as successful feature support.

The existing matrix still records all 44 target rows. Controls, transformations,
rectangular selection/paste, custom templates, font freedom, layout fidelity,
performance budgets, and IME behavior remain unqualified except for the narrow
checks described here. Fine positioning has a successful `raisebox` syntax
probe, but no visual positioning control yet.

## Known existing browser failures

In the local three-worker baseline:

- Chromium: `mouse.spec.ts` — context-menu select-all/cut followed by keyboard
  paste failed to restore the expected content.
- WebKit: the same context-menu/clipboard case failed.
- WebKit: `physical-keyboard.spec.ts` — keyboard cut/paste failed.

The tests already skip the two WebKit clipboard cases in CI. This change does
not widen those skips or mark the local failures as passes. The cause of the
Chromium failure did not reproduce in a subsequent isolated one-worker run;
shared clipboard state during a parallel run is a possibility, not a confirmed
diagnosis. Clipboard reliability remains an S01 concern.

## Dependency and test-tool limitations

`npm audit` reported nine development-toolchain advisories: six low, one
moderate, one high, and one critical. The high/critical entries involve
`markdown-it` and `handlebars`. These were present in the upstream lockfile and
were not automatically upgraded in this slice. Reproducibility and passing
tests do not mean the development dependency audit is clean.

The unit toolchain also emits an upstream ts-jest `isolatedModules` deprecation
warning. No browser automation here counts as native macOS qualification.

## Next slice

Proceed to **S01**, using the workbench to establish shared action contracts for
focus/selection, undo units, navigation/deletion, and clipboard/reopen behavior.
Then add the first visual template catalog in **S02**. See
[implementation order](implementation-order.md).
