const traverse = require('babel-traverse');
const Comment = require('../comment');

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

      // forbid only
      if (path.isIdentifier({ name: "only" })) {
        const name = path.parent.object.name;
        if (['describe','it','context'].includes(name))  {
          throw new Comment.Error("Exclusive tests detected, '.only' call found.")
        }
      }

      if (path.isIdentifier({ name: "skip" })) {

        if (path.parent.object.name === 'it') { // test
          if (!hasStringArgument(path.parentPath.container)) return;

          const testName = path.parentPath.container.arguments[0].value;
          tests.push({
            name: testName,
            suites: currentSuite.map(s => s.arguments[0].value),
            line: getLineNumber(path),
            skipped: true,
          });            
        }

        if (path.parent.object.name === 'describe' || path.parent.object.name === 'context') { // suite
          if (!hasStringArgument(path.parentPath.container)) return;
          const suite = path.parentPath.container;
          suite.skipped = true;
          currentSuite.push(suite);
        }
      }


      if (path.isIdentifier({ name: "xit" })) {
        if (!hasStringArgument(path.parent)) return;

        const testName = path.parent.arguments[0].value;
        tests.push({
          name: testName,
          suites: currentSuite.map(s => s.arguments[0].value),
          line: getLineNumber(path),
          skipped: true,
        });
      }

      if (path.isIdentifier({ name: "it" })) {
        if (!hasStringArgument(path.parent)) return;

        const testName = path.parent.arguments[0].value;
        tests.push({
          name: testName,
          suites: currentSuite.map(s => s.arguments[0].value),
          line: getLineNumber(path),
          skipped: !!currentSuite.filter(s => s.skipped).length
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

function getLineNumber(path) {
  let line = null;
  if (path.container && path.container.loc && path.container.loc.start) {
    line = path.container.loc.start.line;
  }
  return line;
}