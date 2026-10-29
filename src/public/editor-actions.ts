import type { MathfieldElement } from './mathfield-element';
import type { InsertOptions, Selection } from './core-types';

export type AuthoringCommand =
  | 'deleteBackward'
  | 'deleteForward'
  | 'moveToNextChar'
  | 'moveToPreviousChar'
  | 'moveUp'
  | 'moveDown'
  | 'moveToNextPlaceholder'
  | 'moveToPreviousPlaceholder';

export type AuthoringAction =
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'copy' }
  | { type: 'cut' }
  | { type: 'paste' }
  | { type: 'command'; command: AuthoringCommand }
  | {
      type: 'insert' | 'replace';
      value: string;
      selectionMode?: InsertOptions['selectionMode'];
    };

type Context = { value: string; selection: Selection; epoch: number };

function cloneSelection(selection: Readonly<Selection>): Selection {
  return {
    ranges: selection.ranges.map(([start, end]) => [start, end]),
    direction: selection.direction,
  };
}

/** Shared action semantics for palettes, toolbars and future contextual controls. */
export class EditorActions extends EventTarget {
  private bookmark: Context;
  private epoch = 0;
  private composing = false;
  private disposed = false;
  private busy = 0;
  private readonly bindings = new Set<() => void>();
  private readonly listeners: [string, EventListener][];
  private readonly outsideFocus = (event: Event) => {
    // The editor's logical focus can lag behind native DOM focus. Observe
    // external focus directly while a clipboard permission/read is pending.
    if (this.busy > 0 && !event.composedPath().includes(this.mathfield))
      this.epoch++;
  };

  constructor(
    readonly mathfield: MathfieldElement,
    private readonly clipboard:
      Pick<Clipboard, 'readText' | 'writeText'> | undefined = mathfield
      .ownerDocument.defaultView?.navigator.clipboard
  ) {
    super();
    this.bookmark = this.context();
    this.listeners = [
      [
        'selection-change',
        () => {
          this.epoch++;
          this.captureSelection();
        },
      ],
      [
        'beforeinput',
        () => {
          this.epoch++;
        },
      ],
      ['input', () => this.captureSelection()],
      [
        'focusout',
        () => {
          this.epoch++;
          this.captureSelection();
        },
      ],
      [
        'compositionstart',
        () => {
          this.composing = true;
          this.epoch++;
          this.notify();
        },
      ],
      [
        'compositionend',
        () => {
          this.composing = false;
          this.captureSelection();
        },
      ],
    ];
    for (const [type, listener] of this.listeners)
      mathfield.addEventListener(type, listener);
    mathfield.ownerDocument.addEventListener(
      'focusin',
      this.outsideFocus,
      true
    );
  }

  get state(): {
    canUndo: boolean;
    canRedo: boolean;
    canEdit: boolean;
    pending: boolean;
  } {
    return {
      canUndo: this.mathfield.canUndo(),
      canRedo: this.mathfield.canRedo(),
      canEdit:
        !this.disposed && !this.composing && this.mathfield.isSelectionEditable,
      pending: this.busy > 0,
    };
  }

  captureSelection(): void {
    if (this.disposed) return;
    this.bookmark = this.context();
    this.notify();
  }

  private context(): Context {
    return {
      value: this.mathfield.value,
      selection: cloneSelection(this.mathfield.selection),
      epoch: this.epoch,
    };
  }

  private notify(): void {
    this.dispatchEvent(new Event('state-change'));
  }

  private restoreTarget(): void {
    // Programmatic loads may not emit input. Never apply a stale offset to a
    // different equation, even when its offsets happen to fit.
    const saved = this.bookmark;
    this.mathfield.focus();
    if (saved.value === this.mathfield.value)
      this.mathfield.selection = cloneSelection(saved.selection);
  }

  private unchanged(context: Context): boolean {
    return (
      !this.disposed &&
      !this.composing &&
      this.mathfield.isConnected &&
      context.epoch === this.epoch &&
      context.value === this.mathfield.value &&
      JSON.stringify(context.selection) ===
        JSON.stringify(this.mathfield.selection)
    );
  }

  serialize(): string {
    return this.mathfield.value;
  }

  async run(action: AuthoringAction): Promise<boolean> {
    if (this.disposed || this.composing || this.mathfield.disabled)
      return false;
    this.epoch++;
    this.restoreTarget();
    const navigation =
      action.type === 'command' && !action.command.startsWith('delete');
    if (
      action.type !== 'copy' &&
      !navigation &&
      !this.mathfield.isSelectionEditable
    )
      return false;

    if (action.type === 'undo' || action.type === 'redo') {
      const available =
        action.type === 'undo'
          ? this.mathfield.canUndo()
          : this.mathfield.canRedo();
      if (!available) return false;
      const before = JSON.stringify([
        this.mathfield.value,
        this.mathfield.mode,
      ]);
      this.mathfield.executeCommand(action.type);
      this.captureSelection();
      return (
        before !== JSON.stringify([this.mathfield.value, this.mathfield.mode])
      );
    }

    if (
      action.type === 'copy' ||
      action.type === 'cut' ||
      action.type === 'paste'
    )
      return this.clipboardAction(action.type);

    let changed = false;
    try {
      if (action.type === 'command' && navigation)
        changed = this.mathfield.executeCommand(action.command);
      else {
        changed = this.mathfield.performUndoableEdit(() => {
          if (action.type === 'command')
            this.mathfield.executeCommand(action.command);
          else if (action.type === 'replace' && action.value.length === 0)
            this.mathfield.value = '';
          else {
            this.mathfield.insert(action.value, {
              format: 'latex',
              mode: 'math',
              insertionMode:
                action.type === 'replace' ? 'replaceAll' : 'replaceSelection',
              selectionMode:
                action.selectionMode ??
                (action.type === 'replace' ? 'after' : 'placeholder'),
            });
          }
        });
      }
      return changed;
    } finally {
      this.captureSelection();
    }
  }

  private async clipboardAction(
    type: 'copy' | 'cut' | 'paste'
  ): Promise<boolean> {
    if (!this.clipboard) {
      throw new Error(
        'Clipboard access is unavailable. Use the system copy/paste shortcut.'
      );
    }
    if (type === 'cut' && this.mathfield.selectionIsCollapsed) return false;
    const context = this.context();
    this.busy++;
    this.notify();
    try {
      if (type === 'copy' || type === 'cut') {
        const value = this.mathfield.selectionIsCollapsed
          ? this.mathfield.value
          : this.mathfield.getValue(context.selection);
        await this.clipboard.writeText(value);
        if (type === 'copy') return false;
      }
      const value = type === 'paste' ? await this.clipboard.readText() : '';
      if (!this.unchanged(context)) {
        throw new Error(
          'The equation or selection changed. The clipboard edit was cancelled.'
        );
      }
      if (!this.mathfield.isSelectionEditable) return false;
      if (type === 'paste' && value.length === 0) return false;
      this.mathfield.focus();
      this.mathfield.selection = cloneSelection(context.selection);
      return this.mathfield.performUndoableEdit(() => {
        this.mathfield.insert(value, {
          format: 'latex',
          mode: 'math',
          selectionMode: 'after',
        });
      });
    } finally {
      this.busy--;
      // A delayed clipboard response must not steal focus from later work.
      if (this.unchanged(context)) this.mathfield.focus();
      this.captureSelection();
    }
  }

  /** Bind a control while retaining pointer and keyboard selection intent. */
  bind(button: HTMLButtonElement, action: AuthoringAction): () => void {
    const down = (event: PointerEvent) => {
      this.captureSelection();
      if (event.button === 0 && event.pointerType === 'mouse')
        event.preventDefault();
    };
    const click = () => {
      void this.run(action).catch((error: unknown) => {
        this.dispatchEvent(
          new CustomEvent('action-error', {
            detail: error instanceof Error ? error.message : String(error),
          })
        );
      });
    };
    button.addEventListener('pointerdown', down);
    button.addEventListener('click', click);
    const unbind = () => {
      button.removeEventListener('pointerdown', down);
      button.removeEventListener('click', click);
      this.bindings.delete(unbind);
    };
    this.bindings.add(unbind);
    return unbind;
  }

  dispose(): void {
    this.disposed = true;
    this.epoch++;
    for (const unbind of this.bindings) unbind();
    for (const [type, listener] of this.listeners)
      this.mathfield.removeEventListener(type, listener);
    this.mathfield.ownerDocument.removeEventListener(
      'focusin',
      this.outsideFocus,
      true
    );
  }
}
