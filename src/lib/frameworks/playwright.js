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

  // valid test identifiers: built-in `test`/`it` plus any custom fixtures/aliases
  const testNames = ['test', 'it', ...(opts?.testAlias || [])];

  function addSuite(path) {
    currentSuite = currentSuite.filter(s => s.loc.end.line > path.loc.start.line);
    path.tags = playwright.getTestProps({ parent: { expression: path } }).tags;
    currentSuite.push(path);
  }

  // suites that actually enclose the call at `path`. `currentSuite` is only pruned when a
  // new suite is added, so it can still hold sibling suites that already closed above this
  // line — those must not leak their name or `skipped` flag onto a test declared after them.
  function getEnclosingSuites(path) {
    return currentSuite.filter(s => getEndLineNumber({ container: s }) >= getLineNumber(path));
  }

  // resolve the name of the test object an annotation (`.skip`, `.fixme`, `.fail`, `.todo`)
  // is called on, e.g. `test`, `it`, `describe` or a custom test alias / fixture name
  function getTestObjectName(path) {
    if (!path.parent || !path.parent.object) return null;
    return (
      path.parent.object.name || path.parent.object.property?.name || path.parent.object.callee?.object?.name || null
    );
  }

  // Register a single named test declared with an annotation call
  // (`test.skip` / `test.fixme` / `test.fail` / `test.todo`, or the alias equivalents).
  // `path` is the annotation identifier node; its enclosing call holds the test title.
  // Calls without a string title (the runtime form `test.skip()` used inside a test body)
  // declare no test and are ignored. The caller decides `skipped`.
  function registerAnnotatedTest(path, { skipped }) {
    if (!hasStringOrTemplateArgument(path.parentPath.container)) return;

    tests.push({
      name: getStringValue(path.parentPath.container),
      suites: getEnclosingSuites(path).map(s => getStringValue(s)),
      line: getLineNumber(path),
      // `path` is the annotation identifier (`fixme`/`skip`/...); its container ends on the
      // member-expression line only. The full call (and its body) is `path.parentPath.container`,
      // so take the end line from there to capture the complete test code.
      code: getCode(source, getLineNumber(path), getEndLineNumber(path.parentPath), isLineNumber),
      file,
      skipped,
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

      // `.skip` / `.fixme` mark a test (or every test in a suite) as skipped,
      // supporting `test`, `it`, `describe` and any custom test alias / fixture
      if (path.isIdentifier({ name: 'skip' }) || path.isIdentifier({ name: 'fixme' })) {
        const name = getTestObjectName(path);
        if (!name) return;

        if (testNames.includes(name)) {
          // test or it (or alias), e.g. `myFixture.fixme('...', ...)`
          registerAnnotatedTest(path, { skipped: true });
        } else if (name === 'describe') {
          // suite
          if (!hasStringOrTemplateArgument(path.parentPath.container)) return;
          const suite = path.parentPath.container;
          suite.skipped = true;
          addSuite(suite);
        }

        // todo: handle "context"
      }

      // `.fail` marks a test as expected to fail; it still runs, so it is not skipped
      if (path.isIdentifier({ name: 'fail' })) {
        const name = getTestObjectName(path);
        if (!name) return;

        if (testNames.includes(name)) {
          registerAnnotatedTest(path, { skipped: getEnclosingSuites(path).some(s => s.skipped) });
        }
      }

      if (path.isIdentifier({ name: 'todo' })) {
        const name = getTestObjectName(path);
        if (!name) return;

        // todo tests => skipped tests
        if (testNames.includes(name)) {
          registerAnnotatedTest(path, { skipped: true });
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
          const enclosingSuites = getEnclosingSuites(path);

          tests.push({
            name: testName,
            suites: enclosingSuites.map(s => getStringValue(s)),
            updatePoint: getUpdatePoint(path.parent),
            line: getLineNumber(path),
            code,
            file,
            tags: [...getAllSuiteTags(currentSuite), ...playwright.getTestProps(path.parentPath).tags],
            annotations: playwright.getTestProps(path.parentPath).annotations,
            skipped: enclosingSuites.some(s => s.skipped),
          });

          // stop the loop if the test is found
          break;
        }
      }

      if (path.isIdentifier({ name: 'each' })) {
        const currentPath = path.parentPath.parentPath;

        if (!hasStringOrTemplateArgument(currentPath.parent)) return;
        const testName = getStringValue(currentPath.parent);
        const enclosingSuites = getEnclosingSuites(path);
        tests.push({
          name: testName,
          suites: enclosingSuites.map(s => getStringValue(s)),
          updatePoint: getUpdatePoint(path.parent),
          line: getLineNumber(currentPath),
          code: getCode(source, getLineNumber(currentPath), getEndLineNumber(currentPath), isLineNumber),
          file,
          skipped: enclosingSuites.some(s => s.skipped),
        });
      }
    },
  });

  return tests;
};
