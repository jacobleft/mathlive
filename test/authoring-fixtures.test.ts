import fixtures from './authoring/fixtures.json';
import {
  convertLatexToMarkup,
  validateLatex,
} from '../src/public/mathlive-ssr';

describe('authoring notation baseline (not interaction coverage)', () => {
  for (const fixture of fixtures) {
    if (fixture.gap) {
      test.todo(`${fixture.id}: ${fixture.gap}`);
      continue;
    }
    test(fixture.id, () => {
      expect(validateLatex(fixture.latex)).toEqual([]);
      const markup = convertLatexToMarkup(fixture.latex);
      expect(markup).toContain('ML__');
      expect(markup).not.toContain('ML__error');
    });
  }
});
