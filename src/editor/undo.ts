import type { ModelState } from 'editor-model/types';
import type { _Model } from '../editor-model/model-private';

import type { Selection } from '../public/core-types';

export class UndoManager {
  // Maximum number of undo/redo states
  static readonly maximumDepth = 1000;

  private model: Pick<_Model, 'getState' | 'setState'>;

  private transactionDepth = 0;

  private recording = false;

  // Stack of undo/redo states.
  // The state pointed at by `index` represent the current state of
  // the model.
  // The one at `index - 1` is the last snapshot to be used for undo.
  private stack: ModelState[];

  // The current record in the undo/redo stack
  private index: number;

  // The last operation recorded. If the next operation is of the same
  // category (has the same "op" value), it gets coalesced with the previous
  // one.
  lastOp: string;

  constructor(model: Pick<_Model, 'getState' | 'setState'>) {
    this.model = model;
    this.reset();
  }

  reset(): void {
    this.stack = [];
    this.index = -1;
    this.lastOp = '';
  }

  startRecording(): void {
    this.recording = true;
  }

  stopRecording(): void {
    this.recording = false;
  }

  canUndo(): boolean {
    return this.index - 1 >= 0;
  }

  canRedo(): boolean {
    return this.stack.length - 1 > this.index;
  }

  /** Call this to stop coalescing future ops, for example when the selection
   * changes
   */
  stopCoalescing(selection?: Selection): void {
    if (this.transactionDepth) return;
    if (selection && this.index >= 0)
      this.stack[this.index].selection = selection;
    this.lastOp = '';
  }

  undo(): boolean {
    if (this.transactionDepth)
      throw new Error('Cannot undo inside an edit transaction.');
    if (!this.canUndo()) return false;

    const state = this.stack[this.index - 1];

    this.index -= 1;
    if (
      !this.model.setState(state, { silenceNotifications: false, type: 'undo' })
    ) {
      this.index += 1;
      return false;
    }
    this.lastOp = '';

    return true;
  }

  redo(): boolean {
    if (this.transactionDepth)
      throw new Error('Cannot redo inside an edit transaction.');
    if (!this.canRedo()) return false;

    const state = this.stack[this.index + 1];
    this.index += 1;
    if (
      !this.model.setState(state, { silenceNotifications: false, type: 'redo' })
    ) {
      this.index -= 1;
      return false;
    }
    this.lastOp = '';

    return true;
  }

  pop(): void {
    if (!this.canUndo()) return;
    this.stack.splice(this.index, this.stack.length - this.index);
    this.index -= 1;
  }

  /** Seed empty history before a native edit without adding a duplicate step. */
  ensureSnapshot(): void {
    if (this.index < 0) this.snapshot();
  }

  /**
   * Push a snapshot of the content and selection of the mathfield onto the
   * undo stack so that it can potentially be reverted to later.
   *
   * **Return** `true` if the undo state changed
   */
  snapshot(op?: string): boolean {
    if (!this.recording || this.transactionDepth) return false;

    if (op && op === this.lastOp) this.pop();

    // Drop any entries that are part of the redo stack
    this.stack.splice(this.index + 1, this.stack.length - this.index - 1);

    // Add a new entry
    this.stack.push(this.model.getState());

    this.index += 1;

    // If we've reached the maximum number of undo operations, forget the
    // oldest one.
    if (this.stack.length > UndoManager.maximumDepth) {
      this.stack.shift();
      this.index -= 1;
    }

    this.lastOp = op ?? '';

    return true;
  }

  /** Record synchronous model changes as one undo unit, including selection. */
  transact(edit: () => void): boolean {
    const before = this.model.getState();
    const contentKey = (state: ModelState) =>
      JSON.stringify([state.content, state.mode]);
    if (this.transactionDepth) {
      edit();
      return contentKey(before) !== contentKey(this.model.getState());
    }

    const savedStack = this.stack.slice();
    const savedIndex = this.index;
    const savedOp = this.lastOp;
    const wasRecording = this.recording;
    this.transactionDepth++;
    let after: ModelState;
    try {
      edit();
      after = this.model.getState();
    } catch (error) {
      this.model.setState(before, { silenceNotifications: true });
      throw error;
    } finally {
      this.transactionDepth--;
      this.stack = savedStack;
      this.index = savedIndex;
      this.lastOp = savedOp;
      this.recording = wasRecording;
    }

    if (contentKey(before) === contentKey(after)) {
      // Movement creates no undo unit, but typing after it must start a new
      // one, just as it does after ordinary keyboard navigation.
      if (JSON.stringify(before.selection) !== JSON.stringify(after.selection))
        this.stopCoalescing(after.selection);
      return false;
    }
    if (!wasRecording) return true;

    // Synchronize the current entry with the actual pre-edit selection. The
    // edit may contain commands that snapshot before or after their mutation;
    // those internal snapshots are suppressed above.
    if (this.index < 0) {
      this.stack.push(before);
      this.index = 0;
    } else this.stack[this.index] = before;
    this.stack.splice(this.index + 1);
    this.stack.push(after);
    this.index++;
    if (this.stack.length > UndoManager.maximumDepth) {
      this.stack.shift();
      this.index--;
    }
    this.lastOp = '';
    return true;
  }
}
