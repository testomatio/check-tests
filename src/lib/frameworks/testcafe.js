const traverse = require('@babel/traverse').default || require('@babel/traverse');
const {
  getLineNumber,
  getEndLineNumber,
  getCode,
  getUpdatePoint,
  hasTemplateQuasi,
  hasStringArgument,
  hasTemplateArgument,
  getQuasiArgument,
} = require('../utils');

// if you need to expand the adapter with options, use opts = {}
module.exports = (ast, file = '', source = '') => {
  const tests = [];
  let currentSuite = '';

  traverse(ast, {
    enter(path) {
      if (path.isIdentifier({ name: 'fixture' })) {
        if (!hasTemplateQuasi(path.parent)) return;
        currentSuite = path.parent.quasi.quasis[0].value.raw;
      }

      if (path.isIdentifier({ name: 'test' })) {
        if (!hasStringArgument(path.parent) && !hasTemplateArgument(path.parent)) return;

        let testName = path.parent.arguments[0].value;
        if (!testName) {
          testName = getQuasiArgument(path.parent);
        }
        if (!testName) return;
        tests.push({
          name: testName,
          suites: [currentSuite],
          updatePoint: getUpdatePoint(path.parent),
          line: getLineNumber(path),
          code: getCode(source, getLineNumber(path), getEndLineNumber(path)),
          file,
        });
      }

      if (path.isIdentifier({ name: 'skip' })) {
        if (!path.parent || !path.parent.object) {
          return;
        }

        if (path.parent.object.name === 'test') {
          // test
          if (!hasStringArgument(path.parentPath.container) && !hasTemplateArgument(path.parentPath.container)) return;

          const testName = path.parentPath.container.arguments[0].value;
          tests.push({
            name: testName,
            suites: [currentSuite],
            updatePoint: getUpdatePoint(path.parent),
            line: getLineNumber(path),
            code: getCode(source, getLineNumber(path.parentPath), getEndLineNumber(path.parentPath)),
            file,
            skipped: true,
          });
        }
      }

      if (path.isIdentifier({ name: 'before' })) {
        if (!path.parent || !path.parent.object) {
          return;
        }
        if (path.parent.object.name === 'test') {
          const parent = path.parentPath.parentPath.parent;
          if (!hasStringArgument(parent) && !hasTemplateArgument(parent)) return;
          const testName = parent.arguments[0].value;

          tests.push({
            name: testName,
            suites: [currentSuite],
            line: getLineNumber(path),
            code: getCode(
              source,
              getLineNumber(path.parentPath.parentPath),
              getEndLineNumber(path.parentPath.parentPath),
            ),
            file,
            skipped: false,
          });
        }
      }
    },
  });

  return tests;
};
