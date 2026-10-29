import '../src/public/mathlive-ssr';
import { Atom } from '../src/core/atom-class';
import { parseLatex } from '../src/core/parser';
import { readSelectionContext } from '../src/editor-mathfield/selection-context';
import { _MathEnvironment } from '../src/core/math-environment';
import type { Selection } from '../src/public/core-types';

function fixture(value: string) {
  const root = new Atom({ type: 'root', body: parseLatex(value) });
  const atoms = root.children;
  const index = (value: string) =>
    atoms.findIndex((atom) => atom.value === value);
  const read = (position: number | Selection) =>
    readSelectionContext(
      root,
      typeof position === 'number'
        ? { ranges: [[position, position]] }
        : position
    );
  return { root, atoms, index, read };
}

test('unavailable, empty and plain expressions have explicit states', () => {
  expect(readSelectionContext(undefined, { ranges: [[0, 0]] }).status).toBe(
    'unavailable'
  );
  expect(fixture('').read(0).status).toBe('empty');
  const plain = fixture('x+y');
  expect(plain.read(plain.index('x'))).toMatchObject({
    status: 'none',
    structures: [],
  });
  expect(plain.read(-1).status).toBe('unavailable');
});

test('a caret inside a root identifies it before the enclosing fraction', () => {
  const { read, index } = fixture('\\frac{\\sqrt{x}+y}{z}');
  const context = read(index('x'));
  expect(context.status).toBe('supported');
  expect(context.structures.map((item) => item.kind)).toEqual([
    'root',
    'fraction',
  ]);
  expect(context.structures[0]).toMatchObject({
    properties: { indexed: false },
    slots: [{ role: 'radicand', range: [index('x') - 1, index('x')] }],
  });
});

test('a caret after a structure belongs to its actual parent, not its left neighbor', () => {
  const { read, atoms } = fixture('\\frac{\\sqrt{x}+y}{z}');
  expect(
    read(atoms.findIndex((atom) => atom.type === 'surd')).structures.map(
      (item) => item.kind
    )
  ).toEqual(['fraction']);
  expect(
    read(atoms.findIndex((atom) => atom.type === 'genfrac')).structures
  ).toEqual([]);
  expect(read(0).structures).toEqual([]);
});

test('whole-structure and backward selections identify one target and retain direction', () => {
  const { read, atoms, index } = fixture('\\frac{\\sqrt{x}+y}{z}');
  const rootOffset = atoms.findIndex((atom) => atom.type === 'surd');
  const selection: Selection = {
    ranges: [[index('x') - 2, rootOffset]],
    direction: 'backward',
  };
  expect(read(selection)).toMatchObject({
    status: 'supported',
    selection,
    structures: [{ kind: 'root' }, { kind: 'fraction' }],
  });
  const whole = read({ ranges: [[0, atoms.length - 1]] });
  expect(whole.structures.map((item) => item.kind)).toEqual(['fraction']);
});

test('mixed structures, crossed slots and multi-range selections are ambiguous', () => {
  const mixed = fixture('\\frac{\\sqrt{x}+\\sqrt{y}}{z}');
  const roots = mixed.atoms
    .map((atom, i) => (atom.type === 'surd' ? i : -1))
    .filter((i) => i >= 0);
  expect(mixed.read({ ranges: [[1, roots[1]]] }).status).toBe('ambiguous');
  expect(
    mixed.read({ ranges: [[mixed.index('x') - 1, mixed.index('z')]] }).status
  ).toBe('ambiguous');
  expect(
    mixed.read({
      ranges: [
        [0, 1],
        [3, 4],
      ],
    })
  ).toMatchObject({ status: 'ambiguous', structures: [] });
});

test('empty and indexed roots expose real branch ranges', () => {
  const empty = fixture('\\sqrt{}');
  expect(empty.read(1).structures[0]).toMatchObject({
    kind: 'root',
    properties: { indexed: false },
    slots: [{ role: 'radicand', range: [1, 1] }],
  });
  const indexed = fixture('\\sqrt[n]{x}');
  expect(indexed.read(indexed.index('x')).structures[0]).toMatchObject({
    properties: { indexed: true },
    slots: [
      { role: 'index', range: [indexed.index('n') - 1, indexed.index('n')] },
      { role: 'radicand' },
    ],
  });
});

test('scripts include their base and remain an enclosing context of a compound base', () => {
  const simple = fixture('x_i^n');
  expect(simple.read(simple.index('i')).structures[0]).toMatchObject({
    kind: 'scripts',
    range: [0, simple.atoms.length - 1],
    properties: { subscript: true, superscript: true },
    slots: [
      { role: 'base', range: [0, 1] },
      { role: 'subscript' },
      { role: 'superscript' },
    ],
  });
  expect(simple.read(simple.index('x')).structures[0].kind).toBe('scripts');
  const compound = fixture('\\sqrt{x}^n');
  expect(
    compound.read(compound.index('x')).structures.map((item) => item.kind)
  ).toEqual(['root', 'scripts']);
});

test.each([
  ['\\dfrac{x}{y}', 'fraction', { layout: 'display', bar: true }],
  ['\\tfrac{x}{y}', 'fraction', { layout: 'inline', bar: true }],
  ['\\binom{x}{y}', 'fraction', { bar: false }],
  [
    '\\left[x\\right]',
    'delimiters',
    { left: '[', right: ']', automaticRight: false },
  ],
  [
    '\\int\\nolimits_x^y',
    'operator',
    { command: '\\int', placement: 'side', lowerLimit: true, upperLimit: true },
  ],
  [
    '\\sum\\limits_x^y',
    'operator',
    { command: '\\sum', placement: 'above-below' },
  ],
])('native properties: %s', (value, kind, properties) => {
  const { read, index } = fixture(value as string);
  expect(read(index('x')).structures[0]).toMatchObject({ kind, properties });
});

test('arrays report dimensions and the current cell without exposing every cell', () => {
  const { read, index, atoms } = fixture(
    '\\begin{bmatrix}a&b\\\\c&d\\end{bmatrix}'
  );
  expect(read(index('d')).structures[0]).toMatchObject({
    kind: 'array',
    properties: { environment: 'bmatrix', rows: 2, columns: 2 },
    slots: [
      { role: 'cell', row: 1, column: 1, range: [index('d') - 1, index('d')] },
    ],
  });
  expect(read({ ranges: [[0, atoms.length - 1]] }).structures[0].slots).toEqual(
    []
  );
  expect(read({ ranges: [[index('a'), index('b')]] }).status).toBe('ambiguous');
});

test('unsupported inner structures retain only explicit enclosing choices', () => {
  const { read, index } = fixture('\\frac{\\boxed{x}}{y}');
  const context = read(index('x'));
  expect(context.status).toBe('unsupported');
  expect(context.structures.map((item) => item.kind)).toEqual(['fraction']);
});

test('a whole unsupported structure with supported children is not a mixed selection', () => {
  const { read, atoms } = fixture('\\frac{\\boxed{\\sqrt{x}}}{y}');
  const end = atoms.findIndex((atom) => atom.type === 'box');
  const start = atoms.indexOf(atoms[end].firstChild) - 1;
  const context = read({ ranges: [[start, end]] });
  expect(context.status).toBe('unsupported');
  expect(context.structures.map((item) => item.kind)).toEqual(['fraction']);
});

test('inspection returns detached data and never changes the tree or selection', () => {
  const { root, index, read } = fixture('\\frac{x}{y}');
  const before = JSON.stringify(root.toJson());
  const selection: Selection = {
    ranges: [[index('x'), index('x')]],
    direction: 'backward',
  };
  const context = read(selection);
  context.selection.ranges[0][0] = 999;
  context.structures[0].range[0] = 999;
  context.structures[0].slots[0].range[0] = 999;
  expect(selection.ranges[0][0]).toBe(index('x'));
  expect(JSON.stringify(root.toJson())).toBe(before);
  expect(read(selection).structures[0].range[0]).toBe(0);
});

test('branch ranges follow the configured native fraction navigation order', () => {
  const previous = _MathEnvironment.fractionNavigationOrder;
  try {
    _MathEnvironment.fractionNavigationOrder = 'denominator-numerator';
    const { read, index } = fixture('\\frac{x}{y}');
    expect(read(index('x')).structures[0].slots).toEqual([
      { role: 'numerator', range: [index('x') - 1, index('x')] },
      { role: 'denominator', range: [index('y') - 1, index('y')] },
    ]);
  } finally {
    _MathEnvironment.fractionNavigationOrder = previous;
  }
});
