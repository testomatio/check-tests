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

  // built-in `test`/`it` plus any custom fixtures/aliases passed via --test-alias
  const testNames = ['test', 'it', ...(opts?.testAlias || [])];

  function addSuite(path) {
    currentSuite = currentSuite.filter(s => s.loc.end.line > path.loc.start.line);
    path.tags = playwright.getTestProps({ parent: { expression: path } }).tags;
    currentSuite.push(path);
  }

  // suites that enclose the call at `path` (ignoring sibling suites already closed above it)
  function getSuites(path) {
    return currentSuite.filter(s => getEndLineNumber({ container: s }) >= getLineNumber(path));
  }

  // name of the object an annotation is called on, e.g. `test`/`it`/`describe` or a custom alias
  function getAnnotatedObjectName(path) {
    if (!path.parent || !path.parent.object) return null;
    return path.parent.object.name || path.parent.object.property?.name || path.parent.object.callee?.object?.name;
  }

  // register a test declared with an annotation (`.skip`/`.fixme`/`.fail`/`.slow`/`.todo`);
  // runtime forms without a title (`test.skip()` inside a body) declare no test and are ignored
  function addAnnotatedTest(path, skipped) {
    if (!hasStringOrTemplateArgument(path.parentPath.container)) return;

    const suites = getSuites(path);
    tests.push({
      name: getStringValue(path.parentPath.container),
      suites: suites.map(s => getStringValue(s)),
      line: getLineNumber(path),
      // end line comes from the enclosing call (`path` is just the annotation identifier) to capture the full body
      code: getCode(source, getLineNumber(path), getEndLineNumber(path.parentPath), isLineNumber),
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

      // `.skip`/`.fixme` skip the test (or whole suite); `.fail`/`.slow` still run but inherit
      // a skip from an enclosing suite
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

      // `.todo` tests are always skipped
      if (path.isIdentifier({ name: 'todo' })) {
        if (testNames.includes(getAnnotatedObjectName(path))) addAnnotatedTest(path, true);
      }

      for (const fiixtureName of testNames) {
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

          const suites = getSuites(path);

          tests.push({
            name: getStringValue(path.parent),
            suites: suites.map(s => getStringValue(s)),
            updatePoint: getUpdatePoint(path.parent),
            line: getLineNumber(path),
            code,
            file,
            tags: [...getAllSuiteTags(currentSuite), ...playwright.getTestProps(path.parentPath).tags],
            annotations: playwright.getTestProps(path.parentPath).annotations,
            skipped: suites.some(s => s.skipped),
          });

          // stop the loop if the test is found
          break;
        }
      }

      if (path.isIdentifier({ name: 'each' })) {
        const currentPath = path.parentPath.parentPath;

        if (!hasStringOrTemplateArgument(currentPath.parent)) return;
        const suites = getSuites(path);
        tests.push({
          name: getStringValue(currentPath.parent),
          suites: suites.map(s => getStringValue(s)),
          updatePoint: getUpdatePoint(path.parent),
          line: getLineNumber(currentPath),
          code: getCode(source, getLineNumber(currentPath), getEndLineNumber(currentPath), isLineNumber),
          file,
          skipped: suites.some(s => s.skipped),
        });
      }
    },
  });

  return tests;
};
