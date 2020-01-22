const traverse = require('babel-traverse');
const Comment = require('../../comment');
const { hasStringArgument, getLineNumber, getEndLineNumber, getCode } = require('../utils');

module.exports = (ast, file = '', source = '') => {

  const tests = [];
  let currentSuite = [];

  function addSuite(path) {
    currentSuite = currentSuite.filter(s => s.end > path.start);
    currentSuite.push(path);
  }

  traverse.default(ast, {
    enter(path) {
      if (path.isIdentifier({ name: "describe" })) {
        if (!hasStringArgument(path.parent)) return;
        addSuite(path.parent);        
      }

      if (path.isIdentifier({ name: "xdescribe" })) {
        if (!hasStringArgument(path.parent)) return;
        path.parent.skipped = true;
        addSuite(path.parent);  
      }         

      // forbid fdescribe and fit
      if (path.isIdentifier({ name: "fdescribe" })) {
        const line = getLineNumber(path);
        throw new Comment.Error("Exclusive tests detected. `fdescribe` call found in " + `${file}:${line}\n` + "Remove `fdescibe` to restore test checks");
      } 

      if (path.isIdentifier({ name: "fit" })) {
        const line = getLineNumber(path);
        throw new Comment.Error("Exclusive tests detected. `fit` call found in " + `${file}:${line}\n` + "Remove `fit` to restore test checks");
      } 

      if (path.isIdentifier({ name: "xit" })) {
        if (!hasStringArgument(path.parent)) return;

        const testName = path.parent.arguments[0].value;
        tests.push({
          name: testName,
          suites: currentSuite.map(s => s.arguments[0].value),
          line: getLineNumber(path),
          skipped: true,
          code: getCode(source, getLineNumber(path), getEndLineNumber(path)),
          file,
        });
      }

      if (path.isIdentifier({ name: "it" })) {
        if (!hasStringArgument(path.parent)) return;

        const testName = path.parent.arguments[0].value;
        tests.push({
          name: testName,
          suites: currentSuite.map(s => s.arguments[0].value),
          line: getLineNumber(path),
          code: getCode(source, getLineNumber(path), getEndLineNumber(path)),
          file,
          skipped: !!currentSuite.filter(s => s.skipped).length
        });
      }
    },
  });

  return tests;
}

