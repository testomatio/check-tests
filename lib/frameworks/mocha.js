const traverse = require("babel-traverse");
const Comment = require("../../comment");
const {
  getStringValue,
  getUpdatePoint,
  hasStringOrTemplateArgument,
  getLineNumber,
  getEndLineNumber,
  getCode,
} = require("../utils");

module.exports = (ast, file = "", source = "") => {
  const tests = [];
  let currentSuite = [];

  function addSuite(path) {
    currentSuite = currentSuite.filter((s) => s.end > path.start);
    currentSuite.push(path);
  }

  traverse.default(ast, {
    enter(path) {
      if (path.isIdentifier({ name: "describe" })) {
        if (!hasStringOrTemplateArgument(path.parent)) return;
        addSuite(path.parent);
      }

      if (path.isIdentifier({ name: "context" })) {
        if (!hasStringOrTemplateArgument(path.parent)) return;
        addSuite(path.parent);
      }

      // forbid only
      if (path.isIdentifier({ name: "only" })) {
        const name = path.parent.object.name;
        if (["describe", "it", "context"].includes(name)) {
          const line = getLineNumber(path);
          throw new Comment.Error(
            "Exclusive tests detected. `.only` call found in " +
              `${file}:${line}\n` +
              "Remove `.only` to restore test checks"
          );
        }
      }

      if (path.isIdentifier({ name: "skip" })) {
        if (!path.parent || !path.parent.object) {
          return;
        }

        if (path.parent.object.name === "it") {
          // test
          if (!hasStringOrTemplateArgument(path.parentPath.container)) return;

          const testName = getStringValue(path.parentPath.container);
          tests.push({
            name: testName,
            suites: currentSuite.map((s) => getStringValue(s)),
            updatePoint: getUpdatePoint(path.parent.container),
            line: getLineNumber(path),
            code: getCode(source, getLineNumber(path), getEndLineNumber(path)),
            file,
            skipped: true,
          });
        }

        if (
          path.parent.object.name === "describe" ||
          path.parent.object.name === "context"
        ) {
          // suite
          if (!hasStringOrTemplateArgument(path.parentPath.container)) return;
          const suite = path.parentPath.container;
          suite.skipped = true;
          addSuite(suite);
        }
      }

      if (path.isIdentifier({ name: "xit" })) {
        if (!hasStringOrTemplateArgument(path.parent)) return;

        const testName = getStringValue(path.parent);
        tests.push({
          name: testName,
          suites: currentSuite.map((s) => getStringValue(s)),
          updatePoint: getUpdatePoint(path.parent),
          line: getLineNumber(path),
          code: getCode(source, getLineNumber(path), getEndLineNumber(path)),
          skipped: true,
          file,
        });
      }

      if (path.isIdentifier({ name: "it" })) {
        if (!hasStringOrTemplateArgument(path.parent)) return;

        const testName = getStringValue(path.parent);
        tests.push({
          name: testName,
          suites: currentSuite.map((s) => getStringValue(s)),
          updatePoint: getUpdatePoint(path.parent),
          line: getLineNumber(path),
          code: getCode(source, getLineNumber(path), getEndLineNumber(path)),
          file,
          skipped: !!currentSuite.filter((s) => s.skipped).length,
        });
      }
    },
  });

  return tests;
};
