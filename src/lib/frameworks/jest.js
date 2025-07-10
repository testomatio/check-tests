const traverse = require('@babel/traverse').default || require('@babel/traverse');
const CommentError = require('../../errors/comment.error');
const {
  getStringValue,
  getUpdatePoint,
  hasStringOrTemplateArgument,
  getLineNumber,
  getEndLineNumber,
  getCode,
  jest,
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

      if (path.isIdentifier({ name: 'beforeAll' })) {
        beforeCode = getCode(source, getLineNumber(path.parentPath), getEndLineNumber(path.parentPath), isLineNumber);
      }

      if (path.isIdentifier({ name: 'beforeEach' })) {
        beforeEachCode = getCode(
          source,
          getLineNumber(path.parentPath),
          getEndLineNumber(path.parentPath),
          isLineNumber,
        );
      }

      if (path.isIdentifier({ name: 'afterAll' })) {
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
        // console.log(path.parent.object);
        if (!path.parent) return;
        if (!path.parent.object) return;

        const name = path.parent.object.name || (path.parent.object.callee && path.parent.object.callee.object.name);
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

      if (path.isIdentifier({ name: 'skip' })) {
        if (!path.parent || !path.parent.object) {
          return;
        }

        const name = path.parent.object?.name || path.parent.object?.callee?.object?.name;

        if (name === 'test' || name === 'it') {
          // test or it
          if (!hasStringOrTemplateArgument(path.parentPath.container)) return;

          const testName = getStringValue(path.parentPath.container);
          tests.push({
            name: testName,
            suites: currentSuite.map(s => getStringValue(s)),
            line: getLineNumber(path),
            code: getCode(source, getLineNumber(path), getEndLineNumber(path), isLineNumber),
            file,
            skipped: true,
          });
        }

        if (name === 'describe') {
          // suite
          if (!hasStringOrTemplateArgument(path.parentPath.container)) return;
          const suite = path.parentPath.container;
          suite.skipped = true;
          addSuite(suite);
        }

        // todo: handle "context"
      }

      if (path.isIdentifier({ name: 'todo' })) {
        // todo tests => skipped tests
        if (path.parent.object.name === 'test') {
          // test
          if (!hasStringOrTemplateArgument(path.parentPath.container)) return;

          const testName = getStringValue(path.parentPath.container);
          tests.push({
            name: testName,
            suites: currentSuite.map(s => getStringValue(s)),
            line: getLineNumber(path),
            code: getCode(source, getLineNumber(path), getEndLineNumber(path), isLineNumber),
            file,
            skipped: true,
          });
        }
      }

      if (path.isIdentifier({ name: 'test' }) || path.isIdentifier({ name: 'it' })) {
        if (jest.isConcurrentTest(path.parent)) path = path.parentPath;
        if (!hasStringOrTemplateArgument(path.parent)) return;

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

        const testName = getStringValue(path.parent);
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

      if (path.isIdentifier({ name: 'each' })) {
        const currentPath = path.parentPath.parentPath;

        if (!hasStringOrTemplateArgument(currentPath.parent)) return;
        const testName = getStringValue(currentPath.parent);
        tests.push({
          name: testName,
          suites: currentSuite.map(s => getStringValue(s)),
          updatePoint: getUpdatePoint(path.parent),
          line: getLineNumber(currentPath),
          code: getCode(source, getLineNumber(currentPath), getEndLineNumber(currentPath), isLineNumber),
          file,
          skipped: !!currentSuite.filter(s => s.skipped).length,
        });
      }
    },
  });

  return tests;
};
