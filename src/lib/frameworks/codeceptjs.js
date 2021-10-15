const traverse = require('babel-traverse');
const CommentError = require('../../errors/comment.error');
const {
  getUpdatePoint,
  getStringValue,
  getLineNumber,
  getEndLineNumber,
  getCode,
  hasStringOrTemplateArgument,
} = require('../utils');

module.exports = (ast, file = '', source = '') => {
  const tests = [];
  let currentSuite = '';

  const getScenario = path => {
    if (hasStringOrTemplateArgument(path.container)) {
      const testName = getStringValue(path.container);
      tests.push({
        name: testName,
        rawName: testName,
        suites: [currentSuite],
        updatePoint: getUpdatePoint(path.container),
        line: getLineNumber(path),
        code: getCode(source, getLineNumber(path), getEndLineNumber(path)),
        file,
      });
      return;
    }
    if (hasStringOrTemplateArgument(path.parent)) {
      const testName = getStringValue(path.parent);
      tests.push({
        name: testName,
        rawName: testName,
        suites: [currentSuite],
        updatePoint: getUpdatePoint(path.container),
        line: getLineNumber(path),
        code: getCode(source, getLineNumber(path), getEndLineNumber(path)),
        file,
      });
    }
  };

  traverse.default(ast, {
    enter(path) {
      if (path.isIdentifier({ name: 'Feature' })) {
        if (!hasStringOrTemplateArgument(path.parent)) return;
        currentSuite = getStringValue(path.parent);
        currentScenario = null;
      }

      if (path.isIdentifier({ name: 'only' })) {
        const name = path.parent.object.name;
        if (['Scenario'].includes(name)) {
          const line = getLineNumber(path);
          throw new CommentError(
            'Exclusive tests detected. `.only` call found in '
              + `${file}:${line}\n`
              + 'Remove `.only` to restore test checks',
          );
        }
      }

      if (path.isIdentifier({ name: 'xScenario' })) {
        if (hasStringOrTemplateArgument(path.container)) {
          const testName = getStringValue(path.container);
          tests.push({
            name: testName,
            suites: [currentSuite],
            updatePoint: getUpdatePoint(path.container),
            line: getLineNumber(path),
            code: getCode(source, getLineNumber(path), getEndLineNumber(path)),
            skipped: true,
            file,
          });
          return;
        }
      }

      if (path.isIdentifier({ name: 'Scenario' })) {
        getScenario(path);
      }

      if (path.isIdentifier({ name: 'Data' })) {
        getScenario(path.parentPath.parentPath);
      }
      if (path.isIdentifier({ name: 'tag' })) {
        if (
          !path.parentPath.container
          || !path.parentPath.container.arguments
          || !path.parentPath.container.arguments[0]
        ) {
          return;
        }
        let tagName = getStringValue(path.parentPath.container);

        if (!tagName) return;
        if (tagName.startsWith('@')) {
          tagName = tagName.slice(1);
        }

        if (!path.parentPath.container.callee) return;

        appendTagToOwner(path.parentPath.container.callee, tagName);
      }
    },
  });

  function appendTagToOwner(path, tagName) {
    if (!path.object) return null;

    if (path.object.callee.name == 'Data') {
      test = tests[tests.length - 1];
      if (!test) return;
      test.name = test.name.trim() + ' @'+tagName;
      return;
    }

    if (path.object.callee.name == 'Scenario') {
      const scenarioName = getStringValue(path.object);
      test = tests.filter(t => t.rawName === scenarioName)[0];
      if (!test) return;
      test.name = `${test.name.trim()} @${tagName}`;
      return;
    }
    if (path.object.callee.name === 'Feature') {
      currentSuite = `${currentSuite.trim()} @${tagName}`;
      return;
    }
    return appendTagToOwner(path.object.callee, tagName);
  }

  return tests;
};
