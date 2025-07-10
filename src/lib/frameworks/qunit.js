const traverse = require('@babel/traverse').default || require('@babel/traverse');
const CommentError = require('../../errors/comment.error');
const {
  getStringValue,
  getUpdatePoint,
  hasStringOrTemplateArgument,
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
      if (path.isIdentifier({ name: 'module' })) {
        if (!path.parentPath && !path.parentPath.container) return;
        if (!hasStringOrTemplateArgument(path.parentPath.container)) return;
        addSuite(path.parentPath.container);
      }

      if (path.isIdentifier({ name: 'QUnit' })) {
        if (!path.parentPath && !path.parentPath.container) return;
        if (!hasStringOrTemplateArgument(path.parentPath.container)) return;
        addSuite(path.parentPath.container);
      }

      // forbid only
      if (path.isIdentifier({ name: 'only' })) {
        const name = path.parent.object.name || path.parent.object.callee.object.name;
        if (['describe', 'it', 'context', 'test'].includes(name)) {
          const line = getLineNumber(path);
          throw new CommentError(
            /* prettier-ignore */
            'Exclusive tests detected. `.only` call found in '
            + `${file}:${line}\n`
            + 'Remove `.only` to restore test checks',
          );
        }
      }

      if (path.isIdentifier({ name: 'test' }) || path.isIdentifier({ name: 'it' })) {
        if (!path.parentPath) return;
        if (!path.parentPath.container) return;
        if (!hasStringOrTemplateArgument(path.parentPath.container)) return;

        const testName = getStringValue(path.parentPath.container);
        tests.push({
          name: testName,
          suites: currentSuite.map(s => getStringValue(s)),
          updatePoint: getUpdatePoint(path.parentPath),
          line: getLineNumber(path),
          code: getCode(source, getLineNumber(path.parentPath), getEndLineNumber(path.parentPath)),
          file,
          skipped: !!currentSuite.filter(s => s.skipped).length,
        });
      }
    },
  });

  return tests;
};
