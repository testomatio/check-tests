const traverse = require('@babel/traverse').default || require('@babel/traverse');
const CommentError = require('../../errors/comment.error');
const {
  getUpdatePoint,
  hasStringOrTemplateArgument,
  getStringValue,
  getLineNumber,
  getEndLineNumber,
  getCode,
} = require('../utils');

// if you need to expand the adapter with options, use opts = {}
module.exports = (ast, file = '', source = '') => {
  const tests = [];
  let currentSuite = [];

  function addSuite(path) {
    currentSuite = currentSuite.filter(s => s.loc.end.line > path.loc.start.line);
    currentSuite.push(path);
  }

  // only suites whose body still encloses this line count (not closed siblings)
  function getEnclosingSuites(path) {
    const line = getLineNumber(path);
    return currentSuite.filter(s => s.loc.end.line >= line);
  }

  traverse(ast, {
    enter(path) {
      if (path.isIdentifier({ name: 'describe' })) {
        if (!hasStringOrTemplateArgument(path.parent)) return;
        addSuite(path.parent);
      }

      if (path.isIdentifier({ name: 'xdescribe' })) {
        if (!hasStringOrTemplateArgument(path.parent)) return;
        path.parent.skipped = true;
        addSuite(path.parent);
      }

      // forbid fdescribe and fit
      if (path.isIdentifier({ name: 'fdescribe' })) {
        const line = getLineNumber(path);
        throw new CommentError(
          /* prettier-ignore */
          'Exclusive tests detected. `fdescribe` call found in '
          + `${file}:${line}\n`
          + 'Remove `fdescibe` to restore test checks',
        );
      }

      if (path.isIdentifier({ name: 'fit' })) {
        const line = getLineNumber(path);
        throw new CommentError(
          /* prettier-ignore */
          'Exclusive tests detected. `fit` call found in '
          + `${file}:${line}\n`
          + 'Remove `fit` to restore test checks',
        );
      }

      if (path.isIdentifier({ name: 'xit' })) {
        if (!hasStringOrTemplateArgument(path.parent)) return;

        const testName = getStringValue(path.parent);
        tests.push({
          name: testName,
          suites: getEnclosingSuites(path).map(s => getStringValue(s)),
          line: getLineNumber(path),
          updatePoint: getUpdatePoint(path.parent),
          skipped: true,
          code: getCode(source, getLineNumber(path), getEndLineNumber(path)),
          file,
        });
      }

      if (path.isIdentifier({ name: 'it' })) {
        if (!hasStringOrTemplateArgument(path.parent)) return;

        const testName = getStringValue(path.parent);
        const suites = getEnclosingSuites(path);
        tests.push({
          name: testName,
          suites: suites.map(s => getStringValue(s)),
          line: getLineNumber(path),
          updatePoint: getUpdatePoint(path.parent),
          code: getCode(source, getLineNumber(path), getEndLineNumber(path)),
          file,
          skipped: suites.some(s => s.skipped),
        });
      }
    },
  });

  return tests;
};
