import { convertLatexToMarkup } from '../../dist/mathlive.mjs';
import { findTemplates, templateCategories } from './templates.js';

/** A catalog view. All content edits belong to the shared action controller. */
export function mountTemplatePalette(root, actions) {
  const search = root.querySelector('input[type="search"]');
  const categories = root.querySelector('.template-categories');
  const grid = root.querySelector('.template-grid');
  const count = root.querySelector('.template-count');
  const empty = root.querySelector('.template-empty');
  let category = templateCategories[0].id;
  let bindings = [];

  for (const item of [{ id: 'all', label: 'All' }, ...templateCategories]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = item.label;
    button.dataset.category = item.id;
    button.addEventListener('click', () => {
      category = item.id;
      render();
    });
    categories.append(button);
  }

  function updateAvailability() {
    for (const button of grid.querySelectorAll('button'))
      button.disabled = !actions.state.canEdit;
  }

  function render() {
    for (const unbind of bindings) unbind();
    bindings = [];
    grid.replaceChildren();
    grid.scrollTop = 0;
    const results = findTemplates(search.value, category);
    for (const button of categories.querySelectorAll('button')) {
      button.setAttribute(
        'aria-pressed',
        String(button.dataset.category === category)
      );
    }
    results.forEach((template, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'template-button';
      button.dataset.template = template.id;
      button.setAttribute(
        'aria-label',
        `Insert ${template.label.toLowerCase()}`
      );
      button.title = template.label;
      button.tabIndex = index === 0 ? 0 : -1;
      const preview = document.createElement('span');
      preview.className = 'template-preview';
      preview.setAttribute('aria-hidden', 'true');
      // Trusted renderer output from the bundled catalog; search never becomes HTML.
      preview.innerHTML = convertLatexToMarkup(template.preview);
      const label = document.createElement('span');
      label.className = 'template-label';
      label.textContent = template.label;
      button.append(preview, label);
      bindings.push(
        actions.bind(button, { type: 'insert', value: template.latex })
      );
      grid.append(button);
    });
    count.textContent = `${results.length} ${results.length === 1 ? 'template' : 'templates'}`;
    empty.hidden = results.length !== 0;
    updateAvailability();
  }

  search.addEventListener('input', () => {
    // Searching starts across the whole catalog, even from a narrow category.
    category = 'all';
    render();
  });
  search.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') {
      const first = grid.querySelector('button:not(:disabled)');
      if (first) {
        event.preventDefault();
        first.focus();
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      if (search.value) {
        search.value = '';
        render();
      } else requestAnimationFrame(() => actions.mathfield.focus());
    }
  });
  grid.addEventListener('focusin', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    for (const item of grid.querySelectorAll('button'))
      item.tabIndex = item === button ? 0 : -1;
  });
  grid.addEventListener('keydown', (event) => {
    const buttons = [...grid.querySelectorAll('button:not(:disabled)')];
    const index = buttons.indexOf(event.target.closest('button'));
    if (index < 0) return;
    const columns =
      getComputedStyle(grid).gridTemplateColumns.split(' ').length;
    let next = index;
    switch (event.key) {
      case 'ArrowRight':
        next++;
        break;
      case 'ArrowLeft':
        next--;
        break;
      case 'ArrowDown':
        next += columns;
        break;
      case 'ArrowUp':
        next -= columns;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = buttons.length - 1;
        break;
      case 'Escape':
        event.preventDefault();
        requestAnimationFrame(() => actions.mathfield.focus());
        return;
      default:
        return;
    }
    event.preventDefault();
    buttons[Math.max(0, Math.min(next, buttons.length - 1))]?.focus();
  });
  actions.addEventListener('state-change', updateAvailability);
  actions.mathfield.addEventListener('input', updateAvailability);
  new MutationObserver(updateAvailability).observe(actions.mathfield, {
    attributes: true,
    attributeFilter: ['read-only', 'readonly', 'disabled'],
  });
  render();
}
