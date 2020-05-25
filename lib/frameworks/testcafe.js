const traverse = require('babel-traverse');
const Comment = require('../../comment');
const { getLineNumber, getEndLineNumber, getCode, hasTemplateQuasi, hasStringArgument } = require('../utils');

module.exports = (ast, file = '', source = '') => {

  const tests = [];
  let currentSuite = '';

  traverse.default(ast, {
    enter(path) {
      if (path.isIdentifier({ name: "fixture" })) {
        if (!hasTemplateQuasi(path.parent)) return;
        currentSuite =  path.parent.quasi.quasis[0].value.raw;
      }

      if (path.isIdentifier({ name: "test" })) {
        if (!hasStringArgument(path.parent)) return;

        const testName = path.parent.arguments[0].value;
        tests.push({
          name: testName,
          suites: [currentSuite],
          line: getLineNumber(path),
          code: getCode(source, getLineNumber(path), getEndLineNumber(path)),
          file,
        });
      }

      if (path.isIdentifier({ name: "skip" })) {
        if (!path.parent || !path.parent.object) {
          return;
        }

        if (path.parent.object.name === 'test') { // test
          if (!hasStringArgument(path.parentPath.container)) return;

          const testName = path.parentPath.container.arguments[0].value;
          tests.push({
            name: testName,
            suites: [currentSuite],
            line: getLineNumber(path),
            code: getCode(source, getLineNumber(path.parentPath), getEndLineNumber(path.parentPath)),
            file,
            skipped: true,
          });            
        }
      }
    },
  });

  return tests
}

