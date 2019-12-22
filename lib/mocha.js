const traverse = require('babel-traverse');

module.exports = (ast) => {

  const tests = [];
  const currentSuite = [];

  traverse.default(ast, {
    enter(path) {
      if (path.isIdentifier({ name: "describe" })) {
        if (!hasStringArgument(path.parent)) return;
        currentSuite.push(path.parent);        
      }

      if (path.isIdentifier({ name: "context" })) {
        if (!hasStringArgument(path.parent)) return;
        currentSuite.push(path.parent);
      }

      if (path.isIdentifier({ name: "it" })) {
        if (!hasStringArgument(path.parent)) return;
        let line = null;
        if (path.container && path.container.loc && path.container.loc.start) {
          line = path.container.loc.start.line;
        }
        const testName = path.parent.arguments[0].value;
        tests.push({
          name: testName,
          suites: currentSuite.map(s => s.arguments[0].value),
          line,
          // TODO: add line number
        });
      }
    },

    exit(path) {
      if (!currentSuite.length) return;
      if (path === currentSuite[currentSuite.length - 1]) {
        currentSuite.pop();
      };
    }
  });

  return tests;
}

function hasStringArgument(path) {
  if (!path.arguments) return false;
  if (!path.arguments.length) return false;
  return path.arguments[0].type === 'StringLiteral';
}
