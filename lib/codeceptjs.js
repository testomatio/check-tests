const traverse = require('babel-traverse');

module.exports = (ast) => {

  const tests = [];
  let currentSuite = '';

  traverse.default(ast, {
    enter(path) {
      if (path.isIdentifier({ name: "Feature" })) {
        if (!hasStringArgument(path.parent)) return;
        currentSuite = path.parent.arguments[0].value;
      };

      if (path.isIdentifier({ name: "Scenario" })) {
        let line = null;
        if (path.container && path.container.loc && path.container.loc.start) {
          line = path.container.loc.start.line;
        }

        if (hasStringArgument(path.container)) {
          const testName = path.container.arguments[0].value;      
          tests.push({
            name: testName,
            suites: [currentSuite],
            line,
          });
          return;
        };
        if (hasStringArgument(path.parent)) {
          const testName = path.parent.arguments[0].value;      
          tests.push({
            name: testName,
            suites: [currentSuite],
            line,
          });
        }  
      }
    },
  });

  return tests
}

function hasStringArgument(path) {
  if (!path.arguments) return false;
  if (!path.arguments.length) return false;
  return path.arguments[0].type === 'StringLiteral';
}
