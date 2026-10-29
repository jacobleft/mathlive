import { convertLatexToMarkup } from '../../dist/mathlive.mjs';

const slotNames = {
  'numerator': 'Numerator',
  'denominator': 'Denominator',
  'radicand': 'Radicand',
  'index': 'Index',
  'body': 'Body',
  'base': 'Base',
  'subscript': 'Subscript',
  'superscript': 'Superscript',
  'lower-limit': 'Lower limit',
  'upper-limit': 'Upper limit',
};
const delimiters = {
  '.': 'Invisible',
  '(': 'Parenthesis (',
  ')': 'Parenthesis )',
  '[': 'Bracket [',
  ']': 'Bracket ]',
  '\\lbrace': 'Brace {',
  '\\rbrace': 'Brace }',
  '\\{': 'Brace {',
  '\\}': 'Brace }',
  '|': 'Vertical bar',
  '\\lVert': 'Double bar',
  '\\rVert': 'Double bar',
  '\\langle': 'Angle bracket',
  '\\rangle': 'Angle bracket',
  '\\lfloor': 'Floor',
  '\\rfloor': 'Floor',
  '\\lceil': 'Ceiling',
  '\\rceil': 'Ceiling',
};
const messages = {
  unavailable: 'The equation is not ready for inspection.',
  empty: 'Insert a template to inspect its properties.',
  none: 'Place the caret inside a structure, or select one structure.',
  ambiguous:
    'The selection crosses structures or slots. Select one structure to inspect it.',
  unsupported:
    'This structure has no property view yet. Choose an enclosing structure or return to the equation.',
};

function name(structure) {
  if (structure.kind === 'array') {
    if (structure.properties.environment.includes('cases')) return 'Cases';
    if (/align|gather|multline|lines/.test(structure.properties.environment))
      return 'Equation array';
    return 'Matrix';
  }
  return {
    fraction: 'Fraction',
    root: 'Root',
    scripts: 'Scripts',
    delimiters: 'Brackets',
    operator: 'Operator',
  }[structure.kind];
}

function properties(structure) {
  const p = structure.properties;
  const present = (value) => (value ? 'Present' : 'Absent');
  switch (structure.kind) {
    case 'fraction':
      return [
        [
          'Layout',
          { auto: 'Automatic', display: 'Display', inline: 'Inline' }[p.layout],
        ],
        ['Bar', p.bar ? 'Visible' : 'Hidden'],
      ];
    case 'root':
      return [['Form', p.indexed ? 'Indexed root' : 'Square root']];
    case 'scripts':
      return [
        ['Subscript', present(p.subscript)],
        ['Superscript', present(p.superscript)],
      ];
    case 'delimiters':
      return [
        ['Left', delimiters[p.left] ?? 'Other delimiter'],
        ['Right', delimiters[p.right] ?? 'Other delimiter'],
        ['Right matching', p.automaticRight ? 'Automatic' : 'Explicit'],
      ];
    case 'operator':
      return [
        [
          'Operator',
          {
            '\\sum': 'Summation',
            '\\prod': 'Product',
            '\\int': 'Integral',
            '\\iint': 'Double integral',
            '\\iiint': 'Triple integral',
            '\\oint': 'Contour integral',
            '\\lim': 'Limit',
          }[p.command] ?? p.command.replace(/^\\/, ''),
        ],
        [
          'Limit placement',
          {
            'auto': 'Automatic',
            'above-below': 'Above / below',
            'side': 'Beside operator',
          }[p.placement],
        ],
        ['Lower limit', present(p.lowerLimit)],
        ['Upper limit', present(p.upperLimit)],
      ];
    case 'array':
      return [
        [
          'Form',
          {
            bmatrix: 'Square brackets',
            pmatrix: 'Parentheses',
            Bmatrix: 'Braces',
            vmatrix: 'Vertical bars',
            Vmatrix: 'Double bars',
            matrix: 'No delimiters',
            smallmatrix: 'Small matrix',
            cases: 'Cases',
            dcases: 'Display cases',
            aligned: 'Aligned equations',
            align: 'Aligned equations',
            gather: 'Centered equations',
          }[p.environment] ?? 'Equation array',
        ],
        ['Rows', String(p.rows)],
        ['Columns', String(p.columns)],
      ];
  }
  return [];
}

const id = (structure) => `${structure.kind}:${structure.range.join(':')}`;

/** A passive property view with explicit, selection-preserving target navigation. */
export function mountContextualProperties(root, actions) {
  const field = actions.mathfield;
  const trail = root.querySelector('.structure-trail');
  const heading = root.querySelector('.structure-name');
  const preview = root.querySelector('.structure-preview');
  const values = root.querySelector('.structure-values');
  const slots = root.querySelector('.structure-slots');
  const select = root.querySelector('[data-context-action="select"]');
  const back = root.querySelector('[data-context-action="return"]');
  const message = root.querySelector('.structure-message');
  let snapshot;
  let signature = '';
  let chosen;

  function current() {
    const context = field.getSelectionContext();
    return { context, signature: JSON.stringify([field.value, context]) };
  }

  function renderRange(range) {
    return convertLatexToMarkup(field.getValue(range), {
      macros: field.macros,
      registers: field.registers,
    });
  }

  function available() {
    const editable = canNavigate();
    for (const button of trail.querySelectorAll('button'))
      button.disabled = !editable;
    for (const button of slots.querySelectorAll('button'))
      button.disabled = !editable || !chosen;
    select.disabled = !editable || !chosen;
    back.disabled = !editable;
    root.dataset.availability = editable ? 'available' : 'unavailable';
    if (!editable) {
      message.textContent = field.disabled
        ? 'The equation is disabled.'
        : field.mode === 'latex'
          ? 'Finish the current command before navigating structures.'
          : field.readOnly
            ? 'The equation is read-only.'
            : 'Structure navigation is unavailable for the current input or selection.';
    } else {
      message.textContent = chosen
        ? 'Select a slot to edit its contents.'
        : messages[snapshot.status];
    }
  }

  function valid(expected) {
    if (current().signature === expected) return true;
    refresh();
    return false;
  }

  function canNavigate() {
    return actions.state.canEdit && field.mode !== 'latex';
  }

  function navigate(range, expected) {
    if (!canNavigate() || !valid(expected)) return;
    void actions.run({ type: 'select', selection: { ranges: [[...range]] } });
    returnToEquation();
  }

  function details() {
    const structure = snapshot.structures.find((item) => id(item) === chosen);
    for (const button of trail.querySelectorAll('button')) {
      button.setAttribute(
        'aria-pressed',
        String(button.dataset.structure === chosen)
      );
    }
    values.replaceChildren();
    slots.replaceChildren();
    preview.replaceChildren();
    heading.textContent = structure
      ? name(structure)
      : snapshot.status === 'ambiguous'
        ? 'Multiple structures'
        : 'Equation selection';
    root.dataset.target = structure?.kind ?? '';
    if (structure) {
      // Render the native value through MathLive. Equation text is never HTML.
      preview.innerHTML = renderRange(structure.range);
      for (const [label, value] of properties(structure)) {
        const term = document.createElement('dt');
        const description = document.createElement('dd');
        term.textContent = label;
        description.textContent = value;
        values.append(term, description);
      }
      for (const slot of structure.slots) {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.slot = slot.role;
        const label =
          slot.role === 'cell'
            ? `Cell ${slot.row + 1}, ${slot.column + 1}`
            : slotNames[slot.role];
        button.setAttribute('aria-label', `Select ${label.toLowerCase()}`);
        const caption = document.createElement('span');
        caption.textContent = label;
        const sample = document.createElement('span');
        sample.className = 'slot-preview';
        sample.setAttribute('aria-hidden', 'true');
        if (slot.range[0] === slot.range[1]) sample.textContent = 'Empty';
        else sample.innerHTML = renderRange(slot.range);
        button.append(caption, sample);
        const expected = signature;
        button.addEventListener('click', () => navigate(slot.range, expected));
        slots.append(button);
      }
    }
    available();
  }

  function refresh() {
    const next = current();
    if (next.signature !== signature) {
      signature = next.signature;
      snapshot = next.context;
      chosen =
        snapshot.status === 'supported'
          ? id(snapshot.structures[0])
          : undefined;
      root.dataset.context = snapshot.status;
      trail.replaceChildren();
      const structures = [...snapshot.structures].reverse();
      structures.forEach((structure, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        const label = name(structure);
        const duplicates =
          structures.filter((item) => name(item) === label).length > 1;
        button.textContent = duplicates ? `${label} ${index + 1}` : label;
        button.setAttribute(
          'aria-label',
          `Inspect ${button.textContent.toLowerCase()}`
        );
        button.dataset.structure = id(structure);
        const expected = signature;
        button.addEventListener('click', () => {
          if (!canNavigate() || !valid(expected)) return;
          chosen = id(structure);
          details();
        });
        trail.append(button);
      });
      details();
    } else available();
  }

  root.addEventListener('pointerdown', (event) => {
    if (!event.target.closest('button')) return;
    actions.captureSelection();
    if (event.button === 0 && event.pointerType === 'mouse')
      event.preventDefault();
  });
  select.addEventListener('click', () => {
    const structure = snapshot.structures.find((item) => id(item) === chosen);
    if (structure) navigate(structure.range, signature);
  });
  const returnToEquation = () => {
    const owner = field.ownerDocument.activeElement;
    const expected = signature;
    // MathLive may still be completing a preceding focus transition. Retry
    // briefly while this control still owns the request and target.
    let remaining = 12;
    const attempt = () => {
      if (
        canNavigate() &&
        field.ownerDocument.activeElement === owner &&
        current().signature === expected
      ) {
        void actions.run({ type: 'focus' });
        if (!field.matches(':focus-within') && --remaining > 0)
          requestAnimationFrame(attempt);
      }
    };
    requestAnimationFrame(attempt);
  };
  back.addEventListener('click', returnToEquation);
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      returnToEquation();
    }
  });
  actions.addEventListener('state-change', refresh);
  field.addEventListener('input', refresh);
  field.addEventListener('undo-state-change', refresh);
  field.addEventListener('mode-change', refresh);
  new MutationObserver(refresh).observe(field, {
    attributes: true,
    attributeFilter: ['read-only', 'readonly', 'disabled'],
  });
  refresh();
}
