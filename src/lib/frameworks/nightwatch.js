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
          // First pass: collect all hooks from the module.exports object
          let moduleBeforeCode = '';
          let moduleBeforeEachCode = '';
          let moduleAfterCode = '';
          let moduleAfterEachCode = '';

          right.properties.forEach(prop => {
            const propName = prop.key.name || prop.key.value;
            if (propName === 'before' && prop.value.type === 'FunctionExpression') {
              moduleBeforeCode = getCode(source, prop.loc.start.line, prop.loc.end.line, isLineNumber);
            } else if (propName === 'beforeEach' && prop.value.type === 'FunctionExpression') {
              moduleBeforeEachCode = getCode(source, prop.loc.start.line, prop.loc.end.line, isLineNumber);
            } else if (propName === 'after' && prop.value.type === 'FunctionExpression') {
              moduleAfterCode = getCode(source, prop.loc.start.line, prop.loc.end.line, isLineNumber);
            } else if (propName === 'afterEach' && prop.value.type === 'FunctionExpression') {
              moduleAfterEachCode = getCode(source, prop.loc.start.line, prop.loc.end.line, isLineNumber);
            }
          });

          // Second pass: extract test methods from the exported object
          right.properties.forEach(prop => {
            const propName = prop.key.name || prop.key.value;

            // Skip metadata properties (starting with @)
            if (propName && propName.startsWith('@')) {
              return;
            }

            // Handle nested suite objects
            if (
              (prop.type === 'ObjectProperty' && prop.value.type === 'ObjectExpression') ||
              (prop.type === 'Property' && prop.value.type === 'ObjectExpression')
            ) {
              // This is a nested suite - first collect its hooks
              const suiteName = propName;
              let suiteBeforeCode = '';
              let suiteBeforeEachCode = '';
              let suiteAfterCode = '';
              let suiteAfterEachCode = '';

              prop.value.properties.forEach(nestedProp => {
                const nestedPropName = nestedProp.key.name || nestedProp.key.value;
                if (nestedPropName === 'before' && nestedProp.value.type === 'FunctionExpression') {
                  suiteBeforeCode = getCode(source, nestedProp.loc.start.line, nestedProp.loc.end.line, isLineNumber);
                } else if (nestedPropName === 'beforeEach' && nestedProp.value.type === 'FunctionExpression') {
                  suiteBeforeEachCode = getCode(
                    source,
                    nestedProp.loc.start.line,
                    nestedProp.loc.end.line,
                    isLineNumber,
                  );
                } else if (nestedPropName === 'after' && nestedProp.value.type === 'FunctionExpression') {
                  suiteAfterCode = getCode(source, nestedProp.loc.start.line, nestedProp.loc.end.line, isLineNumber);
                } else if (nestedPropName === 'afterEach' && nestedProp.value.type === 'FunctionExpression') {
                  suiteAfterEachCode = getCode(
                    source,
                    nestedProp.loc.start.line,
                    nestedProp.loc.end.line,
                    isLineNumber,
                  );
                }
              });

              // Then process the test methods
              prop.value.properties.forEach(nestedProp => {
                const nestedPropName = nestedProp.key.name || nestedProp.key.value;

                // Skip hooks in nested suites
                if (['before', 'beforeEach', 'beforeAll', 'after', 'afterEach'].includes(nestedPropName)) {
                  return;
                }

                if (
                  nestedProp.type === 'ObjectMethod' ||
                  (nestedProp.type === 'ObjectProperty' && nestedProp.value.type === 'FunctionExpression') ||
                  (nestedProp.type === 'Property' && nestedProp.value.type === 'FunctionExpression')
                ) {
                  let code = '';
                  beforeCode = beforeCode ?? '';
                  beforeEachCode = beforeEachCode ?? '';
                  beforeAllCode = beforeAllCode ?? '';
                  afterCode = afterCode ?? '';
                  afterEachCode = afterEachCode ?? '';

                  /* prettier-ignore */
                  code = noHooks
                    ? getCode(source, nestedProp.loc.start.line, nestedProp.loc.end.line, isLineNumber)
                    : moduleBeforeCode
                    + moduleBeforeEachCode
                    + suiteBeforeCode
                    + suiteBeforeEachCode
                    + beforeAllCode
                    + beforeCode
                    + beforeEachCode
                    + getCode(source, nestedProp.loc.start.line, nestedProp.loc.end.line, isLineNumber)
                    + afterEachCode
                    + suiteAfterEachCode
                    + afterCode
                    + suiteAfterCode
                    + moduleAfterEachCode
                    + moduleAfterCode;

                  tests.push({
                    name: nestedPropName,
                    suites: currentSuite.map(s => getStringValue(s)).concat([suiteName, file.split('/').pop()]),
                    updatePoint: getUpdatePoint(path.parent),
                    line: nestedProp.loc.start.line,
                    code,
                    file,
                    skipped: !!currentSuite.filter(s => s.skipped).length,
                  });
                }
              });
            }
            // Handle regular test functions
            else if (
              prop.type === 'ObjectMethod' ||
              (prop.type === 'ObjectProperty' && prop.value.type === 'FunctionExpression') ||
              (prop.type === 'Property' && prop.value.type === 'FunctionExpression')
            ) {
              // Skip hooks
              if (['before', 'beforeEach', 'beforeAll', 'after', 'afterEach'].includes(propName)) {
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
                : moduleBeforeCode
                + moduleBeforeEachCode
                + beforeAllCode
                + beforeCode
                + beforeEachCode
                + getCode(source, prop.loc.start.line, prop.loc.end.line, isLineNumber)
                + afterEachCode
                + moduleAfterEachCode
                + afterCode
                + moduleAfterCode;

              tests.push({
                name: propName,
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
