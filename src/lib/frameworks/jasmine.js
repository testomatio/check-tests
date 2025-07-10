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
          suites: currentSuite.map(s => getStringValue(s)),
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
        tests.push({
          name: testName,
          suites: currentSuite.map(s => getStringValue(s)),
          line: getLineNumber(path),
          updatePoint: getUpdatePoint(path.parent),
          code: getCode(source, getLineNumber(path), getEndLineNumber(path)),
          file,
          skipped: !!currentSuite.filter(s => s.skipped).length,
        });
      }
    },
  });

  return tests;
};
