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

      // `.skip`/`.fixme` tests are skipped; `.fail`/`.slow` tests still run;
      // runtime forms without a title (e.g. `test.skip()` inside a body) declare no test
      if (path.isIdentifier() && ['skip', 'fixme', 'fail', 'slow'].includes(path.node.name)) {
        if (!path.parent || !path.parent.object) {
          return;
        }
        const name =
          path.parent.object.name || path.parent.object.property?.name || path.parent.object.callee?.object?.name;

        if (testNames.includes(name)) {
          // test or it
          if (!hasStringOrTemplateArgument(path.parentPath.container)) return;

          const testName = getStringValue(path.parentPath.container);
          const suites = currentSuite.filter(s => getEndLineNumber({ container: s }) >= getLineNumber(path));
          tests.push({
            name: testName,
            suites: suites.map(s => getStringValue(s)),
            line: getLineNumber(path),
            // end line comes from the enclosing call to capture the full test body
            code: getCode(source, getLineNumber(path), getEndLineNumber(path.parentPath), isLineNumber),
            file,
            skipped: ['skip', 'fixme'].includes(path.node.name) || suites.some(s => s.skipped),
          });
        }

        if (name === 'describe' && (path.node.name === 'skip' || path.node.name === 'fixme')) {
          // suite
          if (!hasStringOrTemplateArgument(path.parentPath.container)) return;
          const suite = path.parentPath.container;
          suite.skipped = true;
          addSuite(suite);
        }

        // todo: handle "context"
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

          const testName = getStringValue(path.parent);
          const suites = currentSuite.filter(s => getEndLineNumber({ container: s }) >= getLineNumber(path));

          tests.push({
            name: testName,
            suites: suites.map(s => getStringValue(s)),
            updatePoint: getUpdatePoint(path.parent),
            line: getLineNumber(path),
            code,
            file,
            tags: [...getAllSuiteTags(currentSuite), ...playwright.getTestProps(path.parentPath).tags],
            annotations: playwright.getTestProps(path.parentPath).annotations,
            // only suites still enclosing this line can mark it skipped (not closed siblings)
            skipped: suites.some(s => s.skipped),
          });

          // stop the loop if the test is found
          break;
        }
      }

      if (path.isIdentifier({ name: 'each' })) {
        const currentPath = path.parentPath.parentPath;

        if (!hasStringOrTemplateArgument(currentPath.parent)) return;
        const testName = getStringValue(currentPath.parent);
        const suites = currentSuite.filter(s => getEndLineNumber({ container: s }) >= getLineNumber(path));
        tests.push({
          name: testName,
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
