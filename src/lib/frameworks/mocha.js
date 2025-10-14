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

module.exports = (ast, file = '', source = '', opts = {}) => {
  const tests = [];
  let currentSuite = [];
  // hooks variables
  const noHooks = opts?.noHooks;
  // line-numbers opt
  const isLineNumber = opts?.lineNumbers;

  let beforeCode = '';
  let beforeEachCode = '';
  let afterCode = '';

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

      if (path.isIdentifier({ name: 'context' })) {
        if (!hasStringOrTemplateArgument(path.parent)) return;
        addSuite(path.parent);
      }

      if (path.isIdentifier({ name: 'before' })) {
        beforeCode += getCode(source, getLineNumber(path.parentPath), getEndLineNumber(path.parentPath), isLineNumber);
      }

      if (path.isIdentifier({ name: 'beforeEach' })) {
        beforeEachCode = getCode(
          source,
          getLineNumber(path.parentPath),
          getEndLineNumber(path.parentPath),
          isLineNumber,
        );
      }

      if (path.isIdentifier({ name: 'after' })) {
        afterCode = getCode(source, getLineNumber(path.parentPath), getEndLineNumber(path.parentPath), isLineNumber);

        if (afterCode && !noHooks) {
          for (const test of tests) {
            if (!test.code.includes(afterCode)) {
              test.code += afterCode;
            }
          }
        }
      }

      // forbid only
      if (path.isIdentifier({ name: 'only' })) {
        const name = path.parent.object.name;
        if (['describe', 'it', 'context'].includes(name)) {
          const line = getLineNumber(path);
          throw new CommentError(
            /* prettier-ignore */
            'Exclusive tests detected. `.only` call found in '
            + `${file}:${line}\n`
            + 'Remove `.only` to restore test checks',
          );
        }
      }

      if (path.isIdentifier({ name: 'skip' })) {
        if (!path.parent || !path.parent.object) {
          return;
        }

        if (path.parent.object.name === 'it') {
          // test
          if (!hasStringOrTemplateArgument(path.parentPath.container)) return;

          const testName = getStringValue(path.parentPath.container);
          tests.push({
            name: testName,
            suites: currentSuite.map(s => getStringValue(s)),
            updatePoint: getUpdatePoint(path.parent.container),
            line: getLineNumber(path),
            code: getCode(source, getLineNumber(path), getEndLineNumber(path), isLineNumber),
            file,
            skipped: true,
          });
        }

        if (path.parent.object.name === 'describe' || path.parent.object.name === 'context') {
          // suite
          if (!hasStringOrTemplateArgument(path.parentPath.container)) return;
          const suite = path.parentPath.container;
          suite.skipped = true;
          addSuite(suite);
        }
      }

      if (path.isIdentifier({ name: 'xit' })) {
        if (!hasStringOrTemplateArgument(path.parent)) return;

        const testName = getStringValue(path.parent);
        tests.push({
          name: testName,
          suites: currentSuite.map(s => getStringValue(s)),
          updatePoint: getUpdatePoint(path.parent),
          line: getLineNumber(path),
          code: getCode(source, getLineNumber(path), getEndLineNumber(path), isLineNumber),
          skipped: true,
          file,
        });
      }

      if (path.isIdentifier({ name: 'it' })) {
        if (!hasStringOrTemplateArgument(path.parent)) return;

        const testName = getStringValue(path.parent);

        let code = '';

        beforeCode = beforeCode ?? '';
        beforeEachCode = beforeEachCode ?? '';
        afterCode = afterCode ?? '';
        /* prettier-ignore */
        code = noHooks
          ? getCode(source, getLineNumber(path), getEndLineNumber(path), isLineNumber)
          : beforeEachCode
          + beforeCode
          + getCode(source, getLineNumber(path), getEndLineNumber(path), isLineNumber)
          + afterCode;

        tests.push({
          name: testName,
          suites: currentSuite.map(s => getStringValue(s)),
          updatePoint: getUpdatePoint(path.parent),
          line: getLineNumber(path),
          code,
          file,
          skipped: !!currentSuite.filter(s => s.skipped).length,
        });
      }
    },
  });

  return tests;
};
