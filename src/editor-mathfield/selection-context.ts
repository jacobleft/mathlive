import { Atom } from '../core/atom-class';
import { GenfracAtom } from '../atoms/genfrac';
import { LeftRightAtom } from '../atoms/leftright';
import { ArrayAtom } from '../atoms/array';
import type { BranchName } from '../core/types';
import type { Range, Selection } from '../public/core-types';
import type {
  SelectionContext,
  StructureContext,
  StructureSlot,
} from '../public/selection-context';

/** Inspect the native tree; this never reparses or changes the equation. */
export function readSelectionContext(
  root: Atom | undefined,
  selection: Readonly<Selection>
): SelectionContext {
  const result: SelectionContext = {
    status: 'unavailable',
    selection: {
      ranges: selection.ranges.map(([a, b]) => [a, b]),
      direction: selection.direction,
    },
    structures: [],
  };
  if (!root) return result;
  const atoms = root.children;
  if (atoms.length <= 1) return { ...result, status: 'empty' };
  if (selection.ranges.length !== 1) return { ...result, status: 'ambiguous' };
  const [start, end] = selection.ranges[0];
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    end < start ||
    end >= atoms.length
  )
    return result;
  const offsets = new Map(atoms.map((atom, index) => [atom, index]));
  const offset = (atom: Atom) => offsets.get(atom) ?? -1;
  const fullRange = (atom: Atom): Range => [
    atom.hasChildren ? offset(atom.firstChild) - 1 : offset(atom) - 1,
    offset(atom),
  ];
  const contains = ([a, b]: Range, [c, d]: Range) => a <= c && d <= b;
  const equal = ([a, b]: Range, [c, d]: Range) => a === c && b === d;
  const selected: Range = [start, end];
  const collapsed = start === end;

  function slot(
    atom: Atom,
    branch: BranchName,
    role: Exclude<StructureSlot['role'], 'cell'>
  ): StructureSlot[] {
    const children = atom.branch(branch);
    if (!children?.length) return [];
    return [
      {
        role,
        range: [offset(children[0]), offset(children[children.length - 1])],
      },
    ];
  }

  function describe(atom: Atom): StructureContext | undefined {
    const range = fullRange(atom);
    if (atom instanceof GenfracAtom) {
      return {
        kind: 'fraction',
        range,
        properties: {
          layout:
            atom.mathstyleName === 'displaystyle'
              ? 'display'
              : atom.mathstyleName === 'textstyle'
                ? 'inline'
                : 'auto',
          bar: atom.hasBarLine,
        },
        slots: [
          ...slot(atom, 'above', 'numerator'),
          ...slot(atom, 'below', 'denominator'),
        ],
      };
    }
    if (atom.type === 'surd') {
      return {
        kind: 'root',
        range,
        properties: { indexed: !atom.hasEmptyBranch('above') },
        slots: [
          ...slot(atom, 'above', 'index'),
          ...slot(atom, 'body', 'radicand'),
        ],
      };
    }
    if (atom instanceof LeftRightAtom) {
      return {
        kind: 'delimiters',
        range,
        properties: {
          left: atom.leftDelim ?? '.',
          right: atom.matchingRightDelim(),
          automaticRight: !atom.rightDelim || atom.rightDelim === '?',
        },
        slots: slot(atom, 'body', 'body'),
      };
    }
    if (atom instanceof ArrayAtom) {
      const slots: StructureSlot[] = [];
      for (let row = 0; row < atom.rowCount; row++) {
        for (let column = 0; column < atom.colCount; column++) {
          const cell = atom.branch([row, column]);
          if (!cell?.length) continue;
          const cellRange: Range = [
            offset(cell[0]),
            offset(cell[cell.length - 1]),
          ];
          if (contains(cellRange, selected))
            slots.push({ role: 'cell', row, column, range: cellRange });
        }
      }
      return {
        kind: 'array',
        range,
        slots,
        properties: {
          environment: atom.environmentName,
          rows: atom.rowCount,
          columns: atom.colCount,
        },
      };
    }
    if (
      atom.type === 'operator' ||
      atom.type === 'extensible-symbol' ||
      atom.type === 'mop'
    ) {
      return {
        kind: 'operator',
        range,
        properties: {
          command: atom.command,
          placement:
            atom.subsupPlacement === 'over-under'
              ? 'above-below'
              : atom.subsupPlacement === 'adjacent'
                ? 'side'
                : 'auto',
          lowerLimit: !!atom.subscript,
          upperLimit: !!atom.superscript,
        },
        slots: [
          ...slot(atom, 'subscript', 'lower-limit'),
          ...slot(atom, 'superscript', 'upper-limit'),
        ],
      };
    }
    if (atom.type === 'subsup' || atom.subscript || atom.superscript) {
      const slots = [
        ...slot(atom, 'subscript', 'subscript'),
        ...slot(atom, 'superscript', 'superscript'),
      ];
      if (atom.type === 'subsup' && atom.leftSibling?.type !== 'first') {
        const base = fullRange(atom.leftSibling);
        range[0] = base[0];
        slots.unshift({ role: 'base', range: base });
      }
      return {
        kind: 'scripts',
        range,
        slots,
        properties: {
          subscript: !!atom.subscript,
          superscript: !!atom.superscript,
        },
      };
    }
    return undefined;
  }

  const descriptions = new Map<Atom, StructureContext>();
  for (const atom of atoms) {
    const description = describe(atom);
    if (description) descriptions.set(atom, description);
  }
  const bySize = (a: StructureContext, b: StructureContext) =>
    a.range[1] - a.range[0] - (b.range[1] - b.range[0]);
  if (collapsed) {
    const structures = new Set<StructureContext>();
    const current = atoms[start];
    let unsupported = false;
    for (
      let atom: Atom | undefined = current;
      atom && atom !== root;
      atom = atom.parent
    ) {
      if (atom !== current) {
        if (descriptions.has(atom)) structures.add(descriptions.get(atom)!);
        else if (
          structures.size === 0 &&
          atom.hasChildren &&
          atom.type !== 'group'
        )
          unsupported = true;
      }
      if (
        atom.rightSibling?.type === 'subsup' &&
        descriptions.has(atom.rightSibling)
      )
        structures.add(descriptions.get(atom.rightSibling)!);
    }
    result.structures = [...structures].sort(bySize);
    if (unsupported) return { ...result, status: 'unsupported' };
  } else {
    const all = [...descriptions.values()];
    const exact = all.some((item) => equal(item.range, selected));
    const final = atoms[end];
    const unsupportedWhole =
      !exact && final.hasChildren && equal(fullRange(final), selected);
    // A partial selection across multiple structures must not target a nearby
    // containing structure merely because its flat offset range encloses it.
    if (
      !exact &&
      !unsupportedWhole &&
      all.some((item) => contains(selected, item.range))
    )
      return { ...result, status: 'ambiguous' };
    result.structures = all
      .filter(
        (item) =>
          contains(item.range, selected) &&
          (equal(item.range, selected) ||
            item.slots.some((part) => contains(part.range, selected)))
      )
      .sort(bySize);
    if (unsupportedWhole) return { ...result, status: 'unsupported' };
    if (
      !exact &&
      result.structures.length === 0 &&
      all.some((item) => contains(item.range, selected))
    )
      return { ...result, status: 'ambiguous' };
  }
  result.status = result.structures.length ? 'supported' : 'none';
  return result;
}
