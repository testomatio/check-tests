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
  let beforeAllCode = '';
  let afterEachCode = '';

  function addSuite(path) {
    currentSuite = currentSuite.filter(s => s.loc.end.line > path.loc.start.line);
    currentSuite.push(path);
  }

  traverse(ast, {
    enter(path) {
      // Handle suite grouping (describe blocks or similar)
      if (path.isIdentifier({ name: 'describe' })) {
        if (!hasStringOrTemplateArgument(path.parent)) return;
        addSuite(path.parent);
      }

      // Handle hooks
      if (path.isIdentifier({ name: 'before' })) {
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

      if (path.isIdentifier({ name: 'beforeAll' })) {
        beforeAllCode = getCode(
          source,
          getLineNumber(path.parentPath),
          getEndLineNumber(path.parentPath),
          isLineNumber,
        );
      }

      if (path.isIdentifier({ name: 'after' })) {
        afterCode = getCode(source, getLineNumber(path.parentPath), getEndLineNumber(path.parentPath), isLineNumber);

        // Apply after hook to all existing tests immediately
        if (afterCode && !noHooks) {
          for (const test of tests) {
            if (!test.code.includes(afterCode)) {
              test.code += afterCode;
            }
          }
        }
      }

      if (path.isIdentifier({ name: 'afterEach' })) {
        afterEachCode = getCode(
          source,
          getLineNumber(path.parentPath),
          getEndLineNumber(path.parentPath),
          isLineNumber,
        );

        // Apply afterEach hook to all existing tests immediately
        if (afterEachCode && !noHooks) {
          for (const test of tests) {
            if (!test.code.includes(afterEachCode)) {
              test.code += afterEachCode;
            }
          }
        }
      }

      // Handle module.exports object pattern for Nightwatch
      if (path.isAssignmentExpression()) {
        const { left, right } = path.node;

        // Check for module.exports = { ... }
        if (
          left.type === 'MemberExpression' &&
          left.object.name === 'module' &&
          left.property.name === 'exports' &&
          right.type === 'ObjectExpression'
        ) {
          // Extract test methods from the exported object
          right.properties.forEach(prop => {
            if (
              prop.type === 'ObjectMethod' ||
              (prop.type === 'ObjectProperty' && prop.value.type === 'FunctionExpression') ||
              (prop.type === 'Property' && prop.value.type === 'FunctionExpression')
            ) {
              const testName = prop.key.name || prop.key.value;

              // Skip hooks
              if (['before', 'beforeEach', 'beforeAll', 'after', 'afterEach'].includes(testName)) {
                return;
              }

              let code = '';
              beforeCode = beforeCode ?? '';
              beforeEachCode = beforeEachCode ?? '';
              beforeAllCode = beforeAllCode ?? '';
              afterCode = afterCode ?? '';
              afterEachCode = afterEachCode ?? '';

              /* prettier-ignore */
              code = noHooks
                ? getCode(source, prop.loc.start.line, prop.loc.end.line, isLineNumber)
                : beforeAllCode
                + beforeCode
                + beforeEachCode
                + getCode(source, prop.loc.start.line, prop.loc.end.line, isLineNumber)
                + afterEachCode
                + afterCode;

              tests.push({
                name: testName,
                suites: currentSuite.map(s => getStringValue(s)).concat([file.split('/').pop()]),
                updatePoint: getUpdatePoint(path.parent),
                line: prop.loc.start.line,
                code,
                file,
                skipped: !!currentSuite.filter(s => s.skipped).length,
              });
            }
          });
        }
      }

      // Handle individual test functions (it/test pattern)
      if (path.isIdentifier({ name: 'it' }) || path.isIdentifier({ name: 'test' })) {
        if (!hasStringOrTemplateArgument(path.parent)) return;

        let code = '';
        beforeCode = beforeCode ?? '';
        beforeEachCode = beforeEachCode ?? '';
        beforeAllCode = beforeAllCode ?? '';
        afterCode = afterCode ?? '';
        afterEachCode = afterEachCode ?? '';

        /* prettier-ignore */
        code = noHooks
          ? getCode(source, getLineNumber(path), getEndLineNumber(path), isLineNumber)
          : beforeAllCode
          + beforeCode
          + beforeEachCode
          + getCode(source, getLineNumber(path), getEndLineNumber(path), isLineNumber)
          + afterEachCode
          + afterCode;

        const testName = getStringValue(path.parent);
        tests.push({
          name: testName,
          suites: currentSuite.map(s => getStringValue(s)).concat([file.split('/').pop()]),
          updatePoint: getUpdatePoint(path.parent),
          line: getLineNumber(path),
          code,
          file,
          skipped: !!currentSuite.filter(s => s.skipped).length,
        });
      }

      // Handle skipped tests
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
            suites: currentSuite.map(s => getStringValue(s)).concat([file.split('/').pop()]),
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
      }

      // Forbid .only exclusive tests
      if (path.isIdentifier({ name: 'only' })) {
        if (!path.parent || !path.parent.object) return;

        const name = path.parent.object.name || (path.parent.object.callee && path.parent.object.callee.object.name);
        if (['describe', 'it', 'test'].includes(name)) {
          const line = getLineNumber(path);
          throw new CommentError(
            /* prettier-ignore */
            'Exclusive tests detected. `.only` call found in '
            + `${file}:${line}\n`
            + 'Remove `.only` to restore test checks',
          );
        }
      }
    },
  });

  return tests;
};
