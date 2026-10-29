import {
  findTemplates,
  templates,
  templateCategories,
} from '../examples/authoring/templates';
import {
  convertLatexToMarkup,
  validateLatex,
} from '../src/public/mathlive-ssr';

test('the catalog has stable unique IDs and valid categories', () => {
  expect(new Set(templates.map((item) => item.id)).size).toBe(templates.length);
  for (const category of templateCategories)
    expect(templates.some((item) => item.category === category.id)).toBe(true);
  for (const item of templates) {
    expect(item.id).toMatch(/^[a-z]+(?:-[a-z]+)*$/);
    expect(
      templateCategories.some((category) => category.id === item.category)
    ).toBe(true);
    expect(item.label.trim()).not.toBe('');
  }
});

for (const template of templates) {
  test(`catalog syntax/render: ${template.id}`, () => {
    expect(validateLatex(template.preview)).toEqual([]);
    expect(convertLatexToMarkup(template.preview)).not.toContain('ML__error');
    const filled = template.latex.replace(/#[0@?]/g, '{x}');
    expect(validateLatex(filled)).toEqual([]);
  });
}

test('search supports labels, command aliases, symbols and Chinese keywords', () => {
  expect(findTemplates('SQRT').map((item) => item.id)).toEqual([
    'square-root',
    'indexed-root',
    'cube-root',
  ]);
  expect(findTemplates('\\alpha').map((item) => item.id)).toEqual(['alpha']);
  expect(findTemplates('fraction').map((item) => item.id)).toEqual([
    'fraction',
    'display-fraction',
    'inline-fraction',
  ]);
  expect(findTemplates('√').map((item) => item.id)).toEqual(['square-root']);
  expect(findTemplates('定积分').map((item) => item.id)).toEqual([
    'definite-integral',
  ]);
  expect(findTemplates('log base').map((item) => item.id)).toEqual([
    'logarithm-base',
  ]);
  expect(findTemplates('integral', 'fractions')).toEqual([]);
  expect(findTemplates('  ')).toHaveLength(templates.length);
  expect(findTemplates('nothing matches')).toEqual([]);
});
