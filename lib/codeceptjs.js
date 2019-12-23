const traverse = require('babel-traverse');
const Comment = require('../comment');

module.exports = (ast) => {

  const tests = [];
  let currentSuite = '';

  traverse.default(ast, {
    enter(path) {
      if (path.isIdentifier({ name: "Feature" })) {
        if (!hasStringArgument(path.parent)) return;
        currentSuite = path.parent.arguments[0].value;
      };

      if (path.isIdentifier({ name: "only" })) {
        const name = path.parent.object.name;
        if (['Scenario'].includes(name))  {
          throw new Comment.Error("Exclusive tests detected, '.only' call found.")
        }
      }      

      if (path.isIdentifier({ name: "xScenario" })) {
        if (hasStringArgument(path.container)) {
          const testName = path.container.arguments[0].value;      
          tests.push({
            name: testName,
            suites: [currentSuite],
            line: getLineNumber(path),
            skipped: true,
          });
          return;
        };
      }

      if (path.isIdentifier({ name: "Scenario" })) {


        if (hasStringArgument(path.container)) {
          const testName = path.container.arguments[0].value;      
          tests.push({
            name: testName,
            suites: [currentSuite],
            line: getLineNumber(path),
          });
          return;
        };
        if (hasStringArgument(path.parent)) {
          const testName = path.parent.arguments[0].value;      
          tests.push({
            name: testName,
            suites: [currentSuite],
            line: getLineNumber(path),
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

function getLineNumber(path) {
  let line = null;
  if (path.container && path.container.loc && path.container.loc.start) {
    line = path.container.loc.start.line;
  }
  return line;
}