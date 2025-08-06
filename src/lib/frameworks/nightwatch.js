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

// Function to generate suite name from filename
function generateSuiteNameFromFile(filename) {
  const name = filename.split('/').pop(); // Get just the filename
  const hasTestInName = /\.(test|spec)\.(js|ts|mjs)$/.test(name);

  const baseName = name
    .replace(/\.(test|spec)\.(js|ts|mjs)$/, '') // Remove .test.js, .spec.ts, etc.
    .replace(/\.(js|ts|mjs)$/, '') // Remove .js, .ts, .mjs
    .split(/[-_.]/) // Split on hyphens, underscores, dots
    .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize each word
    .join(' '); // Join with spaces

  // Add "Test" suffix if the filename contained "test" or "spec"
  return hasTestInName ? baseName + ' Test' : baseName;
}

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

      // Handle module.exports and export default object patterns for Nightwatch
      if (path.isAssignmentExpression() || path.isExportDefaultDeclaration()) {
        let rightExpression;

        if (path.isAssignmentExpression()) {
          const { left, right } = path.node;
          // Check for module.exports = { ... }
          if (
            left.type === 'MemberExpression' &&
            left.object.name === 'module' &&
            left.property.name === 'exports' &&
            right.type === 'ObjectExpression'
          ) {
            rightExpression = right;
          }
        } else if (path.isExportDefaultDeclaration()) {
          // Check for export default { ... } or export default identifier
          if (path.node.declaration.type === 'ObjectExpression') {
            rightExpression = path.node.declaration;
          } else if (path.node.declaration.type === 'Identifier') {
            // Handle TypeScript: export default home; where home is defined elsewhere
            // We need to find the variable declaration
            const identifierName = path.node.declaration.name;
            // Look for the variable declaration in the same scope
            const binding = path.scope.getBinding(identifierName);
            if (
              binding &&
              binding.path.isVariableDeclarator() &&
              binding.path.node.init &&
              binding.path.node.init.type === 'ObjectExpression'
            ) {
              rightExpression = binding.path.node.init;
            }
          }
        }

        if (rightExpression) {
          // First pass: collect all hooks from the exported object
          let moduleBeforeCode = '';
          let moduleBeforeEachCode = '';
          let moduleAfterCode = '';
          let moduleAfterEachCode = '';

          rightExpression.properties.forEach(prop => {
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
          rightExpression.properties.forEach(prop => {
            const propName = prop.key.name || prop.key.value;

            // Skip metadata properties (starting with @)
            if (propName && propName.startsWith('@')) {
              return;
            }

            // Skip nested objects since Nightwatch doesn't support nested suites
            if (
              (prop.type === 'ObjectProperty' && prop.value.type === 'ObjectExpression') ||
              (prop.type === 'Property' && prop.value.type === 'ObjectExpression')
            ) {
              // Nightwatch doesn't support nested suites, skip these
              return;
            }
            // Handle regular test functions
            else if (
              prop.type === 'ObjectMethod' ||
              (prop.type === 'ObjectProperty' && prop.value.type === 'FunctionExpression') ||
              (prop.type === 'Property' && prop.value.type === 'FunctionExpression') ||
              (prop.type === 'ObjectProperty' && prop.value.type === 'ArrowFunctionExpression') ||
              (prop.type === 'Property' && prop.value.type === 'ArrowFunctionExpression')
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

              // For export default pattern, if no explicit suites, use generated suite name
              const explicitSuites = currentSuite.map(s => getStringValue(s));
              const suiteNames =
                explicitSuites.length > 0
                  ? explicitSuites.concat([file.split('/').pop()])
                  : [generateSuiteNameFromFile(file)];

              // For object property pattern, create updatePoint from the key location
              let updatePoint;
              if (prop.key && prop.key.loc) {
                updatePoint = {
                  line: prop.key.loc.end.line,
                  column: prop.key.loc.end.column - 1,
                };
              }

              tests.push({
                name: propName,
                suites: suiteNames,
                updatePoint: updatePoint,
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
        // For describe/it pattern, if there are explicit suites (describe blocks), use only those
        // If no explicit suites, generate from filename
        const explicitSuites = currentSuite.map(s => getStringValue(s));
        const suiteNames = explicitSuites.length > 0 ? explicitSuites : [generateSuiteNameFromFile(file)];

        tests.push({
          name: testName,
          suites: suiteNames,
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
          // For skipped tests, use same suite logic as regular tests
          const explicitSuites = currentSuite.map(s => getStringValue(s));
          const suiteNames = explicitSuites.length > 0 ? explicitSuites : [generateSuiteNameFromFile(file)];

          tests.push({
            name: testName,
            suites: suiteNames,
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
