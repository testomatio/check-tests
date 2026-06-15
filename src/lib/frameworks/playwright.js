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
  getAllSuiteTags,
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
  const testNames = ['test', 'it', ...(opts?.testAlias || [])];

  function addSuite(path) {
    currentSuite = currentSuite.filter(s => s.loc.end.line > path.loc.start.line);
    path.tags = playwright.getTestProps({ parent: { expression: path } }).tags;
    currentSuite.push(path);
  }

  function getSuites(path) {
    return currentSuite.filter(s => getEndLineNumber({ container: s }) >= getLineNumber(path));
  }

  function getAnnotatedObjectName(path) {
    if (!path.parent || !path.parent.object) return null;
    return path.parent.object.name || path.parent.object.property?.name || path.parent.object.callee?.object?.name;
  }

  function addAnnotatedTest(path, skipped) {
    if (!hasStringOrTemplateArgument(path.parentPath.container)) return;

    const suites = getSuites(path);
    tests.push({
      name: getStringValue(path.parentPath.container),
      suites: suites.map(s => getStringValue(s)),
      line: getLineNumber(path),
      code: getCode(source, getLineNumber(path), getEndLineNumber(path), isLineNumber),
      file,
      skipped: skipped || suites.some(s => s.skipped),
    });
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

      if (['skip', 'fixme', 'fail', 'slow'].includes(path.node.name)) {
        const name = getAnnotatedObjectName(path);
        if (!name) return;

        if (testNames.includes(name)) {
          addAnnotatedTest(path, path.node.name === 'skip' || path.node.name === 'fixme');
        } else if ((path.node.name === 'skip' || path.node.name === 'fixme') && name === 'describe') {
          if (!hasStringOrTemplateArgument(path.parentPath.container)) return;
          const suite = path.parentPath.container;
          suite.skipped = true;
          addSuite(suite);
        }
      }

      if (path.isIdentifier({ name: 'todo' })) {
        if (testNames.includes(getAnnotatedObjectName(path))) addAnnotatedTest(path, true);
      }

      for (const fiixtureName of testNames || []) {
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
            tags: [...getAllSuiteTags(currentSuite), ...playwright.getTestProps(path.parentPath).tags],
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
