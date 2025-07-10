const traverse = require('@babel/traverse').default || require('@babel/traverse');
const CommentError = require('../../errors/comment.error');
const {
  getStringValue,
  getUpdatePoint,
  hasStringOrTemplateArgument,
  getLineNumber,
  getEndLineNumber,
  getCode,
  playwright,
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
        if (!path.parentPath && !path.parentPath.container) return;
        if (!hasStringOrTemplateArgument(path.parentPath.container)) return;
        addSuite(path.parentPath.container);
      }

      if (path.isMemberExpression() && path.node.object.name === 'test' && path.node.property.name === 'beforeAll') {
        beforeCode = getCode(source, getLineNumber(path), getEndLineNumber(path), isLineNumber);
      }

      if (path.isMemberExpression() && path.node.object.name === 'test' && path.node.property.name === 'beforeEach') {
        beforeEachCode = getCode(source, getLineNumber(path), getEndLineNumber(path), isLineNumber);
      }

      if (path.isMemberExpression() && path.node.object.name === 'test' && path.node.property.name === 'afterAll') {
        afterCode = getCode(source, getLineNumber(path), getEndLineNumber(path), isLineNumber);

        if (afterCode && !noHooks) {
          for (const test of tests) {
            if (!test.code.includes(afterCode)) {
              test.code += afterCode;
            }
          }
        }
      }

      if (path.isIdentifier({ name: 'parallel' })) {
        if (!path.parentPath && !path.parentPath.container) return;
        if (!hasStringOrTemplateArgument(path.parentPath.container)) return;
        addSuite(path.parentPath.container);
      }

      if (path.isIdentifier({ name: 'serial' })) {
        if (!path.parentPath && !path.parentPath.container) return;
        if (!hasStringOrTemplateArgument(path.parentPath.container)) return;
        addSuite(path.parentPath.container);
      }

      // forbid only
      if (path.isIdentifier({ name: 'only' })) {
        if (!path.parent || !path.parent.object) {
          return;
        }
        const name =
          path.parent?.object?.name ||
          path.parent?.object?.callee?.object?.name ||
          path.container?.object?.property?.name;

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
        const name =
          path.parent.object.name || path.parent.object.property.name || path.parent.object.callee.object.name;

        if (name === 'test' || name === 'it') {
          // test or it
          if (!hasStringOrTemplateArgument(path.parentPath.container)) return;

          const testName = getStringValue(path.parentPath.container);
          tests.push({
            name: testName,
            suites: currentSuite
              .filter(s => getEndLineNumber({ container: s }) >= getLineNumber(path))
              .map(s => getStringValue(s)),
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

      if (path.isIdentifier({ name: 'fixme' })) {
        if (!path.parent || !path.parent.object) {
          return;
        }
        const name =
          path.parent.object.name || path.parent.object.property.name || path.parent.object.callee.object.name;

        if (name === 'test' || name === 'it') {
          // test or it
          if (!hasStringOrTemplateArgument(path.parentPath.container)) return;

          const testName = getStringValue(path.parentPath.container);
          tests.push({
            name: testName,
            suites: currentSuite
              .filter(s => getEndLineNumber({ container: s }) >= getLineNumber(path))
              .map(s => getStringValue(s)),
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
        if (!path.parent || !path.parent.object) {
          return;
        }
        // todo tests => skipped tests
        if (path.parent.object.name === 'test') {
          // test
          if (!hasStringOrTemplateArgument(path.parentPath.container)) return;

          const testName = getStringValue(path.parentPath.container);
          tests.push({
            name: testName,
            suites: currentSuite
              .filter(s => getEndLineNumber({ container: s }) >= getLineNumber(path))
              .map(s => getStringValue(s)),
            line: getLineNumber(path),
            code: getCode(source, getLineNumber(path), getEndLineNumber(path), isLineNumber),
            file,
            skipped: true,
          });
        }
      }

      const fixtureNames = [...['test', 'it'], ...(opts?.testAlias || [])];
      for (const fiixtureName of fixtureNames || []) {
        if (path.isIdentifier({ name: fiixtureName })) {
          if (!hasStringOrTemplateArgument(path.parent)) return;

          let code = '';

          beforeCode = beforeCode ?? '';
          beforeEachCode = beforeEachCode ?? '';
          afterCode = afterCode ?? '';
          /* prettier-ignore */
          code = noHooks
            ? getCode(source, getLineNumber(path), getEndLineNumber(path), isLineNumber)
            : beforeEachCode +
              beforeCode +
              getCode(source, getLineNumber(path), getEndLineNumber(path), isLineNumber) +
              afterCode;

          const testName = getStringValue(path.parent);

          tests.push({
            name: testName,
            suites: currentSuite
              .filter(s => getEndLineNumber({ container: s }) >= getLineNumber(path))
              .map(s => getStringValue(s)),
            updatePoint: getUpdatePoint(path.parent),
            line: getLineNumber(path),
            code,
            file,
            tags: playwright.getTestProps(path.parentPath).tags,
            annotations: playwright.getTestProps(path.parentPath).annotations,
            skipped: !!currentSuite.filter(s => s.skipped).length,
          });

          // stop the loop if the test is found
          break;
        }
      }

      if (path.isIdentifier({ name: 'each' })) {
        const currentPath = path.parentPath.parentPath;

        if (!hasStringOrTemplateArgument(currentPath.parent)) return;
        const testName = getStringValue(currentPath.parent);
        tests.push({
          name: testName,
          suites: currentSuite
            .filter(s => getEndLineNumber({ container: s }) >= getLineNumber(path))
            .map(s => getStringValue(s)),
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
