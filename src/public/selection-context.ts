import type { Range, Selection } from './core-types';

/** A selectable content slot of a structure. Ranges use mathfield offsets. */
export type StructureSlot = { range: Range } & (
  | {
      role:
        | 'numerator'
        | 'denominator'
        | 'radicand'
        | 'index'
        | 'body'
        | 'base'
        | 'subscript'
        | 'superscript'
        | 'lower-limit'
        | 'upper-limit';
    }
  | {
      role: 'cell';
      /** Zero-based cell coordinates. */
      row: number;
      column: number;
    }
);

/** Detached structural information. Offsets are valid for the current value only. */
export type StructureContext = {
  range: Range;
  slots: StructureSlot[];
} & (
  | {
      kind: 'fraction';
      properties: { layout: 'auto' | 'display' | 'inline'; bar: boolean };
    }
  | { kind: 'root'; properties: { indexed: boolean } }
  | {
      kind: 'scripts';
      properties: { subscript: boolean; superscript: boolean };
    }
  | {
      kind: 'delimiters';
      properties: { left: string; right: string; automaticRight: boolean };
    }
  | {
      kind: 'operator';
      properties: {
        command: string;
        placement: 'auto' | 'above-below' | 'side';
        lowerLimit: boolean;
        upperLimit: boolean;
      };
    }
  | {
      kind: 'array';
      properties: { environment: string; rows: number; columns: number };
    }
);

/**
 * Read-only inspection of the current selection. Structures run from inner to
 * outer. An unsupported selection can still have inspectable enclosing
 * structures; choosing one must be an explicit user action. No model objects
 * or live ranges are exposed.
 */
export type SelectionContext = {
  status:
    | 'unavailable'
    | 'empty'
    | 'none'
    | 'ambiguous'
    | 'unsupported'
    | 'supported';
  selection: Selection;
  structures: StructureContext[];
};
