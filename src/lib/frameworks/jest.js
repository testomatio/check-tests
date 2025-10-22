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
        // Skip if this identifier is part of .each() pattern
        // Check if parent is part of member expression chain leading to .each()
        let currentPath = path.parentPath;
        let isPartOfEachPattern = false;

        // Traverse up to check for .each() patterns
        while (currentPath && currentPath.isMemberExpression()) {
          if (currentPath.node.property && currentPath.node.property.name === 'each') {
            isPartOfEachPattern = true;
            break;
          }
          // Also check for .concurrent.each pattern
          if (currentPath.node.property && currentPath.node.property.name === 'concurrent') {
            const nextPath = currentPath.parentPath;
            if (
              nextPath &&
              nextPath.isMemberExpression() &&
              nextPath.node.property &&
              nextPath.node.property.name === 'each'
            ) {
              isPartOfEachPattern = true;
              break;
            }
          }
          currentPath = currentPath.parentPath;
        }

        if (!isPartOfEachPattern) {
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
      }

      // Handle .each() method calls: test.each(), it.each(), test.concurrent.each(), it.concurrent.each()
      if (path.isCallExpression()) {
        const callee = path.node.callee;

        // Check for .each() calls (but skip if this is part of .each().skip() pattern)
        if (callee.type === 'MemberExpression' && callee.property && callee.property.name === 'each') {
          // Skip if this .each() call is part of .each().skip() pattern
          // Check if parent of this path is a CallExpression whose parent is a MemberExpression with 'skip'
          const parentCall = path.parentPath;
          const grandParentCall = parentCall?.parentPath;

          let isPartOfSkipPattern = false;
          if (grandParentCall && grandParentCall.isCallExpression()) {
            const grandCallee = grandParentCall.node.callee;
            if (
              grandCallee &&
              grandCallee.type === 'MemberExpression' &&
              grandCallee.property &&
              grandCallee.property.name === 'skip'
            ) {
              isPartOfSkipPattern = true;
            }
          }

          if (!isPartOfSkipPattern) {
            let isTestEach = false;
            let isSkipped = false;

            // Handle test.each() or it.each()
            if (callee.object && (callee.object.name === 'test' || callee.object.name === 'it')) {
              isTestEach = true;
            }

            // Handle test.concurrent.each() or it.concurrent.each()
            if (callee.object && callee.object.type === 'MemberExpression') {
              const nestedObject = callee.object.object;
              const nestedProperty = callee.object.property;

              if (
                nestedObject &&
                (nestedObject.name === 'test' || nestedObject.name === 'it') &&
                nestedProperty &&
                nestedProperty.name === 'concurrent'
              ) {
                isTestEach = true;
              }
            }

            if (isTestEach) {
              // For .each() tests, we need to look at the next call expression which contains the test name
              if (parentCall && parentCall.isCallExpression() && hasStringOrTemplateArgument(parentCall.node)) {
                const testName = getStringValue(parentCall.node);
                tests.push({
                  name: testName,
                  suites: currentSuite.map(s => getStringValue(s)),
                  updatePoint: getUpdatePoint(parentCall.node),
                  line: getLineNumber(path),
                  code: getCode(source, getLineNumber(path), getEndLineNumber(parentCall), isLineNumber),
                  file,
                  skipped: isSkipped || !!currentSuite.filter(s => s.skipped).length,
                });
              }
            }
          }
        }

        // Handle skipped .each() tests: test.each().skip(), it.each().skip()
        if (
          callee.property &&
          callee.property.name === 'skip' &&
          callee.object &&
          callee.object.type === 'CallExpression' &&
          callee.object.callee &&
          callee.object.callee.type === 'MemberExpression'
        ) {
          const eachCall = callee.object.callee;
          if (eachCall.property && eachCall.property.name === 'each') {
            let isTestEach = false;
            let isSkipped = true;

            // This is .each().skip() pattern
            if (eachCall.object && (eachCall.object.name === 'test' || eachCall.object.name === 'it')) {
              isTestEach = true;
            }

            // Handle test.concurrent.each().skip()
            if (eachCall.object && eachCall.object.type === 'MemberExpression') {
              const nestedObject = eachCall.object.object;
              const nestedProperty = eachCall.object.property;

              if (
                nestedObject &&
                (nestedObject.name === 'test' || nestedObject.name === 'it') &&
                nestedProperty &&
                nestedProperty.name === 'concurrent'
              ) {
                isTestEach = true;
              }
            }

            if (isTestEach) {
              if (hasStringOrTemplateArgument(path.node)) {
                const testName = getStringValue(path.node);
                tests.push({
                  name: testName,
                  suites: currentSuite.map(s => getStringValue(s)),
                  updatePoint: getUpdatePoint(path.node),
                  line: getLineNumber(path),
                  code: getCode(source, getLineNumber(path), getEndLineNumber(path), isLineNumber),
                  file,
                  skipped: isSkipped || !!currentSuite.filter(s => s.skipped).length,
                });
              }
            }
          }
        }
      }
    },
  });

  // Remove duplicates based on name, line, and skipped status
  const uniqueTests = [];
  const seen = new Set();

  for (const test of tests) {
    const key = `${test.name}:${test.line}:${test.skipped}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueTests.push(test);
    }
  }

  return uniqueTests;
};
